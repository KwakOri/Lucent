'use client';

import type { V2MediaAssetUploadProgress } from '@/lib/client/api/v2-catalog-admin.api';

type UploadStage = V2MediaAssetUploadProgress['stage'] | 'linking' | 'complete';

export type VariantUploadState = {
  stage: UploadStage;
  fileName: string;
  loaded: number;
  total: number;
  percent: number;
};

type UploadProgressCardProps = {
  state: VariantUploadState;
};

function formatBytes(value: number): string {
  if (!Number.isFinite(value) || value <= 0) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB'];
  let size = value;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size >= 10 || unitIndex === 0 ? size.toFixed(0) : size.toFixed(1)} ${units[unitIndex]}`;
}

function getStageLabel(stage: UploadStage): string {
  switch (stage) {
    case 'preparing':
      return '업로드 준비 중';
    case 'uploading':
      return '오디오 업로드 중';
    case 'finalizing':
      return '파일 확인 중';
    case 'linking':
      return '옵션에 연결 중';
    case 'complete':
      return '업로드 완료';
    default:
      return '업로드 진행 중';
  }
}

function getStageDescription(state: VariantUploadState): string {
  if (state.stage === 'preparing') {
    return '파일 전송을 시작하고 있습니다.';
  }
  if (state.stage === 'uploading') {
    return `${formatBytes(state.loaded)} / ${formatBytes(state.total)} 전송됨`;
  }
  if (state.stage === 'finalizing') {
    return 'R2 업로드 완료 후 파일 상태를 확인하고 있습니다.';
  }
  if (state.stage === 'linking') {
    return '업로드한 파일을 옵션의 기본 오디오로 연결하고 있습니다.';
  }
  return '이제 상세 페이지에서 연결된 파일을 확인할 수 있습니다.';
}

export function UploadProgressCard({ state }: UploadProgressCardProps) {
  return (
    <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-blue-900">{getStageLabel(state.stage)}</p>
          <p className="mt-1 text-sm text-blue-900/80">{state.fileName}</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-blue-900">{state.percent}%</p>
          <p className="text-xs text-blue-800/80">{getStageDescription(state)}</p>
        </div>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-blue-100">
        <div
          className="h-full rounded-full bg-blue-600 transition-[width] duration-200 ease-out"
          style={{ width: `${Math.max(4, Math.min(100, state.percent))}%` }}
        />
      </div>
    </div>
  );
}
