/**
 * Auth Types
 *
 * Supabase Auth 관련 타입 정의
 */

import { User, Session } from '@supabase/supabase-js';

/**
 * Supabase User 타입
 */
export type AuthUser = User;

/**
 * Supabase Session 타입
 */
export type AuthSession = Session;

/**
 * Auth Response 타입
 */
export interface AuthResponse {
  user: AuthUser;
  session: AuthSession;
}

/**
 * 회원가입 Input
 */
export interface SignUpInput {
  email: string;
  password: string;
  name?: string;
}

/**
 * 로그인 Input
 */
export interface LoginInput {
  email: string;
  password: string;
}

/**
 * 이메일 인증 결과
 */
export interface EmailVerificationResult {
  email: string;
}

/**
 * 비밀번호 재설정 결과
 */
export interface PasswordResetResult {
  email: string;
}

/**
 * 세션 Response (nullable)
 *
 * 보안: getUser()를 통해 user 정보만 반환
 * session 정보는 보안상 이유로 제공하지 않음
 */
export type SessionResponse = { user: AuthUser; isAdmin: boolean } | null;

/**
 * OAuth 제공자
 */
export type OAuthProvider = 'google' | 'kakao' | 'naver' | 'apple';

/**
 * OAuth 콜백 처리 결과
 */
export interface OAuthCallbackResult {
  user: AuthUser;
  profile: {
    id: string;
    email: string;
    name: string | null;
    phone: string | null;
    main_address: string | null;
    detail_address: string | null;
    created_at: string;
    updated_at: string;
  };
  isNewUser: boolean;
}
