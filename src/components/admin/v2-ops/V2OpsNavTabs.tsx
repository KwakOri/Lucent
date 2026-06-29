'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const V2_OPS_TABS = [
  { label: '운영 대시보드', href: '/admin/v2-ops' },
  { label: '권한 관리', href: '/admin/v2-ops/rbac' },
  { label: '매출 통계', href: '/admin/v2-ops/stats' },
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
    <section className="rounded-[18px] border border-[#e7e3d3] bg-white p-2">
      <div className="flex flex-wrap gap-2">
        {V2_OPS_TABS.map((tab) => {
          const active = isTabActive(pathname, tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-bold transition-colors ${
                active
                  ? 'border-[#1a1a2e] bg-[#1a1a2e] text-white'
                  : 'border-[#e7e3d3] bg-white text-[#1a1a2e]/65 hover:border-[#d8d1bd] hover:bg-[#faf9f3] hover:text-[#1a1a2e]'
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
