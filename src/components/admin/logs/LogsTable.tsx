'use client';

import { useState } from 'react';
import type { V2AdminUnifiedAuditLog } from '@/lib/client/api/v2-admin-ops.api';

interface LogsTableProps {
  logs: V2AdminUnifiedAuditLog[];
}

const sourceLabels: Record<string, string> = {
  logs: 'Legacy',
  v2_admin_action_logs: 'Action',
  v2_admin_state_transition_logs: 'Transition',
  v2_admin_approval_requests: 'Approval',
  v2_order_notifications: 'Notification',
  v2_digital_entitlement_events: 'Entitlement',
  v2_order_financial_events: 'Financial',
};

const severityColors: Record<string, string> = {
  INFO: 'bg-blue-100 text-blue-800',
  WARNING: 'bg-yellow-100 text-yellow-800',
  ERROR: 'bg-red-100 text-red-800',
  CRITICAL: 'bg-red-200 text-red-900',
};

export function LogsTable({ logs: initialLogs }: LogsTableProps) {
  const [logs] = useState(initialLogs);
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [domainFilter, setDomainFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const domains = Array.from(
    new Set(
      logs
        .map((log) => (log.domain || '').toUpperCase())
        .filter((domain) => domain.length > 0),
    ),
  ).sort();

  const filteredLogs = logs.filter((log) => {
    const normalizedSource = log.source_table;
    const normalizedDomain = (log.domain || '').toUpperCase();
    const normalizedSeverity = (log.severity || '').toUpperCase();

    if (sourceFilter !== 'all' && normalizedSource !== sourceFilter) return false;
    if (domainFilter !== 'all' && normalizedDomain !== domainFilter) return false;
    if (severityFilter !== 'all' && normalizedSeverity !== severityFilter) return false;

    return true;
  });

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-3">
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          className="rounded-md bg-white border-2 border-gray-400 text-gray-900 font-medium py-2 pl-3 pr-10 text-sm focus:border-primary-600 focus:ring-2 focus:ring-primary-500"
        >
          <option value="all">전체 소스</option>
          {Object.keys(sourceLabels).map((source) => (
            <option key={source} value={source}>
              {sourceLabels[source]}
            </option>
          ))}
        </select>

        <select
          value={domainFilter}
          onChange={(e) => setDomainFilter(e.target.value)}
          className="rounded-md bg-white border-2 border-gray-400 text-gray-900 font-medium py-2 pl-3 pr-10 text-sm focus:border-primary-600 focus:ring-2 focus:ring-primary-500"
        >
          <option value="all">전체 도메인</option>
          {domains.map((domain) => (
            <option key={domain} value={domain}>
              {domain}
            </option>
          ))}
        </select>

        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="rounded-md bg-white border-2 border-gray-400 text-gray-900 font-medium py-2 pl-3 pr-10 text-sm focus:border-primary-600 focus:ring-2 focus:ring-primary-500"
        >
          <option value="all">전체 레벨</option>
          <option value="INFO">INFO</option>
          <option value="WARNING">WARNING</option>
          <option value="ERROR">ERROR</option>
          <option value="CRITICAL">CRITICAL</option>
        </select>
      </div>

      <div className="mt-4 flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                      시간
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      소스
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      도메인 / 이벤트
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      상태 / 레벨
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      리소스
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      액터
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      메시지
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-3 py-8 text-center text-sm text-gray-500">
                        로그가 없습니다
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => (
                      <tr key={`${log.source_table}:${log.audit_id}`}>
                        {(() => {
                          const normalizedSeverity = (log.severity || '').toUpperCase();
                          const status = (log.status || '-').toUpperCase();
                          const resourceText =
                            log.resource_type && log.resource_id
                              ? `${log.resource_type}:${log.resource_id}`
                              : log.resource_id || '-';
                          return (
                            <>
                              <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-gray-500 sm:pl-6">
                                {new Date(log.occurred_at || '').toLocaleString('ko-KR')}
                              </td>
                              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                {sourceLabels[log.source_table] || log.source_table}
                              </td>
                              <td className="px-3 py-4 text-sm text-gray-700">
                                <div className="font-semibold text-gray-900">{log.domain}</div>
                                <div className="text-xs text-gray-500">{log.event_type}</div>
                              </td>
                              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700">
                                  {status}
                                </span>
                                <span
                                  className={`ml-2 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${severityColors[normalizedSeverity] || 'bg-gray-100 text-gray-800'}`}
                                >
                                  {normalizedSeverity || '-'}
                                </span>
                              </td>
                              <td className="whitespace-nowrap px-3 py-4 text-sm">
                                <span className="font-mono text-xs text-gray-600">
                                  {resourceText}
                                </span>
                              </td>
                              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                {log.actor_email || log.actor_id || '-'}
                              </td>
                              <td className="px-3 py-4 text-sm text-gray-700">
                                <div className="max-w-[360px] truncate">{log.message || '-'}</div>
                              </td>
                            </>
                          );
                        })()}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
