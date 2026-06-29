'use client';

import {
  ArrowLeftRight,
  FolderOpen,
  ImageIcon,
  Megaphone,
  Package,
  ShoppingBag,
  type LucideIcon,
} from 'lucide-react';
import { AdminLinkCard, AdminPageHeader } from '@/src/components/admin/AdminDesignSystem';

type V2Entry = {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  tone: 'navy' | 'gold' | 'blue' | 'green' | 'neutral';
  meta: string;
};

const entries: V2Entry[] = [
  {
    title: 'v2 프로젝트 관리',
    description: '프로젝트 생성/수정, 공개 상태, 노출 순서를 운영합니다.',
    href: '/admin/v2-catalog/projects',
    icon: FolderOpen,
    tone: 'navy',
    meta: '중심 흐름',
  },
  {
    title: 'v2 상품 관리',
    description: '상품과 variant를 등록하고 판매 가능 상태를 관리합니다.',
    href: '/admin/v2-catalog/products',
    icon: ShoppingBag,
    tone: 'gold',
    meta: '기타 메뉴',
  },
  {
    title: 'v2 미디어·에셋',
    description: '상품 이미지와 디지털 파일 메타데이터를 관리합니다.',
    href: '/admin/v2-catalog/assets',
    icon: ImageIcon,
    tone: 'blue',
    meta: '운영 보조',
  },
  {
    title: 'v2 캠페인 관리',
    description: '기간, 대상, 옵션별 할인 가격까지 캠페인 단위로 운영합니다.',
    href: '/admin/v2-catalog/campaigns',
    icon: Megaphone,
    tone: 'green',
    meta: '기타 메뉴',
  },
  {
    title: 'v2 번들 관리',
    description: '번들 정의/컴포넌트 구성과 검증 리포트를 관리합니다.',
    href: '/admin/v2-catalog/bundles',
    icon: Package,
    tone: 'gold',
    meta: '상품 확장',
  },
  {
    title: 'v2 전환 준비',
    description: '카탈로그 정합성과 read switch 준비 상태를 점검합니다.',
    href: '/admin/v2-catalog/readiness',
    icon: ArrowLeftRight,
    tone: 'neutral',
    meta: '검증',
  },
];

export default function V2CatalogHomePage() {
  return (
    <div className="space-y-5 text-[#1a1a2e]">
      <AdminPageHeader
        eyebrow="v2 catalog"
        title="v2 운영 홈"
        description="프로젝트를 중심으로 상품, 캠페인, 에셋, 전환 준비 상태를 확인하는 카탈로그 운영 허브입니다."
      />

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {entries.map((entry) => (
          <AdminLinkCard
            key={entry.href}
            href={entry.href}
            icon={entry.icon}
            title={entry.title}
            description={entry.description}
            tone={entry.tone}
            emphasis={entry.href === '/admin/v2-catalog/projects' ? 'primary' : 'default'}
            meta={
              <span className="inline-flex rounded-[999px] bg-[#f5f3e8] px-3 py-1 text-xs font-black text-[#1a1a2e]/55">
                {entry.meta}
              </span>
            }
          />
        ))}
      </section>
    </div>
  );
}
