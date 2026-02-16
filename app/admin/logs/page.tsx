'use client';

import { Loading } from '@/components/ui/loading';
import { useLogs, useLogStats } from '@/lib/client/hooks/useLogs';
import { LogsTable } from '@/src/components/admin/logs/LogsTable';

function readCount(
  bucket: Record<string, number> | undefined,
  candidates: string[],
): number {
  if (!bucket) {
    return 0;
  }

  return candidates.reduce((sum, key) => {
    const upper = key.toUpperCase();
    const lower = key.toLowerCase();
    return sum + (bucket[key] || bucket[upper] || bucket[lower] || 0);
  }, 0);
}

export default function AdminLogsPage() {
  const { data: logsResponse, isLoading: isLogsLoading, error: logsError } = useLogs({
    limit: 100,
  });
  const { data: stats, isLoading: isStatsLoading } = useLogStats();

  if (isLogsLoading || isStatsLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loading size="lg" />
      </div>
    );
  }

  if (logsError) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">로그를 불러오는데 실패했습니다.</p>
      </div>
    );
  }

  const logs = logsResponse?.data || [];
  const statsView = {
    total: stats?.total || logs.length,
    auth: readCount(stats?.byCategory, ['AUTH', 'auth']),
    order: readCount(stats?.byCategory, ['ORDER', 'order']),
    download: readCount(stats?.byCategory, ['DOWNLOAD', 'download']),
    security: readCount(stats?.byCategory, ['SECURITY', 'security']),
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">로그 조회</h1>
        <p className="mt-1 text-sm text-gray-500">시스템 이벤트 로그를 조회합니다</p>
      </div>

      <div className="mb-8 bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-base font-semibold leading-6 text-gray-900 mb-4">
            로그 통계
          </h3>
          <dl className="grid grid-cols-1 gap-5 sm:grid-cols-5">
            <div className="overflow-hidden rounded-lg bg-gray-50 px-4 py-5">
              <dt className="truncate text-sm font-medium text-gray-500">총 이벤트</dt>
              <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">
                {statsView.total}
              </dd>
            </div>
            <div className="overflow-hidden rounded-lg bg-blue-50 px-4 py-5">
              <dt className="truncate text-sm font-medium text-blue-600">인증</dt>
              <dd className="mt-1 text-3xl font-semibold tracking-tight text-blue-900">
                {statsView.auth}
              </dd>
            </div>
            <div className="overflow-hidden rounded-lg bg-green-50 px-4 py-5">
              <dt className="truncate text-sm font-medium text-green-600">주문</dt>
              <dd className="mt-1 text-3xl font-semibold tracking-tight text-green-900">
                {statsView.order}
              </dd>
            </div>
            <div className="overflow-hidden rounded-lg bg-purple-50 px-4 py-5">
              <dt className="truncate text-sm font-medium text-purple-600">다운로드</dt>
              <dd className="mt-1 text-3xl font-semibold tracking-tight text-purple-900">
                {statsView.download}
              </dd>
            </div>
            <div className="overflow-hidden rounded-lg bg-red-50 px-4 py-5">
              <dt className="truncate text-sm font-medium text-red-600">보안</dt>
              <dd className="mt-1 text-3xl font-semibold tracking-tight text-red-900">
                {statsView.security}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <LogsTable logs={logs} />
    </div>
  );
}
