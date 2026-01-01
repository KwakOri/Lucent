'use client';

import { useState, FormEvent, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/ui/form-field';
import { Checkbox } from '@/components/ui/checkbox';
import { GoogleLoginButton } from '@/components/auth/GoogleLoginButton';

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    passwordConfirm?: string;
    agreedToTerms?: string;
    general?: string;
  }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // URL 파라미터에서 에러 메시지 처리
  useEffect(() => {
    const error = searchParams.get('error');
    const message = searchParams.get('message');

    if (error && message) {
      setErrors({ general: message });
    }
  }, [searchParams]);

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};

    // Email validation
    if (!email) {
      newErrors.email = '이메일을 입력해주세요';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = '올바른 이메일 형식을 입력해주세요';
    }

    // Password validation
    if (!password) {
      newErrors.password = '비밀번호를 입력해주세요';
    } else if (password.length < 6) {
      newErrors.password = '비밀번호는 최소 6자 이상이어야 합니다';
    }

    // Password confirm validation
    if (!passwordConfirm) {
      newErrors.passwordConfirm = '비밀번호 확인을 입력해주세요';
    } else if (password !== passwordConfirm) {
      newErrors.passwordConfirm = '비밀번호가 일치하지 않습니다';
    }

    // Terms agreement validation
    if (!agreedToTerms) {
      newErrors.agreedToTerms = '약관에 동의해주세요';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      // 인증 코드 발송 API 호출
      const response = await fetch('/api/auth/send-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrors({
          general: data.error || '인증 코드 발송에 실패했습니다',
        });
        return;
      }

      // 성공 시 이메일 인증 페이지로 이동
      router.push(`/signup/verify-email?email=${encodeURIComponent(email)}`);
    } catch (error) {
      setErrors({ general: '네트워크 오류가 발생했습니다. 다시 시도해주세요.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4 py-12">
      <div className="w-full max-w-[400px]">
        <div className="bg-white rounded-lg border border-neutral-200 p-8">
          {/* Logo / Service Name */}
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold text-text-primary">
              Lucent Management
            </h1>
            <p className="mt-2 text-sm text-text-secondary">
              새 계정을 만들어보세요
            </p>
          </div>

          {/* Signup Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* General Error */}
            {errors.general && (
              <div
                className="p-4 rounded-lg bg-error-100 text-error-600 text-sm"
                role="alert"
              >
                {errors.general}
              </div>
            )}

            {/* Email Field */}
            <FormField
              label="이메일"
              htmlFor="email"
              required
              error={errors.email}
            >
              <Input
                id="email"
                type="email"
                placeholder="이메일을 입력하세요"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={!!errors.email}
                autoComplete="email"
                disabled={isSubmitting}
              />
            </FormField>

            {/* Password Field */}
            <FormField
              label="비밀번호"
              htmlFor="password"
              required
              error={errors.password}
              help={!errors.password ? '최소 6자 이상 입력하세요' : undefined}
            >
              <Input
                id="password"
                type="password"
                placeholder="비밀번호를 입력하세요 (최소 6자)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={!!errors.password}
                autoComplete="new-password"
                disabled={isSubmitting}
              />
            </FormField>

            {/* Password Confirm Field */}
            <FormField
              label="비밀번호 확인"
              htmlFor="passwordConfirm"
              required
              error={errors.passwordConfirm}
            >
              <Input
                id="passwordConfirm"
                type="password"
                placeholder="비밀번호를 다시 입력하세요"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                error={!!errors.passwordConfirm}
                autoComplete="new-password"
                disabled={isSubmitting}
              />
            </FormField>

            {/* Terms Agreement */}
            <div className="space-y-2">
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  disabled={isSubmitting}
                  error={!!errors.agreedToTerms}
                />
                <span className="text-sm text-text-primary leading-5">
                  <Link
                    href="/terms"
                    target="_blank"
                    className="text-primary-500 hover:text-primary-600 underline"
                  >
                    이용약관
                  </Link>{' '}
                  및{' '}
                  <Link
                    href="/privacy"
                    target="_blank"
                    className="text-primary-500 hover:text-primary-600 underline"
                  >
                    개인정보처리방침
                  </Link>
                  에 동의합니다
                </span>
              </div>
              {errors.agreedToTerms && (
                <p className="text-sm text-error-600" role="alert">
                  {errors.agreedToTerms}
                </p>
              )}
            </div>

            {/* Send Verification Button */}
            <Button
              type="submit"
              intent="primary"
              fullWidth
              loading={isSubmitting}
            >
              {isSubmitting ? '발송 중...' : '인증 코드 발송'}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-neutral-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-text-secondary">또는</span>
            </div>
          </div>

          {/* Google Login */}
          <GoogleLoginButton />

          {/* Login Link */}
          <div className="mt-6 text-center text-sm">
            <span className="text-text-secondary">
              이미 계정이 있으신가요?{' '}
            </span>
            <Link
              href="/login"
              className="text-primary-500 hover:text-primary-600 font-medium underline"
            >
              로그인
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="text-text-secondary">로딩 중...</div>
      </div>
    }>
      <SignupForm />
    </Suspense>
  );
}
