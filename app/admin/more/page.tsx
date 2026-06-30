import {
  Archive,
  ArrowLeftRight,
  FileText,
  ImageIcon,
  Package,
  RotateCcw,
  ShieldCheck,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { AdminLinkCard, AdminPageHeader } from '@/src/components/admin/AdminDesignSystem';

type MoreEntry = {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  tone: 'navy' | 'gold' | 'blue' | 'green' | 'red' | 'neutral';
};

const moreEntries: MoreEntry[] = [
  {
    title: '아티스트 관리',
    description: '아티스트 등록과 프로젝트 연결 정보를 관리합니다.',
    href: '/admin/v2-catalog/artists',
    icon: Users,
    tone: 'blue',
  },
  {
    title: '환불 관리',
    description: '환불 가능 주문을 확인하고 수동 환불을 처리합니다.',
    href: '/admin/refunds',
    icon: RotateCcw,
    tone: 'red',
  },
  {
    title: '로그 조회',
    description: 'legacy와 v2 운영/감사 로그를 확인합니다.',
    href: '/admin/logs',
    icon: FileText,
    tone: 'neutral',
  },
  {
    title: '번들 관리',
    description: '번들 정의와 구성 검증을 관리합니다.',
    href: '/admin/v2-catalog/bundles',
    icon: Package,
    tone: 'gold',
  },
  {
    title: '전환 준비',
    description: 'v2 읽기 전환 준비 상태를 점검합니다.',
    href: '/admin/v2-catalog/readiness',
    icon: ArrowLeftRight,
    tone: 'neutral',
  },
  {
    title: '미디어·에셋',
    description: '상품 이미지와 디지털 파일 메타데이터를 확인합니다.',
    href: '/admin/v2-catalog/assets',
    icon: ImageIcon,
    tone: 'blue',
  },
  {
    title: 'Admin Ops',
    description: '컷오버, 승인, 액션 로그 등 운영 도구를 엽니다.',
    href: '/admin/v2-ops',
    icon: ShieldCheck,
    tone: 'navy',
  },
  {
    title: '권한 관리',
    description: '관리자 역할과 권한 배정을 관리합니다.',
    href: '/admin/v2-ops/rbac',
    icon: ShieldCheck,
    tone: 'navy',
  },
  {
    title: '레거시',
    description: 'v2 전환 이전 관리 화면으로 이동합니다.',
    href: '/admin/legacy',
    icon: Archive,
    tone: 'neutral',
  },
];

export default function AdminMorePage() {
  return (
    <div className="space-y-5 text-[#1a1a2e]">
      <AdminPageHeader
        eyebrow="more"
        title="기타 관리"
        description="주요 플로팅 탭에서 덜어낸 운영 화면과 전환 보조 화면을 한 곳에 모았습니다."
      />

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {moreEntries.map((entry) => (
          <AdminLinkCard
            key={entry.href}
            href={entry.href}
            icon={entry.icon}
            title={entry.title}
            description={entry.description}
            tone={entry.tone}
          />
        ))}
      </section>
    </div>
  );
}
