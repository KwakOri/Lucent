'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const V2_OPS_TABS = [
  { label: '운영 대시보드', href: '/admin/v2-ops' },
  { label: '권한 관리', href: '/admin/v2-ops/rbac' },
];

function isTabActive(pathname: string, href: string): boolean {
  if (href === '/admin/v2-ops') {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function V2OpsNavTabs() {
  const pathname = usePathname();

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-2">
      <div className="flex flex-wrap gap-2">
        {V2_OPS_TABS.map((tab) => {
          const active = isTabActive(pathname, tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors ${
                active
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:text-gray-800'
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
