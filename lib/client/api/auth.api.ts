/**
 * Auth API Client
 *
 * 인증 관련 API 호출
 */

import { apiClient } from "@/lib/client/utils/api-client";
import type { ApiResponse } from "@/types";
import type { AuthUser } from "@/types/auth";
import type { SessionResponse } from "@/types";
import type { LoginRequest } from "@/types/api";

/**
 * 이메일 인증 코드 발송 요청 데이터
 */
export interface SendVerificationData {
  email: string;
  password: string;
}

export interface LoginResponseData {
  user: {
    id: string;
    email?: string;
    name?: string;
  };
  session: {
    accessToken: string;
    refreshToken: string;
    expiresAt: number | null;
  };
}

export interface SignupWithTokenResponseData {
  user: AuthUser;
  session: {
    access_token: string;
    refresh_token: string;
  };
}

/**
 * Auth API
 */
export const AuthAPI = {
  /**
   * 현재 세션 조회
   */
  async getSession(): Promise<ApiResponse<SessionResponse>> {
    return apiClient.get("/api/auth/session");
  },

  /**
   * 로그인
   */
  async login(data: LoginRequest): Promise<ApiResponse<LoginResponseData>> {
    return apiClient.post("/api/auth/login", data, { requiresAuth: false });
  },

  /**
   * 로그아웃
   */
  async logout(): Promise<ApiResponse<{ message: string }>> {
    return apiClient.post("/api/auth/logout", {});
  },

  /**
   * 이메일 인증 코드 발송 (회원가입용)
   */
  async sendVerification(
    data: SendVerificationData
  ): Promise<ApiResponse<{ email: string; expiresIn: number }>> {
    return apiClient.post("/api/auth/send-verification", data, { requiresAuth: false });
  },

  /**
   * 6자리 코드 검증
   */
  async verifyCode(data: {
    email: string;
    code: string;
  }): Promise<ApiResponse<{ token: string }>> {
    return apiClient.post("/api/auth/verify-code", data, { requiresAuth: false });
  },

  /**
   * 검증 토큰으로 회원가입 (자동 로그인)
   */
  async signUpWithToken(data: {
    email: string;
    verificationToken: string;
  }): Promise<ApiResponse<SignupWithTokenResponseData>> {
    return apiClient.post("/api/auth/signup", data, { requiresAuth: false });
  },

  /**
   * 비밀번호 재설정 요청
   */
  async requestPasswordReset(data: {
    email: string;
  }): Promise<ApiResponse<{ message: string }>> {
    return apiClient.post("/api/auth/reset-password", data, { requiresAuth: false });
  },
};
