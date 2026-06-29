'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loading } from '@/components/ui/loading';
import { Select } from '@/components/ui/select';
import {
  AdminPageHeader,
  adminButtonClass,
  adminInputClass,
  adminLegacyBridgeClass,
  adminPrimaryButtonClass,
  adminSelectClass,
  adminTableBodyClass,
  adminTableContainerClass,
  adminTableHeadCellClass,
  adminTableHeadClass,
} from '@/src/components/admin/AdminDesignSystem';
import { V2OpsNavTabs } from '@/src/components/admin/v2-ops/V2OpsNavTabs';
import {
  type ListV2AdminSalesStatsParams,
  type V2AdminSalesStatsPreset,
} from '@/lib/client/api/v2-admin-ops.api';
import {
  useV2AdminProjects,
  useV2Campaigns,
} from '@/lib/client/hooks/useV2CatalogAdmin';
import { useV2AdminSalesStats } from '@/lib/client/hooks/useV2AdminOps';

type FilterState = {
  preset: V2AdminSalesStatsPreset;
  from: string;
  to: string;
  projectId: string;
  campaignId: string;
  salesChannelId: string;
  campaignType: string;
};

function toIsoDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function shiftIsoDate(dateValue: string, days: number): string {
  const date = new Date(`${dateValue}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return toIsoDate(date);
}

function resolvePresetRange(preset: V2AdminSalesStatsPreset): { from: string; to: string } {
  const today = toIsoDate(new Date());
  if (preset === 'LAST_30_DAYS') {
    return {
      from: shiftIsoDate(today, -29),
      to: today,
    };
  }
  return {
    from: shiftIsoDate(today, -6),
    to: today,
  };
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
  return '통계 조회 중 오류가 발생했습니다.';
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('ko-KR').format(value || 0);
}

function formatCurrency(value: number, currencyCode: string): string {
  try {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: currencyCode || 'KRW',
      maximumFractionDigits: 0,
    }).format(value || 0);
  } catch {
    return `${formatNumber(value)}원`;
  }
}

const statCardClassName = 'rounded-[16px] border border-[#e7e3d3] bg-white p-4';
const statLabelClassName = 'text-xs font-black uppercase tracking-wide text-[#1a1a2e]/40';
const statValueClassName = 'mt-1 text-2xl font-black text-[#1a1a2e]';
const tableSectionClassName = 'rounded-[22px] border border-[#e7e3d3] bg-white p-4 shadow-none';
const tableCellClassName = 'px-3 py-2 text-[#1a1a2e]';
const tableCellRightClassName = `${tableCellClassName} text-right`;

function toSalesStatsParams(filters: FilterState): ListV2AdminSalesStatsParams {
  const params: ListV2AdminSalesStatsParams = {
    preset: filters.preset,
    project_id: filters.projectId || undefined,
    campaign_id: filters.campaignId || undefined,
    sales_channel_id: filters.salesChannelId || undefined,
    campaign_type: filters.campaignType || undefined,
  };

  if (filters.preset === 'CUSTOM') {
    params.from = filters.from;
    params.to = filters.to;
  }

  return params;
}

function toCsv(data: ReturnType<typeof useV2AdminSalesStats>['data']): string {
  if (!data) {
    return '';
  }

  const rows: string[] = [];
  rows.push(
    [
      'section',
      'date',
      'project_name',
      'campaign_name',
      'orders_count',
      'units_sold',
      'order_gross_amount',
      'captured_amount',
      'refund_amount',
      'net_settlement_amount',
    ].join(','),
  );

  rows.push(
    [
      'summary',
      '',
      '',
      '',
      data.summary.orders_count,
      data.summary.units_sold,
      data.summary.order_gross_amount,
      data.summary.captured_amount,
      data.summary.refund_amount,
      data.summary.net_settlement_amount,
    ].join(','),
  );

  for (const row of data.daily) {
    rows.push(
      [
        'daily',
        row.date,
        '',
        '',
        row.orders_count,
        row.units_sold,
        row.order_gross_amount,
        row.captured_amount,
        row.refund_amount,
        row.net_settlement_amount,
      ].join(','),
    );
  }

  for (const row of data.by_project) {
    rows.push(
      [
        'project',
        '',
        `"${row.project_name}"`,
        '',
        row.order_count,
        row.units_sold,
        row.order_gross_amount,
        row.captured_amount,
        row.refund_amount,
        row.net_settlement_amount,
      ].join(','),
    );
  }

  for (const row of data.by_campaign) {
    rows.push(
      [
        'campaign',
        '',
        '',
        `"${row.campaign_name}"`,
        row.order_count,
        row.units_sold,
        row.order_gross_amount,
        row.captured_amount,
        row.refund_amount,
        row.net_settlement_amount,
      ].join(','),
    );
  }

  return rows.join('\n');
}

function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function V2AdminSalesStatsPage() {
  const initialRange = resolvePresetRange('LAST_7_DAYS');
  const [draft, setDraft] = useState<FilterState>({
    preset: 'LAST_7_DAYS',
    from: initialRange.from,
    to: initialRange.to,
    projectId: '',
    campaignId: '',
    salesChannelId: '',
    campaignType: '',
  });
  const [applied, setApplied] = useState<FilterState>({
    preset: 'LAST_7_DAYS',
    from: initialRange.from,
    to: initialRange.to,
    projectId: '',
    campaignId: '',
    salesChannelId: '',
    campaignType: '',
  });

  const params = useMemo(() => toSalesStatsParams(applied), [applied]);
  const { data, isLoading, isFetching, error: statsError } = useV2AdminSalesStats(params);
  const { data: projects = [], isLoading: projectsLoading } = useV2AdminProjects();
  const { data: campaigns = [], isLoading: campaignsLoading } = useV2Campaigns();

  const projectOptions = useMemo(
    () => [
      { value: '', label: '전체 프로젝트' },
      ...projects
        .slice()
        .sort((left, right) => left.name.localeCompare(right.name, 'ko-KR'))
        .map((project) => ({
          value: project.id,
          label: `${project.name} (${project.slug})`,
        })),
    ],
    [projects],
  );

  const campaignOptions = useMemo(
    () => [
      { value: '', label: '전체 캠페인' },
      ...campaigns
        .slice()
        .sort((left, right) => right.updated_at.localeCompare(left.updated_at))
        .map((campaign) => ({
          value: campaign.id,
          label: `${campaign.name} (${campaign.code})`,
        })),
    ],
    [campaigns],
  );

  const currencyCode = data?.summary.currency_code || 'KRW';

  const handlePresetApply = (preset: V2AdminSalesStatsPreset) => {
    if (preset === 'CUSTOM') {
      const next = {
        ...draft,
        preset: 'CUSTOM' as const,
      };
      setDraft(next);
      return;
    }

    const range = resolvePresetRange(preset);
    const next = {
      ...draft,
      preset,
      from: range.from,
      to: range.to,
    };
    setDraft(next);
    setApplied(next);
  };

  const handleSearch = () => {
    setApplied(draft);
  };

  const handleDownload = () => {
    if (!data) {
      return;
    }
    const content = toCsv(data);
    const from = data.range.from;
    const to = data.range.to;
    downloadCsv(`v2-sales-stats-${from}-to-${to}.csv`, content);
  };

  return (
    <div className={`${adminLegacyBridgeClass} space-y-6`}>
      <AdminPageHeader
        eyebrow="v2 ops"
        title="v2 통계"
        description="프로젝트/캠페인 매출과 정산 기준 데이터를 조회합니다."
      />

      <V2OpsNavTabs />

      <section className="rounded-[22px] border border-[#e7e3d3] bg-white p-4 shadow-none">
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" intent="secondary" size="sm" className={adminButtonClass} onClick={() => handlePresetApply('LAST_7_DAYS')}>
            최근 7일
          </Button>
          <Button type="button" intent="secondary" size="sm" className={adminButtonClass} onClick={() => handlePresetApply('LAST_30_DAYS')}>
            최근 30일
          </Button>
          <Button type="button" intent="secondary" size="sm" className={adminButtonClass} onClick={() => handlePresetApply('CUSTOM')}>
            기간 직접 선택
          </Button>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <Input
            type="date"
            size="sm"
            value={draft.from}
            onChange={(event) =>
              setDraft((prev) => ({
                ...prev,
                preset: 'CUSTOM',
                from: event.target.value,
              }))
            }
            className={adminInputClass}
          />
          <Input
            type="date"
            size="sm"
            value={draft.to}
            onChange={(event) =>
              setDraft((prev) => ({
                ...prev,
                preset: 'CUSTOM',
                to: event.target.value,
              }))
            }
            className={adminInputClass}
          />
          <Input
            type="text"
            size="sm"
            placeholder="sales_channel_id (예: WEB)"
            value={draft.salesChannelId}
            onChange={(event) =>
              setDraft((prev) => ({ ...prev, salesChannelId: event.target.value }))
            }
            className={adminInputClass}
          />
          <Select
            size="sm"
            value={draft.projectId}
            options={projectOptions}
            disabled={projectsLoading}
            onChange={(event) =>
              setDraft((prev) => ({ ...prev, projectId: event.target.value }))
            }
            className={adminSelectClass}
          />
          <Select
            size="sm"
            value={draft.campaignId}
            options={campaignOptions}
            disabled={campaignsLoading}
            onChange={(event) =>
              setDraft((prev) => ({ ...prev, campaignId: event.target.value }))
            }
            className={adminSelectClass}
          />
          <Input
            type="text"
            size="sm"
            placeholder="campaign_type (예: POPUP)"
            value={draft.campaignType}
            onChange={(event) =>
              setDraft((prev) => ({ ...prev, campaignType: event.target.value }))
            }
            className={adminInputClass}
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" size="sm" className={adminPrimaryButtonClass} onClick={handleSearch}>
            조회
          </Button>
          <Button type="button" intent="secondary" size="sm" className={adminButtonClass} onClick={handleDownload} disabled={!data}>
            CSV 다운로드
          </Button>
          {isFetching ? <span className="text-sm font-medium text-[#1a1a2e]/50">갱신 중...</span> : null}
        </div>
      </section>

      {isLoading ? (
        <div className="rounded-[22px] border border-[#e7e3d3] bg-white p-8">
          <Loading text="통계를 불러오는 중입니다..." />
        </div>
      ) : null}

      {statsError ? (
        <div className="rounded-[14px] border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
          {getErrorMessage(statsError)}
        </div>
      ) : null}

      {data ? (
        <>
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className={statCardClassName}>
              <p className={statLabelClassName}>주문 수</p>
              <p className={statValueClassName}>{formatNumber(data.summary.orders_count)}</p>
            </div>
            <div className={statCardClassName}>
              <p className={statLabelClassName}>판매 수량</p>
              <p className={statValueClassName}>{formatNumber(data.summary.units_sold)}</p>
            </div>
            <div className={statCardClassName}>
              <p className={statLabelClassName}>주문 매출</p>
              <p className={statValueClassName}>
                {formatCurrency(data.summary.order_gross_amount, currencyCode)}
              </p>
            </div>
            <div className={statCardClassName}>
              <p className={statLabelClassName}>결제 매출</p>
              <p className={statValueClassName}>
                {formatCurrency(data.summary.captured_amount, currencyCode)}
              </p>
            </div>
            <div className={statCardClassName}>
              <p className={statLabelClassName}>환불 차감</p>
              <p className="mt-1 text-2xl font-black text-[#ca2a30]">
                {formatCurrency(data.summary.refund_amount, currencyCode)}
              </p>
            </div>
            <div className={statCardClassName}>
              <p className={statLabelClassName}>정산 기준 순매출</p>
              <p className="mt-1 text-2xl font-black text-[#4a88b9]">
                {formatCurrency(data.summary.net_settlement_amount, currencyCode)}
              </p>
            </div>
          </section>

          <section className={tableSectionClassName}>
            <h2 className="text-lg font-black text-[#1a1a2e]">일별 추이</h2>
            <div className={`mt-3 ${adminTableContainerClass}`}>
              <table className="min-w-full text-sm">
                <thead className={adminTableHeadClass}>
                  <tr>
                    <th className={adminTableHeadCellClass}>날짜</th>
                    <th className={`${adminTableHeadCellClass} text-right`}>주문수</th>
                    <th className={`${adminTableHeadCellClass} text-right`}>판매수량</th>
                    <th className={`${adminTableHeadCellClass} text-right`}>주문매출</th>
                    <th className={`${adminTableHeadCellClass} text-right`}>결제매출</th>
                    <th className={`${adminTableHeadCellClass} text-right`}>환불</th>
                    <th className={`${adminTableHeadCellClass} text-right`}>순매출</th>
                  </tr>
                </thead>
                <tbody className={adminTableBodyClass}>
                  {data.daily.map((row) => (
                    <tr key={row.date}>
                      <td className={tableCellClassName}>{row.date}</td>
                      <td className={tableCellRightClassName}>{formatNumber(row.orders_count)}</td>
                      <td className={tableCellRightClassName}>{formatNumber(row.units_sold)}</td>
                      <td className={tableCellRightClassName}>{formatCurrency(row.order_gross_amount, currencyCode)}</td>
                      <td className={tableCellRightClassName}>{formatCurrency(row.captured_amount, currencyCode)}</td>
                      <td className="px-3 py-2 text-right text-[#ca2a30]">
                        {formatCurrency(row.refund_amount, currencyCode)}
                      </td>
                      <td className="px-3 py-2 text-right font-bold text-[#1a1a2e]">
                        {formatCurrency(row.net_settlement_amount, currencyCode)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className={tableSectionClassName}>
            <h2 className="text-lg font-black text-[#1a1a2e]">프로젝트별</h2>
            <div className={`mt-3 ${adminTableContainerClass}`}>
              <table className="min-w-full text-sm">
                <thead className={adminTableHeadClass}>
                  <tr>
                    <th className={adminTableHeadCellClass}>프로젝트</th>
                    <th className={`${adminTableHeadCellClass} text-right`}>주문수</th>
                    <th className={`${adminTableHeadCellClass} text-right`}>판매수량</th>
                    <th className={`${adminTableHeadCellClass} text-right`}>주문매출</th>
                    <th className={`${adminTableHeadCellClass} text-right`}>결제매출</th>
                    <th className={`${adminTableHeadCellClass} text-right`}>환불</th>
                    <th className={`${adminTableHeadCellClass} text-right`}>순매출</th>
                  </tr>
                </thead>
                <tbody className={adminTableBodyClass}>
                  {data.by_project.map((row) => (
                    <tr key={row.project_id || row.project_name}>
                      <td className={tableCellClassName}>{row.project_name}</td>
                      <td className={tableCellRightClassName}>{formatNumber(row.order_count)}</td>
                      <td className={tableCellRightClassName}>{formatNumber(row.units_sold)}</td>
                      <td className={tableCellRightClassName}>{formatCurrency(row.order_gross_amount, currencyCode)}</td>
                      <td className={tableCellRightClassName}>{formatCurrency(row.captured_amount, currencyCode)}</td>
                      <td className="px-3 py-2 text-right text-[#ca2a30]">
                        {formatCurrency(row.refund_amount, currencyCode)}
                      </td>
                      <td className="px-3 py-2 text-right font-bold text-[#1a1a2e]">
                        {formatCurrency(row.net_settlement_amount, currencyCode)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className={tableSectionClassName}>
            <h2 className="text-lg font-black text-[#1a1a2e]">캠페인별</h2>
            <div className={`mt-3 ${adminTableContainerClass}`}>
              <table className="min-w-full text-sm">
                <thead className={adminTableHeadClass}>
                  <tr>
                    <th className={adminTableHeadCellClass}>캠페인</th>
                    <th className={adminTableHeadCellClass}>유형</th>
                    <th className={`${adminTableHeadCellClass} text-right`}>주문수</th>
                    <th className={`${adminTableHeadCellClass} text-right`}>판매수량</th>
                    <th className={`${adminTableHeadCellClass} text-right`}>주문매출</th>
                    <th className={`${adminTableHeadCellClass} text-right`}>결제매출</th>
                    <th className={`${adminTableHeadCellClass} text-right`}>환불</th>
                    <th className={`${adminTableHeadCellClass} text-right`}>순매출</th>
                  </tr>
                </thead>
                <tbody className={adminTableBodyClass}>
                  {data.by_campaign.map((row) => (
                    <tr key={row.campaign_id || row.campaign_name}>
                      <td className={tableCellClassName}>{row.campaign_name}</td>
                      <td className={tableCellClassName}>{row.campaign_type || '-'}</td>
                      <td className={tableCellRightClassName}>{formatNumber(row.order_count)}</td>
                      <td className={tableCellRightClassName}>{formatNumber(row.units_sold)}</td>
                      <td className={tableCellRightClassName}>{formatCurrency(row.order_gross_amount, currencyCode)}</td>
                      <td className={tableCellRightClassName}>{formatCurrency(row.captured_amount, currencyCode)}</td>
                      <td className="px-3 py-2 text-right text-[#ca2a30]">
                        {formatCurrency(row.refund_amount, currencyCode)}
                      </td>
                      <td className="px-3 py-2 text-right font-bold text-[#1a1a2e]">
                        {formatCurrency(row.net_settlement_amount, currencyCode)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-[16px] border border-[#d9e6f2] bg-[#f0f7ff] p-4 text-sm font-medium text-[#1a1a2e]">
            <p className="font-black">정산 계산 기준</p>
            <p className="mt-1">
              판매 지표는 <code>placed_at</code> 기준, 정산 지표는 financial event의 <code>occurred_at</code> 기준으로 계산됩니다.
            </p>
            <p className="mt-1">
              적용 정책: {data.metadata.capture_policy_version}, {data.metadata.refund_policy_version}
            </p>
          </section>
        </>
      ) : null}
    </div>
  );
}
