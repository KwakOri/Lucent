/**
 * Supabase Server Client
 *
 * Next.js Server Components 및 API Routes에서 사용하는 Supabase 클라이언트
 */

import { createServerClient as createSupabaseServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Database } from '@/types/database';

/**
 * Server-side Supabase 클라이언트 생성
 *
 * Next.js API Routes, Server Components, Server Actions에서 사용
 */
export async function createServerClient() {
  const cookieStore = await cookies();

  return createSupabaseServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component에서 cookies().set()을 호출하면 에러가 발생할 수 있음
            // 이 경우 무시하고 계속 진행
          }
        },
      },
    }
  );
}

/**
 * 현재 사용자 정보 가져오기
 */
export async function getCurrentUser() {
  const supabase = await createServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
}

/**
 * 관리자 권한 확인
 *
 * TODO: 실제 프로덕션에서는 profiles 테이블에 role 컬럼을 추가하고,
 * 해당 컬럼을 확인하여 관리자 권한을 검증해야 합니다.
 *
 * 1차 MVP에서는 특정 이메일로 간단히 체크 (환경변수로 관리)
 */
export async function isAdmin(): Promise<boolean> {
  const user = await getCurrentUser();

  if (!user) {
    return false;
  }

  // 환경변수에 설정된 관리자 이메일 목록
  const adminEmails = process.env.ADMIN_EMAILS?.split(',') || [];

  return adminEmails.includes(user.email || '');
}
