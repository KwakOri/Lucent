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
const MEDIA_ASSET_KIND_LABELS: Record<V2MediaAssetKind, string> = {
  IMAGE: '이미지',
  VIDEO: '비디오',
  AUDIO: '오디오',
  DOCUMENT: '문서',
  ARCHIVE: '압축 파일',
  FILE: '기타 파일',
};
const MEDIA_ASSET_STATUS_LABELS: Record<V2MediaAssetStatus, string> = {
  ACTIVE: '사용 가능',
  INACTIVE: '비활성',
  ARCHIVED: '보관됨',
};
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

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
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
          <h1 className="text-2xl font-bold text-gray-900">v2 미디어 에셋 개요</h1>
          <p className="mt-1 text-sm text-gray-500">
            중요 상태와 참조 현황만 먼저 보여주고, 경로 같은 세부 정보는 펼쳐서 확인할 수 있습니다.
          </p>
        </div>
        <div className="mt-3 sm:mt-0">
          <Badge intent="info" size="md">필터 결과 {filteredAssets.length}개</Badge>
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

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-sm font-medium text-gray-500">전체 파일</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{summary.total}</p>
          <p className="mt-1 text-xs text-gray-500">현재 레지스트리에 등록된 파일 수</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-sm font-medium text-gray-500">참조 중</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{summary.referencedCount}</p>
          <p className="mt-1 text-xs text-gray-500">상품 또는 디지털 에셋과 연결된 파일</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-sm font-medium text-gray-500">고아 파일</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{summary.orphanCount}</p>
          <p className="mt-1 text-xs text-gray-500">다른 곳에서 쓰지 않아 정리할 수 있는 파일</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-sm font-medium text-gray-500">사용 가능</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{summary.activeCount}</p>
          <p className="mt-1 text-xs text-gray-500">현재 ACTIVE 상태인 파일</p>
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.4fr)_220px_220px_auto]">
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
                {value === 'ALL' ? '모든 종류' : MEDIA_ASSET_KIND_LABELS[value]}
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
                {value === 'ALL' ? '모든 상태' : MEDIA_ASSET_STATUS_LABELS[value]}
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
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">레지스트리 목록</h2>
            <p className="mt-1 text-sm text-gray-500">
              리스트에서는 이름, 상태, 연결 여부 같은 핵심 정보만 먼저 보여줍니다.
            </p>
          </div>
        </div>

        {filteredAssets.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-gray-200 bg-gray-50 px-6 py-10 text-center text-sm text-gray-500">
            조건에 맞는 media asset이 없습니다.
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {filteredAssets.map((asset) => {
              const referenceSummary = getReferenceSummary(asset);
              return (
                <article
                  key={asset.id}
                  className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
                >
                  <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_220px_220px_auto] xl:items-start">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-semibold text-gray-900 break-all">
                          {asset.file_name}
                        </h3>
                        <Badge intent="default">{MEDIA_ASSET_KIND_LABELS[asset.asset_kind]}</Badge>
                        <Badge intent={getStatusIntent(asset.status)}>
                          {MEDIA_ASSET_STATUS_LABELS[asset.status]}
                        </Badge>
                        <Badge intent={referenceSummary.is_orphan ? 'warning' : 'success'}>
                          {referenceSummary.is_orphan ? '고아 파일' : '참조 중'}
                        </Badge>
                      </div>

                      <p className="mt-2 text-sm text-gray-600">
                        {formatBytes(asset.file_size)}
                        {asset.mime_type ? ` · ${asset.mime_type}` : ''}
                        {asset.updated_at ? ` · ${formatDate(asset.updated_at)} 갱신` : ''}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-3 text-sm">
                        {asset.public_url ? (
                          <a
                            href={asset.public_url}
                            target="_blank"
                            rel="noreferrer"
                            className="font-medium text-blue-600 hover:underline"
                          >
                            파일 열기
                          </a>
                        ) : (
                          <span className="text-gray-400">public URL 없음</span>
                        )}
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        연결 요약
                      </p>
                      <p className="mt-2 text-sm font-medium text-gray-900">
                        {referenceSummary.is_orphan
                          ? '현재 연결된 위치가 없습니다.'
                          : `총 ${referenceSummary.total_reference_count}곳에서 사용 중`}
                      </p>
                      <p className="mt-1 text-sm text-gray-600">
                        상품 {referenceSummary.product_media_count} · 디지털 {referenceSummary.digital_asset_count}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        정리 판단
                      </p>
                      <p className="mt-2 text-sm text-gray-700">
                        {referenceSummary.is_orphan
                          ? '다른 곳에서 쓰지 않으므로 정리 후보입니다.'
                          : '현재 연결 중이라 이 화면에서는 제거할 수 없습니다.'}
                      </p>
                    </div>

                    <div className="flex xl:justify-end">
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
                  </div>

                  <details className="mt-4 rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
                    <summary className="cursor-pointer list-none text-sm font-medium text-gray-700">
                      세부 정보 보기
                    </summary>
                    <div className="mt-3 grid gap-3 text-sm text-gray-600 sm:grid-cols-2">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                          저장 경로
                        </p>
                        <p className="mt-1 break-all">{asset.storage_path}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                          등록 정보
                        </p>
                        <p className="mt-1">스토리지 {asset.storage_provider}</p>
                        <p className="mt-1">ID {asset.id}</p>
                      </div>
                    </div>
                  </details>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
