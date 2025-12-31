/**
 * OAuth Service
 *
 * OAuth 인증 후 프로필 자동 생성 및 관리
 * - OAuth 콜백 처리
 * - 프로필 자동 생성/로드
 * - 이메일 중복 처리 (보안: 자동 연결 방지)
 * - OAuth 로그인 로깅
 */

import { createServerClient } from '@/lib/server/utils/supabase';
import { ApiError } from '@/lib/server/utils/errors';
import { LogService } from './log.service';
import type { User } from '@supabase/supabase-js';
import type { Tables } from '@/types/database';
import type { OAuthCallbackResult } from '@/types/auth';

type Profile = Tables<'profiles'>;

export class OAuthService {
  /**
   * OAuth 콜백 처리
   * - 프로필 존재 확인
   * - 없으면 자동 생성
   * - 이메일 중복 시 에러 반환 (보안: Pre-Account Takeover 방지)
   *
   * @param user - Supabase auth.users 사용자 객체
   * @returns 사용자 정보, 프로필, 신규 여부
   */
  static async handleOAuthCallback(user: User): Promise<OAuthCallbackResult> {
    const supabase = await createServerClient();

    // 1. profiles 테이블에서 기존 프로필 조회 (user.id로 검색)
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (existingProfile) {
      // 기존 사용자 - 프로필 반환
      await LogService.log({
        eventCategory: 'auth',
        eventType: 'oauth_login_success',
        message: 'Google OAuth 로그인 성공',
        userId: user.id,
        metadata: {
          provider: 'google',
          email: user.email || '',
          isNewUser: false,
        },
      });

      return {
        user,
        profile: existingProfile,
        isNewUser: false,
      };
    }

    // 2. 이메일 중복 확인 (보안: 자동 연결 방지)
    if (user.email) {
      const emailProfile = await this.findProfileByEmail(user.email);

      if (emailProfile) {
        // 동일 이메일로 이미 가입된 계정 존재
        // 보안상의 이유로 자동 연결하지 않음 (Pre-Account Takeover 방지)
        await LogService.log({
          eventCategory: 'auth',
          eventType: 'oauth_email_conflict',
          message: 'Google OAuth 이메일 중복 - 기존 계정 존재',
          userId: user.id,
          metadata: {
            email: user.email,
            existingProfileId: emailProfile.id,
          },
          severity: 'warning',
        });

        throw new ApiError(
          '이미 가입된 이메일입니다. 기존 계정으로 로그인하세요.',
          409,
          'EMAIL_ALREADY_EXISTS'
        );
      }
    }

    // 3. 신규 사용자 - 프로필 자동 생성
    const newProfile = await this.createOAuthProfile(user);

    await LogService.log({
      eventCategory: 'auth',
      eventType: 'oauth_signup_success',
      message: 'Google OAuth 회원가입 성공 (프로필 자동 생성)',
      userId: user.id,
      metadata: {
        provider: 'google',
        email: user.email || '',
        name: newProfile.name,
      },
    });

    return {
      user,
      profile: newProfile,
      isNewUser: true,
    };
  }

  /**
   * OAuth 사용자 프로필 생성
   *
   * @param user - Supabase auth.users 사용자 객체
   * @returns 생성된 프로필
   */
  static async createOAuthProfile(user: User): Promise<Profile> {
    const supabase = await createServerClient();

    // Google에서 제공하는 정보 추출
    const email = user.email;
    const name = user.user_metadata?.full_name || user.user_metadata?.name || null;

    if (!email) {
      throw new ApiError(
        'OAuth 사용자 이메일 정보를 찾을 수 없습니다',
        400,
        'OAUTH_EMAIL_MISSING'
      );
    }

    // profiles 테이블에 레코드 생성
    const { data: profile, error } = await supabase
      .from('profiles')
      .insert({
        id: user.id, // auth.users.id와 동일
        email: email,
        name: name,
        phone: null, // 추후 입력
        main_address: null, // 추후 입력
        detail_address: null, // 추후 입력
      })
      .select()
      .single();

    if (error) {
      // 로그 기록
      await LogService.log({
        eventCategory: 'auth',
        eventType: 'oauth_profile_creation_failed',
        message: 'Google OAuth 프로필 생성 실패',
        userId: user.id,
        metadata: {
          email: email,
          error: error.message,
        },
        severity: 'error',
      });

      throw new ApiError(
        '프로필 생성에 실패했습니다',
        500,
        'PROFILE_CREATION_FAILED'
      );
    }

    return profile;
  }

  /**
   * 이메일로 기존 프로필 조회
   *
   * @param email - 이메일 주소
   * @returns 프로필 또는 null
   */
  static async findProfileByEmail(email: string): Promise<Profile | null> {
    const supabase = await createServerClient();

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email)
      .single();

    return profile || null;
  }
}
