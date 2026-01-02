/**
 * Auth API Hooks
 *
 * 인증 관련 React Query hooks
 */

'use client';

import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  AuthSession,
  SessionResponse,
  LoginRequest,
  SignUpRequest,
  ApiResponse,
} from '@/types';
import { useRouter } from 'next/navigation';

/**
 * 현재 세션 조회 Hook
 *
 * @example
 * const { session, user, isLoading, isAuthenticated } = useSession();
 */
export function useSession() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['auth', 'session'],
    queryFn: async () => {
      const response = await fetch('/api/auth/session');
      if (!response.ok) {
        return null;
      }
      const result: ApiResponse<SessionResponse> = await response.json();

      // API 응답 구조: { status: 'success', data: { user, session } }
      if (!result.data || !result.data.session) {
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

  // 실시간 세션 변경 감지 (다른 탭에서의 로그인/로그아웃, 세션 만료 등)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let unsubscribe: (() => void) | undefined;

    // Supabase 클라이언트 동적 import (client 컴포넌트에서만)
    import('@/utils/supabase/client').then(({ createClient }) => {
      const supabase = createClient();

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, _session) => {
        // 세션 변경 감지 시 React Query 캐시 무효화
        queryClient.invalidateQueries({ queryKey: ['auth', 'session'] });
      });

      unsubscribe = () => subscription.unsubscribe();
    });

    return () => {
      unsubscribe?.();
    };
  }, [queryClient]);

  return {
    session: query.data?.session ?? null,
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
 * 이메일 인증 발송 Hook
 *
 * @example
 * const { mutate: sendVerification } = useSendVerification();
 * sendVerification({ email: 'user@example.com' });
 */
export function useSendVerification() {
  return useMutation({
    mutationFn: async ({ email }: { email: string }) => {
      const response = await fetch('/api/auth/send-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '인증 이메일 발송 실패');
      }
      return response.json();
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
