'use client';

import { useState, type FocusEvent } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Archive,
  ArrowLeft,
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
  { name: '아티스트 관리', href: '/admin/v2-catalog/artists', icon: Users },
  { name: '상품 관리', href: '/admin/v2-catalog/products', icon: ShoppingBag },
  { name: '캠페인 관리', href: '/admin/v2-catalog/campaigns', icon: Megaphone },
  { name: '게시글 관리', href: '/admin/content/posts', icon: Newspaper },
  { name: '통계', href: '/admin/v2-ops/stats', icon: BarChart3 },
];

const moreNavigationItems: NavigationItem[] = [
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
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [desktopExpanded, setDesktopExpanded] = useState(false);

  const closeMobileMenu = () => setMobileMenuOpen(false);
  const openDesktopMenu = () => setDesktopExpanded(true);
  const closeDesktopMenu = () => setDesktopExpanded(false);
  const handleGoBack = () => router.back();

  const handleDesktopBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      closeDesktopMenu();
    }
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <div className="sticky top-0 z-40 flex items-center gap-x-6 border-b border-[#e7e3d3] bg-[#f9f9ed]/95 px-4 py-4 shadow-sm backdrop-blur sm:px-6 lg:hidden">
        <button
          type="button"
          className="-m-2.5 p-2.5 text-[#1a1a2e] lg:hidden"
          onClick={() => setMobileMenuOpen(true)}
        >
          <span className="sr-only">메뉴 열기</span>
          <Menu className="h-6 w-6" aria-hidden />
        </button>
        <div className="flex-1 text-sm font-bold leading-6 text-[#1a1a2e]">
          Lucent Admin
        </div>
        <Link
          href="/"
          className="text-sm font-bold leading-6 text-[#1a1a2e] hover:text-[#4a88b9]"
        >
          사이트로 돌아가기
        </Link>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="relative z-50 lg:hidden">
          {/* Background overlay */}
          <div
            className="fixed inset-0 bg-[#1a1a2e]/75"
            onClick={closeMobileMenu}
          />

          {/* Sidebar panel */}
          <div className="fixed inset-y-0 left-0 z-50 w-full overflow-y-auto bg-[#f9f9ed] px-6 py-6 sm:max-w-sm sm:ring-1 sm:ring-[#1a1a2e]/10">
            <div className="flex items-center justify-between">
              <Link href="/" className="text-xl font-black text-[#1a1a2e]" onClick={closeMobileMenu}>
                Lucent Admin
              </Link>
              <button
                type="button"
                className="-m-2.5 rounded-md p-2.5 text-[#1a1a2e]"
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
                    <p className="px-2 text-xs font-bold text-[#1a1a2e]/45">
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
                                  ? 'bg-[#1a1a2e] text-white'
                                  : 'text-[#1a1a2e]/70 hover:bg-white hover:text-[#1a1a2e]'
                                }
                              `}
                            >
                              <item.icon
                                className={`h-6 w-6 shrink-0 ${
                                  isActive ? 'text-[#ffcd27]' : 'text-[#9b9788] group-hover:text-[#4a88b9]'
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
              <div className="mt-8 border-t border-[#e7e3d3] pt-8">
                <Link
                  href="/"
                  onClick={closeMobileMenu}
                  className="group flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 text-[#1a1a2e]/70 hover:bg-white hover:text-[#1a1a2e]"
                >
                  사이트로 돌아가기
                </Link>
              </div>
            </nav>
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <div
        className="hidden lg:fixed lg:left-5 lg:top-5 lg:z-50 lg:flex lg:flex-col lg:gap-3"
        onMouseEnter={openDesktopMenu}
        onMouseLeave={closeDesktopMenu}
        onFocusCapture={openDesktopMenu}
        onBlurCapture={handleDesktopBlur}
      >
        <button
          type="button"
          className={`
            flex h-[46px] items-center justify-start rounded-[15px] border border-[#e7e3d3] bg-white pl-[13px] pr-4 text-sm font-bold text-[#9b9788]
            shadow-[0_10px_24px_rgba(26,26,46,0.08)] transition-[width,color,background-color] duration-300 hover:bg-[#f5f3e8] hover:text-[#1a1a2e]
            ${desktopExpanded ? 'w-48' : 'w-[46px]'}
          `}
          onClick={handleGoBack}
        >
          <span className="sr-only">이전 페이지로 이동</span>
          <span className="flex w-5 shrink-0 justify-center">
            <ArrowLeft className="h-5 w-5" aria-hidden />
          </span>
          <span
            className={`
              overflow-hidden whitespace-nowrap transition-[margin,max-width,opacity] duration-300
              ${desktopExpanded ? 'ml-3 max-w-[9rem] opacity-100' : 'ml-0 max-w-0 opacity-0'}
            `}
          >
            뒤로가기
          </span>
        </button>

        <nav
          className={`
            flex flex-col overflow-hidden rounded-[24px] border border-[#e7e3d3] bg-white p-2 shadow-[0_16px_34px_rgba(26,26,46,0.10)]
            transition-[width] duration-300 ease-out
            ${desktopExpanded ? 'w-60' : 'w-[62px]'}
          `}
        >
          <ul
            role="list"
            className={`
              scrollbar-none max-h-[calc(100vh-15rem)] space-y-1 overflow-y-auto
              ${desktopExpanded ? 'pr-1' : 'pr-0'}
            `}
          >
            {desktopNavigationItems.map((item) => {
              const isActive = isNavItemActive(pathname, item.href);

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`
                      group flex h-[46px] items-center justify-start rounded-[15px] py-3 pl-3 pr-3 text-sm font-bold transition-colors
                      ${isActive
                        ? 'bg-[#1a1a2e] text-white shadow-[0_8px_16px_rgba(26,26,46,0.22)]'
                        : 'text-[#9b9788] hover:bg-[#f5f3e8] hover:text-[#1a1a2e]'
                      }
                    `}
                  >
                    <span className="flex w-5 shrink-0 justify-center">
                      <item.icon
                        className={`
                          h-5 w-5
                          ${isActive ? 'text-[#ffcd27]' : 'text-[#9b9788] group-hover:text-[#4a88b9]'}
                        `}
                        aria-hidden
                      />
                    </span>
                    <span
                      className={`
                        overflow-hidden whitespace-nowrap transition-[margin,max-width,opacity] duration-300
                        ${desktopExpanded ? 'ml-3 max-w-[11rem] opacity-100' : 'ml-0 max-w-0 opacity-0'}
                      `}
                    >
                      {item.name}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
          <div className="mt-3 border-t border-[#f1eee2] pt-3">
            <Link
              href="/"
              className="group flex h-[46px] items-center justify-start rounded-[15px] py-3 pl-3 pr-3 text-sm font-bold text-[#9b9788] transition-colors hover:bg-[#f5f3e8] hover:text-[#1a1a2e]"
            >
              <span className="flex w-5 shrink-0 justify-center">
                <LogOut className="h-5 w-5 group-hover:text-[#4a88b9]" aria-hidden />
              </span>
              <span
                className={`
                  overflow-hidden whitespace-nowrap transition-[margin,max-width,opacity] duration-300
                  ${desktopExpanded ? 'ml-3 max-w-[11rem] opacity-100' : 'ml-0 max-w-0 opacity-0'}
                `}
              >
                나가기
              </span>
            </Link>
          </div>
        </nav>
      </div>
    </>
  );
}
