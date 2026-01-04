/**
 * Auth API Hooks
 *
 * 인증 관련 React Query hooks
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  AuthSession,
  SessionResponse,
  LoginRequest,
  SignUpRequest,
  ApiResponse,
} from '@/types';
import { useRouter } from 'next/navigation';
import { AuthAPI } from '@/lib/client/api/auth.api';

/**
 * 현재 세션 조회 Hook
 *
 * 실시간 세션 변경 감지는 app/providers.tsx에서 전역적으로 처리됨
 * 보안: getUser()를 통해 인증된 user 정보만 반환
 *
 * @example
 * const { user, isLoading, isAuthenticated } = useSession();
 */
export function useSession() {
  const query = useQuery({
    queryKey: ['auth', 'session'],
    queryFn: async () => {
      const response = await fetch('/api/auth/session');
      if (!response.ok) {
        return null;
      }
      const result: ApiResponse<SessionResponse> = await response.json();

      // API 응답 구조: { status: 'success', data: { user } | null }
      if (!result.data || !result.data.user) {
        return null;
      }

      return result.data;
    },
    retry: false,
    staleTime: 1000 * 60 * 5, // 5분 (세션 데이터는 자주 변경되지 않음)
    gcTime: 1000 * 60 * 10, // 10분 (캐시 유지)
    refetchOnMount: false, // 마운트 시 refetch 방지
    refetchOnWindowFocus: false, // 윈도우 포커스 시 refetch 방지
    refetchOnReconnect: false, // 재연결 시 refetch 방지
  });

  return {
    user: query.data?.user ?? null,
    isLoading: query.isLoading,
    isAuthenticated: !!query.data?.user,
    refetch: query.refetch,
  };
}

/**
 * 로그인 Hook
 *
 * @example
 * const { mutate: login, isPending } = useLogin();
 * login({ email: 'user@example.com', password: 'password' });
 */
export function useLogin() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async (credentials: LoginRequest) => {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '로그인 실패');
      }
      const data: ApiResponse<AuthSession> = await response.json();
      return data.data;
    },
    onSuccess: () => {
      // 세션 캐시 무효화
      queryClient.invalidateQueries({ queryKey: ['auth', 'session'] });
      // 메인 페이지로 리다이렉트
      router.push('/');
      router.refresh();
    },
  });
}

/**
 * 회원가입 Hook
 *
 * @example
 * const { mutate: signup, isPending } = useSignup();
 * signup({ email: 'user@example.com', password: 'password', name: '홍길동' });
 */
export function useSignup() {
  const router = useRouter();

  return useMutation({
    mutationFn: async (userData: SignUpRequest) => {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '회원가입 실패');
      }
      const data: ApiResponse<{ userId: string }> = await response.json();
      return data.data;
    },
    onSuccess: () => {
      // 로그인 페이지로 리다이렉트
      router.push('/login?signup=success');
    },
  });
}

/**
 * 로그아웃 Hook
 *
 * @example
 * const { mutate: logout } = useLogout();
 * logout();
 */
export function useLogout() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error('로그아웃 실패');
      }
      return response.json();
    },
    onSuccess: () => {
      // 세션 캐시 무효화
      queryClient.invalidateQueries({ queryKey: ['auth', 'session'] });
      // 로그인 페이지로 리다이렉트
      router.push('/login');
      router.refresh();
    },
  });
}

/**
 * 이메일 인증 코드 발송 Hook (회원가입용)
 *
 * @example
 * const { mutate: sendVerification } = useSendVerification();
 * sendVerification({ email: 'user@example.com', password: 'password123' });
 */
export function useSendVerification() {
  return useMutation({
    mutationFn: async (data: { email: string; password: string }) => {
      const result = await AuthAPI.sendVerification(data);
      return result.data;
    },
  });
}

/**
 * 6자리 코드 검증 Hook
 *
 * @example
 * const { mutate: verifyCode } = useVerifyCode();
 * verifyCode({ email: 'user@example.com', code: '123456' });
 */
export function useVerifyCode() {
  return useMutation({
    mutationFn: async (data: { email: string; code: string }) => {
      const result = await AuthAPI.verifyCode(data);
      return result.data;
    },
  });
}

/**
 * 검증 토큰으로 회원가입 Hook (자동 로그인)
 *
 * @example
 * const { mutate: signupWithToken } = useSignupWithToken();
 * signupWithToken({ email: 'user@example.com', verificationToken: 'token-xxx' });
 */
export function useSignupWithToken() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async (data: { email: string; verificationToken: string }) => {
      const result = await AuthAPI.signUpWithToken(data);
      return result.data;
    },
    onSuccess: () => {
      // 세션 캐시 무효화 (자동 로그인되었으므로)
      queryClient.invalidateQueries({ queryKey: ['auth', 'session'] });
      // Welcome 페이지로 리다이렉트
      router.push('/welcome');
      router.refresh();
    },
  });
}

/**
 * 비밀번호 재설정 요청 Hook
 *
 * @example
 * const { mutate: resetPassword } = useResetPassword();
 * resetPassword({ email: 'user@example.com' });
 */
export function useResetPassword() {
  return useMutation({
    mutationFn: async ({ email }: { email: string }) => {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '비밀번호 재설정 요청 실패');
      }
      return response.json();
    },
  });
}
