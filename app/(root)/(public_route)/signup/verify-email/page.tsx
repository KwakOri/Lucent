'use client';

import { useState, useEffect, FormEvent, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/ui/form-field';

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';

  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  // 만료 타이머 (10분 = 600초)
  const [expiresIn, setExpiresIn] = useState(600);

  // 만료 타이머 카운트다운
  useEffect(() => {
    if (expiresIn <= 0) return;

    const timer = setInterval(() => {
      setExpiresIn((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setError('인증 코드가 만료되었습니다. 회원가입 페이지로 돌아가서 다시 시도해주세요.');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [expiresIn]);

  // 시간 포맷팅 (600 -> "10:00")
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // 코드 입력 핸들러 (숫자만 허용)
  const handleCodeChange = (value: string) => {
    const numericValue = value.replace(/\D/g, '').slice(0, 6);
    setCode(numericValue);
    setError(null);
  };

  // 코드 검증 및 회원가입
  const handleVerifyCode = async (e?: FormEvent<HTMLFormElement>) => {
    if (e) e.preventDefault();

    if (!code || code.length !== 6) {
      setError('6자리 인증 코드를 입력해주세요');
      return;
    }

    if (expiresIn <= 0) {
      setError('인증 코드가 만료되었습니다. 회원가입 페이지로 돌아가서 다시 시도해주세요.');
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      // 1. 코드 검증 API 호출
      const verifyResponse = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });

      const verifyData = await verifyResponse.json();

      if (!verifyResponse.ok) {
        setError(verifyData.error || '잘못된 인증 코드입니다');
        return;
      }

      const verificationToken = verifyData.data.token;

      // 2. 회원가입 API 호출 (자동 로그인)
      const signupResponse = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, verificationToken }),
      });

      const signupData = await signupResponse.json();

      if (!signupResponse.ok) {
        setError(signupData.error || '회원가입에 실패했습니다');
        return;
      }

      // 3. 성공 시 welcome 페이지로 이동
      router.push('/welcome');
    } catch (error) {
      setError('네트워크 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4 py-12">
      <div className="w-full max-w-[400px]">
        <div className="bg-white rounded-lg border border-neutral-200 p-8">
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold text-text-primary">
              이메일을 확인해주세요
            </h1>
            <p className="mt-2 text-sm text-text-secondary">
              <span className="font-medium text-text-primary">{email}</span>
              <br />
              으로 인증 코드를 발송했습니다
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleVerifyCode} className="space-y-5">
            {/* Error Message */}
            {error && (
              <div
                className="p-4 rounded-lg bg-error-100 text-error-600 text-sm"
                role="alert"
              >
                {error}
              </div>
            )}

            {/* Code Input */}
            <FormField
              label="인증 코드 (6자리)"
              htmlFor="code"
              required
            >
              <Input
                id="code"
                type="text"
                inputMode="numeric"
                placeholder="000000"
                value={code}
                onChange={(e) => handleCodeChange(e.target.value)}
                maxLength={6}
                className="text-center text-2xl tracking-widest font-mono"
                disabled={isVerifying || expiresIn <= 0}
                autoFocus
              />
            </FormField>

            {/* Timer */}
            <div className="text-center">
              <p
                className={`text-sm font-medium ${
                  expiresIn <= 60 ? 'text-error-600' : 'text-text-secondary'
                }`}
              >
                {expiresIn > 0 ? (
                  <>
                    남은 시간: <span className="font-mono">{formatTime(expiresIn)}</span>
                  </>
                ) : (
                  '코드가 만료되었습니다'
                )}
              </p>
            </div>

            {/* Verify Button */}
            <Button
              type="submit"
              intent="primary"
              fullWidth
              loading={isVerifying}
              disabled={code.length !== 6 || expiresIn <= 0}
            >
              {isVerifying ? '인증 중...' : '인증하기'}
            </Button>
          </form>

          {/* Info */}
          <div className="mt-6 space-y-2 text-center">
            <p className="text-xs text-text-secondary">
              이메일에서 링크를 클릭해도 인증됩니다
            </p>
            {expiresIn <= 0 && (
              <p className="text-xs text-error-600">
                코드가 만료되었습니다. 회원가입 페이지로 돌아가서 다시 시도해주세요.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="text-text-secondary">로딩 중...</div>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
