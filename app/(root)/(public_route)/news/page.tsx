'use client';

import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function NewsPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50">
      <EmptyState
        title="준비 중입니다"
        description="뉴스 페이지는 현재 개발 중입니다"
      >
        <Link href="/">
          <Button intent="primary" size="md">
            <ArrowLeft className="w-4 h-4" />
            홈으로 돌아가기
          </Button>
        </Link>
      </EmptyState>
    </div>
  );
}
