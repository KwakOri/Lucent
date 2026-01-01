/**
 * React Query Provider & Modal Provider
 *
 * Next.js 15 App Router용 QueryClient Provider 및 ModalProvider
 */

'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ModalProvider } from '@/components/modal';
import { useState } from 'react';

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

  return (
    <QueryClientProvider client={queryClient}>
      <ModalProvider>
        {children}
        {/* 개발 환경에서만 DevTools 표시 */}
        {process.env.NODE_ENV === 'development' && (
          <ReactQueryDevtools initialIsOpen={false} />
        )}
      </ModalProvider>
    </QueryClientProvider>
  );
}
