import Link from 'next/link';
import {
  Archive,
  ArrowLeftRight,
  ArrowRight,
  FileText,
  ImageIcon,
  Megaphone,
  Package,
  RotateCcw,
  ShieldCheck,
  ShoppingBag,
  Users,
  type LucideIcon,
} from 'lucide-react';

type MoreEntry = {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
};

const moreEntries: MoreEntry[] = [
  {
    title: '캠페인 관리',
    description: '전역 캠페인 목록을 확인하고 프로젝트 밖 캠페인 흐름을 관리합니다.',
    href: '/admin/v2-catalog/campaigns',
    icon: Megaphone,
  },
  {
    title: '상품 관리',
    description: '전역 상품 목록과 프로젝트별 상품 관리 화면으로 이동합니다.',
    href: '/admin/v2-catalog/products',
    icon: ShoppingBag,
  },
  {
    title: '아티스트 관리',
    description: '아티스트 등록과 프로젝트 연결 정보를 관리합니다.',
    href: '/admin/v2-catalog/artists',
    icon: Users,
  },
  {
    title: '환불 관리',
    description: '환불 가능 주문을 확인하고 수동 환불을 처리합니다.',
    href: '/admin/refunds',
    icon: RotateCcw,
  },
  {
    title: '로그 조회',
    description: 'legacy와 v2 운영/감사 로그를 확인합니다.',
    href: '/admin/logs',
    icon: FileText,
  },
  {
    title: '번들 관리',
    description: '번들 정의와 구성 검증을 관리합니다.',
    href: '/admin/v2-catalog/bundles',
    icon: Package,
  },
  {
    title: '전환 준비',
    description: 'v2 읽기 전환 준비 상태를 점검합니다.',
    href: '/admin/v2-catalog/readiness',
    icon: ArrowLeftRight,
  },
  {
    title: '미디어·에셋',
    description: '상품 이미지와 디지털 파일 메타데이터를 확인합니다.',
    href: '/admin/v2-catalog/assets',
    icon: ImageIcon,
  },
  {
    title: 'Admin Ops',
    description: '컷오버, 승인, 액션 로그 등 운영 도구를 엽니다.',
    href: '/admin/v2-ops',
    icon: ShieldCheck,
  },
  {
    title: '권한 관리',
    description: '관리자 역할과 권한 배정을 관리합니다.',
    href: '/admin/v2-ops/rbac',
    icon: ShieldCheck,
  },
  {
    title: '레거시',
    description: 'v2 전환 이전 관리 화면으로 이동합니다.',
    href: '/admin/legacy',
    icon: Archive,
  },
];

export default function AdminMorePage() {
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">기타 관리</h1>
        <p className="mt-1 text-sm text-gray-600">
          자주 쓰지 않는 운영 화면과 전환 보조 화면을 모았습니다.
        </p>
      </header>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {moreEntries.map((entry) => (
          <Link
            key={entry.href}
            href={entry.href}
            className="group rounded-lg border border-gray-200 bg-white p-5 shadow-sm transition hover:border-gray-300 hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-700">
                <entry.icon className="h-5 w-5" aria-hidden />
              </div>
              <ArrowRight
                className="h-5 w-5 shrink-0 text-gray-300 transition group-hover:text-primary-600"
                aria-hidden
              />
            </div>
            <div className="mt-5">
              <h2 className="text-base font-semibold text-gray-900 group-hover:text-primary-700">
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
