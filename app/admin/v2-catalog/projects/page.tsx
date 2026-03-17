'use client';

import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { Loading } from '@/components/ui/loading';
import type { V2ProjectStatus } from '@/lib/client/api/v2-catalog-admin.api';
import {
  useCreateV2Project,
  useDeleteV2Project,
  usePublishV2Project,
  useUnpublishV2Project,
  useUpdateV2Project,
  useV2AdminProjects,
} from '@/lib/client/hooks/useV2CatalogAdmin';

type ProjectFilterStatus = 'ALL' | V2ProjectStatus;

const STATUS_VALUES: V2ProjectStatus[] = ['DRAFT', 'ACTIVE', 'ARCHIVED'];
const SELECT_CLASS =
  'h-11 rounded-lg border border-neutral-200 bg-white px-3 text-sm text-text-primary focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20';

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

function parseNonNegativeInteger(value: string, fieldName: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${fieldName}는 0 이상의 정수여야 합니다.`);
  }
  return parsed;
}

function resolveStatusIntent(status: V2ProjectStatus) {
  if (status === 'ACTIVE') {
    return 'success' as const;
  }
  if (status === 'DRAFT') {
    return 'warning' as const;
  }
  return 'default' as const;
}

export default function V2CatalogProjectsPage() {
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [newName, setNewName] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newCoverImageUrl, setNewCoverImageUrl] = useState('');
  const [newSortOrder, setNewSortOrder] = useState('0');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingSlug, setEditingSlug] = useState('');
  const [editingDescription, setEditingDescription] = useState('');
  const [editingCoverImageUrl, setEditingCoverImageUrl] = useState('');
  const [editingSortOrder, setEditingSortOrder] = useState('0');
  const [editingStatus, setEditingStatus] = useState<V2ProjectStatus>('DRAFT');

  const [statusFilter, setStatusFilter] = useState<ProjectFilterStatus>('ALL');
  const [keyword, setKeyword] = useState('');

  const { data: projects, isLoading, error } = useV2AdminProjects();
  const createProject = useCreateV2Project();
  const updateProject = useUpdateV2Project();
  const publishProject = usePublishV2Project();
  const unpublishProject = useUnpublishV2Project();
  const deleteProject = useDeleteV2Project();

  const clearNotice = () => {
    setMessage(null);
    setErrorMessage(null);
  };

  const runAction = async (task: () => Promise<void>) => {
    clearNotice();
    try {
      await task();
    } catch (actionError) {
      setErrorMessage(getErrorMessage(actionError));
    }
  };

  const filteredProjects = useMemo(() => {
    const search = keyword.trim().toLowerCase();
    return (projects || [])
      .filter((project) => {
        if (statusFilter !== 'ALL' && project.status !== statusFilter) {
          return false;
        }
        if (!search) {
          return true;
        }
        const haystack = `${project.name} ${project.slug} ${project.id}`.toLowerCase();
        return haystack.includes(search);
      })
      .sort((left, right) => left.sort_order - right.sort_order);
  }, [keyword, projects, statusFilter]);

  const handleCreateProject = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    await runAction(async () => {
      await createProject.mutateAsync({
        name: newName.trim(),
        slug: newSlug.trim(),
        description: newDescription.trim() || null,
        cover_image_url: newCoverImageUrl.trim() || null,
        sort_order: parseNonNegativeInteger(newSortOrder, 'sort_order'),
      });
      setMessage('v2 프로젝트를 생성했습니다.');
      setNewName('');
      setNewSlug('');
      setNewDescription('');
      setNewCoverImageUrl('');
      setNewSortOrder('0');
    });
  };

  const handleStartEdit = (project: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    cover_image_url: string | null;
    sort_order: number;
    status: V2ProjectStatus;
  }) => {
    clearNotice();
    setEditingId(project.id);
    setEditingName(project.name);
    setEditingSlug(project.slug);
    setEditingDescription(project.description || '');
    setEditingCoverImageUrl(project.cover_image_url || '');
    setEditingSortOrder(String(project.sort_order));
    setEditingStatus(project.status);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName('');
    setEditingSlug('');
    setEditingDescription('');
    setEditingCoverImageUrl('');
    setEditingSortOrder('0');
    setEditingStatus('DRAFT');
  };

  const handleUpdateProject = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingId) {
      return;
    }

    await runAction(async () => {
      await updateProject.mutateAsync({
        id: editingId,
        data: {
          name: editingName.trim(),
          slug: editingSlug.trim(),
          description: editingDescription.trim() || null,
          cover_image_url: editingCoverImageUrl.trim() || null,
          sort_order: parseNonNegativeInteger(editingSortOrder, 'sort_order'),
          status: editingStatus,
          is_active: editingStatus === 'ACTIVE',
        },
      });
      setMessage('v2 프로젝트를 수정했습니다.');
      handleCancelEdit();
    });
  };

  const handlePublish = async (projectId: string) => {
    await runAction(async () => {
      await publishProject.mutateAsync(projectId);
      setMessage('프로젝트를 활성화했습니다.');
    });
  };

  const handleUnpublish = async (projectId: string) => {
    await runAction(async () => {
      await unpublishProject.mutateAsync(projectId);
      setMessage('프로젝트를 DRAFT로 전환했습니다.');
    });
  };

  const handleDelete = async (projectId: string, projectName: string) => {
    if (!window.confirm(`"${projectName}" 프로젝트를 삭제하시겠습니까?`)) {
      return;
    }
    await runAction(async () => {
      await deleteProject.mutateAsync(projectId);
      if (editingId === projectId) {
        handleCancelEdit();
      }
      setMessage('프로젝트를 삭제했습니다.');
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loading size="lg" text="v2 프로젝트를 불러오는 중입니다." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
        프로젝트 목록을 불러오지 못했습니다.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">v2 프로젝트 관리</h1>
          <p className="mt-1 text-sm text-gray-500">
            프로젝트 등록/수정과 공개 상태를 운영합니다.
          </p>
        </div>
        <div className="mt-3 sm:mt-0">
          <Badge intent="info" size="md">
            총 {projects?.length || 0}개
          </Badge>
        </div>
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
        <h2 className="text-lg font-semibold text-gray-900">새 프로젝트 등록</h2>
        <form className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2" onSubmit={handleCreateProject}>
          <Input
            placeholder="프로젝트명"
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            required
          />
          <Input
            placeholder="slug (예: jennie-solo)"
            value={newSlug}
            onChange={(event) => setNewSlug(event.target.value)}
            required
          />
          <Input
            placeholder="cover_image_url (선택)"
            value={newCoverImageUrl}
            onChange={(event) => setNewCoverImageUrl(event.target.value)}
          />
          <Input
            placeholder="sort_order"
            value={newSortOrder}
            onChange={(event) => setNewSortOrder(event.target.value)}
          />
          <div className="md:col-span-2">
            <Textarea
              placeholder="설명 (선택)"
              value={newDescription}
              onChange={(event) => setNewDescription(event.target.value)}
              rows={3}
            />
          </div>
          <div className="md:col-span-2">
            <Button type="submit" loading={createProject.isPending}>
              v2 프로젝트 생성
            </Button>
          </div>
        </form>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex flex-wrap gap-3">
          <Input
            placeholder="프로젝트명/slug 검색"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            className="max-w-xs"
          />
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as ProjectFilterStatus)}
            className={SELECT_CLASS}
          >
            <option value="ALL">전체 상태</option>
            {STATUS_VALUES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-4 overflow-hidden rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  프로젝트
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  slug
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  상태
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  정렬
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                  작업
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {filteredProjects.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">
                    조회 결과가 없습니다.
                  </td>
                </tr>
              )}
              {filteredProjects.map((project) => (
                <tr key={project.id}>
                  <td className="px-4 py-3">
                    <p className="text-sm font-semibold text-gray-900">{project.name}</p>
                    <p className="mt-1 text-xs text-gray-500">{project.id}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{project.slug}</td>
                  <td className="px-4 py-3 text-sm">
                    <Badge intent={resolveStatusIntent(project.status)}>{project.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{project.sort_order}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Button intent="neutral" size="sm" onClick={() => handleStartEdit(project)}>
                        수정
                      </Button>
                      {project.status !== 'ACTIVE' ? (
                        <Button size="sm" onClick={() => handlePublish(project.id)} loading={publishProject.isPending}>
                          활성화
                        </Button>
                      ) : (
                        <Button intent="secondary" size="sm" onClick={() => handleUnpublish(project.id)} loading={unpublishProject.isPending}>
                          비활성화
                        </Button>
                      )}
                      <Button
                        intent="danger"
                        size="sm"
                        onClick={() => handleDelete(project.id, project.name)}
                        loading={deleteProject.isPending}
                      >
                        삭제
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {editingId && (
        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-gray-900">프로젝트 수정</h2>
          <form className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2" onSubmit={handleUpdateProject}>
            <Input
              placeholder="프로젝트명"
              value={editingName}
              onChange={(event) => setEditingName(event.target.value)}
              required
            />
            <Input
              placeholder="slug"
              value={editingSlug}
              onChange={(event) => setEditingSlug(event.target.value)}
              required
            />
            <Input
              placeholder="cover_image_url"
              value={editingCoverImageUrl}
              onChange={(event) => setEditingCoverImageUrl(event.target.value)}
            />
            <Input
              placeholder="sort_order"
              value={editingSortOrder}
              onChange={(event) => setEditingSortOrder(event.target.value)}
            />
            <select
              value={editingStatus}
              onChange={(event) => setEditingStatus(event.target.value as V2ProjectStatus)}
              className={SELECT_CLASS}
            >
              {STATUS_VALUES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
            <div />
            <div className="md:col-span-2">
              <Textarea
                placeholder="설명"
                value={editingDescription}
                onChange={(event) => setEditingDescription(event.target.value)}
                rows={3}
              />
            </div>
            <div className="md:col-span-2 flex gap-2">
              <Button type="submit" loading={updateProject.isPending}>
                저장
              </Button>
              <Button type="button" intent="neutral" onClick={handleCancelEdit}>
                취소
              </Button>
            </div>
          </form>
        </section>
      )}
    </div>
  );
}

