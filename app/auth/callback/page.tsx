/**
 * OAuth Callback Page
 *
 * Google OAuth 인증 완료 후 리디렉션되는 페이지
 * - Supabase에서 세션 정보 추출
 * - 백엔드에 프로필 확인/생성 요청
 * - 로그인 완료 후 메인 페이지로 이동
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        // URL에서 session 정보 추출
        const { data, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !data.session) {
          console.error('OAuth callback error:', sessionError);
          setError('로그인에 실패했습니다. 다시 시도해주세요.');
          setTimeout(() => router.push('/login'), 2000);
          return;
        }

        // 백엔드에 프로필 확인/생성 요청 (세션 토큰 포함)
        const response = await fetch('/api/auth/oauth/callback', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${data.session.access_token}`,
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || '프로필 처리 실패');
        }

        const result = await response.json();
        console.log('OAuth login success:', result);

        // 로그인 완료 → 메인 페이지로 이동
        router.push('/');
      } catch (err: any) {
        console.error('프로필 처리 오류:', err);
        setError(err.message || '로그인 처리 중 오류가 발생했습니다.');
        setTimeout(() => router.push('/login'), 2000);
      }
    };

    handleCallback();
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        {error ? (
          <>
            <div className="mb-4">
              <svg
                className="mx-auto h-12 w-12 text-red-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <p className="text-red-600 font-medium mb-2">로그인 실패</p>
            <p className="text-gray-600 text-sm">{error}</p>
            <p className="text-gray-500 text-xs mt-2">잠시 후 로그인 페이지로 이동합니다...</p>
          </>
        ) : (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-700 font-medium">로그인 처리 중...</p>
            <p className="text-gray-500 text-sm mt-2">잠시만 기다려주세요</p>
          </>
        )}
      </div>
    </div>
  );
}
