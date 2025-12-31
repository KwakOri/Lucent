'use client';

import { use } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Loading } from '@/components/ui/loading';
import { EmptyState } from '@/components/ui/empty-state';
import { ShoppingCart } from 'lucide-react';
import { useProjectBySlug } from '@/hooks';

// Project display config (for UI enhancement)
const PROJECT_DISPLAY_CONFIG: Record<string, {
  emoji?: string;
  color?: string;
  order?: string;
  shopSlug?: string;
}> = {
  '0th': {
    emoji: '🌸',
    color: 'from-[#E3F2FD] to-[#A8D5E2]',
    order: '0th',
    shopSlug: 'miruru',
  },
  '1st': {
    emoji: '💧',
    color: 'from-neutral-100 to-neutral-200',
    order: '1st',
  },
};

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const { data: project, isLoading, error } = useProjectBySlug(slug);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <Loading size="lg" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="text-center">
          <EmptyState
            title="프로젝트를 찾을 수 없습니다"
            description={error instanceof Error ? error.message : '프로젝트를 불러오는 중 오류가 발생했습니다'}
          >
            <Link href="/projects">
              <Button intent="primary">프로젝트 목록으로 돌아가기</Button>
            </Link>
          </EmptyState>
        </div>
      </div>
    );
  }

  const displayConfig = PROJECT_DISPLAY_CONFIG[slug] || {};

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Project Header */}
      <section
        className={`py-20 px-4 bg-gradient-to-br ${displayConfig.color || 'from-neutral-100 to-neutral-200'}`}
      >
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <div className="w-40 h-40 mx-auto mb-8 rounded-full bg-white/50 backdrop-blur-sm flex items-center justify-center">
              <span className="text-8xl">{displayConfig.emoji || '📦'}</span>
            </div>
            <p className="text-3xl font-bold text-text-secondary mb-4">
              {displayConfig.order || project.name}
            </p>
            <h1 className="text-5xl font-bold text-text-primary mb-6">
              {project.name}
            </h1>
            <p className="text-xl text-text-secondary max-w-3xl mx-auto">
              {project.description || '프로젝트 설명'}
            </p>
          </div>
        </div>
      </section>

      {/* Shop Link Section */}
      {project.is_active && (
        <section className="py-20 px-4 bg-white">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-text-primary mb-6">
              상점에서 만나보세요
            </h2>
            <p className="text-lg text-text-secondary mb-8">
              다양한 보이스팩과 굿즈를 구매하실 수 있습니다
            </p>
            <Link href="/shop">
              <Button intent="primary" size="lg">
                <ShoppingCart className="w-5 h-5" />
                상점 보러가기
              </Button>
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
