/**
 * Auth API Client
 *
 * 인증 관련 API 호출
 */

import { apiClient } from "@/lib/client/utils/api-client";
import type { ApiResponse } from "@/types";
import type { AuthUser } from "@/types/auth";

/**
 * 로그인 요청 데이터
 */
export interface LoginData {
  email: string;
  password: string;
}

/**
 * 회원가입 요청 데이터
 */
export interface SignUpData {
  email: string;
  password: string;
  name?: string;
}

/**
 * 이메일 인증 코드 발송 요청 데이터
 */
export interface SendVerificationData {
  email: string;
  password: string;
}

/**
 * Auth API
 */
export const AuthAPI = {
  /**
   * 로그인
   */
  async login(data: LoginData): Promise<ApiResponse<{ user: AuthUser }>> {
    return apiClient.post("/api/auth/login", data);
  },

  /**
   * 로그아웃
   */
  async logout(): Promise<ApiResponse<void>> {
    return apiClient.post("/api/auth/logout", {});
  },

  /**
   * 회원가입
   */
  async signUp(data: SignUpData): Promise<ApiResponse<{ message: string }>> {
    return apiClient.post("/api/auth/signup", data);
  },

  /**
   * 이메일 인증 코드 발송 (회원가입용)
   */
  async sendVerification(
    data: SendVerificationData
  ): Promise<ApiResponse<{ email: string; expiresIn: number }>> {
    return apiClient.post("/api/auth/send-verification", data);
  },

  /**
   * 6자리 코드 검증
   */
  async verifyCode(data: {
    email: string;
    code: string;
  }): Promise<ApiResponse<{ token: string }>> {
    return apiClient.post("/api/auth/verify-code", data);
  },

  /**
   * 이메일 인증 (링크 클릭)
   */
  async verifyEmail(token: string): Promise<ApiResponse<{ message: string }>> {
    return apiClient.post("/api/auth/verify-email", { token });
  },

  /**
   * 검증 토큰으로 회원가입 (자동 로그인)
   */
  async signUpWithToken(data: {
    email: string;
    verificationToken: string;
  }): Promise<ApiResponse<{ user: AuthUser; session: any }>> {
    return apiClient.post("/api/auth/signup", data);
  },

  /**
   * 세션 조회
   */
  async getSession(): Promise<ApiResponse<{ user: AuthUser } | null>> {
    return apiClient.get("/api/auth/session");
  },

  /**
   * 비밀번호 재설정 요청
   */
  async resetPassword(
    email: string
  ): Promise<ApiResponse<{ message: string }>> {
    return apiClient.post("/api/auth/reset-password", { email });
  },

  /**
   * 비밀번호 업데이트
   */
  async updatePassword(
    token: string,
    newPassword: string
  ): Promise<ApiResponse<{ message: string }>> {
    return apiClient.post("/api/auth/update-password", { token, newPassword });
  },
};
