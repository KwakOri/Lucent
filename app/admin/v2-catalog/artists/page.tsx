'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loading } from '@/components/ui/loading';
import {
  AdminPageHeader,
  AdminSurface,
  adminButtonClass,
  adminInputClass,
  adminPrimaryButtonClass,
  adminSelectClass,
  adminTableBodyClass,
  adminTableContainerClass,
  adminTableHeadCellClass,
  adminTableHeadClass,
} from '@/src/components/admin/AdminDesignSystem';
import { useAdminFeedback } from '@/src/components/admin/AdminFeedback';
import type {
  V2Artist,
  V2ArtistStatus,
  V2ProjectArtist,
} from '@/lib/client/api/v2-catalog-admin.api';
import {
  useLinkV2ArtistToProject,
  useUnlinkV2ArtistFromProject,
  useV2AdminArtists,
  useV2AdminProjects,
} from '@/lib/client/hooks/useV2CatalogAdmin';

type ArtistFilterStatus = 'ALL' | V2ArtistStatus;
type ArtistSortKey = 'UPDATED_DESC' | 'NAME_ASC';

const ARTIST_STATUS_VALUES: V2ArtistStatus[] = ['DRAFT', 'ACTIVE', 'ARCHIVED'];

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

function resolveArtistStatusIntent(
  status: V2ArtistStatus,
): 'default' | 'success' | 'warning' | 'error' | 'info' {
  if (status === 'ACTIVE') {
    return 'success';
  }
  if (status === 'DRAFT') {
    return 'warning';
  }
  if (status === 'ARCHIVED') {
    return 'error';
  }
  return 'default';
}

