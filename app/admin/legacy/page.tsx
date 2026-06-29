import Link from 'next/link';
import {
  ArrowRight,
  FolderOpen,
  ShoppingBag,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

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
    <div className="space-y-8">
      <header className="space-y-3">
        <Badge intent="warning" size="md">
          Legacy
        </Badge>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">레거시 관리</h1>
          <p className="mt-1 text-sm text-gray-600">
            v2 전환 이전 관리 화면을 한 곳에서 접근합니다.
          </p>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {legacyEntries.map((entry) => (
          <Link
            key={entry.href}
            href={entry.href}
            className="group rounded-lg border border-gray-200 bg-white p-5 shadow-sm transition hover:border-amber-200 hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
                <entry.icon className="h-5 w-5" aria-hidden />
              </div>
              <ArrowRight
                className="h-5 w-5 shrink-0 text-gray-300 transition group-hover:text-amber-600"
                aria-hidden
              />
            </div>
            <div className="mt-5">
              <h2 className="text-base font-semibold text-gray-900 group-hover:text-amber-700">
                {entry.title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-gray-600">{entry.description}</p>
            </div>
          </Link>
        ))}
      </section>
    </div>
  );
}
