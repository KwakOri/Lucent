/**
 * Auth Service
 *
 * 인증 관련 비즈니스 로직
 * - 회원가입, 로그인, 로그아웃
 * - 이메일 인증
 * - 비밀번호 재설정
 * - 세션 관리
 *
 * 중요: 모든 인증 이벤트는 LogService로 기록됩니다.
 */

import { createServerClient } from '@/lib/server/utils/supabase';
import { ApiError, ValidationError, AuthenticationError } from '@/lib/server/utils/errors';
import { sendVerificationEmail, sendPasswordResetEmail } from '@/lib/server/utils/email';
import { LogService } from './log.service';
import type {
  AuthUser,
  AuthSession,
  AuthResponse,
  SignUpInput,
  LoginInput,
  EmailVerificationResult,
  PasswordResetResult,
  SessionResponse,
} from '@/types/auth';

// ===== AuthService Class =====

export class AuthService {
  /**
   * 이메일 인증 토큰 생성 및 발송
   */
  static async sendEmailVerification(email: string): Promise<void> {
    const supabase = await createServerClient();

    // 이메일 유효성 검사
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new ValidationError('올바른 이메일 형식이 아닙니다', 'INVALID_EMAIL');
    }

    // 이메일 중복 확인
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('email')
      .eq('email', email)
      .single();

    if (existingProfile) {
      throw new ApiError(
        '이미 사용 중인 이메일입니다',
        400,
        'EMAIL_ALREADY_EXISTS'
      );
    }

    // 인증 토큰 생성 (6자리 랜덤 문자)
    const token = Math.random().toString(36).substring(2, 8).toUpperCase();
    const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6자리 코드
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10분 후

    // 기존 미사용 토큰 삭제 (동일 이메일)
    await supabase
      .from('email_verifications')
      .delete()
      .eq('email', email)
      .is('verified_at', null);

    // 새 토큰 저장
    const { error: insertError } = await supabase
      .from('email_verifications')
      .insert({
        email,
        token,
        purpose: 'signup',
        expires_at: expiresAt.toISOString(),
      });

    if (insertError) {
      throw new ApiError(
        '인증 토큰 생성에 실패했습니다',
        500,
        'TOKEN_CREATION_FAILED'
      );
    }

    // 이메일 발송
    try {
      await sendVerificationEmail({ email, code, token });
    } catch (error) {
      // 이메일 발송 실패 시 토큰 삭제
      await supabase
        .from('email_verifications')
        .delete()
        .eq('email', email)
        .eq('token', token);

      throw new ApiError(
        '이메일 발송에 실패했습니다. 잠시 후 다시 시도해주세요.',
        500,
        'EMAIL_SEND_FAILED'
      );
    }

