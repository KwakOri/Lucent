import type {
  V2BundleDefinition,
  V2Campaign,
  V2CampaignStatus,
  V2CampaignTarget,
  V2CampaignTargetType,
  V2CampaignType,
  V2Product,
  V2Project,
} from '@/lib/client/api/v2-catalog-admin.api';
import { toKebabCase } from './v2-product-admin-form';

export type CampaignFilterStatus = 'ALL' | V2CampaignStatus;
export type CampaignFilterType = 'ALL' | V2CampaignType;
export type CampaignPeriodFilter = 'ALL' | 'LIVE' | 'UPCOMING' | 'ENDED' | 'NO_PERIOD';
export type CampaignSortKey = 'UPDATED_DESC' | 'START_ASC' | 'END_ASC' | 'NAME_ASC';

export type CampaignTargetSelection = {
  targetType: V2CampaignTargetType;
  targetId: string;
  label: string;
};

export const CAMPAIGN_TYPES: V2CampaignType[] = [
  'SALE',
  'DROP',
  'EVENT',
  'POPUP',
  'ALWAYS_ON',
];

export const CAMPAIGN_STATUSES: V2CampaignStatus[] = [
  'DRAFT',
  'ACTIVE',
  'SUSPENDED',
  'CLOSED',
  'ARCHIVED',
];

export const CAMPAIGN_TYPE_LABELS: Record<V2CampaignType, string> = {
  SALE: '세일',
  DROP: '드롭',
  EVENT: '이벤트',
  POPUP: '팝업',
  ALWAYS_ON: '상시 운영',
};

export const CAMPAIGN_STATUS_LABELS: Record<V2CampaignStatus, string> = {
  DRAFT: '준비 중',
  ACTIVE: '운영 중',
  SUSPENDED: '일시 중지',
  CLOSED: '종료됨',
  ARCHIVED: '보관됨',
};

export const CAMPAIGN_TARGET_TYPE_LABELS: Record<V2CampaignTargetType, string> = {
  PROJECT: '프로젝트',
  PRODUCT: '상품',
  VARIANT: '옵션',
  BUNDLE_DEFINITION: '번들 구성',
};

export function getErrorMessage(error: unknown): string {
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

export function parseDateTimeLocalInput(value: string, fieldName: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`${fieldName} 형식이 올바르지 않습니다.`);
  }
  return parsed.toISOString();
}

export function toDateTimeLocalValue(value: string | null): string {
  if (!value) {
    return '';
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }
  const offsetMs = parsed.getTimezoneOffset() * 60000;
  return new Date(parsed.getTime() - offsetMs).toISOString().slice(0, 16);
}

