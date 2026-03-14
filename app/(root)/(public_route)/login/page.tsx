'use client';

import { useMemo, useState, FormEvent, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/ui/form-field';
import { EmailInput } from '@/components/form';
import { GoogleLoginButton } from '@/components/auth/GoogleLoginButton';
import { useLogin } from '@/lib/client/hooks';

function LoginForm() {
  const searchParams = useSearchParams();
  const { mutate: login, isPending: isSubmitting, error: loginError } = useLogin();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({});
  const oauthErrorMessage = useMemo(() => {
    const error = searchParams.get('error');
    const message = searchParams.get('message');
    if (!error) {
      return null;
    }

    const errorMessages: Record<string, string> = {
      auth_failed: 'Google 로그인에 실패했습니다. 다시 시도해주세요.',
      email_exists: message || '이미 가입된 이메일입니다. 기존 계정으로 로그인하세요.',
      profile_failed: '프로필 생성에 실패했습니다. 다시 시도해주세요.',
      no_code: '인증 코드가 없습니다. 다시 시도해주세요.',
      unexpected: '예상치 못한 오류가 발생했습니다.',
    };

    return errorMessages[error] || '로그인 중 오류가 발생했습니다.';
  }, [searchParams]);

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};

    // Email validation (EmailInput 컴포넌트에서 자동 검증)
    if (!email) {
      newErrors.email = '이메일을 입력해주세요';
    }

    // Password validation
    if (!password) {
      newErrors.password = '비밀번호를 입력해주세요';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const mutationErrorMessage =
    loginError?.message || '이메일 또는 비밀번호가 올바르지 않습니다';
  const generalErrorMessage =
    errors.general || (loginError ? mutationErrorMessage : oauthErrorMessage);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setErrors({});

    // 🐛 DEBUG: 클라이언트 로그인 시도
    console.log('[DEBUG] Client Login Attempt:', {
      email,
      passwordLength: password.length,
    });

    // useLogin 훅 사용 - 자동으로 세션 캐시 무효화 및 리다이렉트 처리
    login({ email, password });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-[400px]">
        <div className="bg-white rounded-lg border border-neutral-200 p-8">
          {/* Logo / Service Name */}
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold text-text-primary">
              Lucent Management
            </h1>
            <p className="mt-2 text-sm text-text-secondary">
              로그인하여 계속하세요
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* General Error */}
            {generalErrorMessage && (
              <div
                className="p-4 rounded-lg bg-error-100 text-error-600 text-sm"
                role="alert"
              >
                {generalErrorMessage}
              </div>
            )}

            {/* Email Field */}
            <EmailInput
              id="email"
              name="email"
              value={email}
              onChange={setEmail}
              required
              placeholder="이메일을 입력하세요"
              error={errors.email}
              disabled={isSubmitting}
              disableValidation
            />

            {/* Password Field */}
            <FormField
              label="비밀번호"
              htmlFor="password"
              required
              error={errors.password}
            >
              <Input
                id="password"
                type="password"
                placeholder="비밀번호를 입력하세요"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={!!errors.password}
                autoComplete="current-password"
                disabled={isSubmitting}
              />
            </FormField>

            {/* Login Button */}
            <Button
              type="submit"
              intent="primary"
              fullWidth
              loading={isSubmitting}
            >
              {isSubmitting ? '로그인 중...' : '로그인'}
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

          {/* Signup Link */}
          <div className="mt-6 text-center text-sm">
            <span className="text-text-secondary">
              아직 계정이 없으신가요?{' '}
            </span>
            <Link
              href="/signup"
              className="text-primary-500 hover:text-primary-600 font-medium underline"
            >
              회원가입
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="text-text-secondary">로딩 중...</div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
