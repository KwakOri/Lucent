'use client';

import type { ComponentType } from 'react';
import Link from 'next/link';
import {
  FolderIcon,
  ShoppingBagIcon,
  MegaphoneIcon,
  BanknotesIcon,
  CubeIcon,
  ArrowsRightLeftIcon,
} from '@heroicons/react/24/outline';

type V2Entry = {
  title: string;
  description: string;
  href: string;
  icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  tone: string;
};

const entries: V2Entry[] = [
  {
    title: 'v2 프로젝트 관리',
    description: '프로젝트 생성/수정, 공개 상태, 노출 순서를 운영합니다.',
    href: '/admin/v2-catalog/projects',
    icon: FolderIcon,
    tone: 'bg-blue-100 text-blue-700',
  },
  {
    title: 'v2 상품 관리',
    description: '상품과 variant를 등록하고 판매 가능 상태를 관리합니다.',
    href: '/admin/v2-catalog/products',
    icon: ShoppingBagIcon,
    tone: 'bg-indigo-100 text-indigo-700',
  },
  {
    title: 'v2 캠페인 관리',
    description: '기간 판매/이벤트 캠페인과 대상 타겟을 운영합니다.',
    href: '/admin/v2-catalog/campaigns',
    icon: MegaphoneIcon,
    tone: 'bg-emerald-100 text-emerald-700',
  },
  {
    title: 'v2 가격·프로모션',
    description: '가격표, 프로모션, 쿠폰 정책을 운영합니다.',
    href: '/admin/v2-catalog/pricing',
    icon: BanknotesIcon,
    tone: 'bg-amber-100 text-amber-700',
  },
  {
    title: 'v2 번들 관리',
    description: '번들 정의/컴포넌트 구성과 검증 리포트를 관리합니다.',
    href: '/admin/v2-catalog/bundles',
    icon: CubeIcon,
    tone: 'bg-violet-100 text-violet-700',
  },
  {
    title: 'v2 전환 준비',
    description: '카탈로그 정합성과 read switch 준비 상태를 점검합니다.',
    href: '/admin/v2-catalog/readiness',
    icon: ArrowsRightLeftIcon,
    tone: 'bg-slate-100 text-slate-700',
  },
];

export default function V2CatalogHomePage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">v2 운영 홈</h1>
        <p className="mt-1 text-sm text-gray-500">
          프로덕션 운영 기준의 v2 카탈로그 관리 화면입니다.
        </p>
      </div>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {entries.map((entry) => (
          <Link
            key={entry.href}
            href={entry.href}
            className="group rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-md"
          >
            <div className="flex items-start gap-4">
              <div
                className={`inline-flex h-10 w-10 items-center justify-center rounded-lg ${entry.tone}`}
              >
                <entry.icon className="h-5 w-5" aria-hidden />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-gray-900 group-hover:text-blue-700">
                  {entry.title}
                </h2>
                <p className="mt-1 text-sm leading-6 text-gray-600">
                  {entry.description}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </section>
    </div>
  );
}
