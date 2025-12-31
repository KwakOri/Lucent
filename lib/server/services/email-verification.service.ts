/**
 * Email Verification Service
 *
 * 이메일 인증 관련 비즈니스 로직
 * - 6자리 코드 생성
 * - 인증 레코드 생성 및 관리
 * - 코드/토큰 검증
 * - 만료 및 시도 횟수 관리
 */

import { createServerClient } from '@/lib/server/utils/supabase';
import { sendVerificationEmail } from '@/lib/server/utils/email';
import { ApiError } from '@/lib/server/utils/errors';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

// ===== 타입 정의 =====

export interface EmailVerificationRecord {
  id: string;
  email: string;
  code: string | null;
  token: string;
  hashed_password: string | null;
  purpose: 'signup' | 'reset-password';
  expires_at: string;
  verified_at: string | null;
  attempts: number;
  created_at: string;
}

export interface CreateVerificationParams {
  email: string;
  password: string;
  purpose: 'signup' | 'reset-password';
}

export interface VerifyCodeParams {
  email: string;
  code: string;
}

// ===== EmailVerificationService =====

export class EmailVerificationService {
  /**
   * 6자리 랜덤 숫자 코드 생성
   */
  static generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * 이메일 인증 레코드 생성 및 이메일 발송
   */
  static async createVerification(params: CreateVerificationParams): Promise<void> {
    const { email, password, purpose } = params;
    const supabase = await createServerClient();

    // 1. 이메일 중복 확인 (auth.users)
    const { data: existingUser } = await supabase.auth.admin.listUsers();
    const userExists = existingUser.users.some((user) => user.email === email);

    if (userExists) {
      throw new ApiError('이미 가입된 이메일입니다', 400);
    }

    // 2. profiles 테이블에서도 확인
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('email')
      .eq('email', email)
      .single();

    if (existingProfile) {
      throw new ApiError('이미 가입된 이메일입니다', 400);
    }

    // 3. 기존 인증 레코드 삭제 (같은 이메일)
    await supabase
      .from('email_verifications')
      .delete()
      .eq('email', email)
      .eq('purpose', purpose);

    // 4. 6자리 코드 생성
    const code = this.generateCode();

    // 5. UUID 토큰 생성 (링크용)
    const token = uuidv4();

    // 6. 비밀번호 해시
    const hashedPassword = await bcrypt.hash(password, 10);

    // 7. 만료 시간 설정 (10분 후)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);

    // 8. email_verifications 레코드 생성
    const { error: insertError } = await supabase.from('email_verifications').insert({
      email,
      code,
      token,
      hashed_password: hashedPassword,
      purpose,
      expires_at: expiresAt.toISOString(),
      attempts: 0,
    });

    if (insertError) {
      console.error('[EmailVerificationService] 인증 레코드 생성 실패:', insertError);
      throw new ApiError('인증 코드 생성에 실패했습니다', 500);
    }

    // 9. 이메일 발송
    try {
      await sendVerificationEmail({ email, code, token });
    } catch (emailError) {
      // 이메일 발송 실패 시 레코드 삭제
      await supabase
        .from('email_verifications')
        .delete()
        .eq('email', email)
        .eq('token', token);

      throw new ApiError('이메일 발송에 실패했습니다. 잠시 후 다시 시도해주세요.', 500);
    }

    console.log(`[EmailVerificationService] 인증 코드 발송 성공: ${email}`);
  }

