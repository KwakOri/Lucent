/**
 * Profile Hooks
 *
 * 프로필 관련 React Query Hooks
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ProfilesAPI,
  type RequestPhoneVerificationData,
  type UpdateProfileData,
  type VerifyPhoneVerificationData,
} from "@/lib/client/api/profiles.api";
import { queryKeys } from "./query-keys";

/**
 * 내 프로필 조회 Hook
 */
export function useProfile() {
  return useQuery({
    queryKey: queryKeys.profile.my(),
    queryFn: async () => {
      const response = await ProfilesAPI.getMyProfile();
      return response.data;
    },
    staleTime: 1000 * 60 * 5, // 5분
  });
}

/**
 * 프로필 업데이트 Hook
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateProfileData) => {
      const response = await ProfilesAPI.updateProfile(data);
      return response.data;
    },
    onSuccess: () => {
      // 프로필 캐시 무효화
      queryClient.invalidateQueries({
        queryKey: queryKeys.profile.my(),
      });
    },
  });
}

/**
 * 휴대폰 인증 코드 요청 Hook
 */
export function useRequestPhoneVerification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: RequestPhoneVerificationData) => {
      const response = await ProfilesAPI.requestPhoneVerification(data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.profile.my(),
      });
    },
  });
}

/**
 * 휴대폰 인증 코드 검증 Hook
 */
export function useVerifyPhoneVerification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: VerifyPhoneVerificationData) => {
      const response = await ProfilesAPI.verifyPhoneVerification(data);
      return response.data;
    },
    onSuccess: (updatedProfile) => {
      queryClient.setQueryData(queryKeys.profile.my(), updatedProfile);
      queryClient.invalidateQueries({
        queryKey: queryKeys.profile.my(),
      });
    },
  });
}
