'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Input, Textarea } from '@/components/ui/input';
import { Loading } from '@/components/ui/loading';
import type {
  V2AdminShippingBatchPackageRow,
  V2AdminShippingBatchStatus,
  V2AdminTransitionResult,
} from '@/lib/client/api/v2-admin-shipping.api';
import {
  useV2AdminActivateShippingBatch,
  useV2AdminCancelShippingBatch,
  useV2AdminCompleteShippingBatch,
  useV2AdminCreateShippingBatch,
  useV2AdminDispatchShippingBatch,
  useV2AdminPreviewShippingBatch,
  useV2AdminSaveShippingBatchPackages,
  useV2AdminShippingBatchDetail,
  useV2AdminShippingBatches,
  useV2AdminShippingCandidates,
} from '@/lib/client/hooks/useV2AdminShipping';
import { useV2AdminProjects, useV2Campaigns } from '@/lib/client/hooks/useV2CatalogAdmin';

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

function formatDate(value: string | null | undefined): string {
  if (!value) {
    return '-';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatCurrency(amount: number | null | undefined): string {
  return `${Math.max(0, Number(amount || 0)).toLocaleString()}원`;
}

function resolveBatchIntent(status: V2AdminShippingBatchStatus) {
  if (status === 'ACTIVE' || status === 'DISPATCHED') {
    return 'warning' as const;
  }
  if (status === 'COMPLETED') {
    return 'success' as const;
  }
  if (status === 'CANCELED') {
    return 'error' as const;
  }
  return 'default' as const;
}

function resolveBatchStatusLabel(status: string | null | undefined): string {
  const normalized = String(status || '').toUpperCase();
  if (normalized === 'DRAFT') {
    return '출고 준비 전';
  }
  if (normalized === 'ACTIVE') {
    return '출고 준비중';
  }
  if (normalized === 'DISPATCHED') {
    return '배송중';
  }
  if (normalized === 'COMPLETED') {
    return '배송 완료';
  }
  if (normalized === 'CANCELED') {
    return '취소됨';
  }
  return status || '-';
}

function resolveTransitionIntent(status: V2AdminTransitionResult) {
  if (status === 'SUCCEEDED') {
    return 'success' as const;
  }
  if (status === 'FAILED') {
    return 'error' as const;
  }
  if (status === 'PENDING') {
    return 'warning' as const;
  }
  return 'default' as const;
}

function resolveTransitionLabel(status: V2AdminTransitionResult): string {
  if (status === 'SUCCEEDED') {
    return '성공';
  }
  if (status === 'FAILED') {
    return '실패';
  }
  if (status === 'SKIPPED') {
    return '이미 반영';
  }
  return '대기';
}

function resolveTransitionDescription(
  status: V2AdminTransitionResult,
  fallbackMessage?: string | null,
): string | null {
  if (status === 'FAILED') {
    return fallbackMessage || '상태 전이 중 오류가 발생했습니다.';
  }
  if (status === 'SKIPPED') {
    return '이미 해당 단계가 반영되어 변경 없이 처리되었습니다.';
  }
  return null;
}

function resolveComposition(row: {
  has_bundle: boolean;
  has_physical: boolean;
  has_digital: boolean;
}) {
  if (row.has_bundle) {
    return '번들';
  }
  if (row.has_physical && row.has_digital) {
    return '실물+디지털';
  }
  if (row.has_physical) {
    return '실물';
  }
  if (row.has_digital) {
    return '디지털';
  }
  return '기타';
}

function readSnapshotText(snapshot: Record<string, unknown> | null, key: string): string {
  if (!snapshot || typeof snapshot !== 'object') {
    return '';
  }
  const value = snapshot[key];
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim();
}

function readFirstSnapshotText(
  snapshot: Record<string, unknown> | null,
  keys: string[],
): string {
  for (const key of keys) {
    const value = readSnapshotText(snapshot, key);
    if (value.length > 0) {
      return value;
    }
  }
  return '';
}

function buildAddressText(snapshot: Record<string, unknown> | null): string {
  const keys = ['line1', 'line2', 'address', 'address1', 'address_1', 'road_address'];
  const values = keys
    .map((key) => readSnapshotText(snapshot, key))
    .filter((value) => value.length > 0);
  return values.join(' ').trim();
}

function resolvePostalCode(snapshot: Record<string, unknown> | null): string {
  return readFirstSnapshotText(snapshot, [
    'postal_code',
    'postalCode',
    'zipcode',
    'zip_code',
    'zip',
  ]);
}

function resolveAddressLine1(snapshot: Record<string, unknown> | null): string {
  const line1 = readFirstSnapshotText(snapshot, [
    'road_address',
    'address',
    'address1',
    'address_1',
    'line1',
  ]);
  if (line1.length > 0) {
    return line1;
  }
  return buildAddressText(snapshot);
}

function resolveAddressLine2(snapshot: Record<string, unknown> | null): string {
  return readFirstSnapshotText(snapshot, [
    'line2',
    'address2',
    'address_2',
    'detail_address',
    'detail',
  ]);
}

function formatPhoneNumber(phone: string | null | undefined): string {
  const raw = String(phone || '').trim();
  if (!raw) {
    return '';
  }
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10 && digits.startsWith('02')) {
    return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 9 && digits.startsWith('02')) {
    return `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`;
  }
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return raw;
}

function formatAutoBatchTitleDate(date: Date): string {
  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yy}${mm}${dd}`;
}

function buildProjectSummary(projectNames: string[]): string {
  const unique = Array.from(new Set(projectNames.filter((name) => name.trim().length > 0)));
  if (unique.length === 0) {
    return '선택 없음';
  }
  if (unique.length === 1) {
    return unique[0];
  }
  return `${unique[0]} 외 ${unique.length - 1}`;
}

function buildSelectionKey(orderIds: string[]): string {
  return orderIds.slice().sort().join(',');
}

function readLineItemText(item: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = item[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }
  return '';
}

function readLineItemQuantity(item: Record<string, unknown>): number {
  const raw = item.quantity ?? item.qty ?? item.item_quantity;
  const quantity = Number(raw);
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return 0;
  }
  return Math.floor(quantity);
}

function isCanceledLineItem(item: Record<string, unknown>): boolean {
  const status = String(item.line_status || item.status || '').toUpperCase();
  return status === 'CANCELED' || status === 'REFUNDED';
}

function buildLineItemRows(
  lineItemsSnapshot: Array<Record<string, unknown>> | null,
): Array<{ label: string; quantity: number }> {
  if (!Array.isArray(lineItemsSnapshot)) {
    return [];
  }

  return lineItemsSnapshot
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
    .filter((item) => !isCanceledLineItem(item))
    .map((item) => {
      const productName =
        readLineItemText(item, ['product_name_snapshot', 'product_name', 'product_title']) ||
        '이름 없는 상품';
      const variantName = readLineItemText(item, [
        'variant_name_snapshot',
        'variant_name',
        'variant_title',
      ]);
      const label = variantName ? `${productName} (${variantName})` : productName;
      return {
        label,
        quantity: readLineItemQuantity(item),
      };
    })
    .filter((item) => item.quantity > 0);
}

function summarizeLineItems(lineItemsSnapshot: Array<Record<string, unknown>> | null): {
  quantity: number;
  summary: string;
  details: string;
} {
  const rows = buildLineItemRows(lineItemsSnapshot);
  if (rows.length === 0) {
    return {
      quantity: 0,
      summary: '-',
      details: '-',
    };
  }

  const quantity = rows.reduce((sum, row) => sum + row.quantity, 0);
  const details = rows.map((row) => `${row.label} x${row.quantity}`).join(', ');

  if (rows.length === 1) {
    return {
      quantity,
      summary: details,
      details,
    };
  }

  const head = rows
    .slice(0, 2)
    .map((row) => `${row.label} x${row.quantity}`)
    .join(', ');

  return {
    quantity,
    summary: rows.length > 2 ? `${head} 외 ${rows.length - 2}건` : head,
    details,
  };
}

const SHIPPING_CANDIDATE_FILTER_STORAGE_KEY =
  'lucent.admin.shipping.candidate.saved-filters.v1';
const SHIPPING_CANDIDATE_LAST_FILTER_STORAGE_KEY =
  'lucent.admin.shipping.candidate.last-filter.v1';
const MAX_SAVED_SHIPPING_FILTERS = 12;

type ShippingCandidateFilterValue = {
  keyword: string;
  projectId: string;
  campaignId: string;
  dateFrom: string;
  dateTo: string;
};

type SavedShippingCandidateFilter = {
  id: string;
  name: string;
  createdAt: string;
  values: ShippingCandidateFilterValue;
};

type PackageDraftRow = {
  carrier_code: string;
  tracking_no: string;
  notes: string;
};

const POST_OFFICE_EXCEL_HEADERS: string[] = [
  '받는 분',
  '우편번호',
  '주소(시도+시군구+도로명+건물번호)',
  '상세주소(동, 호수, 洞명칭, 아파트, 건물명 등)',
  '일반전화(02-1234-5678)',
  '휴대전화(010-1234-5678)',
  '중량(kg)',
  '부피(cm)=가로+세로+높이',
  '내용품코드',
  '내용물',
  '배달방식',
  '배송시요청사항',
  '분할접수 여부(Y/N)',
  '분할접수 첫번째 중량(kg)',
  '분할접수 첫번째 부피(cm)',
  '분할접수 두번째 중량(kg)',
  '분할접수 두번째 부피(cm)',
];

function isSameFilterValues(
  left: ShippingCandidateFilterValue,
  right: ShippingCandidateFilterValue,
): boolean {
  return (
    left.keyword === right.keyword &&
    left.projectId === right.projectId &&
    left.campaignId === right.campaignId &&
    left.dateFrom === right.dateFrom &&
    left.dateTo === right.dateTo
  );
}

function readSavedShippingCandidateFilters(): SavedShippingCandidateFilter[] {
  if (typeof window === 'undefined') {
    return [];
  }

  const rawSavedFilters = window.localStorage.getItem(
    SHIPPING_CANDIDATE_FILTER_STORAGE_KEY,
  );
  if (!rawSavedFilters) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawSavedFilters) as SavedShippingCandidateFilter[];
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((row) => row && typeof row.id === 'string');
  } catch {
    window.localStorage.removeItem(SHIPPING_CANDIDATE_FILTER_STORAGE_KEY);
    return [];
  }
}

function readLastShippingCandidateFilter(): ShippingCandidateFilterValue {
  const emptyFilter: ShippingCandidateFilterValue = {
    keyword: '',
    projectId: '',
    campaignId: '',
    dateFrom: '',
    dateTo: '',
  };

  if (typeof window === 'undefined') {
    return emptyFilter;
  }

  const rawLastFilter = window.localStorage.getItem(
    SHIPPING_CANDIDATE_LAST_FILTER_STORAGE_KEY,
  );
  if (!rawLastFilter) {
    return emptyFilter;
  }

  try {
    const parsed = JSON.parse(rawLastFilter) as ShippingCandidateFilterValue;
    return {
      keyword: parsed.keyword || '',
      projectId: parsed.projectId || '',
      campaignId: parsed.campaignId || '',
      dateFrom: parsed.dateFrom || '',
      dateTo: parsed.dateTo || '',
    };
  } catch {
    window.localStorage.removeItem(SHIPPING_CANDIDATE_LAST_FILTER_STORAGE_KEY);
    return emptyFilter;
  }
}

export default function AdminShippingPage() {
  const initialFilterValues = useMemo(() => readLastShippingCandidateFilter(), []);

  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [keywordInput, setKeywordInput] = useState(initialFilterValues.keyword);
  const [projectIdInput, setProjectIdInput] = useState(initialFilterValues.projectId);
  const [campaignIdInput, setCampaignIdInput] = useState(initialFilterValues.campaignId);
  const [dateFromInput, setDateFromInput] = useState(initialFilterValues.dateFrom);
  const [dateToInput, setDateToInput] = useState(initialFilterValues.dateTo);

  const [savedFilters, setSavedFilters] = useState<SavedShippingCandidateFilter[]>(
    () => readSavedShippingCandidateFilters(),
  );
  const [selectedViewId, setSelectedViewId] = useState<string>('DEFAULT');
  const [isViewManagerOpen, setIsViewManagerOpen] = useState(false);
  const [viewNameDraft, setViewNameDraft] = useState('');

  const [keyword, setKeyword] = useState(initialFilterValues.keyword);
  const [projectId, setProjectId] = useState(initialFilterValues.projectId);
  const [campaignId, setCampaignId] = useState(initialFilterValues.campaignId);
  const [dateFrom, setDateFrom] = useState(initialFilterValues.dateFrom);
  const [dateTo, setDateTo] = useState(initialFilterValues.dateTo);

  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [batchNotes, setBatchNotes] = useState('');
  const [previewSelectionKey, setPreviewSelectionKey] = useState('');
  const [previewErrorMessage, setPreviewErrorMessage] = useState<string | null>(null);
  const autoPreviewRequestedKeyRef = useRef('');

  const [batchStatusFilter, setBatchStatusFilter] =
    useState<V2AdminShippingBatchStatus | ''>('');
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [batchActionReason, setBatchActionReason] = useState('');
  const [isExcelDownloading, setIsExcelDownloading] = useState(false);

  const [packageDrafts, setPackageDrafts] = useState<Record<string, PackageDraftRow>>({});

  const projectsQuery = useV2AdminProjects();
  const campaignsQuery = useV2Campaigns();

  const candidatesQuery = useV2AdminShippingCandidates({
    limit: 300,
    keyword: keyword || undefined,
    project_id: projectId || undefined,
    campaign_id: campaignId || undefined,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
  });
  const batchesQuery = useV2AdminShippingBatches({
    limit: 100,
    status: batchStatusFilter || undefined,
  });
  const batchDetailQuery = useV2AdminShippingBatchDetail(selectedBatchId);

  const previewMutation = useV2AdminPreviewShippingBatch();
  const createBatchMutation = useV2AdminCreateShippingBatch();
  const activateBatchMutation = useV2AdminActivateShippingBatch();
  const savePackagesMutation = useV2AdminSaveShippingBatchPackages();
  const dispatchBatchMutation = useV2AdminDispatchShippingBatch();
  const completeBatchMutation = useV2AdminCompleteShippingBatch();
  const cancelBatchMutation = useV2AdminCancelShippingBatch();

  const projects = useMemo(() => projectsQuery.data || [], [projectsQuery.data]);
  const campaigns = useMemo(
    () => campaignsQuery.data || [],
    [campaignsQuery.data],
  );
  const projectsLoading = projectsQuery.isLoading;
  const campaignsLoading = campaignsQuery.isLoading;

  const previewData = previewMutation.data;
  const candidateRows = useMemo(
    () => candidatesQuery.data?.items || [],
    [candidatesQuery.data?.items],
  );
  const allCandidateIds = useMemo(
    () => candidateRows.map((row) => row.order_id),
    [candidateRows],
  );
  const selectedOrderIdsInView = useMemo(() => {
    const candidateIdSet = new Set(allCandidateIds);
    return selectedOrderIds.filter((orderId) => candidateIdSet.has(orderId));
  }, [allCandidateIds, selectedOrderIds]);
  const currentSelectionKey = useMemo(
    () => buildSelectionKey(selectedOrderIdsInView),
    [selectedOrderIdsInView],
  );
  const hasFreshPreview =
    currentSelectionKey.length > 0 &&
    previewSelectionKey.length > 0 &&
    currentSelectionKey === previewSelectionKey;
  const detail = batchDetailQuery.data;
  const selectedBatch = detail?.batch || null;

  const selectedCandidateRows = useMemo(() => {
    const selectedIdSet = new Set(selectedOrderIdsInView);
    return candidateRows.filter((row) => selectedIdSet.has(row.order_id));
  }, [candidateRows, selectedOrderIdsInView]);

  const selectedProjectSummary = useMemo(
    () => buildProjectSummary(selectedCandidateRows.map((row) => row.project_name || '')),
    [selectedCandidateRows],
  );

  const autoBatchTitle = useMemo(() => {
    const datePrefix = formatAutoBatchTitleDate(new Date());
    const todaySequences = (batchesQuery.data?.items || [])
      .map((row) => String(row.title || ''))
      .map((title) => {
        const match = title.match(/^SH(\d{6})(\d{2,})$/);
        if (!match || match[1] !== datePrefix) {
          return 0;
        }
        return Number.parseInt(match[2], 10);
      })
      .filter((value) => Number.isFinite(value));

    const nextSequence = (todaySequences.length > 0 ? Math.max(...todaySequences) : 0) + 1;
    return `SH${datePrefix}${String(nextSequence).padStart(2, '0')}`;
  }, [batchesQuery.data?.items]);

  const projectOptions = useMemo(
    () =>
      projects
        .slice()
        .sort((left, right) => left.name.localeCompare(right.name, 'ko-KR'))
        .map((project) => ({
          value: project.id,
          label: `${project.name} (${project.slug})`,
        })),
    [projects],
  );

  const campaignOptions = useMemo(
    () =>
      campaigns
        .slice()
        .sort((left, right) => right.updated_at.localeCompare(left.updated_at))
        .map((campaign) => ({
          value: campaign.id,
          label: `${campaign.name} (${campaign.code})`,
        })),
    [campaigns],
  );

  const projectNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const project of projects) {
      map.set(project.id, project.name);
    }
    return map;
  }, [projects]);

  const campaignNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const campaign of campaigns) {
      map.set(campaign.id, campaign.name);
    }
    return map;
  }, [campaigns]);

  const selectedSavedView = useMemo(
    () => savedFilters.find((row) => row.id === selectedViewId) || null,
    [savedFilters, selectedViewId],
  );

  const allChecked =
    candidateRows.length > 0 &&
    selectedOrderIdsInView.length > 0 &&
    selectedOrderIdsInView.length === allCandidateIds.length;

  const isBusy =
    createBatchMutation.isPending ||
    activateBatchMutation.isPending ||
    savePackagesMutation.isPending ||
    dispatchBatchMutation.isPending ||
    completeBatchMutation.isPending ||
    cancelBatchMutation.isPending;

  const packageByBatchOrderId = useMemo(() => {
    const map = new Map<string, V2AdminShippingBatchPackageRow>();
    for (const row of detail?.packages || []) {
      if (typeof row.batch_order_id === 'string' && !map.has(row.batch_order_id)) {
        map.set(row.batch_order_id, row);
      }
    }
    return map;
  }, [detail?.packages]);

  const trackingFilledBatchOrderIds = useMemo(() => {
    const ids = new Set<string>();
    for (const row of detail?.packages || []) {
      if (
        typeof row.batch_order_id === 'string' &&
        typeof row.tracking_no === 'string' &&
        row.tracking_no.trim().length > 0
      ) {
        ids.add(row.batch_order_id);
      }
    }
    return ids;
  }, [detail?.packages]);

  const trackingProgress = {
    total: detail?.orders?.length || 0,
    filled: detail?.orders
      ? detail.orders.filter((row) => trackingFilledBatchOrderIds.has(row.id)).length
      : 0,
  };
  const trackingProgressWithStatus = {
    ...trackingProgress,
    allFilled: trackingProgress.total > 0 && trackingProgress.filled === trackingProgress.total,
  };

  const transitionFailures = {
    dispatchFailed: (detail?.orders || []).filter(
      (row) => row.dispatch_transition_status === 'FAILED',
    ).length,
    deliveryFailed: (detail?.orders || []).filter(
      (row) => row.delivery_transition_status === 'FAILED',
    ).length,
  };

  const summary = useMemo(() => {
    return {
      candidateCount: candidateRows.length,
      selectedCount: selectedOrderIdsInView.length,
      previewValidCount:
        hasFreshPreview && previewData ? previewData.valid_order_count : 0,
      previewBlockedCount:
        hasFreshPreview && previewData ? previewData.blocked_order_count : 0,
      activeBatchCount:
        (batchesQuery.data?.items || []).filter(
          (row) => row.status === 'ACTIVE' || row.status === 'DISPATCHED',
        ).length || 0,
    };
  }, [
    batchesQuery.data?.items,
    candidateRows.length,
    hasFreshPreview,
    previewData,
    selectedOrderIdsInView.length,
  ]);

  const workflowGuideSteps = useMemo(() => {
    const hasAppliedView =
      selectedViewId !== 'DEFAULT' ||
      Boolean(keyword || projectId || campaignId || dateFrom || dateTo);
    const hasOrderSelection = selectedOrderIdsInView.length > 0;
    const hasBatchCreated = Boolean(selectedBatchId);
    const hasDispatchStarted =
      (selectedBatch?.status as V2AdminShippingBatchStatus | undefined) === 'DISPATCHED' ||
      (selectedBatch?.status as V2AdminShippingBatchStatus | undefined) === 'COMPLETED';
    const hasCompleted =
      (selectedBatch?.status as V2AdminShippingBatchStatus | undefined) === 'COMPLETED';

    return [
      {
        key: 'view',
        title: '1. 뷰 선택',
        description: '반복 작업 조건(프로젝트/캠페인)을 불러와 후보 주문을 좁힙니다.',
        done: hasAppliedView,
        hint: hasAppliedView
          ? '현재 필터가 적용되어 있습니다.'
          : '전체 뷰에서 시작해도 됩니다.',
      },
      {
        key: 'snapshot',
        title: '2. 배치 생성',
        description: '출고할 주문을 선택해 스냅샷 배치를 생성합니다.',
        done: hasOrderSelection || hasBatchCreated,
        hint: hasOrderSelection
          ? `${selectedOrderIdsInView.length}건 선택됨`
          : hasBatchCreated
            ? '배치가 생성되었습니다.'
            : '체크박스로 주문을 먼저 선택하세요.',
      },
      {
        key: 'dispatch',
        title: '3. 운송장 등록/출고',
        description: '운송장 저장 후 출고 실행으로 배송중 상태로 전이합니다.',
        done: hasDispatchStarted,
        hint: hasDispatchStarted
          ? '선택 배치가 배송중 단계로 전환되었습니다.'
          : trackingProgress.filled > 0
            ? `운송장 ${trackingProgress.filled}/${trackingProgress.total} 입력됨`
            : '운송장 입력을 먼저 진행하세요.',
      },
      {
        key: 'complete',
        title: '4. 배송 완료 처리',
        description: '배송 완료 확인 후 배치 완료를 실행합니다.',
        done: hasCompleted,
        hint: hasCompleted
          ? '배송 완료 처리까지 마무리되었습니다.'
          : '배송중 상태에서 완료 액션을 실행하세요.',
      },
    ] as const;
  }, [
    campaignId,
    dateFrom,
    dateTo,
    keyword,
    projectId,
    selectedBatch?.status,
    selectedBatchId,
    selectedOrderIdsInView.length,
    selectedViewId,
    trackingProgress.filled,
    trackingProgress.total,
  ]);

  useEffect(() => {
    window.localStorage.setItem(
      SHIPPING_CANDIDATE_FILTER_STORAGE_KEY,
      JSON.stringify(savedFilters),
    );
  }, [savedFilters]);

  useEffect(() => {
    if (selectedOrderIdsInView.length === 0) {
      previewMutation.reset();
      autoPreviewRequestedKeyRef.current = '';
      return;
    }

    const requestSelectionKey = buildSelectionKey(selectedOrderIdsInView);
    if (!requestSelectionKey) {
      previewMutation.reset();
      autoPreviewRequestedKeyRef.current = '';
      return;
    }
    if (autoPreviewRequestedKeyRef.current === requestSelectionKey) {
      return;
    }
    autoPreviewRequestedKeyRef.current = requestSelectionKey;

    const timeoutId = setTimeout(() => {
      previewMutation.mutate(
        { order_ids: selectedOrderIdsInView },
        {
          onSuccess: () => {
            setPreviewSelectionKey(requestSelectionKey);
            setPreviewErrorMessage(null);
          },
          onError: (error) => {
            setPreviewSelectionKey('');
            setPreviewErrorMessage(getErrorMessage(error));
          },
        },
      );
    }, 250);

    return () => clearTimeout(timeoutId);
  }, [previewMutation, selectedOrderIdsInView]);

  const currentFilterInputValue: ShippingCandidateFilterValue = {
    keyword: keywordInput.trim(),
    projectId: projectIdInput,
    campaignId: campaignIdInput,
    dateFrom: dateFromInput,
    dateTo: dateToInput,
  };

  const applyFilterValues = (values: ShippingCandidateFilterValue) => {
    setKeywordInput(values.keyword);
    setProjectIdInput(values.projectId);
    setCampaignIdInput(values.campaignId);
    setDateFromInput(values.dateFrom);
    setDateToInput(values.dateTo);

    setKeyword(values.keyword.trim());
    setProjectId(values.projectId);
    setCampaignId(values.campaignId);
    setDateFrom(values.dateFrom);
    setDateTo(values.dateTo);
    setSelectedOrderIds([]);
    setPreviewSelectionKey('');
    setPreviewErrorMessage(null);
    autoPreviewRequestedKeyRef.current = '';
  };

  const persistLastFilter = (values: ShippingCandidateFilterValue) => {
    window.localStorage.setItem(
      SHIPPING_CANDIDATE_LAST_FILTER_STORAGE_KEY,
      JSON.stringify(values),
    );
  };

  const buildFilterSummaryText = (values: ShippingCandidateFilterValue): string => {
    const projectLabel = values.projectId
      ? projectNameById.get(values.projectId) || '알 수 없는 프로젝트'
      : '전체 프로젝트';
    const campaignLabel = values.campaignId
      ? campaignNameById.get(values.campaignId) || '알 수 없는 캠페인'
      : '전체 캠페인';
    const dateLabel =
      values.dateFrom || values.dateTo
        ? `${values.dateFrom || '시작'} ~ ${values.dateTo || '현재'}`
        : '전체 기간';
    const keywordLabel = values.keyword || '없음';
    return `${projectLabel} · ${campaignLabel} · ${dateLabel} · 검색:${keywordLabel}`;
  };

  const appliedFilterSummaryText =
    !keyword && !projectId && !campaignId && !dateFrom && !dateTo
      ? '설정된 필터 없음'
      : buildFilterSummaryText({ keyword, projectId, campaignId, dateFrom, dateTo });

  const setError = (error: unknown) => {
    setMessage(null);
    setErrorMessage(getErrorMessage(error));
  };

  const clearNotice = () => {
    setMessage(null);
    setErrorMessage(null);
  };

  const toggleOrderSelection = (orderId: string) => {
    setPreviewErrorMessage(null);
    setSelectedOrderIds((prev) => {
      if (prev.includes(orderId)) {
        return prev.filter((id) => id !== orderId);
      }
      return [...prev, orderId];
    });
  };

  const toggleSelectAll = () => {
    setPreviewErrorMessage(null);
    if (allChecked) {
      setSelectedOrderIds([]);
      return;
    }
    setSelectedOrderIds(allCandidateIds);
  };

  const handleSearchApply = () => {
    clearNotice();
    applyFilterValues(currentFilterInputValue);
    persistLastFilter(currentFilterInputValue);
    const matchedView = savedFilters.find((row) =>
      isSameFilterValues(row.values, currentFilterInputValue),
    );
    setSelectedViewId(matchedView?.id || 'DEFAULT');
  };

  const handleSearchReset = () => {
    clearNotice();
    const emptyFilter: ShippingCandidateFilterValue = {
      keyword: '',
      projectId: '',
      campaignId: '',
      dateFrom: '',
      dateTo: '',
    };
    applyFilterValues(emptyFilter);
    persistLastFilter(emptyFilter);
    setSelectedViewId('DEFAULT');
  };

  const handleCreateViewFromCurrentFilter = () => {
    clearNotice();
    const hasAnyValue = Object.values(currentFilterInputValue).some(
      (value) => value.trim().length > 0,
    );
    if (!hasAnyValue) {
      setErrorMessage('저장할 뷰 조건이 없습니다.');
      return;
    }

    if (!viewNameDraft.trim()) {
      setErrorMessage('뷰 이름을 입력해 주세요.');
      return;
    }

    const usedIds = new Set(savedFilters.map((row) => row.id));
    let nextSequence = savedFilters.length + 1;
    while (usedIds.has(`view-${nextSequence}`)) {
      nextSequence += 1;
    }

    const nextFilter: SavedShippingCandidateFilter = {
      id: `view-${nextSequence}`,
      name: viewNameDraft.trim(),
      createdAt: new Date().toISOString(),
      values: currentFilterInputValue,
    };

    setSavedFilters((prev) => [nextFilter, ...prev].slice(0, MAX_SAVED_SHIPPING_FILTERS));
    setViewNameDraft('');
    setSelectedViewId(nextFilter.id);
    setMessage('현재 조건을 새 뷰로 저장했습니다.');
  };

  const handleApplySavedFilter = (savedFilter: SavedShippingCandidateFilter) => {
    clearNotice();
    applyFilterValues(savedFilter.values);
    persistLastFilter(savedFilter.values);
    setSelectedViewId(savedFilter.id);
    setMessage(`"${savedFilter.name}" 뷰를 적용했습니다.`);
  };

  const handleUpdateSelectedView = () => {
    clearNotice();
    if (!selectedSavedView) {
      setErrorMessage('업데이트할 저장 뷰를 먼저 선택해 주세요.');
      return;
    }

    setSavedFilters((prev) =>
      prev.map((row) =>
        row.id === selectedSavedView.id
          ? {
              ...row,
              values: currentFilterInputValue,
              createdAt: new Date().toISOString(),
            }
          : row,
      ),
    );
    setMessage(`"${selectedSavedView.name}" 뷰를 현재 조건으로 업데이트했습니다.`);
  };

  const handleDeleteSavedFilter = (filterId: string) => {
    clearNotice();
    setSavedFilters((prev) => prev.filter((row) => row.id !== filterId));
    if (selectedViewId === filterId) {
      setSelectedViewId('DEFAULT');
    }
    setMessage('선택한 뷰를 삭제했습니다.');
  };

  const handleCreateBatch = async () => {
    clearNotice();
    if (selectedOrderIdsInView.length === 0) {
      setErrorMessage('배치에 포함할 주문을 먼저 선택해 주세요.');
      return;
    }

    try {
      const created = await createBatchMutation.mutateAsync({
        title: autoBatchTitle,
        order_ids: selectedOrderIdsInView,
        notes: batchNotes.trim() || null,
        metadata: {
          project_summary: selectedProjectSummary,
        },
      });
      const nextBatchId = typeof created.batch?.id === 'string' ? created.batch.id : null;
      if (nextBatchId) {
        setSelectedBatchId(nextBatchId);
        setPackageDrafts({});
      }

      setBatchNotes('');
      setSelectedOrderIds([]);
      setPreviewSelectionKey('');
      setPreviewErrorMessage(null);
      autoPreviewRequestedKeyRef.current = '';

      const createdTitle =
        typeof created.batch?.title === 'string' ? created.batch.title : autoBatchTitle;
      setMessage(`출고 배치를 생성했습니다. (${createdTitle})`);
    } catch (error) {
      setError(error);
    }
  };

  const handleActivateBatch = async () => {
    if (!selectedBatchId) {
      return;
    }

    clearNotice();
    try {
      await activateBatchMutation.mutateAsync(selectedBatchId);
      setMessage('배치를 출고 준비중으로 전환했습니다.');
    } catch (error) {
      setError(error);
    }
  };

  const handlePackageDraftChange = (
    batchOrderId: string,
    key: keyof PackageDraftRow,
    value: string,
  ) => {
    setPackageDrafts((prev) => ({
      ...prev,
      [batchOrderId]: {
        carrier_code: prev[batchOrderId]?.carrier_code || '',
        tracking_no: prev[batchOrderId]?.tracking_no || '',
        notes: prev[batchOrderId]?.notes || '',
        [key]: value,
      },
    }));
  };

  const resolvePackageDraft = (batchOrderId: string): PackageDraftRow => {
    const draft = packageDrafts[batchOrderId];
    const existing = packageByBatchOrderId.get(batchOrderId);

    return {
      carrier_code:
        draft?.carrier_code !== undefined
          ? draft.carrier_code
          : typeof existing?.carrier_code === 'string'
            ? existing.carrier_code
            : '',
      tracking_no:
        draft?.tracking_no !== undefined
          ? draft.tracking_no
          : typeof existing?.tracking_no === 'string'
            ? existing.tracking_no
            : '',
      notes:
        draft?.notes !== undefined
          ? draft.notes
          : typeof existing?.notes === 'string'
            ? existing.notes
            : '',
    };
  };

  const handleSavePackages = async () => {
    if (!selectedBatchId) {
      return;
    }

    clearNotice();
    const packagesPayload = (detail?.orders || [])
      .map((order) => {
        const draft = resolvePackageDraft(order.id);
        return {
          batch_order_id: order.id,
          carrier_code: draft.carrier_code.trim() || null,
          tracking_no: draft.tracking_no.trim() || null,
          notes: draft.notes.trim() || null,
        };
      })
      .filter((row) => row.tracking_no);

    if (packagesPayload.length === 0) {
      setErrorMessage('저장할 운송장 번호를 1개 이상 입력해 주세요.');
      return;
    }

    try {
      await savePackagesMutation.mutateAsync({
        batchId: selectedBatchId,
        data: { packages: packagesPayload },
      });
      setMessage('운송장 정보를 저장했습니다.');
    } catch (error) {
      setError(error);
    }
  };

  const handleDispatchBatch = async () => {
    if (!selectedBatchId) {
      return;
    }

    clearNotice();
    try {
      await dispatchBatchMutation.mutateAsync({
        batchId: selectedBatchId,
        data: { reason: batchActionReason.trim() || null },
      });
      setMessage('출고 처리를 완료하고 주문을 배송중으로 이동했습니다.');
    } catch (error) {
      setError(error);
    }
  };

  const handleCompleteBatch = async () => {
    if (!selectedBatchId) {
      return;
    }

    clearNotice();
    try {
      await completeBatchMutation.mutateAsync({
        batchId: selectedBatchId,
        data: { reason: batchActionReason.trim() || null },
      });
      setMessage('배송 완료 처리 후 주문을 완료 단계로 이동했습니다.');
    } catch (error) {
      setError(error);
    }
  };

  const handleCancelBatch = async () => {
    if (!selectedBatchId) {
      return;
    }

    clearNotice();
    try {
      await cancelBatchMutation.mutateAsync({
        batchId: selectedBatchId,
        reason: batchActionReason.trim() || null,
      });
      setMessage('선택한 배송 배치를 취소했습니다.');
    } catch (error) {
      setError(error);
    }
  };

  const handlePrintShippingList = () => {
    if (!selectedBatchId || typeof window === 'undefined') {
      return;
    }

    const previousIframe = document.getElementById(
      'lucent-shipping-print-iframe',
    ) as HTMLIFrameElement | null;
    if (previousIframe) {
      previousIframe.remove();
    }

    const iframe = document.createElement('iframe');
    iframe.id = 'lucent-shipping-print-iframe';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.opacity = '0';
    iframe.style.pointerEvents = 'none';
    iframe.src = `/admin/shipping/print/${selectedBatchId}?autoprint=1&embedded=1&t=${Date.now()}`;

    iframe.onload = () => {
      const cleanup = () => {
        window.setTimeout(() => {
          iframe.remove();
        }, 300);
      };
      iframe.contentWindow?.addEventListener('afterprint', cleanup, { once: true });
    };

    document.body.appendChild(iframe);

    window.setTimeout(() => {
      iframe.remove();
    }, 120000);
  };

  const handleDownloadPostOfficeExcel = async () => {
    if (!detail || (detail.orders || []).length === 0) {
      setErrorMessage('다운로드할 배송 스냅샷 주문이 없습니다.');
      return;
    }

    setErrorMessage(null);
    setMessage(null);
    setIsExcelDownloading(true);
    try {
      const XLSX = await import('xlsx');
      const rows = (detail.orders || []).map((order) => {
        const snapshot = order.shipping_address_snapshot as Record<string, unknown> | null;
        const phone = formatPhoneNumber(order.recipient_phone || '');
        const isLandline = phone.startsWith('02-');
        const lineItems = summarizeLineItems(
          order.line_items_snapshot as Array<Record<string, unknown>> | null,
        );
        const contentText = lineItems.details === '-' ? '굿즈' : lineItems.details;

        return [
          order.recipient_name || '',
          resolvePostalCode(snapshot),
          resolveAddressLine1(snapshot),
          resolveAddressLine2(snapshot),
          isLandline ? phone : '',
          isLandline ? '' : phone,
          '3',
          '80',
          '의류/패션잡화',
          contentText,
          '',
          '',
          'N',
          '',
          '',
          '',
          '',
        ];
      });

      const sheet = XLSX.utils.aoa_to_sheet([POST_OFFICE_EXCEL_HEADERS, ...rows]);
      sheet['!cols'] = [
        { wch: 12 },
        { wch: 12 },
        { wch: 34 },
        { wch: 32 },
        { wch: 18 },
        { wch: 18 },
        { wch: 10 },
        { wch: 18 },
        { wch: 20 },
        { wch: 50 },
        { wch: 12 },
        { wch: 24 },
        { wch: 12 },
        { wch: 20 },
        { wch: 20 },
        { wch: 20 },
        { wch: 20 },
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, sheet, '창구소포 파일접수양식');

      const safeBatchNo = String(selectedBatch?.batch_no || 'shipping_batch').replace(
        /[^A-Za-z0-9_-]/g,
        '_',
      );
      XLSX.writeFile(workbook, `${safeBatchNo}_우체국접수양식.xls`, {
        bookType: 'biff8',
      });

      setMessage(`우체국 접수 양식 엑셀을 생성했습니다. (${rows.length}건)`);
    } catch (error) {
      setError(error);
    } finally {
      setIsExcelDownloading(false);
    }
  };

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold text-gray-900">배송 관리</h1>
        <p className="text-sm text-gray-600">
          출고 작업 단위로 주문을 묶고, 운송장 입력부터 출고/배송 완료까지 배송 탭에서 일괄
          관리합니다.
        </p>
      </header>

      {(message || errorMessage) && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            errorMessage
              ? 'border-red-200 bg-red-50 text-red-700'
              : 'border-emerald-200 bg-emerald-50 text-emerald-700'
          }`}
        >
          {errorMessage || message}
        </div>
      )}

      <section className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-5">
        <div>
          <h2 className="text-base font-semibold text-slate-900">작업 가이드</h2>
          <p className="text-sm text-slate-600">
            반복 필터로 후보를 찾고, 출고 배치 스냅샷을 만든 뒤 운송장/배송 상태를 순서대로
            처리하세요.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-4">
          {workflowGuideSteps.map((step) => (
            <div key={step.key} className="rounded-lg border border-slate-200 bg-white p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-900">{step.title}</p>
                <Badge intent={step.done ? 'success' : 'default'}>
                  {step.done ? '완료' : '대기'}
                </Badge>
              </div>
              <p className="mt-2 text-xs text-slate-600">{step.description}</p>
              <p className="mt-2 text-xs text-slate-500">{step.hint}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">출고 후보 주문</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">{summary.candidateCount}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">선택 주문</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">{summary.selectedCount}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">자동 검증 통과</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">
            {summary.previewValidCount}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">진행 중 배치</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">
            {summary.activeBatchCount}
          </p>
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-5">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-gray-900">1) 출고 후보 주문 선택</h2>
          <p className="text-sm text-gray-600">
            배송 대기(READY_TO_SHIP) 주문만 표시됩니다. 주문 선택 즉시 자동 검증이 실행되며,
            반복 조건은 뷰로 저장해 재사용할 수 있습니다.
          </p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <p className="text-xs text-gray-500">설정된 뷰</p>
                <p className="text-sm font-medium text-gray-900">
                  {selectedSavedView?.name || '설정된 뷰 없음'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">설정된 필터</p>
                <p className="text-sm font-medium text-gray-900">{appliedFilterSummaryText}</p>
              </div>
            </div>
            <Button intent="neutral" onClick={() => setIsViewManagerOpen((prev) => !prev)}>
              {isViewManagerOpen ? '뷰 관리 닫기' : '뷰 관리 열기'}
            </Button>
          </div>
        </div>

        {isViewManagerOpen && (
          <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-800">필터 관리</p>
              <p className="text-xs text-gray-600">
                배송 후보 조회는 키워드/프로젝트/캠페인/기간 필터를 함께 사용할 수 있습니다.
              </p>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-6">
                <Input
                  value={keywordInput}
                  onChange={(event) => setKeywordInput(event.target.value)}
                  placeholder="주문번호/입금자명/프로젝트/캠페인"
                  className="md:col-span-2"
                />
                <select
                  className="h-11 rounded-lg border border-gray-200 px-3 text-sm"
                  value={projectIdInput}
                  disabled={projectsLoading}
                  onChange={(event) => setProjectIdInput(event.target.value)}
                >
                  <option value="">전체 프로젝트</option>
                  {projectOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <select
                  className="h-11 rounded-lg border border-gray-200 px-3 text-sm"
                  value={campaignIdInput}
                  disabled={campaignsLoading}
                  onChange={(event) => setCampaignIdInput(event.target.value)}
                >
                  <option value="">전체 캠페인</option>
                  {campaignOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <Input
                  type="date"
                  value={dateFromInput}
                  onChange={(event) => setDateFromInput(event.target.value)}
                />
                <Input
                  type="date"
                  value={dateToInput}
                  onChange={(event) => setDateToInput(event.target.value)}
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button intent="neutral" onClick={handleSearchApply}>
                  필터 적용
                </Button>
                <Button intent="neutral" onClick={handleSearchReset}>
                  필터 해제
                </Button>
              </div>
            </div>

            <div className="border-t border-gray-200" />

            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-800">뷰 관리</p>
              <p className="text-xs text-gray-600">
                현재 필터를 뷰로 저장하면 반복 작업 시 바로 다시 적용할 수 있습니다.
              </p>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-[minmax(0,1fr)_auto]">
                <Input
                  value={viewNameDraft}
                  onChange={(event) => setViewNameDraft(event.target.value)}
                  placeholder="새 뷰 이름 (예: 미루루-3월4주 출고)"
                />
                <Button intent="neutral" onClick={handleCreateViewFromCurrentFilter}>
                  새 뷰 저장
                </Button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  intent={selectedViewId === 'DEFAULT' ? 'secondary' : 'neutral'}
                  size="sm"
                  onClick={() => {
                    clearNotice();
                    setSelectedViewId('DEFAULT');
                    setMessage('뷰 선택을 해제했습니다.');
                  }}
                >
                  뷰 선택 해제
                </Button>
                {selectedSavedView && (
                  <Button intent="neutral" size="sm" onClick={handleUpdateSelectedView}>
                    선택 뷰 업데이트
                  </Button>
                )}
                <Button
                  intent="danger"
                  size="sm"
                  onClick={() =>
                    selectedSavedView ? handleDeleteSavedFilter(selectedSavedView.id) : null
                  }
                  disabled={!selectedSavedView}
                >
                  선택 뷰 삭제
                </Button>
              </div>

              <div className="space-y-2">
                {savedFilters.length === 0 ? (
                  <p className="text-xs text-gray-500">저장된 뷰가 없습니다.</p>
                ) : (
                  savedFilters.map((savedFilter) => (
                    <button
                      key={savedFilter.id}
                      type="button"
                      onClick={() => handleApplySavedFilter(savedFilter)}
                      className={`w-full rounded-lg border px-3 py-2 text-left text-xs ${
                        selectedViewId === savedFilter.id
                          ? 'border-blue-200 bg-blue-50 text-blue-900'
                          : 'border-gray-200 bg-white text-gray-700'
                      }`}
                    >
                      <p className="font-medium">{savedFilter.name}</p>
                      <p className="mt-1 text-[11px]">{buildFilterSummaryText(savedFilter.values)}</p>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Button
            intent="neutral"
            size="sm"
            onClick={toggleSelectAll}
            disabled={candidateRows.length === 0}
          >
            {allChecked ? '전체 해제' : '전체 선택'}
          </Button>
          <Button
            size="sm"
            onClick={handleCreateBatch}
            disabled={selectedOrderIdsInView.length === 0 || isBusy}
          >
            선택 주문으로 배치 생성
          </Button>
        </div>

        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-600">
          {selectedOrderIdsInView.length === 0 ? (
            <p>주문을 선택하면 주소/품목/차단 조건을 자동으로 검증합니다.</p>
          ) : previewMutation.isPending ? (
            <p>선택 주문을 자동 검증 중입니다...</p>
          ) : previewErrorMessage ? (
            <p className="text-red-600">자동 검증 실패: {previewErrorMessage}</p>
          ) : hasFreshPreview ? (
            <p>
              자동 검증 결과: 통과 {summary.previewValidCount}건 · 차단 {summary.previewBlockedCount}
              건
            </p>
          ) : (
            <p>자동 검증 결과를 준비하고 있습니다.</p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          <Input value={autoBatchTitle} readOnly placeholder="자동 생성 배치 번호" />
          <Input value={selectedProjectSummary} readOnly placeholder="프로젝트 요약" />
          <Textarea
            rows={2}
            value={batchNotes}
            onChange={(event) => setBatchNotes(event.target.value)}
            placeholder="배치 메모(선택)"
          />
        </div>

        {candidatesQuery.isLoading ? (
          <div className="py-8">
            <Loading text="배송 후보 주문을 불러오는 중입니다." />
          </div>
        ) : candidateRows.length === 0 ? (
          <EmptyState
            title="선택 가능한 배송 후보 주문이 없습니다."
            description="필터를 변경하거나 주문 상태를 확인해 주세요."
          />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left">
                    <input type="checkbox" checked={allChecked} onChange={toggleSelectAll} />
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">주문번호</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">프로젝트/캠페인</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">입금자</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">구성</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-600">주문금액</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">주문일시</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {candidateRows.map((row) => {
                  const checked = selectedOrderIdsInView.includes(row.order_id);
                  return (
                    <tr key={row.order_id} className={checked ? 'bg-blue-50/60' : ''}>
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleOrderSelection(row.order_id)}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <p className="font-medium text-gray-900">{row.order_no}</p>
                        <p className="text-xs text-gray-500">{row.order_id}</p>
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-700">
                        <p>{row.project_name || '-'}</p>
                        <p className="text-gray-500">{row.campaign_name || '-'}</p>
                      </td>
                      <td className="px-3 py-2 text-gray-700">{row.depositor_name || '-'}</td>
                      <td className="px-3 py-2 text-gray-700">{resolveComposition(row)}</td>
                      <td className="px-3 py-2 text-right text-gray-700">
                        {formatCurrency(row.grand_total)}
                      </td>
                      <td className="px-3 py-2 text-gray-700">
                        {formatDate(row.placed_at || row.created_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-5">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-gray-900">2) 배송 배치 워크벤치</h2>
          <p className="text-sm text-gray-600">
            배치 상태는 출고 준비 전 → 출고 준비중 → 배송중 → 배송 완료 흐름으로 관리합니다.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="text-sm text-gray-600" htmlFor="shipping-status-filter">
            상태 필터
          </label>
          <select
            id="shipping-status-filter"
            className="h-11 rounded-lg border border-gray-200 px-3 text-sm"
            value={batchStatusFilter}
            onChange={(event) =>
              setBatchStatusFilter((event.target.value as V2AdminShippingBatchStatus) || '')
            }
          >
            <option value="">전체</option>
            <option value="DRAFT">출고 준비 전</option>
            <option value="ACTIVE">출고 준비중</option>
            <option value="DISPATCHED">배송중</option>
            <option value="COMPLETED">배송 완료</option>
            <option value="CANCELED">취소됨</option>
          </select>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">배치번호</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">상태</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-600">주문수</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-600">운송장수</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {(batchesQuery.data?.items || []).map((row) => (
                  <tr
                    key={row.id}
                    className={`cursor-pointer ${selectedBatchId === row.id ? 'bg-blue-50' : ''}`}
                    onClick={() => {
                      setSelectedBatchId(row.id);
                      setPackageDrafts({});
                    }}
                  >
                    <td className="px-3 py-2">
                      <p className="font-medium text-gray-900">{row.batch_no}</p>
                      <p className="text-xs text-gray-500">{row.title}</p>
                    </td>
                    <td className="px-3 py-2">
                      <Badge intent={resolveBatchIntent(row.status)}>
                        {resolveBatchStatusLabel(row.status)}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-right text-gray-700">
                      {row.order_count.toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-right text-gray-700">
                      {row.package_count.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 rounded-lg border border-gray-200 p-4">
            {!selectedBatchId ? (
              <EmptyState
                title="배치를 선택해 주세요."
                description="좌측 목록에서 배치를 선택하면 운송장 입력/출고/완료를 진행할 수 있습니다."
              />
            ) : batchDetailQuery.isLoading ? (
              <div className="py-8">
                <Loading text="배치 상세를 불러오는 중입니다." />
              </div>
            ) : !selectedBatch ? (
              <EmptyState title="배치 상세를 불러오지 못했습니다." />
            ) : (
              <>
                <div>
                  <p className="text-sm text-gray-500">선택 배치</p>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {String(selectedBatch.batch_no || '-')}
                  </h3>
                  <p className="text-sm text-gray-600">{String(selectedBatch.title || '-')}</p>
                  <div className="mt-2">
                    <Badge intent={resolveBatchIntent(selectedBatch.status as V2AdminShippingBatchStatus)}>
                      {resolveBatchStatusLabel(selectedBatch.status as string)}
                    </Badge>
                  </div>
                </div>

                <Input
                  value={batchActionReason}
                  onChange={(event) => setBatchActionReason(event.target.value)}
                  placeholder="액션 사유(선택)"
                />

                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                  <p>
                    운송장 입력: {trackingProgressWithStatus.filled} / {trackingProgressWithStatus.total}{' '}
                    {trackingProgressWithStatus.allFilled ? '(완료)' : ''}
                  </p>
                  <p>출고 실패: {transitionFailures.dispatchFailed}건</p>
                  <p>배송 완료 실패: {transitionFailures.deliveryFailed}건</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {(selectedBatch.status as V2AdminShippingBatchStatus) === 'DRAFT' && (
                    <Button onClick={handleActivateBatch} disabled={isBusy}>
                      출고 준비 시작
                    </Button>
                  )}
                  {(selectedBatch.status as V2AdminShippingBatchStatus) === 'ACTIVE' && (
                    <>
                      <Button intent="neutral" onClick={handleSavePackages} disabled={isBusy}>
                        운송장 저장
                      </Button>
                      <Button onClick={handleDispatchBatch} disabled={isBusy}>
                        출고 실행
                      </Button>
                    </>
                  )}
                  {(selectedBatch.status as V2AdminShippingBatchStatus) === 'DISPATCHED' && (
                    <Button onClick={handleCompleteBatch} disabled={isBusy}>
                      배송 완료 처리
                    </Button>
                  )}
                  {((selectedBatch.status as V2AdminShippingBatchStatus) === 'DRAFT' ||
                    (selectedBatch.status as V2AdminShippingBatchStatus) === 'ACTIVE') && (
                    <Button intent="danger" onClick={handleCancelBatch} disabled={isBusy}>
                      배치 취소
                    </Button>
                  )}
                  <Button
                    intent="neutral"
                    onClick={handleDownloadPostOfficeExcel}
                    disabled={!detail || isBusy || isExcelDownloading}
                  >
                    {isExcelDownloading ? '우체국 엑셀 생성 중...' : '우체국 엑셀 다운로드'}
                  </Button>
                  <Button intent="neutral" onClick={handlePrintShippingList} disabled={!detail}>
                    배송 리스트 인쇄
                  </Button>
                </div>

                <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 text-sm text-gray-700">
                  <p>생성일: {formatDate(String(selectedBatch.created_at || ''))}</p>
                  <p>출고일: {formatDate(String(selectedBatch.dispatched_at || ''))}</p>
                  <p>완료일: {formatDate(String(selectedBatch.completed_at || ''))}</p>
                </div>
              </>
            )}
          </div>
        </div>

        {detail && (
          <div className="space-y-4">
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">주문번호</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">수취인/연락처</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">주소</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">출고 품목</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-600">수량합</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">운송장</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">출고/완료</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {(detail.orders || []).map((row) => {
                    const address = buildAddressText(
                      row.shipping_address_snapshot as Record<string, unknown> | null,
                    );
                    const lineItems = summarizeLineItems(
                      row.line_items_snapshot as Array<Record<string, unknown>> | null,
                    );
                    const packageRow = packageByBatchOrderId.get(row.id) || null;
                    const trackingText =
                      typeof packageRow?.tracking_no === 'string' && packageRow.tracking_no.trim().length > 0
                        ? `${String(packageRow?.carrier_code || '-')} / ${packageRow.tracking_no}`
                        : '-';

                    return (
                      <tr key={row.id}>
                        <td className="px-3 py-2 text-gray-900">{row.order_no}</td>
                        <td className="px-3 py-2 text-gray-700">
                          {row.recipient_name || '-'} / {row.recipient_phone || '-'}
                        </td>
                        <td className="px-3 py-2 text-gray-700">{address || '-'}</td>
                        <td className="px-3 py-2 text-gray-700" title={lineItems.details}>
                          {lineItems.summary}
                        </td>
                        <td className="px-3 py-2 text-right text-gray-700">
                          {lineItems.quantity.toLocaleString()}
                        </td>
                        <td className="px-3 py-2 text-gray-700">{trackingText}</td>
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap gap-1">
                            <Badge intent={resolveTransitionIntent(row.dispatch_transition_status)}>
                              출고 {resolveTransitionLabel(row.dispatch_transition_status)}
                            </Badge>
                            <Badge intent={resolveTransitionIntent(row.delivery_transition_status)}>
                              완료 {resolveTransitionLabel(row.delivery_transition_status)}
                            </Badge>
                          </div>
                          {(() => {
                            const hasDispatchFailed = row.dispatch_transition_status === 'FAILED';
                            const hasDeliveryFailed = row.delivery_transition_status === 'FAILED';
                            const hasFailed = hasDispatchFailed || hasDeliveryFailed;
                            const note = resolveTransitionDescription(
                              hasFailed
                                ? 'FAILED'
                                : row.delivery_transition_status === 'SKIPPED' ||
                                    row.dispatch_transition_status === 'SKIPPED'
                                  ? 'SKIPPED'
                                  : 'SUCCEEDED',
                              row.error_message,
                            );

                            if (!note) {
                              return null;
                            }

                            return (
                              <p
                                className={
                                  hasFailed
                                    ? 'mt-1 text-xs text-red-600'
                                    : 'mt-1 text-xs text-gray-500'
                                }
                              >
                                {note}
                              </p>
                            );
                          })()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {(selectedBatch?.status as V2AdminShippingBatchStatus) === 'ACTIVE' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-gray-900">운송장 입력</h3>
                  <p className="text-xs text-gray-500">
                    입력 후 반드시 &quot;운송장 저장&quot;을 눌러야 출고 실행에 반영됩니다.
                  </p>
                </div>
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-gray-600">주문번호</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-600">수취인</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-600">택배사</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-600">운송장번호</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-600">메모</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {(detail.orders || []).map((row) => (
                        <tr key={row.id}>
                          <td className="px-3 py-2 text-gray-900">{row.order_no}</td>
                          <td className="px-3 py-2 text-gray-700">
                            {row.recipient_name || '-'} / {row.recipient_phone || '-'}
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              value={resolvePackageDraft(row.id).carrier_code}
                              onChange={(event) =>
                                handlePackageDraftChange(
                                  row.id,
                                  'carrier_code',
                                  event.target.value,
                                )
                              }
                              placeholder="POST_OFFICE / CJ ..."
                            />
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              value={resolvePackageDraft(row.id).tracking_no}
                              onChange={(event) =>
                                handlePackageDraftChange(
                                  row.id,
                                  'tracking_no',
                                  event.target.value,
                                )
                              }
                              placeholder="운송장 번호"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              value={resolvePackageDraft(row.id).notes}
                              onChange={(event) =>
                                handlePackageDraftChange(row.id, 'notes', event.target.value)
                              }
                              placeholder="메모(선택)"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
