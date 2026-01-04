/**
 * Auth Hooks
 *
 * 인증 관련 React Query Hooks
 */

import {
  AuthAPI,
  SendVerificationData,
  type LoginData,
  type SignUpData,
} from "@/lib/client/api/auth.api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "./query-keys";

/**
 * 세션 조회 Hook
 */
export function useSession() {
  return useQuery({
    queryKey: queryKeys.auth.session(),
    queryFn: () => AuthAPI.getSession(),
    staleTime: 1000 * 60 * 5, // 5분
    retry: false,
  });
}

/**
 * 로그인 Hook
 */
export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: LoginData) => AuthAPI.login(data),
    onSuccess: () => {
      // 세션 캐시 무효화
      queryClient.invalidateQueries({
        queryKey: queryKeys.auth.session(),
      });
    },
  });
}

/**
 * 로그아웃 Hook
 */
export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => AuthAPI.logout(),
    onSuccess: () => {
      // 모든 캐시 초기화
      queryClient.clear();
    },
  });
}

/**
 * 회원가입 Hook
 */
export function useSignUp() {
  return useMutation({
    mutationFn: (data: SignUpData) => AuthAPI.signUp(data),
  });
}

/**
 * 이메일 인증 코드 발송 Hook
 */
export function useSendVerification() {
  return useMutation({
    mutationFn: (data: SendVerificationData) => AuthAPI.sendVerification(data),
  });
}

/**
 * 이메일 인증 Hook
 */
export function useVerifyEmail() {
  return useMutation({
    mutationFn: (token: string) => AuthAPI.verifyEmail(token),
  });
}

/**
 * 비밀번호 재설정 요청 Hook
 */
export function useResetPassword() {
  return useMutation({
    mutationFn: (email: string) => AuthAPI.resetPassword(email),
  });
}

/**
 * 비밀번호 업데이트 Hook
 */
export function useUpdatePassword() {
  return useMutation({
    mutationFn: ({
      token,
      newPassword,
    }: {
      token: string;
      newPassword: string;
    }) => AuthAPI.updatePassword(token, newPassword),
  });
}
