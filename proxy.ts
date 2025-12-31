/**
 * Next.js Proxy (formerly Middleware)
 *
 * 모든 요청에 대해 실행되며, Supabase 세션을 자동으로 갱신합니다.
 * 이를 통해 사용자가 로그인 상태를 유지할 수 있습니다.
 *
 * Note: Next.js 15+에서는 middleware.ts 대신 proxy.ts를 사용합니다.
 */

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: 세션을 가져와서 쿠키를 갱신합니다
  // getUser()를 호출하지 않으면 세션이 갱신되지 않습니다
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 보호된 라우트 처리 (선택사항)
  // 예시: 로그인하지 않은 사용자는 마이페이지 접근 불가
  if (!user && request.nextUrl.pathname.startsWith('/mypage')) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  // 이미 로그인한 사용자가 로그인/회원가입 페이지 접근 시 리다이렉트 (선택사항)
  if (
    user &&
    (request.nextUrl.pathname === '/login' ||
      request.nextUrl.pathname === '/signup')
  ) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * 다음을 제외한 모든 요청 경로에 대해 실행:
     * - _next/static (정적 파일)
     * - _next/image (이미지 최적화 파일)
     * - favicon.ico (파비콘 파일)
     * - public 폴더의 파일들
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
