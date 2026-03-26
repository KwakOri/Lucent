/**
 * Profiles API Client
 *
 * 프로필 관련 API 호출
 */

import { apiClient } from "@/lib/client/utils/api-client";
import type { ApiResponse } from "@/types";
import type { Tables } from "@/types/database";

type Profile = Tables<"profiles">;

/**
 * 프로필 업데이트 데이터
 */
export interface UpdateProfileData {
  name?: string | null;
  phone?: string | null;
  main_address?: string | null;
  detail_address?: string | null;
}

export interface RequestPhoneVerificationData {
  phone?: string | null;
}

export interface RequestPhoneVerificationResult {
  expiresIn: number;
  dailyLimit: number;
  remainingRequests: number;
  phone: string;
}

export interface VerifyPhoneVerificationData {
  code: string;
  phone?: string | null;
}

/**
 * Profiles API
 */
export const ProfilesAPI = {
  /**
   * 내 프로필 조회
   */
  async getMyProfile(): Promise<ApiResponse<Profile>> {
    return apiClient.get("/api/profiles/me");
  },

  /**
   * 프로필 업데이트
   */
  async updateProfile(data: UpdateProfileData): Promise<ApiResponse<Profile>> {
    return apiClient.patch("/api/profiles/me", data);
  },

  /**
   * 휴대폰 인증 코드 발송
   */
  async requestPhoneVerification(
    data: RequestPhoneVerificationData,
  ): Promise<ApiResponse<RequestPhoneVerificationResult>> {
    return apiClient.post("/api/profiles/me/phone-verification/request", data);
  },

  /**
   * 휴대폰 인증 코드 확인
   */
  async verifyPhoneVerification(
    data: VerifyPhoneVerificationData,
  ): Promise<ApiResponse<Profile>> {
    return apiClient.post("/api/profiles/me/phone-verification/verify", data);
  },
};
