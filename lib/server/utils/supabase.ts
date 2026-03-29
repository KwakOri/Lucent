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
 * Admin용 Supabase 클라이언트 생성
 *
 * Service Role Key를 사용하여 관리자 권한이 필요한 작업 수행
 * (예: auth.admin.createUser, auth.admin.deleteUser 등)
 *
 * ⚠️ 주의: 이 클라이언트는 모든 RLS를 우회하므로 신중하게 사용해야 합니다.
 */
export async function createAdminClient() {
  const cookieStore = await cookies();

  return createSupabaseServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // Service Role Key 사용
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
 * 관리자 권한 확인
 */
export async function isAdmin(): Promise<boolean> {
  const user = await getCurrentUser();

  if (!user) {
    return false;
  }

  const adminClient = await createAdminClient();
  const { data: userRoles, error: userRolesError } = await adminClient
    .from('v2_admin_user_roles')
    .select('role_id, expires_at, role:v2_admin_roles(is_active)')
    .eq('user_id', user.id)
    .eq('status', 'ACTIVE');

  if (!userRolesError && (userRoles || []).some((row) => isRoleAssignmentActive(row))) {
    return true;
  }

  const normalizedEmail = normalizeEmail(user.email);
  if (!normalizedEmail) {
    return false;
  }

  const adminEmails = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  if (!adminEmails.includes(normalizedEmail)) {
    return false;
  }

  const { data: activeRoles, error: activeRolesError } = await adminClient
    .from('v2_admin_user_roles')
    .select('role_id, expires_at, role:v2_admin_roles(is_active)')
    .eq('status', 'ACTIVE')
    .order('assigned_at', { ascending: false })
    .limit(500);

  if (activeRolesError) {
    return false;
  }

  const hasAnyActiveDbAdmin = (activeRoles || []).some((row) => isRoleAssignmentActive(row));
  return !hasAnyActiveDbAdmin;
}

function normalizeEmail(email?: string | null): string | null {
  if (!email || typeof email !== 'string') {
    return null;
  }
  const normalized = email.trim().toLowerCase();
  return normalized || null;
}

type AdminRoleAssignmentRow = {
  expires_at?: string | null;
  role?: {
    is_active?: boolean | null;
  } | null;
};

function isRoleAssignmentActive(row: AdminRoleAssignmentRow): boolean {
  if (!row?.role?.is_active) {
    return false;
  }
  if (!row.expires_at) {
    return true;
  }
  const expiresAt = Date.parse(String(row.expires_at));
  return Number.isNaN(expiresAt) || expiresAt > Date.now();
}
