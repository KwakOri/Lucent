'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Archive,
  ArrowLeftRight,
  BarChart3,
  FileText,
  FolderOpen,
  House,
  ImageIcon,
  LogOut,
  Menu,
  Megaphone,
  Newspaper,
  Package,
  RotateCcw,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';

type NavigationItem = {
  name: string;
  href: string;
  icon: LucideIcon;
};

type NavigationSection = {
  title: string;
  items: NavigationItem[];
};

const primaryNavigationItems: NavigationItem[] = [
  { name: '대시보드', href: '/admin', icon: House },
  { name: '주문 조회', href: '/admin/orders', icon: ShoppingCart },
  {
    name: '주문 이행 관리',
    href: '/admin/production-shipping',
    icon: ArrowLeftRight,
  },
  { name: '프로젝트 관리', href: '/admin/v2-catalog/projects', icon: FolderOpen },
  { name: '캠페인 관리', href: '/admin/v2-catalog/campaigns', icon: Megaphone },
  { name: '상품 관리', href: '/admin/v2-catalog/products', icon: ShoppingBag },
  { name: '게시글 관리', href: '/admin/content/posts', icon: Newspaper },
  { name: '통계', href: '/admin/v2-ops/stats', icon: BarChart3 },
];

const moreNavigationItems: NavigationItem[] = [
  { name: '아티스트 관리', href: '/admin/v2-catalog/artists', icon: Users },
  { name: '환불 관리', href: '/admin/refunds', icon: RotateCcw },
  { name: '로그 조회', href: '/admin/logs', icon: FileText },
  { name: '번들 관리', href: '/admin/v2-catalog/bundles', icon: Package },
  { name: '전환 준비', href: '/admin/v2-catalog/readiness', icon: ArrowLeftRight },
  { name: '미디어·에셋', href: '/admin/v2-catalog/assets', icon: ImageIcon },
  { name: 'Admin Ops', href: '/admin/v2-ops', icon: ShieldCheck },
  { name: '권한 관리', href: '/admin/v2-ops/rbac', icon: ShieldCheck },
  { name: '레거시', href: '/admin/legacy', icon: Archive },
];

const moreNavigationItem: NavigationItem = { name: '기타', href: '/admin/more', icon: Menu };

const navigationSections: NavigationSection[] = [
  {
    title: '주요 관리',
    items: primaryNavigationItems,
  },
  {
    title: '기타',
    items: [moreNavigationItem],
  },
];

const desktopNavigationItems = [...primaryNavigationItems, moreNavigationItem];
const legacyAdminPathPrefixes = ['/admin/artists', '/admin/projects', '/admin/products'];

