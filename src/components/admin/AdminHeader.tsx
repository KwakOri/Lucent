'use client';

import { User } from '@supabase/supabase-js';
import { useLogout } from '@/lib/client/hooks';

interface AdminHeaderProps {
  user: User;
}

export function AdminHeader({ user }: AdminHeaderProps) {
  const { mutate: logout, isPending: isLoggingOut } = useLogout();

  return (
    <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
      <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
        {/* Search (Future) */}
        <div className="flex flex-1" />

        {/* User Menu */}
        <div className="flex items-center gap-x-4 lg:gap-x-6">
          {/* User Info */}
          <div className="hidden lg:block lg:h-6 lg:w-px lg:bg-gray-200" aria-hidden="true" />

          <div className="flex items-center gap-x-4">
            <span className="text-sm font-semibold text-gray-900">
              {user.email}
            </span>

            <button
              onClick={() => logout()}
              disabled={isLoggingOut}
              className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
            >
              {isLoggingOut ? '로그아웃 중...' : '로그아웃'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
