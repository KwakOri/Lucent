'use client';

import { Loading } from '@/components/ui/loading';
import { useV2AdminUnifiedAuditLogs } from '@/lib/client/hooks/useV2AdminOps';
import {
  AdminPageHeader,
  AdminStatCard,
  adminLegacyBridgeClass,
} from '@/src/components/admin/AdminDesignSystem';
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
    <div className={`${adminLegacyBridgeClass} space-y-6`}>
      <AdminPageHeader
        eyebrow="audit logs"
        title="로그 조회"
        description="legacy + v2 운영/감사 로그를 통합 조회합니다."
      />

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <AdminStatCard label="총 이벤트" value={statsView.total} />
        <AdminStatCard label="Legacy Logs" value={statsView.legacy} />
        <AdminStatCard label="Action" value={statsView.actions} />
        <AdminStatCard label="Transition" value={statsView.transitions} />
        <AdminStatCard label="Approval" value={statsView.approvals} />
        <AdminStatCard label="도메인 이벤트" value={statsView.domainEvents} />
      </section>

      <LogsTable logs={logs} />
    </div>
  );
}
