'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loading } from '@/components/ui/loading';
import { useSignupWithToken } from '@/hooks';

function SignupCompleteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  const { mutate: signupWithToken } = useSignupWithToken();

  useEffect(() => {
    const completeSignup = () => {
      const token = searchParams.get('token');
      const verified = searchParams.get('verified');

      if (!token || verified !== 'true') {
        setStatus('error');
        setErrorMessage('유효하지 않은 인증 링크입니다');
        setTimeout(() => router.push('/signup'), 3000);
        return;
      }

      // 회원가입 (useSignupWithToken 훅 사용 - 자동 로그인 포함)
      // 이메일은 백엔드에서 토큰으로부터 가져옴
      signupWithToken(
        {
          email: '', // 백엔드에서 토큰으로 이메일 추출
          verificationToken: token,
        },
        {
          onSuccess: () => {
            setStatus('success');
            // useSignupWithToken이 자동으로 /welcome으로 리다이렉트
          },
          onError: (error: any) => {
            setStatus('error');
            setErrorMessage(error.message || '회원가입에 실패했습니다');
            setTimeout(() => router.push('/signup'), 3000);
          },
        }
      );
    };

    completeSignup();
  }, [searchParams, router, signupWithToken]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-[400px] text-center">
        <div className="bg-white rounded-lg border border-neutral-200 p-8">
          {status === 'loading' && (
            <>
              <Loading size="lg" />
              <h2 className="mt-4 text-lg font-semibold text-text-primary">
                회원가입 처리 중...
              </h2>
              <p className="mt-2 text-sm text-text-secondary">
                잠시만 기다려주세요
              </p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="text-6xl mb-4">✅</div>
              <h2 className="text-lg font-semibold text-text-primary">
                회원가입이 완료되었습니다!
              </h2>
              <p className="mt-2 text-sm text-text-secondary">
                프로필 입력 페이지로 이동합니다...
              </p>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="text-6xl mb-4">❌</div>
              <h2 className="text-lg font-semibold text-error-600">
                오류가 발생했습니다
              </h2>
              <p className="mt-2 text-sm text-text-secondary">
                {errorMessage}
              </p>
              <p className="mt-1 text-xs text-text-tertiary">
                회원가입 페이지로 이동합니다...
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SignupCompletePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <Loading size="lg" />
      </div>
    }>
      <SignupCompleteContent />
    </Suspense>
  );
}