export function formatDateTime(value: string | null): string {
  if (!value) {
    return '-';
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDateRange(startsAt: string | null, endsAt: string | null): string {
  if (!startsAt && !endsAt) {
    return '종료일 없는 상시 캠페인';
  }
  if (startsAt && !endsAt) {
    return `${formatDateTime(startsAt)} 시작 · 종료 없음`;
  }
  if (!startsAt && endsAt) {
    return `즉시 운영 · ${formatDateTime(endsAt)} 종료`;
  }
  return `${formatDateTime(startsAt)} - ${formatDateTime(endsAt)}`;
}

export function getCampaignPeriod(
  startsAt: string | null,
  endsAt: string | null,
  nowMs = Date.now(),
): Exclude<CampaignPeriodFilter, 'ALL'> {
  if (!startsAt && !endsAt) {
    return 'NO_PERIOD';
  }

  const startsMs = startsAt ? new Date(startsAt).getTime() : null;
  const endsMs = endsAt ? new Date(endsAt).getTime() : null;

  if (startsMs !== null && Number.isFinite(startsMs) && startsMs > nowMs) {
    return 'UPCOMING';
  }
  if (endsMs !== null && Number.isFinite(endsMs) && endsMs < nowMs) {
    return 'ENDED';
  }
  return 'LIVE';
}

export function getPeriodLabel(period: Exclude<CampaignPeriodFilter, 'ALL'>): string {
  if (period === 'LIVE') {
    return '진행 중';
  }
  if (period === 'UPCOMING') {
    return '예정';
  }
  if (period === 'ENDED') {
    return '종료';
  }
  return '상시';
}

export function getCampaignStatusIntent(
  status: V2CampaignStatus,
): 'default' | 'success' | 'warning' | 'error' | 'info' {
  if (status === 'ACTIVE') {
    return 'success';
  }
  if (status === 'SUSPENDED') {
    return 'warning';
  }
  if (status === 'CLOSED') {
    return 'info';
  }
  if (status === 'ARCHIVED') {
    return 'error';
  }
  return 'default';
}

export function getCampaignPeriodIntent(
  period: Exclude<CampaignPeriodFilter, 'ALL'>,
): 'default' | 'success' | 'warning' | 'error' | 'info' {
  if (period === 'LIVE') {
    return 'success';
  }
  if (period === 'UPCOMING') {
    return 'warning';
  }
  if (period === 'ENDED') {
    return 'info';
  }
  return 'default';
}

export function buildCampaignCode(name: string): string {
  return toKebabCase(name).slice(0, 80);
}

export function formatChannelScope(raw: unknown[] | undefined): string {
  if (!Array.isArray(raw)) {
    return '전체 채널';
  }
  const values = raw.filter((value): value is string => typeof value === 'string' && value.trim().length > 0);
  if (values.length === 0) {
    return '전체 채널';
  }
  return values.join(', ');
}

export function formatChannelScopeInput(raw: unknown[] | undefined): string {
  if (!Array.isArray(raw)) {
    return '';
  }
  return raw.filter((value): value is string => typeof value === 'string').join(', ');
}

export function parseChannelScopeInput(raw: string): string[] {
  return raw
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

export function resolveTargetLabel(params: {
  target: Pick<V2CampaignTarget, 'target_type' | 'target_id' | 'source_snapshot_json'>;
  projects?: V2Project[];
  products?: V2Product[];
  bundleDefinitions?: V2BundleDefinition[];
}): string {
  const { target, projects = [], products = [], bundleDefinitions = [] } = params;

  if (target.target_type === 'PROJECT') {
    return projects.find((project) => project.id === target.target_id)?.name || target.target_id;
  }

  if (target.target_type === 'PRODUCT') {
    return products.find((product) => product.id === target.target_id)?.title || target.target_id;
  }

  if (target.target_type === 'BUNDLE_DEFINITION') {
    const definition = bundleDefinitions.find((item) => item.id === target.target_id);
    if (definition) {
      const bundleProduct = products.find((product) => product.id === definition.bundle_product_id);
      return `${bundleProduct?.title || definition.bundle_product_id} / v${definition.version_no}`;
    }
    return target.target_id;
  }

  const snapshot = target.source_snapshot_json;
  if (snapshot && typeof snapshot === 'object') {
    const title =
      (typeof (snapshot as { title?: unknown }).title === 'string' &&
        (snapshot as { title: string }).title) ||
      (typeof (snapshot as { name?: unknown }).name === 'string' &&
        (snapshot as { name: string }).name) ||
      (typeof (snapshot as { sku?: unknown }).sku === 'string' &&
        (snapshot as { sku: string }).sku);

    if (title) {
      return title;
    }
  }

  return target.target_id;
}

export function summarizeTargetGroups(
  targets: Pick<V2CampaignTarget, 'target_type' | 'is_excluded'>[],
): string {
  if (targets.length === 0) {
    return '대상 미설정';
  }

  const includeCounts = new Map<V2CampaignTargetType, number>();
  const excludeCounts = new Map<V2CampaignTargetType, number>();

  targets.forEach((target) => {
    const map = target.is_excluded ? excludeCounts : includeCounts;
    map.set(target.target_type, (map.get(target.target_type) || 0) + 1);
  });

  const includeSummary = Array.from(includeCounts.entries())
    .map(([type, count]) => `${CAMPAIGN_TARGET_TYPE_LABELS[type]} ${count}개`)
    .join(', ');
  const excludeSummary = Array.from(excludeCounts.entries())
    .map(([type, count]) => `${CAMPAIGN_TARGET_TYPE_LABELS[type]} ${count}개 제외`)
    .join(', ');

  if (includeSummary && excludeSummary) {
    return `${includeSummary} · ${excludeSummary}`;
  }
  return includeSummary || excludeSummary || '대상 미설정';
}

export function getCampaignScheduleOverlapWarnings(params: {
  campaigns: V2Campaign[];
  startsAt: string | null;
  endsAt: string | null;
  currentCampaignId?: string | null;
}): string[] {
  const { campaigns, startsAt, endsAt, currentCampaignId } = params;
  const currentStart = startsAt ? new Date(startsAt).getTime() : Number.NEGATIVE_INFINITY;
  const currentEnd = endsAt ? new Date(endsAt).getTime() : Number.POSITIVE_INFINITY;

  if (!Number.isFinite(currentStart) && !Number.isFinite(currentEnd)) {
    return [];
  }

  return campaigns
    .filter((campaign) => campaign.id !== currentCampaignId)
    .filter((campaign) => campaign.status !== 'ARCHIVED' && campaign.status !== 'CLOSED')
    .filter((campaign) => {
      const otherStart = campaign.starts_at
        ? new Date(campaign.starts_at).getTime()
        : Number.NEGATIVE_INFINITY;
      const otherEnd = campaign.ends_at
        ? new Date(campaign.ends_at).getTime()
        : Number.POSITIVE_INFINITY;

      return currentStart <= otherEnd && otherStart <= currentEnd;
    })
    .slice(0, 3)
    .map((campaign) => `겹칠 수 있는 캠페인: ${campaign.name} (${formatDateRange(campaign.starts_at, campaign.ends_at)})`);
}

export function createSelectionFromTarget(
  target: Pick<V2CampaignTarget, 'target_type' | 'target_id' | 'source_snapshot_json'>,
  options: {
    projects?: V2Project[];
    products?: V2Product[];
    bundleDefinitions?: V2BundleDefinition[];
  } = {},
): CampaignTargetSelection {
  return {
    targetType: target.target_type,
    targetId: target.target_id,
    label: resolveTargetLabel({
      target,
      projects: options.projects,
      products: options.products,
      bundleDefinitions: options.bundleDefinitions,
    }),
  };
}
