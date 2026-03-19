'use client';

import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loading } from '@/components/ui/loading';
import type {
  V2MediaAsset,
  V2MediaAssetKind,
  V2MediaAssetStatus,
} from '@/lib/client/api/v2-catalog-admin.api';
import {
  useDeleteV2MediaAsset,
  useV2AdminMediaAssets,
} from '@/lib/client/hooks/useV2CatalogAdmin';

const MEDIA_ASSET_KIND_VALUES: Array<V2MediaAssetKind | 'ALL'> = [
  'ALL',
  'IMAGE',
  'VIDEO',
  'AUDIO',
  'DOCUMENT',
  'ARCHIVE',
  'FILE',
];
const MEDIA_ASSET_STATUS_VALUES: Array<V2MediaAssetStatus | 'ALL'> = [
  'ALL',
  'ACTIVE',
  'INACTIVE',
  'ARCHIVED',
];
const SELECT_CLASS =
  'h-11 rounded-lg border border-neutral-200 bg-white px-3 text-sm text-text-primary focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20';

function formatBytes(value: number | null): string {
  if (!value || value <= 0) {
    return '-';
  }
  if (value < 1024) {
    return `${value} B`;
  }
  const kb = value / 1024;
  if (kb < 1024) {
    return `${kb.toFixed(1)} KB`;
  }
  const mb = kb / 1024;
  if (mb < 1024) {
    return `${mb.toFixed(1)} MB`;
  }
  return `${(mb / 1024).toFixed(1)} GB`;
}

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

function getStatusIntent(
  status: V2MediaAssetStatus,
): 'default' | 'success' | 'warning' | 'error' | 'info' {
  if (status === 'ACTIVE') {
    return 'success';
  }
  if (status === 'INACTIVE') {
    return 'info';
  }
  if (status === 'ARCHIVED') {
    return 'warning';
  }
  return 'default';
}

function getReferenceSummary(asset: V2MediaAsset) {
  return (
    asset.reference_summary ?? {
      product_media_count: 0,
      digital_asset_count: 0,
      total_reference_count: 0,
      is_orphan: true,
    }
  );
}

