/**
 * Supabase Server-Side Client (for App Router Server Components)
 *
 * Next.js App Router의 서버 컴포넌트에서 사용하는 Supabase 클라이언트
 * 쿠키 기반 세션 관리를 통해 사용자 인증 상태를 확인합니다.
 *
 * Note: API Routes에서는 lib/server/utils/supabase.ts를 사용하세요.
 */

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/types/database';

/**
 * Server Component용 Supabase 클라이언트 생성
 *
 * Next.js 서버 컴포넌트, Server Actions에서 사용
 *
 * @example
 * ```tsx
 * import { createClient } from '@/utils/supabase/server';
 *
 * export default async function ProtectedPage() {
 *   const supabase = await createClient();
 *   const { data: { user } } = await supabase.auth.getUser();
 *
 *   if (!user) {
 *     redirect('/login');
 *   }
 *
 *   return <div>Welcome, {user.email}</div>;
 * }
 * ```
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
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