    // ✅ 로그 기록
    await LogService.logEmailVerificationSent(email);
  }

  /**
   * 이메일 인증 확인
   */
  static async verifyEmail(token: string): Promise<EmailVerificationResult> {
    const supabase = await createServerClient();

    const { data: verification, error } = await supabase
      .from('email_verifications')
      .select('email, expires_at, verified_at, purpose')
      .eq('token', token)
      .eq('purpose', 'signup')
      .single();

    if (error || !verification) {
      // ✅ 로그 기록 (실패)
      await LogService.logEmailVerificationFailed(
        'unknown',
        '유효하지 않은 인증 토큰'
      );

      throw new ApiError(
        '유효하지 않은 인증 토큰입니다',
        400,
        'INVALID_TOKEN'
      );
    }

    // 만료 확인
    if (new Date(verification.expires_at) < new Date()) {
      await LogService.logEmailVerificationFailed(
        verification.email,
        '인증 토큰 만료'
      );

      throw new ApiError(
        '인증 토큰이 만료되었습니다. 다시 요청해주세요.',
        400,
        'TOKEN_EXPIRED'
      );
    }

    // 이미 사용된 토큰 확인
    if (verification.verified_at) {
      await LogService.logEmailVerificationFailed(
        verification.email,
        '이미 사용된 토큰'
      );

      throw new ApiError(
        '이미 사용된 인증 토큰입니다',
        400,
        'TOKEN_ALREADY_USED'
      );
    }

    // 토큰 검증 완료 처리
    await supabase
      .from('email_verifications')
      .update({ verified_at: new Date().toISOString() })
      .eq('token', token);

    // ✅ 로그 기록 (성공)
    // 이 시점에는 아직 회원가입 전이므로 userId 없음
    await LogService.log({
      eventType: 'user.email_verification.success',
      severity: 'info',
      message: '이메일 인증 완료 (회원가입 전)',
      metadata: { email: verification.email },
    });

    return { email: verification.email };
  }

  /**
   * 회원가입
   */
  static async signUp(
    input: SignUpInput,
    ipAddress?: string,
    userAgent?: string
  ): Promise<AuthResponse> {
    const { email, password, name } = input;
    const supabase = await createServerClient();

    // 비밀번호 검증
    if (password.length < 8) {
      throw new ValidationError(
        '비밀번호는 최소 8자 이상이어야 합니다',
        'PASSWORD_TOO_SHORT'
      );
    }

    // 이메일 인증 여부 확인
    const { data: verification } = await supabase
      .from('email_verifications')
      .select('verified_at')
      .eq('email', email)
      .eq('purpose', 'signup')
      .not('verified_at', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!verification) {
      throw new ApiError(
        '이메일 인증이 필요합니다',
        400,
        'EMAIL_NOT_VERIFIED'
      );
    }

    // Supabase Auth 회원가입
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name || null,
        },
      },
    });

    if (authError || !authData.user || !authData.session) {
      // ✅ 로그 기록 (실패)
      await LogService.logSignupFailed(
        email,
        authError?.message || '회원가입 실패',
        ipAddress
      );

      throw new ApiError(
        '회원가입에 실패했습니다',
        500,
        'SIGNUP_FAILED'
      );
    }

    // profiles 테이블에 추가 정보 저장
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: authData.user.id,
        email: authData.user.email!,
        name: name || null,
      });

    if (profileError) {
      console.error('[AuthService] Profile 생성 실패:', profileError);
    }

    // ✅ 로그 기록 (성공)
    await LogService.logSignupSuccess(
      authData.user.id,
      email,
      ipAddress,
      userAgent
    );

    return {
      user: authData.user,
      session: authData.session,
    };
  }

  /**
   * 로그인
   */
  static async login(
    input: LoginInput,
    ipAddress?: string,
    userAgent?: string
  ): Promise<AuthResponse> {
    const { email, password } = input;
    const supabase = await createServerClient();

    // 🐛 DEBUG: 로그인 시도
    console.log('[DEBUG] AuthService.login:', {
      email,
      passwordLength: password.length,
      passwordType: typeof password,
      ipAddress,
    });

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user) {
      // 🐛 DEBUG: 로그인 실패 상세 정보
      console.error('[DEBUG] AuthService.login - Failed:', {
        email,
        errorMessage: error?.message,
        errorCode: error?.status,
        errorName: error?.name,
      });

      // ✅ 로그 기록 (실패)
      await LogService.logLoginFailed(
        email,
        error?.message || '로그인 실패',
        ipAddress,
        userAgent
      );

      throw new AuthenticationError(
        '이메일 또는 비밀번호가 올바르지 않습니다',
        'INVALID_CREDENTIALS'
      );
    }

    // 🐛 DEBUG: 로그인 성공
    console.log('[DEBUG] AuthService.login - Success:', {
      userId: data.user.id,
      email: data.user.email,
      sessionExists: !!data.session,
    });

    // ✅ 로그 기록 (성공)
    await LogService.logLoginSuccess(
      data.user.id,
      ipAddress,
      userAgent
    );

    return {
      user: data.user,
      session: data.session,
    };
  }

  /**
   * 로그아웃
   */
  static async logout(userId: string): Promise<void> {
    const supabase = await createServerClient();

    const { error } = await supabase.auth.signOut();

    if (error) {
      throw new ApiError(
        '로그아웃에 실패했습니다',
        500,
        'LOGOUT_FAILED'
      );
    }

    // ✅ 로그 기록
    await LogService.logLogout(userId);
  }

  /**
   * 현재 세션 확인
   *
   * 보안: getUser()를 사용하여 Supabase Auth 서버에서 직접 사용자를 인증합니다.
   * getSession()은 쿠키에서 직접 가져오므로 보안상 사용하지 않습니다.
   */
  static async getSession(): Promise<SessionResponse> {
    const supabase = await createServerClient();

    // getUser()로 사용자 인증 (Supabase Auth 서버와 통신하여 인증 보장)
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {
      return null;
    }

    return {
      user: data.user,
    };
  }

  /**
   * 비밀번호 재설정 요청
   */
  static async requestPasswordReset(email: string): Promise<void> {
    const supabase = await createServerClient();

    // 사용자 존재 여부 확인
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single();

    if (!profile) {
      // 보안상 이유로 사용자 없어도 성공 응답
      // 실제로는 이메일을 발송하지 않음
      return;
    }

    // 재설정 토큰 생성
    const token = Math.random().toString(36).substring(2, 15);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10분

    // 기존 미사용 토큰 삭제
    await supabase
      .from('email_verifications')
      .delete()
      .eq('email', email)
      .eq('purpose', 'reset_password')
      .is('verified_at', null);

    // 새 토큰 저장
    await supabase
      .from('email_verifications')
      .insert({
        email,
        token,
        purpose: 'reset_password',
        expires_at: expiresAt.toISOString(),
      });

    // 이메일 발송
    try {
      await sendPasswordResetEmail(email, token);
    } catch (error) {
      throw new ApiError(
        '이메일 발송에 실패했습니다',
        500,
        'EMAIL_SEND_FAILED'
      );
    }

    // ✅ 로그 기록
    await LogService.logPasswordResetRequested(email);
  }

  /**
   * 비밀번호 재설정 확인 및 변경
   */
  static async resetPassword(
    token: string,
    newPassword: string
  ): Promise<PasswordResetResult> {
    const supabase = await createServerClient();

    // 비밀번호 검증
    if (newPassword.length < 8) {
      throw new ValidationError(
        '비밀번호는 최소 8자 이상이어야 합니다',
        'PASSWORD_TOO_SHORT'
      );
    }

    // 토큰 검증
    const { data: verification, error } = await supabase
      .from('email_verifications')
      .select('email, expires_at, verified_at')
      .eq('token', token)
      .eq('purpose', 'reset_password')
      .single();

    if (error || !verification) {
      await LogService.logPasswordResetFailed('unknown', '유효하지 않은 토큰');
      throw new ApiError(
        '유효하지 않은 재설정 토큰입니다',
        400,
        'INVALID_TOKEN'
      );
    }

    // 만료 확인
    if (new Date(verification.expires_at) < new Date()) {
      await LogService.logPasswordResetFailed(verification.email, '토큰 만료');
      throw new ApiError(
        '재설정 토큰이 만료되었습니다',
        400,
        'TOKEN_EXPIRED'
      );
    }

    // 이미 사용됨
    if (verification.verified_at) {
      await LogService.logPasswordResetFailed(verification.email, '이미 사용된 토큰');
      throw new ApiError(
        '이미 사용된 재설정 토큰입니다',
        400,
        'TOKEN_ALREADY_USED'
      );
    }

    // 사용자 찾기
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', verification.email)
      .single();

    if (!profile) {
      throw new ApiError(
        '사용자를 찾을 수 없습니다',
        404,
        'USER_NOT_FOUND'
      );
    }

    // 비밀번호 변경 (Supabase Admin API 사용)
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      profile.id,
      { password: newPassword }
    );

    if (updateError) {
      await LogService.logPasswordResetFailed(
        verification.email,
        '비밀번호 변경 실패'
      );
      throw new ApiError(
        '비밀번호 변경에 실패했습니다',
        500,
        'PASSWORD_UPDATE_FAILED'
      );
    }

    // 토큰 사용 처리
    await supabase
      .from('email_verifications')
      .update({ verified_at: new Date().toISOString() })
      .eq('token', token);

    // ✅ 로그 기록 (성공)
    await LogService.logPasswordResetSuccess(profile.id, verification.email);

    return { email: verification.email };
  }
}