export default function V2CatalogAssetsPage() {
  const [search, setSearch] = useState('');
  const [kindFilter, setKindFilter] = useState<V2MediaAssetKind | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<V2MediaAssetStatus | 'ALL'>('ALL');
  const [showOrphansOnly, setShowOrphansOnly] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    data: mediaAssets,
    isLoading,
    error,
  } = useV2AdminMediaAssets();
  const deleteMediaAsset = useDeleteV2MediaAsset();

  const filteredAssets = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return (mediaAssets || []).filter((asset) => {
      const referenceSummary = getReferenceSummary(asset);
      if (kindFilter !== 'ALL' && asset.asset_kind !== kindFilter) {
        return false;
      }
      if (statusFilter !== 'ALL' && asset.status !== statusFilter) {
        return false;
      }
      if (showOrphansOnly && !referenceSummary.is_orphan) {
        return false;
      }
      if (!normalizedSearch) {
        return true;
      }
      return [asset.file_name, asset.storage_path, asset.mime_type || '']
        .join(' ')
        .toLowerCase()
        .includes(normalizedSearch);
    });
  }, [kindFilter, mediaAssets, search, showOrphansOnly, statusFilter]);

  const summary = useMemo(() => {
    const assets = mediaAssets || [];
    const orphanCount = assets.filter((asset) => getReferenceSummary(asset).is_orphan).length;
    const activeCount = assets.filter((asset) => asset.status === 'ACTIVE').length;
    return {
      total: assets.length,
      orphanCount,
      referencedCount: assets.length - orphanCount,
      activeCount,
    };
  }, [mediaAssets]);

  const handleDeleteMediaAsset = async (asset: V2MediaAsset) => {
    const referenceSummary = getReferenceSummary(asset);
    if (!referenceSummary.is_orphan) {
      setErrorMessage('참조 중인 media asset은 이 화면에서 제거할 수 없습니다.');
      return;
    }

    const confirmed = window.confirm(
      `\"${asset.file_name}\" 고아 파일을 레지스트리에서 제거할까요? R2 원본 파일도 함께 삭제됩니다.`,
    );
    if (!confirmed) {
      return;
    }

    setMessage(null);
    setErrorMessage(null);

    try {
      await deleteMediaAsset.mutateAsync(asset.id);
      setMessage(`고아 파일 \"${asset.file_name}\"을(를) 제거했습니다.`);
    } catch (deleteError) {
      setErrorMessage(getErrorMessage(deleteError));
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loading size="lg" text="미디어 에셋 레지스트리를 불러오는 중입니다." />
      </div>
    );
  }

  if (error || !mediaAssets) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
        미디어 에셋 레지스트리를 불러오지 못했습니다.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">v2 미디어 에셋 레지스트리</h1>
          <p className="mt-1 text-sm text-gray-500">
            업로드/연결은 상품 상세에서 처리하고, 이 화면에서는 파일 상태 조회와 고아 파일 정리에 집중합니다.
          </p>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 sm:mt-0">
          <Badge intent="info" size="md">전체 {summary.total}개</Badge>
          <Badge intent="success" size="md">참조 중 {summary.referencedCount}개</Badge>
          <Badge intent="warning" size="md">고아 파일 {summary.orphanCount}개</Badge>
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
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.3fr)_200px_200px_auto]">
          <Input
            placeholder="파일명, 경로, MIME 타입으로 검색"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <select
            value={kindFilter}
            onChange={(event) => setKindFilter(event.target.value as V2MediaAssetKind | 'ALL')}
            className={SELECT_CLASS}
          >
            {MEDIA_ASSET_KIND_VALUES.map((value) => (
              <option key={value} value={value}>
                {value === 'ALL' ? '모든 종류' : value}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as V2MediaAssetStatus | 'ALL')
            }
            className={SELECT_CLASS}
          >
            {MEDIA_ASSET_STATUS_VALUES.map((value) => (
              <option key={value} value={value}>
                {value === 'ALL' ? '모든 상태' : value}
              </option>
            ))}
          </select>
          <Button
            intent={showOrphansOnly ? 'primary' : 'neutral'}
            onClick={() => setShowOrphansOnly((current) => !current)}
          >
            {showOrphansOnly ? '고아 파일만 보는 중' : '고아 파일만 보기'}
          </Button>
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">레지스트리 현황</h2>
            <p className="mt-1 text-sm text-gray-500">
              현재 등록된 파일의 상태와 참조 현황을 확인하고, 다른 곳에서 쓰지 않는 고아 파일만 제거할 수 있습니다.
            </p>
          </div>
          <Badge intent="default" size="md">
            필터 결과 {filteredAssets.length}개
          </Badge>
        </div>

        <div className="mt-4 overflow-hidden rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  파일
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  상태
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  참조 현황
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  경로
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                  작업
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {filteredAssets.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-sm text-gray-500">
                    조건에 맞는 media asset이 없습니다.
                  </td>
                </tr>
              ) : (
                filteredAssets.map((asset) => {
                  const referenceSummary = getReferenceSummary(asset);
                  return (
                    <tr key={asset.id}>
                      <td className="px-4 py-4 align-top">
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-gray-900">{asset.file_name}</p>
                          <p className="text-xs text-gray-500">
                            {asset.mime_type || 'MIME 없음'} · {formatBytes(asset.file_size)}
                          </p>
                          {asset.public_url ? (
                            <a
                              href={asset.public_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-block text-xs text-blue-600 hover:underline"
                            >
                              파일 열기
                            </a>
                          ) : (
                            <p className="text-xs text-gray-400">public URL 없음</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <div className="flex flex-wrap gap-2">
                          <Badge intent="default">{asset.asset_kind}</Badge>
                          <Badge intent={getStatusIntent(asset.status)}>{asset.status}</Badge>
                          <Badge intent={referenceSummary.is_orphan ? 'warning' : 'success'}>
                            {referenceSummary.is_orphan ? '고아 파일' : '참조 중'}
                          </Badge>
                        </div>
                      </td>
                      <td className="px-4 py-4 align-top text-sm text-gray-700">
                        <p>상품 미디어 {referenceSummary.product_media_count}건</p>
                        <p>디지털 에셋 {referenceSummary.digital_asset_count}건</p>
                        <p className="mt-1 text-xs text-gray-500">
                          총 {referenceSummary.total_reference_count}건 연결됨
                        </p>
                      </td>
                      <td className="px-4 py-4 align-top text-xs text-gray-600">
                        <p className="break-all">{asset.storage_path}</p>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <div className="flex justify-end gap-2">
                          {referenceSummary.is_orphan ? (
                            <Button
                              intent="danger"
                              size="sm"
                              onClick={() => handleDeleteMediaAsset(asset)}
                              loading={deleteMediaAsset.isPending}
                            >
                              고아 파일 제거
                            </Button>
                          ) : (
                            <Button intent="neutral" size="sm" disabled>
                              참조 중
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
