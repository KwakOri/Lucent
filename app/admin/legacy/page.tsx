import { FolderOpen, ShoppingBag, Users, type LucideIcon } from 'lucide-react';
import {
  AdminLinkCard,
  AdminPageHeader,
  adminLegacyBridgeClass,
} from '@/src/components/admin/AdminDesignSystem';

type LegacyEntry = {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
};

const legacyEntries: LegacyEntry[] = [
  {
    title: '프로젝트 관리',
    description: '기존 프로젝트 데이터와 공개 상태를 확인합니다.',
    href: '/admin/projects',
    icon: FolderOpen,
  },
  {
    title: '아티스트 관리',
    description: '기존 아티스트 데이터와 프로젝트 연결을 확인합니다.',
    href: '/admin/artists',
    icon: Users,
  },
  {
    title: '상품 관리',
    description: '기존 상품 데이터, 가격, 재고 정보를 확인합니다.',
    href: '/admin/products',
    icon: ShoppingBag,
  },
];

export default function AdminLegacyPage() {
  return (
    <div className={`${adminLegacyBridgeClass} space-y-6`}>
      <AdminPageHeader
        eyebrow="legacy"
        title="레거시 관리"
        description="v2 전환 이전 관리 화면을 한 곳에서 접근합니다."
      />

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {legacyEntries.map((entry) => (
          <AdminLinkCard
            key={entry.href}
            href={entry.href}
            icon={entry.icon}
            title={entry.title}
            description={entry.description}
            tone="gold"
          />
        ))}
      </section>
    </div>
  );
}
