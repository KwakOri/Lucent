'use client';

import { useProject } from '@/lib/client/hooks/useProjects';
import { Loading } from '@/components/ui/loading';
import { ProjectForm } from '@/src/components/admin/projects/ProjectForm';

export default function EditProjectPage({
  params,
}: {
  params: { id: string };
}) {
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
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">프로젝트 수정</h1>
        <p className="mt-1 text-sm text-gray-500">
          {project.name} 정보를 수정합니다
        </p>
      </div>

      <ProjectForm project={project} />
    </div>
  );
}
