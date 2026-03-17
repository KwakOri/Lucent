'use client';

import { useState, type ComponentType } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  HomeIcon,
  UserGroupIcon,
  FolderIcon,
  ShoppingBagIcon,
  ShoppingCartIcon,
  DocumentTextIcon,
  ArrowsRightLeftIcon,
  CubeIcon,
  BanknotesIcon,
  ShieldCheckIcon,
  MegaphoneIcon,
  PhotoIcon,
  Bars3Icon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

type NavigationItem = {
  name: string;
  href: string;
  icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
};

type NavigationSection = {
  title: string;
  items: NavigationItem[];
};

const navigationSections: NavigationSection[] = [
  {
    title: '공통',
    items: [
      { name: '대시보드', href: '/admin', icon: HomeIcon },
      { name: 'v1 주문 관리', href: '/admin/orders', icon: ShoppingCartIcon },
      { name: '로그 조회', href: '/admin/logs', icon: DocumentTextIcon },
    ],
  },
  {
    title: 'v1 카탈로그',
    items: [
      { name: 'v1 아티스트 관리', href: '/admin/artists', icon: UserGroupIcon },
      { name: 'v1 프로젝트 관리', href: '/admin/projects', icon: FolderIcon },
      { name: 'v1 상품 관리', href: '/admin/products', icon: ShoppingBagIcon },
    ],
  },
  {
    title: 'v2 운영',
    items: [
      { name: 'v2 운영 홈', href: '/admin/v2-catalog', icon: HomeIcon },
      { name: 'v2 프로젝트 관리', href: '/admin/v2-catalog/projects', icon: FolderIcon },
      { name: 'v2 아티스트 관리', href: '/admin/v2-catalog/artists', icon: UserGroupIcon },
      { name: 'v2 상품 관리', href: '/admin/v2-catalog/products', icon: ShoppingBagIcon },
      { name: 'v2 미디어·에셋', href: '/admin/v2-catalog/assets', icon: PhotoIcon },
      { name: 'v2 캠페인 관리', href: '/admin/v2-catalog/campaigns', icon: MegaphoneIcon },
      { name: 'v2 가격·프로모션', href: '/admin/v2-catalog/pricing', icon: BanknotesIcon },
      { name: 'v2 번들 관리', href: '/admin/v2-catalog/bundles', icon: CubeIcon },
      { name: 'v2 전환 준비', href: '/admin/v2-catalog/readiness', icon: ArrowsRightLeftIcon },
      { name: 'v2 Admin Ops', href: '/admin/v2-ops', icon: ShieldCheckIcon },
    ],
  },
];

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
          <Bars3Icon className="h-6 w-6" aria-hidden />
        </button>
        <div className="flex-1 text-sm font-semibold leading-6 text-gray-900">
          Lucent Admin
        </div>
        <Link
          href="/"
          className="text-sm font-semibold leading-6 text-gray-900 hover:text-blue-600"
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
                <XMarkIcon className="h-6 w-6" aria-hidden />
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
                        const isActive = pathname === item.href ||
                          (item.href !== '/admin' && pathname.startsWith(item.href));

                        return (
                          <li key={item.name}>
                            <Link
                              href={item.href}
                              onClick={closeMobileMenu}
                              className={`
                                group flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6
                                ${isActive
                                  ? 'bg-blue-50 text-blue-600'
                                  : 'text-gray-700 hover:bg-gray-50 hover:text-blue-600'
                                }
                              `}
                            >
                              <item.icon
                                className={`h-6 w-6 shrink-0 ${
                                  isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-blue-600'
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
                  className="group flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 text-gray-700 hover:bg-gray-50 hover:text-blue-600"
                >
                  사이트로 돌아가기
                </Link>
              </div>
            </nav>
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-64 lg:flex-col">
        {/* Sidebar Container */}
        <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r border-gray-200 bg-white px-6 pb-4">
          {/* Logo */}
          <div className="flex h-16 shrink-0 items-center">
            <Link href="/" className="text-xl font-bold text-gray-900">
              Lucent Admin
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex flex-1 flex-col">
            <ul role="list" className="flex flex-1 flex-col gap-y-7">
              <li>
                <div className="space-y-6">
                  {navigationSections.map((section) => (
                    <div key={section.title}>
                      <p className="px-2 text-xs font-bold uppercase tracking-wide text-gray-400">
                        {section.title}
                      </p>
                      <ul role="list" className="-mx-2 mt-2 space-y-1">
                        {section.items.map((item) => {
                          const isActive = pathname === item.href ||
                            (item.href !== '/admin' && pathname.startsWith(item.href));

                          return (
                            <li key={item.name}>
                              <Link
                                href={item.href}
                                className={`
                                  group flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6
                                  ${isActive
                                    ? 'bg-blue-50 text-blue-600'
                                    : 'text-gray-700 hover:bg-gray-50 hover:text-blue-600'
                                  }
                                `}
                              >
                                <item.icon
                                  className={`h-6 w-6 shrink-0 ${
                                    isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-blue-600'
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
              </li>

              {/* Spacer */}
              <li className="mt-auto">
                <Link
                  href="/"
                  className="group -mx-2 flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 text-gray-700 hover:bg-gray-50 hover:text-blue-600"
                >
                  사이트로 돌아가기
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </>
  );
}
