'use client';

import { Loading } from '@/components/ui/loading';
import { useV2AdminUnifiedAuditLogs } from '@/lib/client/hooks/useV2AdminOps';
import { LogsTable } from '@/src/components/admin/logs/LogsTable';

export default function AdminLogsPage() {
  const {
    data: logsResponse,
    isLoading: isLogsLoading,
    error: logsError,
  } = useV2AdminUnifiedAuditLogs({
    limit: 200,
  });

  if (isLogsLoading) {
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

  const logs = logsResponse?.items || [];
  const statsView = {
    total: logs.length,
    legacy: logs.filter((log) => log.source_table === 'logs').length,
    actions: logs.filter((log) => log.source_table === 'v2_admin_action_logs').length,
    transitions: logs.filter((log) => log.source_table === 'v2_admin_state_transition_logs')
      .length,
    approvals: logs.filter((log) => log.source_table === 'v2_admin_approval_requests')
      .length,
    domainEvents: logs.filter(
      (log) =>
        log.source_table === 'v2_order_notifications' ||
        log.source_table === 'v2_digital_entitlement_events' ||
        log.source_table === 'v2_order_financial_events',
    ).length,
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">로그 조회</h1>
        <p className="mt-1 text-sm text-gray-500">
          legacy + v2 운영/감사 로그를 통합 조회합니다
        </p>
      </div>

      <div className="mb-8 bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-base font-semibold leading-6 text-gray-900 mb-4">
            로그 통계
          </h3>
          <dl className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-6">
            <div className="overflow-hidden rounded-lg bg-gray-50 px-4 py-5">
              <dt className="truncate text-sm font-medium text-gray-500">총 이벤트</dt>
              <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">
                {statsView.total}
              </dd>
            </div>
            <div className="overflow-hidden rounded-lg bg-blue-50 px-4 py-5">
              <dt className="truncate text-sm font-medium text-blue-600">Legacy Logs</dt>
              <dd className="mt-1 text-3xl font-semibold tracking-tight text-blue-900">
                {statsView.legacy}
              </dd>
            </div>
            <div className="overflow-hidden rounded-lg bg-green-50 px-4 py-5">
              <dt className="truncate text-sm font-medium text-green-600">Action</dt>
              <dd className="mt-1 text-3xl font-semibold tracking-tight text-green-900">
                {statsView.actions}
              </dd>
            </div>
            <div className="overflow-hidden rounded-lg bg-indigo-50 px-4 py-5">
              <dt className="truncate text-sm font-medium text-indigo-600">Transition</dt>
              <dd className="mt-1 text-3xl font-semibold tracking-tight text-indigo-900">
                {statsView.transitions}
              </dd>
            </div>
            <div className="overflow-hidden rounded-lg bg-amber-50 px-4 py-5">
              <dt className="truncate text-sm font-medium text-amber-700">Approval</dt>
              <dd className="mt-1 text-3xl font-semibold tracking-tight text-amber-900">
                {statsView.approvals}
              </dd>
            </div>
            <div className="overflow-hidden rounded-lg bg-rose-50 px-4 py-5">
              <dt className="truncate text-sm font-medium text-rose-700">도메인 이벤트</dt>
              <dd className="mt-1 text-3xl font-semibold tracking-tight text-rose-900">
                {statsView.domainEvents}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <LogsTable logs={logs} />
    </div>
  );
}
