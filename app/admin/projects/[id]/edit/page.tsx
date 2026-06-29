'use client';

import { useParams } from 'next/navigation';
import { useProject } from '@/lib/client/hooks/useProjects';
import { Loading } from '@/components/ui/loading';
import {
  AdminPageHeader,
  adminLegacyBridgeClass,
} from '@/src/components/admin/AdminDesignSystem';
import { ProjectForm } from '@/src/components/admin/projects/ProjectForm';

export default function EditProjectPage() {
  const params = useParams<{ id: string }>();
  const { data: project, isLoading, error } = useProject(params.id);

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loading size="lg" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">프로젝트 정보를 불러오는데 실패했습니다.</p>
      </div>
    );
  }

  return (
    <div className={`${adminLegacyBridgeClass} space-y-6`}>
      <AdminPageHeader
        eyebrow="legacy form"
        title="프로젝트 수정"
        description={`${project.name} 정보를 수정합니다.`}
      />

      <ProjectForm project={project} />
    </div>
  );
}
