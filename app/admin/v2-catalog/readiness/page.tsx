'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, Copy, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Loading } from '@/components/ui/loading';
import { Button } from '@/components/ui/button';
import type { ReadSwitchRemediationTask } from '@/lib/client/api/v2-catalog-admin.api';
import {
  useV2CatalogMigrationCompareReport,
  useV2CatalogReadSwitchChecklist,
  useV2CatalogReadSwitchRemediationTasks,
} from '@/lib/client/hooks/useV2CatalogAdmin';

const SAMPLE_LIMIT = 20;
const NOTION_ACTIONS_URL = 'https://www.notion.so/32198957580781e8a48deaee45bb4cda';

function formatDateTime(value: string | undefined): string {
  if (!value) {
    return '-';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString('ko-KR');
}

function summarizeDifferenceCounts(differences: Record<string, unknown>): Array<{
  group: string;
  key: string;
  count: number;
}> {
  const rows: Array<{ group: string; key: string; count: number }> = [];

  Object.entries(differences).forEach(([group, value]) => {
    if (!value || typeof value !== 'object') {
      return;
    }

    Object.entries(value as Record<string, unknown>).forEach(([key, sample]) => {
      rows.push({
        group,
        key,
        count: Array.isArray(sample) ? sample.length : 0,
      });
    });
  });

  return rows;
}

function buildRemediationDraft(checklist: {
  generated_at: string;
  blocking_tasks: ReadSwitchRemediationTask[];
  advisory_tasks: ReadSwitchRemediationTask[];
}): string {
  const allTasks = [...checklist.blocking_tasks, ...checklist.advisory_tasks];
  if (allTasks.length === 0) {
    return [
      '# V2 Read Switch 보정 작업 초안',
      '',
      `- 생성 시각: ${checklist.generated_at}`,
      '- 상태: 현재 실패 항목 없음 (read switch 가능)',
    ].join('\n');
  }

  const lines = [
    '# V2 Read Switch 보정 작업 초안',
    '',
    `- 생성 시각: ${checklist.generated_at}`,
    `- 실패 항목 수: ${allTasks.length}`,
    `- Blocking: ${checklist.blocking_tasks.length}`,
    `- Advisory: ${checklist.advisory_tasks.length}`,
    '',
    '## Blocking 액션 아이템',
  ];

  checklist.blocking_tasks.forEach((item, index) => {
    lines.push(`${index + 1}. [ ] ${item.check_key} (${item.title})`);
    lines.push(`- 근거: ${item.detail}`);
    lines.push(`- 현재/기대: ${item.actual} / ${item.expected}`);
    lines.push(`- 조치: ${item.action}`);
  });

  if (checklist.advisory_tasks.length > 0) {
    lines.push('', '## Advisory 점검 항목');
    checklist.advisory_tasks.forEach((item, index) => {
      lines.push(`${index + 1}. [ ] ${item.check_key} (${item.title})`);
      lines.push(`- 근거: ${item.detail}`);
      lines.push(`- 현재/기대: ${item.actual} / ${item.expected}`);
      lines.push(`- 조치: ${item.action}`);
    });
  }

  return lines.join('\n');
}

function buildTaskDraft(task: ReadSwitchRemediationTask): string {
  return [
    `[ ] ${task.check_key} (${task.title})`,
    `- 구분: ${task.severity}`,
    `- 근거: ${task.detail}`,
    `- 현재/기대: ${task.actual} / ${task.expected}`,
    `- 샘플: ${task.sample_source || '-'} (${task.sample_count}건)`,
    `- 조치: ${task.action}`,
  ].join('\n');
}

function buildApprovalRecordDraft(input: {
  generated_at: string;
  sample_limit: number;
  compare_ready: boolean;
  checklist: {
    total_checks: number;
    passed_checks: number;
    failed_checks: number;
    blocking_failed_checks?: number;
    advisory_failed_checks?: number;
    blocking_checks: string[];
  };
  remediation: {
    failed_total: number;
    blocking_failed: number;
    advisory_failed: number;
  };
  recommended_order: string[];
}): string {
  const gateA = input.remediation.blocking_failed === 0 ? 'PASS' : 'FAIL';
  const gateB = (input.checklist.blocking_failed_checks || 0) === 0 ? 'PASS' : 'FAIL';

  return [
    '## V2 Read Switch 승인 기록',
    '',
    `- 일시: ${input.generated_at}`,
    '- 실행자:',
    `- sample_limit: ${input.sample_limit}`,
    '',
    '### 요약 수치',
    `- compare.read_switch.ready: ${input.compare_ready}`,
    `- checklist: total=${input.checklist.total_checks}, passed=${input.checklist.passed_checks}, failed=${input.checklist.failed_checks}`,
    `- checklist.blocking_failed: ${input.checklist.blocking_failed_checks || 0}`,
    `- checklist.advisory_failed: ${input.checklist.advisory_failed_checks || 0}`,
    `- remediation.failed_total: ${input.remediation.failed_total}`,
    `- remediation.blocking_failed: ${input.remediation.blocking_failed}`,
    `- remediation.advisory_failed: ${input.remediation.advisory_failed}`,
    `- blocking_checks: ${
      input.checklist.blocking_checks.length > 0
        ? input.checklist.blocking_checks.join(', ')
        : '(none)'
    }`,
    '',
    '### Gate 판정',
    `- Gate A (blocking_failed=0): ${gateA}`,
    `- Gate B (checklist blocking_failed=0): ${gateB}`,
    '- Gate C (기능 스모크): PASS/FAIL',
    '- Gate D (롤백 준비): PASS/FAIL',
    '- 최종 결정: 진행/보류',
    '',
    '### 권장 전환 순서',
    ...input.recommended_order.map((step, index) => `${index + 1}. ${step}`),
    '',
    '- 비고:',
  ].join('\n');
}

export default function V2CatalogReadinessPage() {
  const [copiedTarget, setCopiedTarget] = useState<string | null>(null);

  const {
    data: compareReport,
    isLoading: isLoadingReport,
    error: reportError,
  } = useV2CatalogMigrationCompareReport(SAMPLE_LIMIT);

  const {
    data: checklist,
    isLoading: isLoadingChecklist,
    error: checklistError,
  } = useV2CatalogReadSwitchChecklist(SAMPLE_LIMIT);

  const {
    data: remediation,
    isLoading: isLoadingRemediation,
    error: remediationError,
  } = useV2CatalogReadSwitchRemediationTasks(SAMPLE_LIMIT);

  const copyToClipboard = async (text: string, target: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedTarget(target);
      window.setTimeout(() => {
        setCopiedTarget((current) => (current === target ? null : current));
      }, 1800);
    } catch {
      setCopiedTarget(null);
    }
  };

  if (isLoadingReport || isLoadingChecklist || isLoadingRemediation) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loading size="lg" text="v2 전환 준비 상태를 확인하는 중입니다" />
      </div>
    );
  }

  if (
    reportError ||
    checklistError ||
    remediationError ||
    !compareReport ||
    !checklist ||
    !remediation
  ) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">v2 전환 준비 리포트를 불러오는데 실패했습니다.</p>
      </div>
    );
  }

  const differenceRows = summarizeDifferenceCounts(
    compareReport.differences as Record<string, unknown>,
  );
  const gateA = remediation.summary.blocking_failed === 0;
  const gateB = (checklist.blocking_failed_checks || 0) === 0;
  const remediationTaskByCheck = new Map(
    [...remediation.blocking_tasks, ...remediation.advisory_tasks].map((task) => [
      task.check_key,
      task,
    ]),
  );

  return (
    <div className="space-y-8">
      <div className="sm:flex sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">V2 읽기 전환 준비</h1>
          <p className="mt-1 text-sm text-gray-500">
            v1/v2 카탈로그 정합성과 read switch 준비 상태를 확인합니다.
          </p>
          <p className="mt-1 text-xs text-gray-400">
            기준 시각: {formatDateTime(compareReport.generated_at)} / 샘플 제한: {SAMPLE_LIMIT}
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <Badge
            intent={compareReport.read_switch.ready ? 'success' : 'warning'}
            size="md"
          >
            {compareReport.read_switch.ready ? '전환 가능' : '전환 보류'}
          </Badge>
        </div>
      </div>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">Legacy Products</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">
            {compareReport.counts.legacy.products}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">V2 Products (Mapped)</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">
            {compareReport.counts.v2.products_mapped}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">Passed Checks</p>
          <p className="mt-1 text-2xl font-semibold text-green-700">
            {checklist.passed_checks} / {checklist.total_checks}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">Blocking Checks</p>
          <p className="mt-1 text-2xl font-semibold text-red-700">
            {remediation.summary.blocking_failed}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">Advisory Checks</p>
          <p className="mt-1 text-2xl font-semibold text-amber-700">
            {remediation.summary.advisory_failed}
          </p>
        </div>
      </section>

      <section className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <div className="sm:flex sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-blue-900">보정/승인 기록 생성</h2>
            <p className="mt-1 text-sm text-blue-800">
              blocking/advisory 실패 항목을 Notion 티켓/작업으로 옮길 수 있도록
              초안을 생성합니다.
            </p>
            <p className="mt-1 text-xs text-blue-700">
              실패 {remediation.summary.failed_total}건 (blocking{' '}
              {remediation.summary.blocking_failed} / advisory{' '}
              {remediation.summary.advisory_failed})
            </p>
            <p className="mt-1 text-xs text-blue-700">
              Gate A: {gateA ? 'PASS' : 'FAIL'} / Gate B: {gateB ? 'PASS' : 'FAIL'}
            </p>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 sm:mt-0">
            <Button
              intent="primary"
              size="sm"
              onClick={() =>
                copyToClipboard(
                  buildRemediationDraft({
                    generated_at: remediation.generated_at,
                    blocking_tasks: remediation.blocking_tasks,
                    advisory_tasks: remediation.advisory_tasks,
                  }),
                  'all-failed-items',
                )
              }
            >
              {copiedTarget === 'all-failed-items' ? (
                <>
                  <Check className="h-4 w-4" />
                  전체 초안 복사됨
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  실패 항목 초안 복사
                </>
              )}
            </Button>
            <Button
              intent="secondary"
              size="sm"
              onClick={() =>
                copyToClipboard(
                  buildApprovalRecordDraft({
                    generated_at: compareReport.generated_at,
                    sample_limit: SAMPLE_LIMIT,
                    compare_ready: compareReport.read_switch.ready,
                    checklist,
                    remediation: remediation.summary,
                    recommended_order: checklist.recommended_order,
                  }),
                  'approval-record',
                )
              }
            >
              {copiedTarget === 'approval-record' ? (
                <>
                  <Check className="h-4 w-4" />
                  승인 기록 복사됨
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  승인 기록 초안 복사
                </>
              )}
            </Button>
            <Link href={NOTION_ACTIONS_URL} target="_blank">
              <Button intent="secondary" size="sm">
                <ExternalLink className="h-4 w-4" />
                Notion 티켓 목록 열기
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-4 py-3">
          <h2 className="text-base font-semibold text-gray-900">Read Switch Checklist</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">
                  Check
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">
                  상태
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">
                  심각도
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">
                  현재값
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">
                  기대값
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">
                  조치
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">
                  작업 생성
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {compareReport.checks.map((check) => {
                const checklistItem = checklist.checklist.find(
                  (item) => item.key === check.key,
                );
                const task = remediationTaskByCheck.get(check.key);
                const severity = check.severity || checklistItem?.severity || 'BLOCKING';

                return (
                  <tr key={check.key}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {check.key}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <Badge intent={check.passed ? 'success' : 'error'}>
                        {check.passed ? 'PASS' : 'FAIL'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <Badge intent={severity === 'BLOCKING' ? 'error' : 'warning'}>
                        {severity === 'BLOCKING' ? 'BLOCKING' : 'ADVISORY'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{check.actual}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{check.expected}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {task?.action || checklistItem?.action || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {task && !check.passed ? (
                        <button
                          type="button"
                          onClick={() =>
                            copyToClipboard(
                              buildTaskDraft(task),
                              `item-${check.key}`,
                            )
                          }
                          className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                        >
                          {copiedTarget === `item-${check.key}` ? (
                            <>
                              <Check className="h-3.5 w-3.5" />
                              복사됨
                            </>
                          ) : (
                            <>
                              <Copy className="h-3.5 w-3.5" />
                              항목 복사
                            </>
                          )}
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-4 py-3">
          <h2 className="text-base font-semibold text-gray-900">보정 작업 목록</h2>
        </div>
        <div className="space-y-6 p-4">
          <div>
            <h3 className="text-sm font-semibold text-red-700">Blocking</h3>
            {remediation.blocking_tasks.length === 0 ? (
              <p className="mt-2 text-sm text-gray-500">실패한 blocking 항목이 없습니다.</p>
            ) : (
              <div className="mt-2 overflow-x-auto rounded-md border border-red-100">
                <table className="min-w-full divide-y divide-red-100">
                  <thead className="bg-red-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-red-800">
                        Task
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-red-800">
                        샘플
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-red-800">
                        조치
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-red-100">
                    {remediation.blocking_tasks.map((task) => (
                      <tr key={`blocking-${task.check_key}`}>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          <p className="font-medium">{task.title}</p>
                          <p className="text-xs text-gray-600">{task.check_key}</p>
                          <p className="text-xs text-gray-500">{task.detail}</p>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          <Badge intent={task.sample_count > 0 ? 'warning' : 'success'}>
                            {task.sample_count}
                          </Badge>
                          <p className="mt-1 text-xs text-gray-500">
                            {task.sample_source || '-'}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          <p>{task.action}</p>
                          <button
                            type="button"
                            onClick={() =>
                              copyToClipboard(
                                buildTaskDraft(task),
                                `task-${task.check_key}`,
                              )
                            }
                            className="mt-2 inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                          >
                            {copiedTarget === `task-${task.check_key}` ? (
                              <>
                                <Check className="h-3.5 w-3.5" />
                                복사됨
                              </>
                            ) : (
                              <>
                                <Copy className="h-3.5 w-3.5" />
                                항목 복사
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div>
            <h3 className="text-sm font-semibold text-amber-700">Advisory</h3>
            {remediation.advisory_tasks.length === 0 ? (
              <p className="mt-2 text-sm text-gray-500">실패한 advisory 항목이 없습니다.</p>
            ) : (
              <div className="mt-2 overflow-x-auto rounded-md border border-amber-100">
                <table className="min-w-full divide-y divide-amber-100">
                  <thead className="bg-amber-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-amber-800">
                        Task
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-amber-800">
                        샘플
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-amber-800">
                        조치
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-100">
                    {remediation.advisory_tasks.map((task) => (
                      <tr key={`advisory-${task.check_key}`}>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          <p className="font-medium">{task.title}</p>
                          <p className="text-xs text-gray-600">{task.check_key}</p>
                          <p className="text-xs text-gray-500">{task.detail}</p>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          <Badge intent={task.sample_count > 0 ? 'warning' : 'success'}>
                            {task.sample_count}
                          </Badge>
                          <p className="mt-1 text-xs text-gray-500">
                            {task.sample_source || '-'}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          <p>{task.action}</p>
                          <button
                            type="button"
                            onClick={() =>
                              copyToClipboard(
                                buildTaskDraft(task),
                                `task-${task.check_key}`,
                              )
                            }
                            className="mt-2 inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                          >
                            {copiedTarget === `task-${task.check_key}` ? (
                              <>
                                <Check className="h-3.5 w-3.5" />
                                복사됨
                              </>
                            ) : (
                              <>
                                <Copy className="h-3.5 w-3.5" />
                                항목 복사
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-4 py-3">
          <h2 className="text-base font-semibold text-gray-900">차이 리포트 요약</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">
                  그룹
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">
                  항목
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">
                  샘플 건수
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {differenceRows.map((row) => (
                <tr key={`${row.group}-${row.key}`}>
                  <td className="px-4 py-3 text-sm text-gray-900">{row.group}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{row.key}</td>
                  <td className="px-4 py-3 text-sm">
                    <Badge intent={row.count > 0 ? 'warning' : 'success'}>
                      {row.count}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="text-base font-semibold text-gray-900">권장 전환 순서</h2>
        <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-gray-700">
          {checklist.recommended_order.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </section>
    </div>
  );
}
