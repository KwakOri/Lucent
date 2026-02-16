/**
 * OAuth Callback Route Handler
 *
 * Google OAuth 인증 완료 후 Supabase가 리디렉션하는 엔드포인트
 * - URL에서 인증 코드 추출
 * - 코드를 세션으로 교환 (PKCE 플로우)
 * - backend OAuth profile sync API 호출
 * - 신규/기존 사용자 분기 리디렉션
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/server/utils/supabase';

interface OAuthSyncResponse {
  status?: 'success' | 'error';
  data?: {
    isNewUser?: boolean;
  };
  message?: string;
  errorCode?: string;
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const origin = requestUrl.origin;

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=no_code`);
  }

  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error || !data.session) {
      return NextResponse.redirect(`${origin}/login?error=auth_failed`);
    }

    const syncResponse = await fetch(`${origin}/api/auth/oauth/profile-sync`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${data.session.access_token}`,
      },
      cache: 'no-store',
    });

    const syncPayload = (await syncResponse
      .json()
      .catch(() => null)) as OAuthSyncResponse | null;

    if (!syncResponse.ok) {
      if (
        syncResponse.status === 409 ||
        syncPayload?.errorCode === 'EMAIL_ALREADY_EXISTS'
      ) {
        const message = encodeURIComponent(
          syncPayload?.message ||
            '이미 가입된 이메일입니다. 기존 계정으로 로그인하세요.',
        );
        return NextResponse.redirect(
          `${origin}/login?error=email_exists&message=${message}`,
        );
      }

      return NextResponse.redirect(`${origin}/login?error=profile_failed`);
    }

    const isNewUser = syncPayload?.data?.isNewUser === true;
    return NextResponse.redirect(isNewUser ? `${origin}/welcome` : `${origin}/`);
  } catch {
    return NextResponse.redirect(`${origin}/login?error=unexpected`);
  }
}
