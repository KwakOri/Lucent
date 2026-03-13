'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, Copy, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Loading } from '@/components/ui/loading';
import { Button } from '@/components/ui/button';
import {
  useV2CatalogMigrationCompareReport,
  useV2CatalogReadSwitchChecklist,
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
  checklist: Array<{ key: string; passed: boolean; action: string; detail: string }>;
}): string {
  const failedItems = checklist.checklist.filter((item) => !item.passed);
  if (failedItems.length === 0) {
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
    `- 실패 항목 수: ${failedItems.length}`,
    '',
    '## 액션 아이템',
  ];

  failedItems.forEach((item, index) => {
    lines.push(`${index + 1}. [ ] ${item.key}`);
    lines.push(`- 근거: ${item.detail}`);
    lines.push(`- 조치: ${item.action}`);
  });

  return lines.join('\n');
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

  if (isLoadingReport || isLoadingChecklist) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loading size="lg" text="v2 전환 준비 상태를 확인하는 중입니다" />
      </div>
    );
  }

  if (reportError || checklistError || !compareReport || !checklist) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">v2 전환 준비 리포트를 불러오는데 실패했습니다.</p>
      </div>
    );
  }

  const differenceRows = summarizeDifferenceCounts(
    compareReport.differences as Record<string, unknown>,
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

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
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
            {checklist.blocking_checks.length}
          </p>
        </div>
      </section>

      <section className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <div className="sm:flex sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-blue-900">보정 작업 생성</h2>
            <p className="mt-1 text-sm text-blue-800">
              실패 항목을 Notion 티켓/작업으로 옮길 수 있도록 초안을 생성합니다.
            </p>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 sm:mt-0">
            <Button
              intent="primary"
              size="sm"
              onClick={() =>
                copyToClipboard(
                  buildRemediationDraft({
                    generated_at: checklist.generated_at,
                    checklist: checklist.checklist,
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
                    <td className="px-4 py-3 text-sm text-gray-700">{check.actual}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{check.expected}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {checklistItem?.action || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {checklistItem && !check.passed ? (
                        <button
                          type="button"
                          onClick={() =>
                            copyToClipboard(
                              [
                                `[ ] ${check.key}`,
                                `- 근거: ${check.detail}`,
                                `- 조치: ${checklistItem.action}`,
                              ].join('\n'),
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
