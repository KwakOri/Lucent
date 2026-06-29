'use client';

import Link from 'next/link';
import { Loading } from '@/components/ui/loading';
import { useProjects } from '@/lib/client/hooks/useProjects';
import {
  AdminPageHeader,
  adminLegacyBridgeClass,
  adminPrimaryButtonClass,
} from '@/src/components/admin/AdminDesignSystem';
import { ProjectsTable } from '@/src/components/admin/projects/ProjectsTable';

export default function AdminProjectsPage() {
  const { data: projects, isLoading, error } = useProjects({
    isActive: 'all',
  });

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loading size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">프로젝트 목록을 불러오는데 실패했습니다.</p>
      </div>
    );
  }

  return (
    <div className={`${adminLegacyBridgeClass} space-y-6`}>
      <AdminPageHeader
        eyebrow="legacy"
        title="프로젝트 관리"
        description="레이블 프로젝트를 관리합니다."
        actions={
          <Link
            href="/admin/projects/new"
            className={adminPrimaryButtonClass}
          >
            + 프로젝트 등록
          </Link>
        }
      />

      <ProjectsTable projects={projects || []} />
    </div>
  );
}
