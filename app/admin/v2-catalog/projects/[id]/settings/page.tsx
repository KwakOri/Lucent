'use client';

import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Archive, ArrowLeft, Power, RotateCcw, Settings } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loading } from '@/components/ui/loading';
import type { V2ProjectStatus } from '@/lib/client/api/v2-catalog-admin.api';
import {
  useArchiveV2Project,
  usePublishV2Project,
  useRestoreV2Project,
  useUnpublishV2Project,
  useV2AdminProject,
} from '@/lib/client/hooks/useV2CatalogAdmin';

function getErrorMessage(error: unknown): string {
  if (error && typeof error === 'object') {
    const maybeError = error as {
      message?: string;
      response?: { data?: { message?: string } };
    };
    if (maybeError.response?.data?.message) {
      return maybeError.response.data.message;
    }
    if (maybeError.message) {
      return maybeError.message;
    }
  }
  return '요청 처리 중 오류가 발생했습니다.';
}

function getProjectStatusIntent(status: V2ProjectStatus) {
  if (status === 'ACTIVE') {
    return 'success' as const;
  }
  if (status === 'DRAFT') {
    return 'warning' as const;
  }
  return 'error' as const;
}

export default function V2CatalogProjectSettingsPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();

  const projectId = useMemo(() => {
    const raw = params?.id;
    if (Array.isArray(raw)) {
      return raw[0] || '';
    }
    return raw || '';
  }, [params]);

  const { data: project, isLoading, error } = useV2AdminProject(projectId);
  const publishProject = usePublishV2Project();
  const unpublishProject = useUnpublishV2Project();
  const archiveProject = useArchiveV2Project();
  const restoreProject = useRestoreV2Project();

  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const runAction = async (task: () => Promise<string>) => {
    setMessage(null);
    setErrorMessage(null);
    try {
      const successMessage = await task();
      setMessage(successMessage);
    } catch (actionError) {
      setErrorMessage(getErrorMessage(actionError));
    }
  };

  const handlePublish = async () => {
    if (!project) {
      return;
    }
    await runAction(async () => {
      await publishProject.mutateAsync(project.id);
      return '프로젝트를 활성화했습니다.';
    });
  };

  const handleUnpublish = async () => {
    if (!project) {
      return;
    }
    if (!window.confirm(`"${project.name}" 프로젝트를 비활성화하시겠습니까?`)) {
      return;
    }
    await runAction(async () => {
      await unpublishProject.mutateAsync(project.id);
      return '프로젝트를 DRAFT로 전환했습니다.';
    });
  };

  const handleArchive = async () => {
    if (!project) {
      return;
    }
    if (!window.confirm(`"${project.name}" 프로젝트를 보관하시겠습니까? 보관하면 일반 목록에서 숨겨집니다.`)) {
      return;
    }
    await runAction(async () => {
      await archiveProject.mutateAsync(project.id);
      return '프로젝트를 보관했습니다.';
    });
  };

  const handleRestore = async () => {
    if (!project) {
      return;
    }
    if (!window.confirm(`"${project.name}" 프로젝트를 보관함에서 복귀시키겠습니까? 복귀 후에는 DRAFT 상태가 됩니다.`)) {
      return;
    }
    await runAction(async () => {
      await restoreProject.mutateAsync(project.id);
      return '프로젝트를 보관함에서 복귀시켰습니다.';
    });
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loading size="lg" text="프로젝트 설정을 불러오는 중입니다." />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          프로젝트 설정을 불러오지 못했습니다.
        </div>
        <Button intent="neutral" onClick={() => router.push('/admin/v2-catalog/projects')}>
          <ArrowLeft className="h-4 w-4" />
          프로젝트 목록
        </Button>
      </div>
    );
  }

  const isAnyActionPending =
    publishProject.isPending ||
    unpublishProject.isPending ||
    archiveProject.isPending ||
    restoreProject.isPending;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Button
            intent="ghost"
            size="sm"
            onClick={() => router.push(`/admin/v2-catalog/projects/${project.id}`)}
          >
            <ArrowLeft className="h-4 w-4" />
            프로젝트 상세
          </Button>
          <div className="mt-4 flex items-center gap-2">
            <Settings className="h-5 w-5 text-gray-500" />
            <h1 className="text-2xl font-bold text-gray-900">프로젝트 설정</h1>
          </div>
          <p className="mt-1 text-sm text-gray-500">{project.name}</p>
        </div>
        <Badge intent={getProjectStatusIntent(project.status)} size="md">
          {project.status}
        </Badge>
      </div>

      {message && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {message}
        </div>
      )}
      {errorMessage && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">운영 상태</h2>
            <p className="mt-1 text-sm text-gray-500">
              현재 상태: {project.status}
            </p>
          </div>
          {project.status === 'ARCHIVED' ? (
            <Button onClick={handleRestore} loading={restoreProject.isPending}>
              <RotateCcw className="h-4 w-4" />
              보관함에서 복귀
            </Button>
          ) : project.status === 'ACTIVE' ? (
            <Button
              intent="secondary"
              onClick={handleUnpublish}
              loading={unpublishProject.isPending}
              disabled={isAnyActionPending}
            >
              <Power className="h-4 w-4" />
              비활성화
            </Button>
          ) : (
            <Button
              onClick={handlePublish}
              loading={publishProject.isPending}
              disabled={isAnyActionPending}
            >
              <Power className="h-4 w-4" />
              활성화
            </Button>
          )}
        </div>
      </section>

      {project.status !== 'ARCHIVED' && (
        <section className="rounded-xl border border-red-200 bg-white p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-red-700">보관</h2>
              <p className="mt-1 text-sm text-gray-500">
                보관된 프로젝트는 일반 프로젝트 목록에서 제외됩니다.
              </p>
            </div>
            <Button
              intent="danger"
              onClick={handleArchive}
              loading={archiveProject.isPending}
              disabled={isAnyActionPending}
            >
              <Archive className="h-4 w-4" />
              프로젝트 보관
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