function isLegacyAdminPath(pathname: string): boolean {
  return legacyAdminPathPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function isDirectNavItemActive(pathname: string, href: string): boolean {
  if (pathname === href) {
    return true;
  }

  // 대시보드는 해당 경로에서만 활성화합니다.
  if (href === '/admin') {
    return false;
  }
  if (href === '/admin/v2-ops' && pathname.startsWith('/admin/v2-ops/rbac')) {
    return false;
  }

  return pathname.startsWith(href);
}

function isMoreNavItemActive(pathname: string): boolean {
  if (pathname === moreNavigationItem.href || isLegacyAdminPath(pathname)) {
    return true;
  }
  if (primaryNavigationItems.some((item) => isDirectNavItemActive(pathname, item.href))) {
    return false;
  }
  return moreNavigationItems.some((item) => isDirectNavItemActive(pathname, item.href));
}

function isNavItemActive(pathname: string, href: string): boolean {
  if (href === moreNavigationItem.href) {
    return isMoreNavItemActive(pathname);
  }
  return isDirectNavItemActive(pathname, href);
}

export function AdminSidebar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <>
      {/* Mobile Menu Button */}
      <div className="sticky top-0 z-40 flex items-center gap-x-6 bg-white px-4 py-4 shadow-sm sm:px-6 lg:hidden">
        <button
          type="button"
          className="-m-2.5 p-2.5 text-gray-700 lg:hidden"
          onClick={() => setMobileMenuOpen(true)}
        >
          <span className="sr-only">메뉴 열기</span>
          <Menu className="h-6 w-6" aria-hidden />
        </button>
        <div className="flex-1 text-sm font-semibold leading-6 text-gray-900">
          Lucent Admin
        </div>
        <Link
          href="/"
          className="text-sm font-semibold leading-6 text-gray-900 hover:text-[#a35200]"
        >
          사이트로 돌아가기
        </Link>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="relative z-50 lg:hidden">
          {/* Background overlay */}
          <div
            className="fixed inset-0 bg-gray-900/80"
            onClick={closeMobileMenu}
          />

          {/* Sidebar panel */}
          <div className="fixed inset-y-0 left-0 z-50 w-full overflow-y-auto bg-white px-6 py-6 sm:max-w-sm sm:ring-1 sm:ring-gray-900/10">
            <div className="flex items-center justify-between">
              <Link href="/" className="text-xl font-bold text-gray-900" onClick={closeMobileMenu}>
                Lucent Admin
              </Link>
              <button
                type="button"
                className="-m-2.5 rounded-md p-2.5 text-gray-700"
                onClick={closeMobileMenu}
              >
                <span className="sr-only">메뉴 닫기</span>
                <X className="h-6 w-6" aria-hidden />
              </button>
            </div>
            <nav className="mt-6">
              <div className="space-y-6">
                {navigationSections.map((section) => (
                  <div key={section.title}>
                    <p className="px-2 text-xs font-bold uppercase tracking-wide text-gray-400">
                      {section.title}
                    </p>
                    <ul role="list" className="-mx-2 mt-2 space-y-1">
                      {section.items.map((item) => {
                        const isActive = isNavItemActive(pathname, item.href);

                        return (
                          <li key={item.name}>
                            <Link
                              href={item.href}
                              onClick={closeMobileMenu}
                              className={`
                                group flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6
                                ${isActive
                                  ? 'bg-[#fff4d5] text-[#a35200]'
                                  : 'text-gray-700 hover:bg-[#fff4d5] hover:text-[#a35200]'
                                }
                              `}
                            >
                              <item.icon
                                className={`h-6 w-6 shrink-0 ${
                                  isActive ? 'text-[#a35200]' : 'text-gray-400 group-hover:text-[#a35200]'
                                }`}
                                aria-hidden
                              />
                              {item.name}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
              <div className="mt-8 pt-8 border-t border-gray-200">
                <Link
                  href="/"
                  onClick={closeMobileMenu}
                  className="group flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 text-gray-700 hover:bg-[#fff4d5] hover:text-[#a35200]"
                >
                  사이트로 돌아가기
                </Link>
              </div>
            </nav>
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <div className="hidden lg:fixed lg:bottom-6 lg:left-5 lg:top-6 lg:z-50 lg:flex">
        <nav className="flex w-[72px] flex-col items-center rounded-[24px] bg-white px-3 py-3 shadow-[0_18px_40px_rgba(26,26,46,0.12)] ring-1 ring-[#e7e3d3]">
          <Link
            href="/admin"
            className="mb-5 flex h-10 w-10 items-center justify-center rounded-[13px] bg-[#1a1a2e] text-lg font-black text-[#ffcd27] shadow-[0_10px_22px_rgba(26,26,46,0.22)]"
            aria-label="관리자 대시보드"
            title="관리자 대시보드"
          >
            L
          </Link>
          <ul
            role="list"
            className="scrollbar-none flex min-h-0 flex-1 flex-col items-center gap-2 overflow-y-auto"
          >
            {desktopNavigationItems.map((item) => {
              const isActive = isNavItemActive(pathname, item.href);

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-label={item.name}
                    title={item.name}
                    className={`
                      group flex h-10 w-10 items-center justify-center rounded-[13px] transition-colors
                      ${isActive
                        ? 'bg-[#f59e0b] text-white shadow-[0_10px_22px_rgba(245,158,11,0.26)]'
                        : 'text-[#9b9788] hover:bg-[#fff4d5] hover:text-[#a35200]'
                      }
                    `}
                  >
                    <item.icon className="h-[18px] w-[18px]" aria-hidden />
                    <span className="sr-only">{item.name}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
          <div className="mt-3 w-full border-t border-[#eee7d6] pt-3">
            <Link
              href="/"
              aria-label="사이트로 나가기"
              title="사이트로 나가기"
              className="group flex h-10 w-10 items-center justify-center rounded-[13px] text-[#9b9788] transition-colors hover:bg-[#fff4d5] hover:text-[#a35200]"
            >
              <LogOut className="h-[18px] w-[18px]" aria-hidden />
              <span className="sr-only">나가기</span>
            </Link>
          </div>
        </nav>
      </div>
    </>
  );
}
