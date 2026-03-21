/**
 * React Query Provider, Modal Provider & Toast Provider
 *
 * Next.js 15 App Router용 QueryClient Provider, ModalProvider 및 ToastProvider
 */

'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ModalProvider } from '@/components/modal';
import { ToastProvider } from '@/src/components/toast';
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // 기본 staleTime: 1분
            staleTime: 1000 * 60,
            // 재시도 1번만
            retry: 1,
            // 윈도우 포커스 시 refetch 비활성화
            refetchOnWindowFocus: false,
            // 마운트 시 refetch 비활성화
            refetchOnMount: false,
          },
          mutations: {
            // Mutation은 재시도 안함
            retry: 0,
          },
        },
      })
  );

  // 전역 Supabase Auth 리스너 (앱 전체에서 한 번만 등록)
  useEffect(() => {
    const supabase = createClient();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      // 세션 변경 감지 시 React Query 캐시 무효화
      // 모든 useSession 호출이 자동으로 업데이트됨
      queryClient.invalidateQueries({ queryKey: ['auth', 'session'] });
      queryClient.invalidateQueries({ queryKey: ['v2-checkout', 'cart'] });
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <ModalProvider>
        <ToastProvider>
          {children}
          {/* 개발 환경에서만 DevTools 표시 */}
          {process.env.NODE_ENV === 'development' && (
            <ReactQueryDevtools initialIsOpen={false} />
          )}
        </ToastProvider>
      </ModalProvider>
    </QueryClientProvider>
  );
}
