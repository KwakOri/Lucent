/**
 * Supabase Client-Side Client
 *
 * 브라우저에서 실행되는 클라이언트 컴포넌트에서 사용하는 Supabase 클라이언트
 * 쿠키 기반 세션 관리를 통해 서버와 클라이언트 간 세션을 공유합니다.
 */

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/database';

/**
 * Client-side Supabase 클라이언트 생성
 *
 * 브라우저 환경(Client Components, Event Handlers)에서 사용
 *
 * @example
 * ```tsx
 * 'use client';
 *
 * import { createClient } from '@/utils/supabase/client';
 * import { useEffect, useState } from 'react';
 *
 * export default function UserProfile() {
 *   const [user, setUser] = useState(null);
 *   const supabase = createClient();
 *
 *   useEffect(() => {
 *     const getUser = async () => {
 *       const { data: { user } } = await supabase.auth.getUser();
 *       setUser(user);
 *     };
 *
 *     getUser();
 *   }, []);
 *
 *   return <div>{user?.email}</div>;
 * }
 * ```
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