function formatDateTime(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function isProjectArtist(item: unknown): item is V2ProjectArtist {
  if (!item || typeof item !== 'object') {
    return false;
  }
  const record = item as Record<string, unknown>;
  return typeof record.project_id === 'string' && typeof record.artist_id === 'string';
}

export default function V2CatalogArtistsPage() {
  const router = useRouter();
  const { confirm } = useAdminFeedback();
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<ArtistFilterStatus>('ALL');
  const [sortKey, setSortKey] = useState<ArtistSortKey>('UPDATED_DESC');

  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const [linkArtistId, setLinkArtistId] = useState('');
  const [linkRole, setLinkRole] = useState('ARTIST');
  const [linkSortOrder, setLinkSortOrder] = useState('0');
  const [linkPrimary, setLinkPrimary] = useState(false);
  const [linkStatus, setLinkStatus] = useState<V2ArtistStatus>('ACTIVE');
  const [editingRelationArtistId, setEditingRelationArtistId] = useState<string | null>(
    null,
  );

  const {
    data: projects,
    isLoading: projectsLoading,
    error: projectsError,
  } = useV2AdminProjects();
  const {
    data: artistsRaw,
    isLoading: artistsLoading,
    error: artistsError,
  } = useV2AdminArtists();

  const activeProjectId = useMemo(() => {
    if (selectedProjectId && (projects || []).some((project) => project.id === selectedProjectId)) {
      return selectedProjectId;
    }
    return projects?.[0]?.id ?? null;
  }, [projects, selectedProjectId]);

  const {
    data: projectArtistsRaw,
    isLoading: projectArtistsLoading,
    error: projectArtistsError,
  } = useV2AdminArtists({
    projectId: activeProjectId || undefined,
  });

  const linkArtist = useLinkV2ArtistToProject();
  const unlinkArtist = useUnlinkV2ArtistFromProject();

  const artists = useMemo(() => {
    const list = (artistsRaw || []) as unknown[];
    return list.filter((item) => !isProjectArtist(item)) as V2Artist[];
  }, [artistsRaw]);

  const linkedArtists = useMemo(() => {
    const list = (projectArtistsRaw || []) as unknown[];
    return list.filter(isProjectArtist);
  }, [projectArtistsRaw]);

  const filteredArtists = useMemo(() => {
    const search = keyword.trim().toLowerCase();
    const filtered = artists.filter((artist) => {
      if (statusFilter !== 'ALL' && artist.status !== statusFilter) {
        return false;
      }
      if (!search) {
        return true;
      }
      const haystack = `${artist.name} ${artist.slug} ${artist.id}`.toLowerCase();
      return haystack.includes(search);
    });

    return filtered.sort((left, right) => {
      if (sortKey === 'NAME_ASC') {
        return left.name.localeCompare(right.name, 'ko');
      }
      return right.updated_at.localeCompare(left.updated_at);
    });
  }, [artists, keyword, sortKey, statusFilter]);

  const activeProjectName = useMemo(() => {
    if (!activeProjectId) {
      return null;
    }
    return (projects || []).find((project) => project.id === activeProjectId)?.name || null;
  }, [activeProjectId, projects]);

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

  const resetLinkForm = () => {
    setLinkArtistId('');
    setLinkRole('ARTIST');
    setLinkSortOrder('0');
    setLinkPrimary(false);
    setLinkStatus('ACTIVE');
    setEditingRelationArtistId(null);
  };

  const handleSubmitLink = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeProjectId) {
      setErrorMessage('연결할 프로젝트를 선택하세요.');
      return;
    }
    if (!linkArtistId.trim()) {
      setErrorMessage('연결할 아티스트를 선택하세요.');
      return;
    }
    await runAction(async () => {
      await linkArtist.mutateAsync({
        projectId: activeProjectId,
        artistId: linkArtistId.trim(),
        data: {
          role: linkRole.trim() || 'ARTIST',
          sort_order: parseNonNegativeInteger(linkSortOrder, 'sort_order'),
          is_primary: linkPrimary,
          status: linkStatus,
        },
      });
      setMessage(
        editingRelationArtistId
          ? '프로젝트-아티스트 연결 정보를 수정했습니다.'
          : '프로젝트에 아티스트를 연결했습니다.',
      );
      resetLinkForm();
    });
  };

  const handleStartEditRelation = (relation: V2ProjectArtist) => {
    clearNotice();
    setLinkArtistId(relation.artist_id);
    setLinkRole(relation.role);
    setLinkSortOrder(String(relation.sort_order));
    setLinkPrimary(relation.is_primary);
    setLinkStatus(relation.status);
    setEditingRelationArtistId(relation.artist_id);
  };

  const handleUnlink = async (artistId: string, artistName: string) => {
    if (!activeProjectId) {
      return;
    }
    const confirmed = await confirm({
      title: '아티스트 연결 해제',
      message: `"${artistName}" 연결을 해제하시겠습니까?`,
      description: '선택한 프로젝트와 아티스트의 연결만 해제됩니다.',
      confirmText: '해제',
      tone: 'warning',
    });
    if (!confirmed) {
      return;
    }
    await runAction(async () => {
      await unlinkArtist.mutateAsync({
        projectId: activeProjectId,
        artistId,
      });
      if (editingRelationArtistId === artistId) {
        resetLinkForm();
      }
      setMessage('프로젝트-아티스트 연결을 해제했습니다.');
    });
  };

  if (projectsLoading || artistsLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loading size="lg" text="v2 아티스트 정보를 불러오는 중입니다." />
      </div>
    );
  }

  if (projectsError || artistsError || !projects || !artists) {
    return (
      <div className="rounded-[20px] border border-red-200 bg-red-50 p-5 text-sm font-bold text-red-700">
        아티스트 운영 데이터를 불러오지 못했습니다.
      </div>
    );
  }

  return (
    <div className="space-y-5 text-[#1a1a2e]">
      <AdminPageHeader
        eyebrow="artist catalog"
        title="v2 아티스트 관리"
        description="아티스트 목록과 프로젝트 연결 상태를 운영합니다."
        actions={
          <>
          <Badge intent="info" size="md">
            총 {artists.length}명
          </Badge>
          <Button
            className={adminPrimaryButtonClass}
            onClick={() => router.push('/admin/v2-catalog/artists/new')}
          >
            새 아티스트
          </Button>
          </>
        }
      />

      {message && (
        <div className="rounded-[14px] border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
          {message}
        </div>
      )}
      {errorMessage && (
        <div className="rounded-[14px] border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {errorMessage}
        </div>
      )}

      <AdminSurface padding="md">
        <div className="flex flex-wrap gap-3">
          <Input
            placeholder="이름/slug 검색"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            className={`max-w-sm ${adminInputClass}`}
          />
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as ArtistFilterStatus)}
            className={adminSelectClass}
          >
            <option value="ALL">전체 상태</option>
            {ARTIST_STATUS_VALUES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <select
            value={sortKey}
            onChange={(event) => setSortKey(event.target.value as ArtistSortKey)}
            className={adminSelectClass}
          >
            <option value="UPDATED_DESC">최근 수정순</option>
            <option value="NAME_ASC">이름순</option>
          </select>
        </div>

        <div className={`mt-4 ${adminTableContainerClass}`}>
          <table className="min-w-full">
            <thead className={adminTableHeadClass}>
              <tr>
                <th className={adminTableHeadCellClass}>
                  아티스트
                </th>
                <th className={adminTableHeadCellClass}>
                  상태
                </th>
                <th className={adminTableHeadCellClass}>
                  수정일
                </th>
                <th className={`${adminTableHeadCellClass} text-right`}>
                  작업
                </th>
              </tr>
            </thead>
            <tbody className={adminTableBodyClass}>
              {filteredArtists.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-sm font-medium text-[#1a1a2e]/45">
                    조회 결과가 없습니다.
                  </td>
                </tr>
              )}
              {filteredArtists.map((artist) => (
                <tr key={artist.id}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {artist.profile_image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element -- project policy uses native img instead of next/image.
                        <img
                          src={artist.profile_image_url}
                          alt={artist.name}
                          className="h-10 w-10 rounded-full object-cover ring-1 ring-[#e7e3d3]"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-[#f5f3e8] ring-1 ring-[#e7e3d3]" />
                      )}
                      <div>
                        <p className="text-sm font-black text-[#1a1a2e]">{artist.name}</p>
                        <p className="mt-1 text-xs font-medium text-[#1a1a2e]/45">{artist.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge intent={resolveArtistStatusIntent(artist.status)}>{artist.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-[#1a1a2e]/60">
                    {formatDateTime(artist.updated_at)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Button
                        intent="neutral"
                        size="sm"
                        className={adminButtonClass}
                        onClick={() => router.push(`/admin/v2-catalog/artists/${artist.id}/edit`)}
                      >
                        수정
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminSurface>

      <AdminSurface padding="md">
        <div className="sm:flex sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-black text-[#1a1a2e]">프로젝트 연결 관리</h2>
            <p className="mt-1 text-sm font-medium text-[#1a1a2e]/55">
              프로젝트별 아티스트 라인업(정렬/Primary/상태)을 관리합니다.
            </p>
          </div>
          <div className="mt-3 sm:mt-0 sm:min-w-72">
            <select
              value={activeProjectId || ''}
              onChange={(event) => setSelectedProjectId(event.target.value || null)}
              className={adminSelectClass}
            >
              {(projects || []).map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name} ({project.slug})
                </option>
              ))}
            </select>
          </div>
        </div>

        {!activeProjectId ? (
          <div className="mt-4 rounded-[14px] border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-amber-700">
            연결할 프로젝트가 없습니다. 먼저 v2 프로젝트를 생성하세요.
          </div>
        ) : (
          <>
            <div className="mt-3 text-sm font-medium text-[#1a1a2e]/60">
              현재 프로젝트: <span className="font-black text-[#1a1a2e]">{activeProjectName}</span>
            </div>

            <form className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-4" onSubmit={handleSubmitLink}>
              <select
                value={linkArtistId}
                onChange={(event) => setLinkArtistId(event.target.value)}
                className={adminSelectClass}
                required
                disabled={!!editingRelationArtistId}
              >
                <option value="">아티스트 선택</option>
                {artists.map((artist) => (
                  <option key={artist.id} value={artist.id}>
                    {artist.name} ({artist.slug})
                  </option>
                ))}
              </select>
              <Input
                placeholder="role (예: ARTIST, PRODUCER)"
                value={linkRole}
                onChange={(event) => setLinkRole(event.target.value)}
                className={adminInputClass}
              />
              <Input
                placeholder="sort_order"
                value={linkSortOrder}
                onChange={(event) => setLinkSortOrder(event.target.value)}
                className={adminInputClass}
              />
              <select
                value={linkStatus}
                onChange={(event) => setLinkStatus(event.target.value as V2ArtistStatus)}
                className={adminSelectClass}
              >
                {ARTIST_STATUS_VALUES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
              <label className="flex items-center gap-2 rounded-[12px] border border-[#e7e3d3] bg-[#fdfcf4] px-3 text-sm font-medium text-[#1a1a2e]/65">
                <input
                  type="checkbox"
                  checked={linkPrimary}
                  onChange={(event) => setLinkPrimary(event.target.checked)}
                />
                Primary 지정
              </label>
              <div className="lg:col-span-3 flex gap-2">
                <Button type="submit" className={adminPrimaryButtonClass} loading={linkArtist.isPending}>
                  {editingRelationArtistId ? '연결 정보 저장' : '아티스트 연결'}
                </Button>
                {editingRelationArtistId && (
                  <Button type="button" intent="neutral" className={adminButtonClass} onClick={resetLinkForm}>
                    수정 취소
                  </Button>
                )}
              </div>
            </form>

            <div className={`mt-4 ${adminTableContainerClass}`}>
              <table className="min-w-full">
                <thead className={adminTableHeadClass}>
                  <tr>
                    <th className={adminTableHeadCellClass}>
                      아티스트
                    </th>
                    <th className={adminTableHeadCellClass}>
                      역할/상태
                    </th>
                    <th className={adminTableHeadCellClass}>
                      정렬/Primary
                    </th>
                    <th className={`${adminTableHeadCellClass} text-right`}>
                      작업
                    </th>
                  </tr>
                </thead>
                <tbody className={adminTableBodyClass}>
                  {projectArtistsLoading && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-sm font-medium text-[#1a1a2e]/45">
                        연결 데이터를 불러오는 중입니다.
                      </td>
                    </tr>
                  )}
                  {!projectArtistsLoading && projectArtistsError && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-sm text-red-600">
                        프로젝트 연결 데이터를 불러오지 못했습니다.
                      </td>
                    </tr>
                  )}
                  {!projectArtistsLoading && !projectArtistsError && linkedArtists.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-sm font-medium text-[#1a1a2e]/45">
                        연결된 아티스트가 없습니다.
                      </td>
                    </tr>
                  )}
                  {!projectArtistsLoading &&
                    !projectArtistsError &&
                    linkedArtists.map((relation) => (
                      <tr key={relation.id}>
                        <td className="px-4 py-3">
                          <p className="text-sm font-black text-[#1a1a2e]">
                            {relation.artist?.name || relation.artist_id}
                          </p>
                          <p className="mt-1 text-xs font-medium text-[#1a1a2e]/45">
                            {relation.artist?.slug || relation.artist_id}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            <Badge intent="default">{relation.role}</Badge>
                            <Badge intent={resolveArtistStatusIntent(relation.status)}>
                              {relation.status}
                            </Badge>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-[#1a1a2e]/60">
                          <p>sort: {relation.sort_order}</p>
                          <p className="mt-1">primary: {relation.is_primary ? '예' : '아니오'}</p>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <Button
                              intent="neutral"
                              size="sm"
                              className={adminButtonClass}
                              onClick={() => handleStartEditRelation(relation)}
                            >
                              수정
                            </Button>
                            <Button
                              intent="danger"
                              size="sm"
                              className="!rounded-[10px] !bg-[#ca2a30] !font-bold !text-white hover:!bg-[#b0242a]"
                              onClick={() =>
                                handleUnlink(
                                  relation.artist_id,
                                  relation.artist?.name || relation.artist_id,
                                )
                              }
                              loading={unlinkArtist.isPending}
                            >
                              해제
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </AdminSurface>
    </div>
  );
}
