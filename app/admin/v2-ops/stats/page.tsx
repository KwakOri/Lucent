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
  type V2AdminSalesStatsByOrderRow,
  type V2AdminSalesStatsByProductRow,
  type V2AdminSalesStatsDailyRow,
  type V2AdminSalesStatsPreset,
} from '@/lib/client/api/v2-admin-ops.api';
import {
  useV2AdminProjects,
  useV2Campaigns,
} from '@/lib/client/hooks/useV2CatalogAdmin';
import {
  useV2AdminDownloadSalesStatsPdf,
  useV2AdminSalesStats,
} from '@/lib/client/hooks/useV2AdminOps';

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

function resolveCampaignRange(campaign: {
  starts_at: string | null;
  ends_at: string | null;
}): { from: string; to: string } | null {
  if (!campaign.starts_at) {
    return null;
  }

  const startsAt = new Date(campaign.starts_at);
  if (Number.isNaN(startsAt.getTime())) {
    return null;
  }

  const endsAt = campaign.ends_at ? new Date(campaign.ends_at) : null;
  if (endsAt && Number.isNaN(endsAt.getTime())) {
    return null;
  }

  const from = toIsoDate(startsAt);
  const to = endsAt ? toIsoDate(endsAt) : toIsoDate(new Date());
  return from <= to ? { from, to } : null;
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
const paginationButtonClassName = `${adminButtonClass} disabled:opacity-40`;
const statsPageSize = 10;

type StatsTab = 'daily' | 'orders' | 'products';

function toSalesStatsParams(
  filters: FilterState,
  expandBundleComponents: boolean,
): ListV2AdminSalesStatsParams {
  const params: ListV2AdminSalesStatsParams = {
    preset: filters.preset,
    project_id: filters.projectId || undefined,
    campaign_id: filters.campaignId || undefined,
    sales_channel_id: filters.salesChannelId || undefined,
    campaign_type: filters.campaignType || undefined,
    expand_bundle_components: expandBundleComponents || undefined,
  };

  if (filters.preset === 'CUSTOM') {
    params.from = filters.from;
    params.to = filters.to;
  }

  return params;
}

function escapeCsv(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
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
      'order_no',
      'units_sold',
      'order_gross_amount',
      'captured_amount',
      'refund_amount',
      'item_gross_amount',
      'order_count',
    ].join(','),
  );

  rows.push(
    [
      'summary',
      '',
      '',
      data.summary.units_sold,
      data.summary.order_gross_amount,
      data.summary.captured_amount,
      data.summary.refund_amount,
      data.summary.item_gross_amount,
      data.summary.orders_count,
    ].join(','),
  );

  for (const row of data.daily) {
    rows.push(
      [
        'daily',
        row.date,
        '',
        row.units_sold,
        row.order_gross_amount,
        row.captured_amount,
        row.refund_amount,
        row.item_gross_amount,
        row.orders_count,
      ].join(','),
    );
  }

  for (const row of data.by_order || []) {
    rows.push(
      [
        'order',
        row.placed_at || '',
        escapeCsv(row.order_no || row.order_id),
        row.units_sold,
        row.order_gross_amount,
        '',
        '',
        row.item_gross_amount,
        '',
      ].join(','),
    );
  }

  for (const row of data.by_product || []) {
    rows.push(
      [
        'product',
        '',
        escapeCsv(row.product_name),
        row.units_sold,
        '',
        '',
        '',
        row.item_gross_amount,
        row.order_count,
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

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
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
  const [activeTab, setActiveTab] = useState<StatsTab>('daily');
  const [expandBundleComponents, setExpandBundleComponents] = useState(false);
  const [page, setPage] = useState(1);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const params = useMemo(
    () =>
      toSalesStatsParams(
        applied,
        activeTab === 'products' && expandBundleComponents,
      ),
    [activeTab, applied, expandBundleComponents],
  );
  const { data, isLoading, isFetching, error: statsError } = useV2AdminSalesStats(params);
  const downloadPdfMutation = useV2AdminDownloadSalesStatsPdf();
  const { data: projects = [], isLoading: projectsLoading } = useV2AdminProjects();
  const { data: campaigns = [], isLoading: campaignsLoading } = useV2Campaigns({
    projectId: draft.projectId || undefined,
  });
  const selectedCampaign = useMemo(
    () => campaigns.find((campaign) => campaign.id === draft.campaignId) || null,
    [campaigns, draft.campaignId],
  );
  const campaignRange = useMemo(
    () => (selectedCampaign ? resolveCampaignRange(selectedCampaign) : null),
    [selectedCampaign],
  );

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

  const tabRows = useMemo(() => {
    if (activeTab === 'orders') {
      return data?.by_order || [];
    }
    if (activeTab === 'products') {
      return data?.by_product || [];
    }
    return data?.daily || [];
  }, [activeTab, data]);
  const totalPages = Math.max(1, Math.ceil(tabRows.length / statsPageSize));
  const visibleRows = useMemo(
    () => tabRows.slice((page - 1) * statsPageSize, page * statsPageSize),
    [page, tabRows],
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
    setPage(1);
  };

  const handleCampaignRangeApply = () => {
    if (!campaignRange) {
      return;
    }

    const next = {
      ...draft,
      preset: 'CUSTOM' as const,
      from: campaignRange.from,
      to: campaignRange.to,
    };
    setDraft(next);
    setApplied(next);
    setPage(1);
  };

  const handleSearch = () => {
    setPdfError(null);
    setApplied(draft);
    setPage(1);
  };

  const handleTabChange = (nextTab: StatsTab) => {
    setActiveTab(nextTab);
    setPage(1);
  };

  const handlePageChange = (nextPage: number) => {
    setPage(Math.min(Math.max(nextPage, 1), totalPages));
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

  const handleDownloadPdf = async () => {
    if (!data || !applied.campaignId || downloadPdfMutation.isPending) {
      return;
    }

    setPdfError(null);
    try {
      const result = await downloadPdfMutation.mutateAsync(params);
      downloadBlob(result.filename, result.blob);
    } catch (error) {
      setPdfError(getErrorMessage(error));
    }
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
          <Button
            type="button"
            intent="secondary"
            size="sm"
            className={adminButtonClass}
            disabled={!campaignRange || campaignsLoading}
            onClick={handleCampaignRangeApply}
          >
            캠페인 전체
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
              setDraft((prev) => ({
                ...prev,
                projectId: event.target.value,
                campaignId: '',
              }))
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
          <Button
            type="button"
            intent="secondary"
            size="sm"
            className={adminButtonClass}
            onClick={handleDownloadPdf}
            disabled={!data || !applied.campaignId || downloadPdfMutation.isPending}
          >
            {downloadPdfMutation.isPending ? 'PDF 생성 중...' : '정산 PDF'}
          </Button>
          {isFetching ? <span className="text-sm font-medium text-[#1a1a2e]/50">갱신 중...</span> : null}
        </div>
        {pdfError ? (
          <p className="mt-2 text-sm font-medium text-red-700">{pdfError}</p>
        ) : null}
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
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2" role="tablist" aria-label="통계 상세 탭">
                {([
                  ['daily', '일별 추이'],
                  ['orders', '주문별'],
                  ['products', '상품별'],
                ] as const).map(([tab, label]) => (
                  <Button
                    key={tab}
                    type="button"
                    intent={activeTab === tab ? 'primary' : 'secondary'}
                    size="sm"
                    className={activeTab === tab ? adminPrimaryButtonClass : adminButtonClass}
                    role="tab"
                    aria-selected={activeTab === tab}
                    onClick={() => handleTabChange(tab)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {activeTab === 'products' ? (
                  <Button
                    type="button"
                    intent={expandBundleComponents ? 'primary' : 'secondary'}
                    size="sm"
                    className={
                      expandBundleComponents
                        ? adminPrimaryButtonClass
                        : adminButtonClass
                    }
                    aria-pressed={expandBundleComponents}
                    onClick={() => {
                      setExpandBundleComponents((previous) => !previous);
                      setPage(1);
                    }}
                  >
                    번들 내부 상품으로 조회
                  </Button>
                ) : null}
                <span className="text-xs font-bold text-[#1a1a2e]/50">
                  총 {formatNumber(tabRows.length)}건 · {page} / {totalPages}페이지
                </span>
              </div>
            </div>

            {activeTab === 'products' && expandBundleComponents ? (
              <p className="mt-3 text-xs font-medium text-[#1a1a2e]/55">
                번들 상품은 구성품으로 펼쳐 집계됩니다. 구성품 판매수량은 번들에 포함된 실제 구성품 수량입니다.
              </p>
            ) : null}

            {activeTab === 'daily' ? (
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
                    {(visibleRows as V2AdminSalesStatsDailyRow[]).map((row) => (
                      <tr key={row.date}>
                        <td className={tableCellClassName}>{row.date}</td>
                        <td className={tableCellRightClassName}>{formatNumber(row.orders_count)}</td>
                        <td className={tableCellRightClassName}>{formatNumber(row.units_sold)}</td>
                        <td className={tableCellRightClassName}>{formatCurrency(row.order_gross_amount, currencyCode)}</td>
                        <td className={tableCellRightClassName}>{formatCurrency(row.captured_amount, currencyCode)}</td>
                        <td className="px-3 py-2 text-right text-[#ca2a30]">{formatCurrency(row.refund_amount, currencyCode)}</td>
                        <td className="px-3 py-2 text-right font-bold text-[#1a1a2e]">{formatCurrency(row.net_settlement_amount, currencyCode)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}

            {activeTab === 'orders' ? (
              <div className={`mt-3 ${adminTableContainerClass}`}>
                <table className="min-w-full text-sm">
                  <thead className={adminTableHeadClass}>
                    <tr>
                      <th className={adminTableHeadCellClass}>주문번호</th>
                      <th className={adminTableHeadCellClass}>주문일시</th>
                      <th className={adminTableHeadCellClass}>상태</th>
                      <th className={adminTableHeadCellClass}>상품</th>
                      <th className={`${adminTableHeadCellClass} text-right`}>수량</th>
                      <th className={`${adminTableHeadCellClass} text-right`}>주문금액</th>
                    </tr>
                  </thead>
                  <tbody className={adminTableBodyClass}>
                    {(visibleRows as V2AdminSalesStatsByOrderRow[]).map((row) => (
                      <tr key={row.order_id}>
                        <td className={`${tableCellClassName} font-bold`}>{row.order_no || row.order_id}</td>
                        <td className={tableCellClassName}>{row.placed_at ? new Date(row.placed_at).toLocaleString('ko-KR') : '-'}</td>
                        <td className={tableCellClassName}>{row.payment_status || row.order_status || '-'}</td>
                        <td className={tableCellClassName}>
                          <div className="max-w-[28rem] space-y-1">
                            {row.items.map((item) => (
                              <div key={item.order_item_id || `${item.product_name}-${item.variant_name || ''}`}>
                                {item.product_name}{item.variant_name ? ` · ${item.variant_name}` : ''} × {formatNumber(item.quantity)}
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className={tableCellRightClassName}>{formatNumber(row.units_sold)}</td>
                        <td className={tableCellRightClassName}>{formatCurrency(row.order_gross_amount, currencyCode)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}

            {activeTab === 'products' ? (
              <div className={`mt-3 ${adminTableContainerClass}`}>
                <table className="min-w-full text-sm">
                  <thead className={adminTableHeadClass}>
                    <tr>
                      <th className={adminTableHeadCellClass}>상품</th>
                      <th className={`${adminTableHeadCellClass} text-right`}>주문수</th>
                      <th className={`${adminTableHeadCellClass} text-right`}>판매수량</th>
                      <th className={`${adminTableHeadCellClass} text-right`}>상품매출</th>
                    </tr>
                  </thead>
                  <tbody className={adminTableBodyClass}>
                    {(visibleRows as V2AdminSalesStatsByProductRow[]).map((row) => (
                      <tr key={row.product_id || row.product_name}>
                        <td className={`${tableCellClassName} font-bold`}>{row.product_name}</td>
                        <td className={tableCellRightClassName}>{formatNumber(row.order_count)}</td>
                        <td className={tableCellRightClassName}>{formatNumber(row.units_sold)}</td>
                        <td className={tableCellRightClassName}>{formatCurrency(row.item_gross_amount, currencyCode)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}

            {visibleRows.length === 0 ? (
              <p className="mt-6 text-center text-sm font-medium text-[#1a1a2e]/50">표시할 데이터가 없습니다.</p>
            ) : null}

            <div className="mt-4 flex items-center justify-center gap-2">
              <Button
                type="button"
                intent="secondary"
                size="sm"
                className={paginationButtonClassName}
                disabled={page <= 1}
                onClick={() => handlePageChange(page - 1)}
              >
                이전
              </Button>
              <Button
                type="button"
                intent="secondary"
                size="sm"
                className={paginationButtonClassName}
                disabled={page >= totalPages}
                onClick={() => handlePageChange(page + 1)}
              >
                다음
              </Button>
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