  /**
   * 코드로 이메일 인증 (6자리 숫자)
   */
  static async verifyCode(params: VerifyCodeParams): Promise<string> {
    const { email, code } = params;
    const supabase = await createServerClient();

    // 1. 인증 레코드 조회
    const { data: verification, error: selectError } = await supabase
      .from('email_verifications')
      .select('*')
      .eq('email', email)
      .eq('code', code)
      .eq('purpose', 'signup')
      .is('verified_at', null)
      .single();

    if (selectError || !verification) {
      // 시도 횟수 증가
      await this.incrementAttempts(email);
      throw new ApiError('잘못된 인증 코드입니다', 400);
    }

    // 2. 만료 여부 확인
    const now = new Date();
    const expiresAt = new Date(verification.expires_at);

    if (now > expiresAt) {
      throw new ApiError('인증 코드가 만료되었습니다. 코드를 재발송해주세요.', 400);
    }

    // 3. 시도 횟수 확인
    if (verification.attempts >= 5) {
      throw new ApiError('인증 시도 횟수를 초과했습니다. 코드를 재발송해주세요.', 429);
    }

    // 4. 검증 완료 처리
    const { error: updateError } = await supabase
      .from('email_verifications')
      .update({ verified_at: new Date().toISOString() })
      .eq('id', verification.id);

    if (updateError) {
      console.error('[EmailVerificationService] 인증 완료 처리 실패:', updateError);
      throw new ApiError('인증 처리에 실패했습니다', 500);
    }

    console.log(`[EmailVerificationService] 코드 인증 성공: ${email}`);

    // 5. 검증 토큰 반환 (회원가입 API에서 사용)
    return verification.token;
  }

  /**
   * 토큰으로 이메일 인증 (링크 클릭)
   */
  static async verifyToken(token: string): Promise<EmailVerificationRecord> {
    const supabase = await createServerClient();

    // 1. 인증 레코드 조회
    const { data: verification, error: selectError } = await supabase
      .from('email_verifications')
      .select('*')
      .eq('token', token)
      .eq('purpose', 'signup')
      .is('verified_at', null)
      .single();

    if (selectError || !verification) {
      throw new ApiError('유효하지 않은 인증 링크입니다', 400);
    }

    // 2. 만료 여부 확인
    const now = new Date();
    const expiresAt = new Date(verification.expires_at);

    if (now > expiresAt) {
      throw new ApiError('인증 링크가 만료되었습니다', 400);
    }

    // 3. 검증 완료 처리
    const { error: updateError } = await supabase
      .from('email_verifications')
      .update({ verified_at: new Date().toISOString() })
      .eq('id', verification.id);

    if (updateError) {
      console.error('[EmailVerificationService] 인증 완료 처리 실패:', updateError);
      throw new ApiError('인증 처리에 실패했습니다', 500);
    }

    console.log(`[EmailVerificationService] 링크 인증 성공: ${verification.email}`);

    return verification as EmailVerificationRecord;
  }

  /**
   * 검증된 인증 레코드 조회 (회원가입 시 사용)
   */
  static async getVerifiedRecord(token: string): Promise<EmailVerificationRecord | null> {
    const supabase = await createServerClient();

    const { data: verification } = await supabase
      .from('email_verifications')
      .select('*')
      .eq('token', token)
      .eq('purpose', 'signup')
      .not('verified_at', 'is', null)
      .single();

    return verification as EmailVerificationRecord | null;
  }

  /**
   * 인증 레코드 삭제 (회원가입 완료 후)
   */
  static async deleteVerification(token: string): Promise<void> {
    const supabase = await createServerClient();

    await supabase.from('email_verifications').delete().eq('token', token);

    console.log(`[EmailVerificationService] 인증 레코드 삭제: ${token}`);
  }

  /**
   * 시도 횟수 증가 (비공개 메서드)
   */
  private static async incrementAttempts(email: string): Promise<void> {
    const supabase = await createServerClient();

    await supabase.rpc('increment_verification_attempts', { p_email: email });
  }

  /**
   * 코드 재발송 쿨타임 확인 (60초)
   */
  static async checkResendCooldown(email: string): Promise<boolean> {
    const supabase = await createServerClient();

    const { data: verification } = await supabase
      .from('email_verifications')
      .select('created_at')
      .eq('email', email)
      .eq('purpose', 'signup')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!verification) {
      return true; // 기존 레코드 없으면 발송 가능
    }

    const now = new Date();
    const createdAt = new Date(verification.created_at);
    const diffSeconds = (now.getTime() - createdAt.getTime()) / 1000;

    if (diffSeconds < 60) {
      return false; // 60초 미만이면 쿨타임
    }

    return true; // 60초 이상이면 재발송 가능
  }
}
