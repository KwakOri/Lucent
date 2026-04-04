'use client';

import { useState, type FocusEvent } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ArrowLeft,
  ArrowLeftRight,
  BarChart3,
  FileText,
  FolderOpen,
  House,
  ImageIcon,
  Menu,
  Megaphone,
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

const navigationSections: NavigationSection[] = [
  {
    title: '공통',
    items: [
      { name: '대시보드', href: '/admin', icon: House },
      { name: '로그 조회', href: '/admin/logs', icon: FileText },
    ],
  },
  {
    title: '주요 관리',
    items: [
      { name: '운영 홈', href: '/admin/v2-catalog', icon: House },
      { name: '주문 조회', href: '/admin/orders', icon: ShoppingCart },
      {
        name: '주문 이행 관리',
        href: '/admin/production-shipping',
        icon: ArrowLeftRight,
      },
      { name: '환불 관리', href: '/admin/refunds', icon: RotateCcw },
      { name: '프로젝트 관리', href: '/admin/v2-catalog/projects', icon: FolderOpen },
      { name: '아티스트 관리', href: '/admin/v2-catalog/artists', icon: Users },
      { name: '상품 관리', href: '/admin/v2-catalog/products', icon: ShoppingBag },
      { name: '캠페인 관리', href: '/admin/v2-catalog/campaigns', icon: Megaphone },
      { name: '통계', href: '/admin/v2-ops/stats', icon: BarChart3 },
    ],
  },
  {
    title: '기타',
    items: [
      { name: '번들 관리', href: '/admin/v2-catalog/bundles', icon: Package },
      { name: '전환 준비', href: '/admin/v2-catalog/readiness', icon: ArrowLeftRight },
      { name: '미디어·에셋', href: '/admin/v2-catalog/assets', icon: ImageIcon },
      { name: 'Admin Ops', href: '/admin/v2-ops', icon: ShieldCheck },
      { name: '권한 관리', href: '/admin/v2-ops/rbac', icon: ShieldCheck },
    ],
  },
  {
    title: '레거시',
    items: [
      { name: '[LEGACY] 아티스트 관리', href: '/admin/artists', icon: Users },
      { name: '[LEGACY] 프로젝트 관리', href: '/admin/projects', icon: FolderOpen },
      { name: '[LEGACY] 상품 관리', href: '/admin/products', icon: ShoppingBag },
    ],
  },
];

const desktopNavigationItems = navigationSections.flatMap((section) => section.items);

function isNavItemActive(pathname: string, href: string): boolean {
  if (pathname === href) {
    return true;
  }

  // 대시보드/운영 홈은 해당 경로에서만 활성화합니다.
  if (href === '/admin' || href === '/admin/v2-catalog') {
    return false;
  }
  if (href === '/admin/v2-ops' && pathname.startsWith('/admin/v2-ops/rbac')) {
    return false;
  }

  return pathname.startsWith(href);
}

export function AdminSidebar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [desktopExpanded, setDesktopExpanded] = useState(false);

  const closeMobileMenu = () => setMobileMenuOpen(false);
  const openDesktopMenu = () => setDesktopExpanded(true);
  const closeDesktopMenu = () => setDesktopExpanded(false);

  const handleDesktopBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      closeDesktopMenu();
    }
  };

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
          className="text-sm font-semibold leading-6 text-gray-900 hover:text-primary-600"
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
                                  ? 'bg-primary-50 text-primary-700'
                                  : 'text-gray-700 hover:bg-gray-50 hover:text-primary-700'
                                }
                              `}
                            >
                              <item.icon
                                className={`h-6 w-6 shrink-0 ${
                                  isActive ? 'text-primary-700' : 'text-gray-400 group-hover:text-primary-700'
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
                  className="group flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 text-gray-700 hover:bg-gray-50 hover:text-primary-700"
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
        className="hidden lg:fixed lg:left-6 lg:top-6 lg:z-50 lg:flex lg:flex-col lg:gap-4"
        onMouseEnter={openDesktopMenu}
        onMouseLeave={closeDesktopMenu}
        onFocusCapture={openDesktopMenu}
        onBlurCapture={handleDesktopBlur}
      >
        <Link
          href="/"
          className={`
            flex h-14 items-center justify-start rounded-2xl bg-white pl-4 pr-4 text-sm font-semibold text-text-secondary
            shadow-md ring-1 ring-neutral-200 transition-[width,color] duration-300 hover:text-primary-700
            ${desktopExpanded ? 'w-48' : 'w-14'}
          `}
        >
          <ArrowLeft className="h-5 w-5 shrink-0" aria-hidden />
          <span
            className={`
              overflow-hidden whitespace-nowrap transition-[margin,max-width,opacity] duration-300
              ${desktopExpanded ? 'ml-3 max-w-[9rem] opacity-100' : 'ml-0 max-w-0 opacity-0'}
            `}
          >
            홈으로
          </span>
        </Link>

        <nav
          className={`
            overflow-hidden rounded-[28px] bg-white p-3 shadow-lg ring-1 ring-neutral-200/90
            transition-[width] duration-300 ease-out
            ${desktopExpanded ? 'w-60' : 'w-[4.5rem]'}
          `}
        >
          <ul
            role="list"
            className={`
              max-h-[calc(100vh-12rem)] space-y-1 overflow-y-auto
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
                      flex items-center justify-start rounded-2xl py-3 pl-3 pr-3 text-sm font-semibold transition-colors
                      ${isActive
                        ? 'bg-primary-600 text-white shadow-sm'
                        : 'text-neutral-500 hover:bg-primary-50 hover:text-primary-700'
                      }
                    `}
                  >
                    <item.icon
                      className={`
                        h-5 w-5 shrink-0
                        ${isActive ? 'text-white' : 'text-neutral-500'}
                      `}
                      aria-hidden
                    />
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
        </nav>
      </div>
    </>
  );
}
