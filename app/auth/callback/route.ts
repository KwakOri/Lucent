/**
 * OAuth Callback Route Handler
 *
 * Google OAuth 인증 완료 후 Supabase가 리디렉션하는 엔드포인트
 * - URL에서 인증 코드 추출
 * - 코드를 세션으로 교환 (PKCE 플로우)
 * - 세션을 쿠키에 저장
 * - 프로필 자동 생성/확인
 * - 메인 페이지로 리디렉션
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/server/utils/supabase';
import { OAuthService } from '@/lib/server/services/oauth.service';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const origin = requestUrl.origin;

  console.log('[OAuth Callback] Starting...');
  console.log('[OAuth Callback] Code present:', !!code);

  if (code) {
    try {
      // Supabase 클라이언트 생성
      const supabase = await createServerClient();

      console.log('[OAuth Callback] Exchanging code for session...');

      // 코드를 세션으로 교환 (PKCE 플로우)
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        console.error('[OAuth Callback] Exchange failed:', error);
        return NextResponse.redirect(`${origin}/login?error=auth_failed`);
      }

      console.log('[OAuth Callback] Session established for user:', data.user.id);

      // 프로필 자동 생성/확인
      try {
        console.log('[OAuth Callback] Processing profile...');
        const result = await OAuthService.handleOAuthCallback(data.user);
        console.log('[OAuth Callback] Profile processed. New user:', result.isNewUser);
      } catch (profileError: any) {
        console.error('[OAuth Callback] Profile processing error:', profileError);

        // 이메일 중복 에러인 경우
        if (profileError.statusCode === 409) {
          return NextResponse.redirect(
            `${origin}/login?error=email_exists&message=${encodeURIComponent(
              profileError.message
            )}`
          );
        }

        // 기타 프로필 처리 에러
        return NextResponse.redirect(`${origin}/login?error=profile_failed`);
      }

      // 로그인 성공 - 메인 페이지로 리디렉션
      console.log('[OAuth Callback] Success! Redirecting to home...');
      return NextResponse.redirect(`${origin}/`);
    } catch (error) {
      console.error('[OAuth Callback] Unexpected error:', error);
      return NextResponse.redirect(`${origin}/login?error=unexpected`);
    }
  }

  // 코드가 없으면 에러
  console.error('[OAuth Callback] No code in URL');
  return NextResponse.redirect(`${origin}/login?error=no_code`);
}
