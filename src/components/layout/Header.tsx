'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useSession, useLogout } from '@/hooks';

export function Header() {
  const { user, isLoading } = useSession();
  const { mutate: logout, isPending: isLoggingOut } = useLogout();

  const handleLogout = () => {
    logout();
  };

  return (
    <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-neutral-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="text-xl font-bold text-text-primary hover:text-primary-700 transition-colors">
            Lucent
          </Link>

          {/* Main Navigation Links */}
          <div className="hidden md:flex items-center gap-6">
            <Link href="/projects" className="text-text-secondary hover:text-text-primary transition-colors">
              Projects
            </Link>
            <Link href="/shop" className="text-text-secondary hover:text-text-primary transition-colors">
              Shop
            </Link>
            {user && (
              <Link href="/mypage" className="text-text-secondary hover:text-text-primary transition-colors">
                MyPage
              </Link>
            )}
          </div>

          {/* Auth Buttons */}
          <div className="flex items-center gap-3">
            {isLoading ? (
              // 로딩 중
              <div className="w-20 h-8 bg-neutral-100 rounded animate-pulse" />
            ) : user ? (
              // 로그인 상태
              <>
                <Link href="/mypage">
                  <Button intent="neutral" size="sm">
                    마이페이지
                  </Button>
                </Link>
                <Button
                  intent="neutral"
                  size="sm"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                >
                  로그아웃
                </Button>
              </>
            ) : (
              // 비로그인 상태
              <>
                <Link href="/login">
                  <Button intent="neutral" size="sm">
                    로그인
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button intent="primary" size="sm">
                    회원가입
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
