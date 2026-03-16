'use client';

import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { Loading } from '@/components/ui/loading';
import {
  useActivateV2Campaign,
  useBuildV2PriceQuote,
  useCloseV2Campaign,
  useCreateV2Campaign,
  useCreateV2CampaignTarget,
  useCreateV2Coupon,
  useCreateV2PriceList,
  useCreateV2PriceListItem,
  useCreateV2Promotion,
  useCreateV2PromotionRule,
  useDeactivateV2PriceListItem,
  useDeleteV2CampaignTarget,
  useEvaluateV2Promotions,
  usePublishV2PriceList,
  useRedeemV2CouponRedemption,
  useReleaseV2CouponRedemption,
  useReserveV2Coupon,
  useRollbackV2PriceList,
  useSuspendV2Campaign,
  useUpdateV2Campaign,
  useUpdateV2CampaignTarget,
  useUpdateV2Coupon,
  useUpdateV2PriceList,
  useUpdateV2PriceListItem,
  useUpdateV2Promotion,
  useUpdateV2PromotionRule,
  useV2AdminProducts,
  useV2AdminProjects,
  useV2AdminVariants,
  useV2BundleDefinitions,
  useV2Campaigns,
  useV2CampaignTargets,
  useV2CouponRedemptions,
  useV2Coupons,
  useV2OrderSnapshotContract,
  useV2PriceListItems,
  useV2PriceLists,
  useV2PricingDebugTrace,
  useV2PromotionRules,
  useV2Promotions,
  useValidateV2Coupon,
} from '@/lib/client/hooks/useV2CatalogAdmin';

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

function parseLinesJson(raw: string): Array<{ variant_id: string; quantity: number }> {
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error('lines는 배열 JSON이어야 합니다.');
  }
  return parsed.map((line) => {
    if (!line || typeof line !== 'object') {
      throw new Error('lines 항목 형식이 올바르지 않습니다.');
    }
    const record = line as Record<string, unknown>;
    if (typeof record.variant_id !== 'string' || record.variant_id.trim().length === 0) {
      throw new Error('variant_id는 필수 문자열입니다.');
    }
    const quantity = Number(record.quantity ?? 1);
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new Error('quantity는 1 이상의 정수여야 합니다.');
    }
    return {
      variant_id: record.variant_id.trim(),
      quantity,
    };
  });
}

function toNullable(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

type PricingOpsTabKey =
  | 'campaign'
  | 'price-list'
  | 'promotion'
  | 'coupon-ops'
  | 'simulator';

type CampaignTypeValue = 'POPUP' | 'EVENT' | 'SALE' | 'DROP' | 'ALWAYS_ON';
type CampaignStatusValue = 'DRAFT' | 'ACTIVE' | 'SUSPENDED' | 'CLOSED' | 'ARCHIVED';
type CampaignTargetTypeValue = 'PROJECT' | 'PRODUCT' | 'VARIANT' | 'BUNDLE_DEFINITION';
type CampaignFilterStatus = 'ALL' | CampaignStatusValue;
type CampaignFilterType = 'ALL' | CampaignTypeValue;
type CampaignPeriodFilter = 'ALL' | 'LIVE' | 'UPCOMING' | 'ENDED' | 'NO_PERIOD';
type CampaignSortKey = 'UPDATED_DESC' | 'STARTS_ASC' | 'ENDS_ASC' | 'NAME_ASC';
type PriceListScopeValue = 'BASE' | 'OVERRIDE';
type PriceListStatusValue = 'DRAFT' | 'PUBLISHED' | 'ROLLED_BACK' | 'ARCHIVED';
type PriceListFilterStatus = 'ALL' | PriceListStatusValue;
type PriceListFilterScope = 'ALL' | PriceListScopeValue;
type PriceListFilterCampaign = 'ALL' | 'NONE' | string;
type PriceListSortKey = 'UPDATED_DESC' | 'PRIORITY_ASC' | 'PUBLISHED_DESC' | 'NAME_ASC';
type PriceItemStatusValue = 'ACTIVE' | 'INACTIVE';
type PromotionTypeValue =
  | 'ITEM_PERCENT'
  | 'ITEM_FIXED'
  | 'ORDER_PERCENT'
  | 'ORDER_FIXED'
  | 'SHIPPING_PERCENT'
  | 'SHIPPING_FIXED';
type PromotionStatusValue = 'DRAFT' | 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED';
type PromotionCombinabilityValue = 'STACKABLE' | 'EXCLUSIVE';
type PromotionRuleTypeValue =
  | 'MIN_ORDER_AMOUNT'
  | 'MIN_ITEM_QUANTITY'
  | 'TARGET_PROJECT'
  | 'TARGET_PRODUCT'
  | 'TARGET_VARIANT'
  | 'TARGET_BUNDLE'
  | 'CHANNEL'
  | 'USER_SEGMENT';
type PromotionFilterStatus = 'ALL' | PromotionStatusValue;
type PromotionFilterType = 'ALL' | PromotionTypeValue;
type PromotionFilterCouponRequired = 'ALL' | 'YES' | 'NO';
type PromotionSortKey = 'UPDATED_DESC' | 'PRIORITY_ASC' | 'NAME_ASC';
type CouponStatusValue = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'EXHAUSTED' | 'EXPIRED' | 'ARCHIVED';
type CouponFilterStatus = 'ALL' | CouponStatusValue;
type CouponSortKey = 'UPDATED_DESC' | 'CODE_ASC' | 'REDEEMED_DESC';
type CouponRedemptionStatusValue = 'RESERVED' | 'APPLIED' | 'RELEASED' | 'CANCELED' | 'EXPIRED';

const CAMPAIGN_TYPES: CampaignTypeValue[] = ['EVENT', 'POPUP', 'SALE', 'DROP', 'ALWAYS_ON'];
const CAMPAIGN_TARGET_TYPES: CampaignTargetTypeValue[] = [
  'PROJECT',
  'PRODUCT',
  'VARIANT',
  'BUNDLE_DEFINITION',
];
const PRICE_LIST_SCOPES: PriceListScopeValue[] = ['BASE', 'OVERRIDE'];
const PROMOTION_TYPES: PromotionTypeValue[] = [
  'ORDER_PERCENT',
  'ORDER_FIXED',
  'ITEM_PERCENT',
  'ITEM_FIXED',
  'SHIPPING_PERCENT',
  'SHIPPING_FIXED',
];
const PROMOTION_RULE_TYPES: PromotionRuleTypeValue[] = [
  'MIN_ORDER_AMOUNT',
  'MIN_ITEM_QUANTITY',
  'TARGET_PROJECT',
  'TARGET_PRODUCT',
  'TARGET_VARIANT',
  'TARGET_BUNDLE',
  'CHANNEL',
  'USER_SEGMENT',
];
const FIELD_SELECT_CLASS_NAME = 'rounded-md border border-gray-300 px-3 py-2 text-sm';
const CAMPAIGN_PERIOD_REFERENCE_MS = Date.now();

function parseChannelScopeInput(raw: string): string[] {
  return raw
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

function formatChannelScopeInput(raw: unknown[] | null | undefined): string {
  if (!Array.isArray(raw)) {
    return '';
  }
  return raw.filter((value): value is string => typeof value === 'string').join(', ');
}

function parseDateTimeLocalInput(value: string, fieldName: string): string | null {
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

function parseNonNegativeInteger(value: string, fieldName: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${fieldName}는 0 이상의 정수여야 합니다.`);
  }
  return parsed;
}

function parseNullableNonNegativeInteger(value: string, fieldName: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  return parseNonNegativeInteger(trimmed, fieldName);
}

function parsePositiveInteger(value: string, fieldName: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${fieldName}는 1 이상의 정수여야 합니다.`);
  }
  return parsed;
}

function parseOptionalObjectJson(raw: string, fieldName: string): Record<string, unknown> {
  const trimmed = raw.trim();
  if (!trimmed) {
    return {};
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    throw new Error(`${fieldName} JSON 형식이 올바르지 않습니다.`);
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`${fieldName}는 JSON object 형식이어야 합니다.`);
  }
  return parsed as Record<string, unknown>;
}

function toDateTimeLocalValue(value: string | null): string {
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

function formatDateTime(value: string | null): string {
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

function getCampaignStatusBadgeIntent(status: CampaignStatusValue): 'default' | 'success' | 'warning' | 'error' | 'info' {
  if (status === 'ACTIVE') {
    return 'success';
  }
  if (status === 'SUSPENDED') {
    return 'warning';
  }
  if (status === 'ARCHIVED') {
    return 'error';
  }
  if (status === 'CLOSED') {
    return 'info';
  }
  return 'default';
}

function getCampaignPeriod(
  startsAt: string | null,
  endsAt: string | null,
  nowMs: number,
): Exclude<CampaignPeriodFilter, 'ALL'> {
  const startsMs = startsAt ? new Date(startsAt).getTime() : null;
  const endsMs = endsAt ? new Date(endsAt).getTime() : null;
  const hasNoPeriod = startsAt === null && endsAt === null;
  if (hasNoPeriod) {
    return 'NO_PERIOD';
  }
  if (startsMs !== null && Number.isFinite(startsMs) && startsMs > nowMs) {
    return 'UPCOMING';
  }
  if (endsMs !== null && Number.isFinite(endsMs) && endsMs < nowMs) {
    return 'ENDED';
  }
  return 'LIVE';
}

function getCampaignPeriodBadgeIntent(period: Exclude<CampaignPeriodFilter, 'ALL'>): 'default' | 'success' | 'warning' | 'error' | 'info' {
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

function getCampaignPeriodLabel(period: Exclude<CampaignPeriodFilter, 'ALL'>): string {
  if (period === 'LIVE') {
    return '진행중';
  }
  if (period === 'UPCOMING') {
    return '예정';
  }
  if (period === 'ENDED') {
    return '종료';
  }
  return '상시';
}

function getPriceListStatusBadgeIntent(status: PriceListStatusValue): 'default' | 'success' | 'warning' | 'error' | 'info' {
  if (status === 'PUBLISHED') {
    return 'success';
  }
  if (status === 'ROLLED_BACK') {
    return 'warning';
  }
  if (status === 'ARCHIVED') {
    return 'error';
  }
  return 'default';
}

function getPriceListScopeBadgeIntent(scope: PriceListScopeValue): 'default' | 'success' | 'warning' | 'error' | 'info' {
  if (scope === 'OVERRIDE') {
    return 'info';
  }
  return 'default';
}

function getPromotionStatusBadgeIntent(status: PromotionStatusValue): 'default' | 'success' | 'warning' | 'error' | 'info' {
  if (status === 'ACTIVE') {
    return 'success';
  }
  if (status === 'SUSPENDED') {
    return 'warning';
  }
  if (status === 'ARCHIVED') {
    return 'error';
  }
  return 'default';
}

function getCouponStatusBadgeIntent(status: CouponStatusValue): 'default' | 'success' | 'warning' | 'error' | 'info' {
  if (status === 'ACTIVE') {
    return 'success';
  }
  if (status === 'PAUSED') {
    return 'warning';
  }
  if (status === 'EXHAUSTED' || status === 'EXPIRED') {
    return 'info';
  }
  if (status === 'ARCHIVED') {
    return 'error';
  }
  return 'default';
}

export default function V2CatalogPricingPage() {
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<PricingOpsTabKey>('campaign');

  const [campaignCode, setCampaignCode] = useState('');
  const [campaignName, setCampaignName] = useState('');
  const [campaignType, setCampaignType] = useState<CampaignTypeValue>('EVENT');
  const [campaignDescription, setCampaignDescription] = useState('');
  const [campaignStartsAtInput, setCampaignStartsAtInput] = useState('');
  const [campaignEndsAtInput, setCampaignEndsAtInput] = useState('');
  const [campaignChannelScopeInput, setCampaignChannelScopeInput] = useState('');
  const [campaignSearchKeyword, setCampaignSearchKeyword] = useState('');
  const [campaignStatusFilter, setCampaignStatusFilter] = useState<CampaignFilterStatus>('ALL');
  const [campaignTypeFilter, setCampaignTypeFilter] = useState<CampaignFilterType>('ALL');
  const [campaignPeriodFilter, setCampaignPeriodFilter] = useState<CampaignPeriodFilter>('ALL');
  const [campaignSortKey, setCampaignSortKey] = useState<CampaignSortKey>('UPDATED_DESC');

  const [editingCampaignId, setEditingCampaignId] = useState<string | null>(null);
  const [editingCampaignCode, setEditingCampaignCode] = useState('');
  const [editingCampaignName, setEditingCampaignName] = useState('');
  const [editingCampaignDescription, setEditingCampaignDescription] = useState('');
  const [editingCampaignType, setEditingCampaignType] = useState<CampaignTypeValue>('EVENT');
  const [editingCampaignStartsAtInput, setEditingCampaignStartsAtInput] = useState('');
  const [editingCampaignEndsAtInput, setEditingCampaignEndsAtInput] = useState('');
  const [editingCampaignChannelScopeInput, setEditingCampaignChannelScopeInput] = useState('');

  const [targetCampaignId, setTargetCampaignId] = useState<string | null>(null);
  const [newTargetType, setNewTargetType] = useState<CampaignTargetTypeValue>('PROJECT');
  const [newTargetId, setNewTargetId] = useState('');
  const [newVariantTargetProductId, setNewVariantTargetProductId] = useState('');
  const [newTargetSortOrder, setNewTargetSortOrder] = useState('0');
  const [newTargetExcluded, setNewTargetExcluded] = useState(false);

  const [editingTargetId, setEditingTargetId] = useState<string | null>(null);
  const [editingTargetType, setEditingTargetType] = useState<CampaignTargetTypeValue>('PROJECT');
  const [editingTargetEntityId, setEditingTargetEntityId] = useState('');
  const [editingTargetSortOrder, setEditingTargetSortOrder] = useState('0');
  const [editingTargetExcluded, setEditingTargetExcluded] = useState(false);

  const [priceListName, setPriceListName] = useState('');
  const [priceListScope, setPriceListScope] = useState<PriceListScopeValue>('BASE');
  const [priceListCampaignId, setPriceListCampaignId] = useState('');
  const [priceListCurrency, setPriceListCurrency] = useState('KRW');
  const [priceListPriority, setPriceListPriority] = useState('0');
  const [priceListStartsAtInput, setPriceListStartsAtInput] = useState('');
  const [priceListEndsAtInput, setPriceListEndsAtInput] = useState('');
  const [priceListChannelScopeInput, setPriceListChannelScopeInput] = useState('');
  const [priceListSearchKeyword, setPriceListSearchKeyword] = useState('');
  const [priceListStatusFilter, setPriceListStatusFilter] = useState<PriceListFilterStatus>('ALL');
  const [priceListScopeFilter, setPriceListScopeFilter] = useState<PriceListFilterScope>('ALL');
  const [priceListCampaignFilter, setPriceListCampaignFilter] = useState<PriceListFilterCampaign>('ALL');
  const [priceListSortKey, setPriceListSortKey] = useState<PriceListSortKey>('UPDATED_DESC');
  const [editingPriceListId, setEditingPriceListId] = useState<string | null>(null);
  const [editingPriceListName, setEditingPriceListName] = useState('');
  const [editingPriceListScope, setEditingPriceListScope] = useState<PriceListScopeValue>('BASE');
  const [editingPriceListStatus, setEditingPriceListStatus] = useState<PriceListStatusValue>('DRAFT');
  const [editingPriceListCampaignId, setEditingPriceListCampaignId] = useState('');
  const [editingPriceListCurrency, setEditingPriceListCurrency] = useState('KRW');
  const [editingPriceListPriority, setEditingPriceListPriority] = useState('0');
  const [editingPriceListStartsAtInput, setEditingPriceListStartsAtInput] = useState('');
  const [editingPriceListEndsAtInput, setEditingPriceListEndsAtInput] = useState('');
  const [editingPriceListChannelScopeInput, setEditingPriceListChannelScopeInput] = useState('');
  const [selectedPriceListId, setSelectedPriceListId] = useState<string | null>(null);

  const [newPriceItemProductId, setNewPriceItemProductId] = useState('');
  const [newPriceItemVariantId, setNewPriceItemVariantId] = useState('');
  const [newPriceItemStatus, setNewPriceItemStatus] = useState<PriceItemStatusValue>('ACTIVE');
  const [newPriceItemUnitAmount, setNewPriceItemUnitAmount] = useState('0');
  const [newPriceItemCompareAtAmount, setNewPriceItemCompareAtAmount] = useState('');
  const [newPriceItemMinQuantity, setNewPriceItemMinQuantity] = useState('1');
  const [newPriceItemMaxQuantity, setNewPriceItemMaxQuantity] = useState('');
  const [newPriceItemStartsAtInput, setNewPriceItemStartsAtInput] = useState('');
  const [newPriceItemEndsAtInput, setNewPriceItemEndsAtInput] = useState('');
  const [newPriceItemChannelScopeInput, setNewPriceItemChannelScopeInput] = useState('');

  const [editingPriceItemId, setEditingPriceItemId] = useState<string | null>(null);
  const [editingPriceItemProductId, setEditingPriceItemProductId] = useState('');
  const [editingPriceItemVariantId, setEditingPriceItemVariantId] = useState('');
  const [editingPriceItemStatus, setEditingPriceItemStatus] = useState<PriceItemStatusValue>('ACTIVE');
  const [editingPriceItemUnitAmount, setEditingPriceItemUnitAmount] = useState('0');
  const [editingPriceItemCompareAtAmount, setEditingPriceItemCompareAtAmount] = useState('');
  const [editingPriceItemMinQuantity, setEditingPriceItemMinQuantity] = useState('1');
  const [editingPriceItemMaxQuantity, setEditingPriceItemMaxQuantity] = useState('');
  const [editingPriceItemStartsAtInput, setEditingPriceItemStartsAtInput] = useState('');
  const [editingPriceItemEndsAtInput, setEditingPriceItemEndsAtInput] = useState('');
  const [editingPriceItemChannelScopeInput, setEditingPriceItemChannelScopeInput] = useState('');

  const [promotionName, setPromotionName] = useState('');
  const [promotionDescription, setPromotionDescription] = useState('');
  const [promotionType, setPromotionType] = useState<PromotionTypeValue>('ORDER_PERCENT');
  const [promotionStatus, setPromotionStatus] = useState<PromotionStatusValue>('DRAFT');
  const [promotionCombinability, setPromotionCombinability] = useState<PromotionCombinabilityValue>('STACKABLE');
  const [promotionDiscountValue, setPromotionDiscountValue] = useState('10');
  const [promotionMaxDiscountAmount, setPromotionMaxDiscountAmount] = useState('');
  const [promotionPriority, setPromotionPriority] = useState('0');
  const [promotionStartsAtInput, setPromotionStartsAtInput] = useState('');
  const [promotionEndsAtInput, setPromotionEndsAtInput] = useState('');
  const [promotionChannelScopeInput, setPromotionChannelScopeInput] = useState('');
  const [promotionCampaignId, setPromotionCampaignId] = useState('');
  const [promotionCouponRequired, setPromotionCouponRequired] = useState(false);
  const [promotionSearchKeyword, setPromotionSearchKeyword] = useState('');
  const [promotionStatusFilter, setPromotionStatusFilter] = useState<PromotionFilterStatus>('ALL');
  const [promotionTypeFilter, setPromotionTypeFilter] = useState<PromotionFilterType>('ALL');
  const [promotionCouponRequiredFilter, setPromotionCouponRequiredFilter] = useState<PromotionFilterCouponRequired>('ALL');
  const [promotionCampaignFilter, setPromotionCampaignFilter] = useState<'ALL' | 'NONE' | string>('ALL');
  const [promotionSortKey, setPromotionSortKey] = useState<PromotionSortKey>('UPDATED_DESC');
  const [editingPromotionId, setEditingPromotionId] = useState<string | null>(null);
  const [editingPromotionName, setEditingPromotionName] = useState('');
  const [editingPromotionDescription, setEditingPromotionDescription] = useState('');
  const [editingPromotionType, setEditingPromotionType] = useState<PromotionTypeValue>('ORDER_PERCENT');
  const [editingPromotionStatus, setEditingPromotionStatus] = useState<PromotionStatusValue>('DRAFT');
  const [editingPromotionCombinability, setEditingPromotionCombinability] = useState<PromotionCombinabilityValue>('STACKABLE');
  const [editingPromotionDiscountValue, setEditingPromotionDiscountValue] = useState('0');
  const [editingPromotionMaxDiscountAmount, setEditingPromotionMaxDiscountAmount] = useState('');
  const [editingPromotionPriority, setEditingPromotionPriority] = useState('0');
  const [editingPromotionCampaignId, setEditingPromotionCampaignId] = useState('');
  const [editingPromotionCouponRequired, setEditingPromotionCouponRequired] = useState(false);
  const [editingPromotionStartsAtInput, setEditingPromotionStartsAtInput] = useState('');
  const [editingPromotionEndsAtInput, setEditingPromotionEndsAtInput] = useState('');
  const [editingPromotionChannelScopeInput, setEditingPromotionChannelScopeInput] = useState('');
  const [selectedPromotionId, setSelectedPromotionId] = useState<string | null>(null);

  const [newRuleType, setNewRuleType] = useState<PromotionRuleTypeValue>('MIN_ORDER_AMOUNT');
  const [newRuleStatus, setNewRuleStatus] = useState<PriceItemStatusValue>('ACTIVE');
  const [newRuleSortOrder, setNewRuleSortOrder] = useState('0');
  const [newRulePayloadJson, setNewRulePayloadJson] = useState('{\n  "min_amount": 50000\n}');
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [editingRuleType, setEditingRuleType] = useState<PromotionRuleTypeValue>('MIN_ORDER_AMOUNT');
  const [editingRuleStatus, setEditingRuleStatus] = useState<PriceItemStatusValue>('ACTIVE');
  const [editingRuleSortOrder, setEditingRuleSortOrder] = useState('0');
  const [editingRulePayloadJson, setEditingRulePayloadJson] = useState('{}');

  const [couponCode, setCouponCode] = useState('');
  const [couponPromotionId, setCouponPromotionId] = useState('');
  const [couponStatus, setCouponStatus] = useState<CouponStatusValue>('DRAFT');
  const [couponStartsAtInput, setCouponStartsAtInput] = useState('');
  const [couponEndsAtInput, setCouponEndsAtInput] = useState('');
  const [couponMaxIssuance, setCouponMaxIssuance] = useState('');
  const [couponMaxPerUser, setCouponMaxPerUser] = useState('1');
  const [couponChannelScopeInput, setCouponChannelScopeInput] = useState('');
  const [couponSearchKeyword, setCouponSearchKeyword] = useState('');
  const [couponStatusFilter, setCouponStatusFilter] = useState<CouponFilterStatus>('ALL');
  const [couponPromotionFilter, setCouponPromotionFilter] = useState<'ALL' | 'NONE' | string>('ALL');
  const [couponSortKey, setCouponSortKey] = useState<CouponSortKey>('UPDATED_DESC');
  const [editingCouponId, setEditingCouponId] = useState<string | null>(null);
  const [editingCouponCode, setEditingCouponCode] = useState('');
  const [editingCouponStatus, setEditingCouponStatus] = useState<CouponStatusValue>('DRAFT');
  const [editingCouponPromotionId, setEditingCouponPromotionId] = useState('');
  const [editingCouponStartsAtInput, setEditingCouponStartsAtInput] = useState('');
  const [editingCouponEndsAtInput, setEditingCouponEndsAtInput] = useState('');
  const [editingCouponMaxIssuance, setEditingCouponMaxIssuance] = useState('');
  const [editingCouponMaxPerUser, setEditingCouponMaxPerUser] = useState('1');
  const [editingCouponChannelScopeInput, setEditingCouponChannelScopeInput] = useState('');

  const [redemptionCouponFilter, setRedemptionCouponFilter] = useState('');
  const [redemptionUserIdFilter, setRedemptionUserIdFilter] = useState('');
  const [redemptionStatusFilter, setRedemptionStatusFilter] = useState<
    'ALL' | CouponRedemptionStatusValue
  >('ALL');
  const [redemptionQuoteReferenceFilter, setRedemptionQuoteReferenceFilter] = useState('');

  const [quoteLinesJson, setQuoteLinesJson] = useState(
    '[\n  {\n    "variant_id": "",\n    "quantity": 1\n  }\n]',
  );
  const [quoteCampaignId, setQuoteCampaignId] = useState('');
  const [quoteChannel, setQuoteChannel] = useState('WEB');
  const [quoteCouponCode, setQuoteCouponCode] = useState('');
  const [quoteUserId, setQuoteUserId] = useState('');
  const [quoteShippingAmount, setQuoteShippingAmount] = useState('0');

  const [couponValidateCode, setCouponValidateCode] = useState('');
  const [couponValidateUserId, setCouponValidateUserId] = useState('');
  const [reserveCouponId, setReserveCouponId] = useState('');
  const [reserveCouponUserId, setReserveCouponUserId] = useState('');
  const [releaseRedemptionId, setReleaseRedemptionId] = useState('');
  const [redeemRedemptionId, setRedeemRedemptionId] = useState('');
  const [redeemOrderId, setRedeemOrderId] = useState('');

  const [quoteResult, setQuoteResult] = useState<unknown>(null);
  const [promotionEvaluationResult, setPromotionEvaluationResult] = useState<unknown>(null);
  const [pricingDebugResult, setPricingDebugResult] = useState<unknown>(null);
  const [couponValidationResult, setCouponValidationResult] = useState<unknown>(null);
  const [couponOpResult, setCouponOpResult] = useState<unknown>(null);

  const { data: campaigns, isLoading: campaignsLoading, error: campaignsError } = useV2Campaigns();
  const { data: campaignTargets, isLoading: campaignTargetsLoading } = useV2CampaignTargets(targetCampaignId);
  const { data: adminProjects } = useV2AdminProjects();
  const { data: adminProducts } = useV2AdminProducts();
  const { data: bundleDefinitions } = useV2BundleDefinitions();
  const { data: variantTargetOptions } = useV2AdminVariants(
    newTargetType === 'VARIANT' ? newVariantTargetProductId : null,
  );
  const { data: priceLists, isLoading: priceListsLoading, error: priceListsError } = useV2PriceLists();
  const { data: priceListItems, isLoading: priceListItemsLoading } = useV2PriceListItems(selectedPriceListId);
  const { data: newPriceItemVariants } = useV2AdminVariants(newPriceItemProductId || null);
  const { data: editingPriceItemVariants } = useV2AdminVariants(editingPriceItemProductId || null);
  const { data: promotions, isLoading: promotionsLoading, error: promotionsError } = useV2Promotions();
  const { data: promotionRules, isLoading: promotionRulesLoading } = useV2PromotionRules(selectedPromotionId);
  const { data: coupons, isLoading: couponsLoading, error: couponsError } = useV2Coupons();
  const { data: couponRedemptions, isLoading: couponRedemptionsLoading } = useV2CouponRedemptions({
    couponId: redemptionCouponFilter.trim() || undefined,
    userId: redemptionUserIdFilter.trim() || undefined,
    status: redemptionStatusFilter === 'ALL' ? undefined : redemptionStatusFilter,
    quoteReference: redemptionQuoteReferenceFilter.trim() || undefined,
  });
  const { data: orderSnapshotContract } = useV2OrderSnapshotContract();

  const createCampaign = useCreateV2Campaign();
  const updateCampaign = useUpdateV2Campaign();
  const activateCampaign = useActivateV2Campaign();
  const suspendCampaign = useSuspendV2Campaign();
  const closeCampaign = useCloseV2Campaign();
  const createCampaignTarget = useCreateV2CampaignTarget();
  const updateCampaignTarget = useUpdateV2CampaignTarget();
  const deleteCampaignTarget = useDeleteV2CampaignTarget();

  const createPriceList = useCreateV2PriceList();
  const updatePriceList = useUpdateV2PriceList();
  const publishPriceList = usePublishV2PriceList();
  const rollbackPriceList = useRollbackV2PriceList();
  const createPriceListItem = useCreateV2PriceListItem();
  const updatePriceListItem = useUpdateV2PriceListItem();
  const deactivatePriceListItem = useDeactivateV2PriceListItem();

  const createPromotion = useCreateV2Promotion();
  const updatePromotion = useUpdateV2Promotion();
  const createPromotionRule = useCreateV2PromotionRule();
  const updatePromotionRule = useUpdateV2PromotionRule();
  const createCoupon = useCreateV2Coupon();
  const updateCoupon = useUpdateV2Coupon();

  const buildPriceQuote = useBuildV2PriceQuote();
  const evaluatePromotions = useEvaluateV2Promotions();
  const getPricingDebugTrace = useV2PricingDebugTrace();

  const validateCoupon = useValidateV2Coupon();
  const reserveCoupon = useReserveV2Coupon();
  const releaseCouponRedemption = useReleaseV2CouponRedemption();
  const redeemCouponRedemption = useRedeemV2CouponRedemption();

  const clearNotice = () => {
    setMessage(null);
    setErrorMessage(null);
  };

  const runWithNotice = async (task: () => Promise<void>) => {
    clearNotice();
    try {
      await task();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
      throw error;
    }
  };

  const handleCreateCampaign = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await runWithNotice(async () => {
      const startsAt = parseDateTimeLocalInput(campaignStartsAtInput, 'starts_at');
      const endsAt = parseDateTimeLocalInput(campaignEndsAtInput, 'ends_at');
      await createCampaign.mutateAsync({
        code: campaignCode.trim(),
        name: campaignName.trim(),
        campaign_type: campaignType,
        description: toNullable(campaignDescription),
        starts_at: startsAt,
        ends_at: endsAt,
        channel_scope_json: parseChannelScopeInput(campaignChannelScopeInput),
      });
      setCampaignCode('');
      setCampaignName('');
      setCampaignDescription('');
      setCampaignStartsAtInput('');
      setCampaignEndsAtInput('');
      setCampaignChannelScopeInput('');
      setMessage('campaign을 생성했습니다.');
    });
  };

  const handleCampaignAction = async (
    action: 'activate' | 'suspend' | 'close',
    campaignId: string,
  ) => {
    await runWithNotice(async () => {
      if (action === 'activate') {
        await activateCampaign.mutateAsync(campaignId);
        setMessage('campaign을 ACTIVE로 전환했습니다.');
        return;
      }
      if (action === 'suspend') {
        await suspendCampaign.mutateAsync(campaignId);
        setMessage('campaign을 SUSPENDED로 전환했습니다.');
        return;
      }
      await closeCampaign.mutateAsync(campaignId);
      setMessage('campaign을 CLOSED로 전환했습니다.');
    });
  };

  const handleStartCampaignEdit = (campaign: {
    id: string;
    code: string;
    name: string;
    description: string | null;
    campaign_type: CampaignTypeValue;
    starts_at: string | null;
    ends_at: string | null;
    channel_scope_json: unknown[];
  }) => {
    setEditingCampaignId(campaign.id);
    setEditingCampaignCode(campaign.code);
    setEditingCampaignName(campaign.name);
    setEditingCampaignDescription(campaign.description ?? '');
    setEditingCampaignType(campaign.campaign_type);
    setEditingCampaignStartsAtInput(toDateTimeLocalValue(campaign.starts_at));
    setEditingCampaignEndsAtInput(toDateTimeLocalValue(campaign.ends_at));
    setEditingCampaignChannelScopeInput(formatChannelScopeInput(campaign.channel_scope_json));
  };

  const handleCancelCampaignEdit = () => {
    setEditingCampaignId(null);
    setEditingCampaignCode('');
    setEditingCampaignName('');
    setEditingCampaignDescription('');
    setEditingCampaignType('EVENT');
    setEditingCampaignStartsAtInput('');
    setEditingCampaignEndsAtInput('');
    setEditingCampaignChannelScopeInput('');
  };

  const handleUpdateCampaign = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingCampaignId) {
      return;
    }
    await runWithNotice(async () => {
      const startsAt = parseDateTimeLocalInput(editingCampaignStartsAtInput, 'starts_at');
      const endsAt = parseDateTimeLocalInput(editingCampaignEndsAtInput, 'ends_at');
      await updateCampaign.mutateAsync({
        id: editingCampaignId,
        data: {
          code: editingCampaignCode.trim(),
          name: editingCampaignName.trim(),
          campaign_type: editingCampaignType,
          description: toNullable(editingCampaignDescription),
          starts_at: startsAt,
          ends_at: endsAt,
          channel_scope_json: parseChannelScopeInput(editingCampaignChannelScopeInput),
        },
      });
      setMessage('campaign을 수정했습니다.');
      handleCancelCampaignEdit();
    });
  };

  const handleOpenCampaignTargets = (campaignId: string) => {
    setTargetCampaignId(campaignId);
    setEditingTargetId(null);
    setNewTargetId('');
    setNewTargetType('PROJECT');
    setNewVariantTargetProductId('');
    setNewTargetSortOrder('0');
    setNewTargetExcluded(false);
  };

  const handleCreateCampaignTarget = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!targetCampaignId) {
      setErrorMessage('target campaign이 선택되지 않았습니다.');
      return;
    }
    await runWithNotice(async () => {
      const sortOrder = Number.parseInt(newTargetSortOrder, 10);
      if (!Number.isInteger(sortOrder) || sortOrder < 0) {
        throw new Error('target sort_order는 0 이상의 정수여야 합니다.');
      }
      const targetId = newTargetId.trim();
      if (targetId.length === 0) {
        throw new Error('target_id는 필수입니다.');
      }
      await createCampaignTarget.mutateAsync({
        campaignId: targetCampaignId,
        data: {
          target_type: newTargetType,
          target_id: targetId,
          sort_order: sortOrder,
          is_excluded: newTargetExcluded,
        },
      });
      setNewTargetId('');
      setNewTargetSortOrder('0');
      setNewTargetExcluded(false);
      setMessage('campaign target을 추가했습니다.');
    });
  };

  const handleStartTargetEdit = (target: {
    id: string;
    target_type: CampaignTargetTypeValue;
    target_id: string;
    sort_order: number;
    is_excluded: boolean;
  }) => {
    setEditingTargetId(target.id);
    setEditingTargetType(target.target_type);
    setEditingTargetEntityId(target.target_id);
    setEditingTargetSortOrder(String(target.sort_order));
    setEditingTargetExcluded(target.is_excluded);
  };

  const handleCancelTargetEdit = () => {
    setEditingTargetId(null);
    setEditingTargetType('PROJECT');
    setEditingTargetEntityId('');
    setEditingTargetSortOrder('0');
    setEditingTargetExcluded(false);
  };

  const handleUpdateTarget = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingTargetId) {
      return;
    }
    await runWithNotice(async () => {
      const sortOrder = Number.parseInt(editingTargetSortOrder, 10);
      if (!Number.isInteger(sortOrder) || sortOrder < 0) {
        throw new Error('target sort_order는 0 이상의 정수여야 합니다.');
      }
      const targetId = editingTargetEntityId.trim();
      if (targetId.length === 0) {
        throw new Error('target_id는 필수입니다.');
      }
      await updateCampaignTarget.mutateAsync({
        targetId: editingTargetId,
        data: {
          target_type: editingTargetType,
          target_id: targetId,
          sort_order: sortOrder,
          is_excluded: editingTargetExcluded,
        },
      });
      setMessage('campaign target을 수정했습니다.');
      handleCancelTargetEdit();
    });
  };

  const handleDeleteTarget = async (targetId: string) => {
    await runWithNotice(async () => {
      await deleteCampaignTarget.mutateAsync(targetId);
      if (editingTargetId === targetId) {
        handleCancelTargetEdit();
      }
      setMessage('campaign target을 삭제했습니다.');
    });
  };

  const handleCreatePriceList = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await runWithNotice(async () => {
      const priority = parseNonNegativeInteger(priceListPriority, 'price list priority');
      const startsAt = parseDateTimeLocalInput(priceListStartsAtInput, 'starts_at');
      const endsAt = parseDateTimeLocalInput(priceListEndsAtInput, 'ends_at');
      await createPriceList.mutateAsync({
        name: priceListName.trim(),
        scope_type: priceListScope,
        campaign_id: toNullable(priceListCampaignId),
        currency_code: priceListCurrency.trim().toUpperCase(),
        priority,
        starts_at: startsAt,
        ends_at: endsAt,
        channel_scope_json: parseChannelScopeInput(priceListChannelScopeInput),
      });
      setPriceListName('');
      setPriceListCampaignId('');
      setPriceListStartsAtInput('');
      setPriceListEndsAtInput('');
      setPriceListChannelScopeInput('');
      setMessage('price list를 생성했습니다.');
    });
  };

  const handlePriceListAction = async (
    action: 'publish' | 'rollback',
    priceListId: string,
  ) => {
    await runWithNotice(async () => {
      if (action === 'publish') {
        await publishPriceList.mutateAsync(priceListId);
        setMessage('price list를 publish했습니다.');
        return;
      }
      await rollbackPriceList.mutateAsync(priceListId);
      setMessage('price list rollback을 적용했습니다.');
    });
  };

  const handleStartPriceListEdit = (priceList: {
    id: string;
    name: string;
    scope_type: PriceListScopeValue;
    status: PriceListStatusValue;
    campaign_id: string | null;
    currency_code: string;
    priority: number;
    starts_at: string | null;
    ends_at: string | null;
    channel_scope_json: unknown[];
  }) => {
    setEditingPriceListId(priceList.id);
    setEditingPriceListName(priceList.name);
    setEditingPriceListScope(priceList.scope_type);
    setEditingPriceListStatus(priceList.status);
    setEditingPriceListCampaignId(priceList.campaign_id ?? '');
    setEditingPriceListCurrency(priceList.currency_code);
    setEditingPriceListPriority(String(priceList.priority));
    setEditingPriceListStartsAtInput(toDateTimeLocalValue(priceList.starts_at));
    setEditingPriceListEndsAtInput(toDateTimeLocalValue(priceList.ends_at));
    setEditingPriceListChannelScopeInput(formatChannelScopeInput(priceList.channel_scope_json));
  };

  const handleCancelPriceListEdit = () => {
    setEditingPriceListId(null);
    setEditingPriceListName('');
    setEditingPriceListScope('BASE');
    setEditingPriceListStatus('DRAFT');
    setEditingPriceListCampaignId('');
    setEditingPriceListCurrency('KRW');
    setEditingPriceListPriority('0');
    setEditingPriceListStartsAtInput('');
    setEditingPriceListEndsAtInput('');
    setEditingPriceListChannelScopeInput('');
  };

  const handleUpdatePriceList = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingPriceListId) {
      return;
    }
    await runWithNotice(async () => {
      const priority = parseNonNegativeInteger(
        editingPriceListPriority,
        'price list priority',
      );
      const startsAt = parseDateTimeLocalInput(
        editingPriceListStartsAtInput,
        'starts_at',
      );
      const endsAt = parseDateTimeLocalInput(
        editingPriceListEndsAtInput,
        'ends_at',
      );
      await updatePriceList.mutateAsync({
        id: editingPriceListId,
        data: {
          name: editingPriceListName.trim(),
          scope_type: editingPriceListScope,
          status: editingPriceListStatus,
          campaign_id: toNullable(editingPriceListCampaignId),
          currency_code: editingPriceListCurrency.trim().toUpperCase(),
          priority,
          starts_at: startsAt,
          ends_at: endsAt,
          channel_scope_json: parseChannelScopeInput(editingPriceListChannelScopeInput),
        },
      });
      setMessage('price list를 수정했습니다.');
      handleCancelPriceListEdit();
    });
  };

  const handleOpenPriceListItems = (priceListId: string) => {
    setSelectedPriceListId(priceListId);
    setEditingPriceItemId(null);
    setNewPriceItemProductId('');
    setNewPriceItemVariantId('');
    setNewPriceItemStatus('ACTIVE');
    setNewPriceItemUnitAmount('0');
    setNewPriceItemCompareAtAmount('');
    setNewPriceItemMinQuantity('1');
    setNewPriceItemMaxQuantity('');
    setNewPriceItemStartsAtInput('');
    setNewPriceItemEndsAtInput('');
    setNewPriceItemChannelScopeInput('');
  };

  const handleCreatePriceListItem = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedPriceListId) {
      setErrorMessage('item을 추가할 price list를 선택해주세요.');
      return;
    }
    await runWithNotice(async () => {
      const productId = newPriceItemProductId.trim();
      if (productId.length === 0) {
        throw new Error('product_id는 필수입니다.');
      }
      const unitAmount = parseNonNegativeInteger(newPriceItemUnitAmount, 'unit_amount');
      const minQuantity = parsePositiveInteger(newPriceItemMinQuantity, 'min_purchase_quantity');
      const maxQuantity = parseNullableNonNegativeInteger(
        newPriceItemMaxQuantity,
        'max_purchase_quantity',
      );
      if (maxQuantity !== null && maxQuantity < minQuantity) {
        throw new Error('max_purchase_quantity는 min_purchase_quantity 이상이어야 합니다.');
      }
      const compareAtAmount = parseNullableNonNegativeInteger(
        newPriceItemCompareAtAmount,
        'compare_at_amount',
      );
      if (compareAtAmount !== null && compareAtAmount < unitAmount) {
        throw new Error('compare_at_amount는 unit_amount 이상이어야 합니다.');
      }
      const startsAt = parseDateTimeLocalInput(newPriceItemStartsAtInput, 'starts_at');
      const endsAt = parseDateTimeLocalInput(newPriceItemEndsAtInput, 'ends_at');
      await createPriceListItem.mutateAsync({
        priceListId: selectedPriceListId,
        data: {
          product_id: productId,
          variant_id: toNullable(newPriceItemVariantId),
          status: newPriceItemStatus,
          unit_amount: unitAmount,
          compare_at_amount: compareAtAmount,
          min_purchase_quantity: minQuantity,
          max_purchase_quantity: maxQuantity,
          starts_at: startsAt,
          ends_at: endsAt,
          channel_scope_json: parseChannelScopeInput(newPriceItemChannelScopeInput),
        },
      });
      setNewPriceItemVariantId('');
      setNewPriceItemStatus('ACTIVE');
      setNewPriceItemUnitAmount('0');
      setNewPriceItemCompareAtAmount('');
      setNewPriceItemMinQuantity('1');
      setNewPriceItemMaxQuantity('');
      setNewPriceItemStartsAtInput('');
      setNewPriceItemEndsAtInput('');
      setNewPriceItemChannelScopeInput('');
      setMessage('price list item을 추가했습니다.');
    });
  };

  const handleStartPriceItemEdit = (item: {
    id: string;
    product_id: string;
    variant_id: string | null;
    status: PriceItemStatusValue;
    unit_amount: number;
    compare_at_amount: number | null;
    min_purchase_quantity: number;
    max_purchase_quantity: number | null;
    starts_at: string | null;
    ends_at: string | null;
    channel_scope_json: unknown[];
  }) => {
    setEditingPriceItemId(item.id);
    setEditingPriceItemProductId(item.product_id);
    setEditingPriceItemVariantId(item.variant_id ?? '');
    setEditingPriceItemStatus(item.status);
    setEditingPriceItemUnitAmount(String(item.unit_amount));
    setEditingPriceItemCompareAtAmount(
      item.compare_at_amount === null ? '' : String(item.compare_at_amount),
    );
    setEditingPriceItemMinQuantity(String(item.min_purchase_quantity));
    setEditingPriceItemMaxQuantity(
      item.max_purchase_quantity === null ? '' : String(item.max_purchase_quantity),
    );
    setEditingPriceItemStartsAtInput(toDateTimeLocalValue(item.starts_at));
    setEditingPriceItemEndsAtInput(toDateTimeLocalValue(item.ends_at));
    setEditingPriceItemChannelScopeInput(formatChannelScopeInput(item.channel_scope_json));
  };

  const handleCancelPriceItemEdit = () => {
    setEditingPriceItemId(null);
    setEditingPriceItemProductId('');
    setEditingPriceItemVariantId('');
    setEditingPriceItemStatus('ACTIVE');
    setEditingPriceItemUnitAmount('0');
    setEditingPriceItemCompareAtAmount('');
    setEditingPriceItemMinQuantity('1');
    setEditingPriceItemMaxQuantity('');
    setEditingPriceItemStartsAtInput('');
    setEditingPriceItemEndsAtInput('');
    setEditingPriceItemChannelScopeInput('');
  };

  const handleUpdatePriceItem = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingPriceItemId) {
      return;
    }
    await runWithNotice(async () => {
      const productId = editingPriceItemProductId.trim();
      if (productId.length === 0) {
        throw new Error('product_id는 필수입니다.');
      }
      const unitAmount = parseNonNegativeInteger(editingPriceItemUnitAmount, 'unit_amount');
      const minQuantity = parsePositiveInteger(
        editingPriceItemMinQuantity,
        'min_purchase_quantity',
      );
      const maxQuantity = parseNullableNonNegativeInteger(
        editingPriceItemMaxQuantity,
        'max_purchase_quantity',
      );
      if (maxQuantity !== null && maxQuantity < minQuantity) {
        throw new Error('max_purchase_quantity는 min_purchase_quantity 이상이어야 합니다.');
      }
      const compareAtAmount = parseNullableNonNegativeInteger(
        editingPriceItemCompareAtAmount,
        'compare_at_amount',
      );
      if (compareAtAmount !== null && compareAtAmount < unitAmount) {
        throw new Error('compare_at_amount는 unit_amount 이상이어야 합니다.');
      }
      const startsAt = parseDateTimeLocalInput(editingPriceItemStartsAtInput, 'starts_at');
      const endsAt = parseDateTimeLocalInput(editingPriceItemEndsAtInput, 'ends_at');
      await updatePriceListItem.mutateAsync({
        itemId: editingPriceItemId,
        data: {
          product_id: productId,
          variant_id: toNullable(editingPriceItemVariantId),
          status: editingPriceItemStatus,
          unit_amount: unitAmount,
          compare_at_amount: compareAtAmount,
          min_purchase_quantity: minQuantity,
          max_purchase_quantity: maxQuantity,
          starts_at: startsAt,
          ends_at: endsAt,
          channel_scope_json: parseChannelScopeInput(editingPriceItemChannelScopeInput),
        },
      });
      setMessage('price list item을 수정했습니다.');
      handleCancelPriceItemEdit();
    });
  };

  const handleDeactivatePriceItem = async (itemId: string) => {
    await runWithNotice(async () => {
      await deactivatePriceListItem.mutateAsync(itemId);
      if (editingPriceItemId === itemId) {
        handleCancelPriceItemEdit();
      }
      setMessage('price list item을 비활성화했습니다.');
    });
  };

  const handleCreatePromotion = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await runWithNotice(async () => {
      const discountValue = Number.parseFloat(promotionDiscountValue);
      if (!Number.isFinite(discountValue) || discountValue < 0) {
        throw new Error('discount_value는 0 이상의 숫자여야 합니다.');
      }
      const maxDiscountAmount = parseNullableNonNegativeInteger(
        promotionMaxDiscountAmount,
        'max_discount_amount',
      );
      if (maxDiscountAmount !== null && maxDiscountAmount < discountValue) {
        throw new Error('max_discount_amount는 discount_value 이상이어야 합니다.');
      }
      const priority = parseNonNegativeInteger(promotionPriority, 'priority');
      const startsAt = parseDateTimeLocalInput(promotionStartsAtInput, 'starts_at');
      const endsAt = parseDateTimeLocalInput(promotionEndsAtInput, 'ends_at');
      await createPromotion.mutateAsync({
        name: promotionName.trim(),
        description: toNullable(promotionDescription),
        campaign_id: toNullable(promotionCampaignId),
        promotion_type: promotionType,
        status: promotionStatus,
        combinability_mode: promotionCombinability,
        priority,
        discount_value: discountValue,
        max_discount_amount: maxDiscountAmount,
        coupon_required: promotionCouponRequired,
        starts_at: startsAt,
        ends_at: endsAt,
        channel_scope_json: parseChannelScopeInput(promotionChannelScopeInput),
      });
      setPromotionName('');
      setPromotionDescription('');
      setPromotionStatus('DRAFT');
      setPromotionCombinability('STACKABLE');
      setPromotionPriority('0');
      setPromotionMaxDiscountAmount('');
      setPromotionStartsAtInput('');
      setPromotionEndsAtInput('');
      setPromotionChannelScopeInput('');
      setMessage('promotion을 생성했습니다.');
    });
  };

  const handleStartPromotionEdit = (promotion: {
    id: string;
    name: string;
    description: string | null;
    promotion_type: PromotionTypeValue;
    status: PromotionStatusValue;
    combinability_mode: PromotionCombinabilityValue;
    priority: number;
    discount_value: number;
    max_discount_amount: number | null;
    coupon_required: boolean;
    campaign_id: string | null;
    starts_at: string | null;
    ends_at: string | null;
    channel_scope_json: unknown[];
  }) => {
    setEditingPromotionId(promotion.id);
    setEditingPromotionName(promotion.name);
    setEditingPromotionDescription(promotion.description ?? '');
    setEditingPromotionType(promotion.promotion_type);
    setEditingPromotionStatus(promotion.status);
    setEditingPromotionCombinability(promotion.combinability_mode);
    setEditingPromotionPriority(String(promotion.priority));
    setEditingPromotionDiscountValue(String(promotion.discount_value));
    setEditingPromotionMaxDiscountAmount(
      promotion.max_discount_amount === null ? '' : String(promotion.max_discount_amount),
    );
    setEditingPromotionCouponRequired(promotion.coupon_required);
    setEditingPromotionCampaignId(promotion.campaign_id ?? '');
    setEditingPromotionStartsAtInput(toDateTimeLocalValue(promotion.starts_at));
    setEditingPromotionEndsAtInput(toDateTimeLocalValue(promotion.ends_at));
    setEditingPromotionChannelScopeInput(
      formatChannelScopeInput(promotion.channel_scope_json),
    );
  };

  const handleCancelPromotionEdit = () => {
    setEditingPromotionId(null);
    setEditingPromotionName('');
    setEditingPromotionDescription('');
    setEditingPromotionType('ORDER_PERCENT');
    setEditingPromotionStatus('DRAFT');
    setEditingPromotionCombinability('STACKABLE');
    setEditingPromotionPriority('0');
    setEditingPromotionDiscountValue('0');
    setEditingPromotionMaxDiscountAmount('');
    setEditingPromotionCouponRequired(false);
    setEditingPromotionCampaignId('');
    setEditingPromotionStartsAtInput('');
    setEditingPromotionEndsAtInput('');
    setEditingPromotionChannelScopeInput('');
  };

  const handleUpdatePromotion = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingPromotionId) {
      return;
    }
    await runWithNotice(async () => {
      const discountValue = Number.parseFloat(editingPromotionDiscountValue);
      if (!Number.isFinite(discountValue) || discountValue < 0) {
        throw new Error('discount_value는 0 이상의 숫자여야 합니다.');
      }
      const maxDiscountAmount = parseNullableNonNegativeInteger(
        editingPromotionMaxDiscountAmount,
        'max_discount_amount',
      );
      if (maxDiscountAmount !== null && maxDiscountAmount < discountValue) {
        throw new Error('max_discount_amount는 discount_value 이상이어야 합니다.');
      }
      const priority = parseNonNegativeInteger(editingPromotionPriority, 'priority');
      const startsAt = parseDateTimeLocalInput(
        editingPromotionStartsAtInput,
        'starts_at',
      );
      const endsAt = parseDateTimeLocalInput(editingPromotionEndsAtInput, 'ends_at');

      await updatePromotion.mutateAsync({
        id: editingPromotionId,
        data: {
          name: editingPromotionName.trim(),
          description: toNullable(editingPromotionDescription),
          promotion_type: editingPromotionType,
          status: editingPromotionStatus,
          combinability_mode: editingPromotionCombinability,
          campaign_id: toNullable(editingPromotionCampaignId),
          priority,
          discount_value: discountValue,
          max_discount_amount: maxDiscountAmount,
          coupon_required: editingPromotionCouponRequired,
          starts_at: startsAt,
          ends_at: endsAt,
          channel_scope_json: parseChannelScopeInput(editingPromotionChannelScopeInput),
        },
      });
      setMessage('promotion을 수정했습니다.');
      handleCancelPromotionEdit();
    });
  };

  const handleOpenPromotionRules = (promotionId: string) => {
    setSelectedPromotionId(promotionId);
    setEditingRuleId(null);
    setNewRuleType('MIN_ORDER_AMOUNT');
    setNewRuleStatus('ACTIVE');
    setNewRuleSortOrder('0');
    setNewRulePayloadJson('{\n  "min_amount": 50000\n}');
  };

  const handleCreatePromotionRule = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedPromotionId) {
      setErrorMessage('rule을 추가할 promotion을 선택해주세요.');
      return;
    }
    await runWithNotice(async () => {
      const sortOrder = parseNonNegativeInteger(newRuleSortOrder, 'sort_order');
      const payload = parseOptionalObjectJson(newRulePayloadJson, 'rule_payload');
      await createPromotionRule.mutateAsync({
        promotionId: selectedPromotionId,
        data: {
          rule_type: newRuleType,
          status: newRuleStatus,
          sort_order: sortOrder,
          rule_payload: payload,
        },
      });
      setNewRuleSortOrder('0');
      setNewRulePayloadJson('{\n  "min_amount": 50000\n}');
      setMessage('promotion rule을 추가했습니다.');
    });
  };

  const handleStartRuleEdit = (rule: {
    id: string;
    rule_type: PromotionRuleTypeValue;
    status: PriceItemStatusValue;
    sort_order: number;
    rule_payload: Record<string, unknown>;
  }) => {
    setEditingRuleId(rule.id);
    setEditingRuleType(rule.rule_type);
    setEditingRuleStatus(rule.status);
    setEditingRuleSortOrder(String(rule.sort_order));
    setEditingRulePayloadJson(JSON.stringify(rule.rule_payload ?? {}, null, 2));
  };

  const handleCancelRuleEdit = () => {
    setEditingRuleId(null);
    setEditingRuleType('MIN_ORDER_AMOUNT');
    setEditingRuleStatus('ACTIVE');
    setEditingRuleSortOrder('0');
    setEditingRulePayloadJson('{}');
  };

  const handleUpdateRule = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingRuleId) {
      return;
    }
    await runWithNotice(async () => {
      const sortOrder = parseNonNegativeInteger(editingRuleSortOrder, 'sort_order');
      const payload = parseOptionalObjectJson(editingRulePayloadJson, 'rule_payload');
      await updatePromotionRule.mutateAsync({
        ruleId: editingRuleId,
        data: {
          rule_type: editingRuleType,
          status: editingRuleStatus,
          sort_order: sortOrder,
          rule_payload: payload,
        },
      });
      setMessage('promotion rule을 수정했습니다.');
      handleCancelRuleEdit();
    });
  };

  const handleCreateCoupon = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await runWithNotice(async () => {
      const promotionId = toNullable(couponPromotionId);
      if (!promotionId) {
        throw new Error('coupon 생성 시 promotion_id는 필수입니다.');
      }
      const maxPerUser = parsePositiveInteger(
        couponMaxPerUser,
        'max_redemptions_per_user',
      );
      const maxIssuance = parseNullableNonNegativeInteger(
        couponMaxIssuance,
        'max_issuance',
      );
      const startsAt = parseDateTimeLocalInput(couponStartsAtInput, 'starts_at');
      const endsAt = parseDateTimeLocalInput(couponEndsAtInput, 'ends_at');
      await createCoupon.mutateAsync({
        code: couponCode.trim(),
        promotion_id: promotionId,
        status: couponStatus,
        starts_at: startsAt,
        ends_at: endsAt,
        max_issuance: maxIssuance,
        max_redemptions_per_user: maxPerUser,
        channel_scope_json: parseChannelScopeInput(couponChannelScopeInput),
      });
      setCouponCode('');
      setCouponStatus('DRAFT');
      setCouponStartsAtInput('');
      setCouponEndsAtInput('');
      setCouponMaxIssuance('');
      setCouponMaxPerUser('1');
      setCouponChannelScopeInput('');
      setMessage('coupon을 생성했습니다.');
    });
  };

  const handleStartCouponEdit = (coupon: {
    id: string;
    code: string;
    status: CouponStatusValue;
    promotion_id: string | null;
    starts_at: string | null;
    ends_at: string | null;
    max_issuance: number | null;
    max_redemptions_per_user: number;
    channel_scope_json: unknown[];
  }) => {
    setEditingCouponId(coupon.id);
    setEditingCouponCode(coupon.code);
    setEditingCouponStatus(coupon.status);
    setEditingCouponPromotionId(coupon.promotion_id ?? '');
    setEditingCouponStartsAtInput(toDateTimeLocalValue(coupon.starts_at));
    setEditingCouponEndsAtInput(toDateTimeLocalValue(coupon.ends_at));
    setEditingCouponMaxIssuance(
      coupon.max_issuance === null ? '' : String(coupon.max_issuance),
    );
    setEditingCouponMaxPerUser(String(coupon.max_redemptions_per_user));
    setEditingCouponChannelScopeInput(formatChannelScopeInput(coupon.channel_scope_json));
  };

  const handleCancelCouponEdit = () => {
    setEditingCouponId(null);
    setEditingCouponCode('');
    setEditingCouponStatus('DRAFT');
    setEditingCouponPromotionId('');
    setEditingCouponStartsAtInput('');
    setEditingCouponEndsAtInput('');
    setEditingCouponMaxIssuance('');
    setEditingCouponMaxPerUser('1');
    setEditingCouponChannelScopeInput('');
  };

  const handleUpdateCoupon = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingCouponId) {
      return;
    }
    await runWithNotice(async () => {
      const maxPerUser = parsePositiveInteger(
        editingCouponMaxPerUser,
        'max_redemptions_per_user',
      );
      const maxIssuance = parseNullableNonNegativeInteger(
        editingCouponMaxIssuance,
        'max_issuance',
      );
      const startsAt = parseDateTimeLocalInput(editingCouponStartsAtInput, 'starts_at');
      const endsAt = parseDateTimeLocalInput(editingCouponEndsAtInput, 'ends_at');
      await updateCoupon.mutateAsync({
        id: editingCouponId,
        data: {
          code: editingCouponCode.trim(),
          status: editingCouponStatus,
          promotion_id: toNullable(editingCouponPromotionId),
          starts_at: startsAt,
          ends_at: endsAt,
          max_issuance: maxIssuance,
          max_redemptions_per_user: maxPerUser,
          channel_scope_json: parseChannelScopeInput(editingCouponChannelScopeInput),
        },
      });
      setMessage('coupon을 수정했습니다.');
      handleCancelCouponEdit();
    });
  };

  const buildQuotePayload = () => {
    const shippingAmount = Number.parseInt(quoteShippingAmount, 10);
    if (!Number.isInteger(shippingAmount) || shippingAmount < 0) {
      throw new Error('shipping_amount는 0 이상의 정수여야 합니다.');
    }
    return {
      lines: parseLinesJson(quoteLinesJson),
      campaign_id: toNullable(quoteCampaignId),
      channel: toNullable(quoteChannel),
      coupon_code: toNullable(quoteCouponCode),
      user_id: toNullable(quoteUserId),
      shipping_amount: shippingAmount,
    };
  };

  const handleBuildQuote = async () => {
    await runWithNotice(async () => {
      const result = await buildPriceQuote.mutateAsync(buildQuotePayload());
      setQuoteResult(result);
      setMessage('price quote 계산이 완료되었습니다.');
    });
  };

  const handleEvaluatePromotions = async () => {
    await runWithNotice(async () => {
      const result = await evaluatePromotions.mutateAsync(buildQuotePayload());
      setPromotionEvaluationResult(result);
      setMessage('promotion evaluation이 완료되었습니다.');
    });
  };

  const handlePricingDebug = async () => {
    await runWithNotice(async () => {
      const result = await getPricingDebugTrace.mutateAsync(buildQuotePayload());
      setPricingDebugResult(result);
      setMessage('pricing debug trace를 조회했습니다.');
    });
  };

  const handleValidateCoupon = async () => {
    await runWithNotice(async () => {
      const result = await validateCoupon.mutateAsync({
        code: couponValidateCode.trim(),
        user_id: toNullable(couponValidateUserId),
      });
      setCouponValidationResult(result);
      setMessage('coupon 검증을 실행했습니다.');
    });
  };

  const handleReserveCoupon = async () => {
    await runWithNotice(async () => {
      const result = await reserveCoupon.mutateAsync({
        couponId: reserveCouponId.trim(),
        data: {
          user_id: reserveCouponUserId.trim(),
        },
      });
      setCouponOpResult(result.data);
      setMessage('coupon reserve를 실행했습니다.');
    });
  };

  const handleReleaseCoupon = async () => {
    await runWithNotice(async () => {
      const result = await releaseCouponRedemption.mutateAsync({
        redemptionId: releaseRedemptionId.trim(),
      });
      setCouponOpResult(result.data);
      setMessage('coupon release를 실행했습니다.');
    });
  };

  const handleRedeemCoupon = async () => {
    await runWithNotice(async () => {
      const result = await redeemCouponRedemption.mutateAsync({
        redemptionId: redeemRedemptionId.trim(),
        data: {
          order_id: toNullable(redeemOrderId),
        },
      });
      setCouponOpResult(result.data);
      setMessage('coupon redeem를 실행했습니다.');
    });
  };

  const selectedTargetCampaign = useMemo(
    () => (campaigns || []).find((campaign) => campaign.id === targetCampaignId) ?? null,
    [campaigns, targetCampaignId],
  );

  const projectNameMap = useMemo(
    () =>
      new Map((adminProjects || []).map((project) => [project.id, project.name])),
    [adminProjects],
  );
  const productNameMap = useMemo(
    () =>
      new Map((adminProducts || []).map((product) => [product.id, product.title])),
    [adminProducts],
  );
  const bundleLabelMap = useMemo(
    () =>
      new Map(
        (bundleDefinitions || []).map((definition) => [
          definition.id,
          `${definition.bundle_product_id} (v${definition.version_no})`,
        ]),
      ),
    [bundleDefinitions],
  );
  const variantTitleMap = useMemo(
    () =>
      new Map(
        (variantTargetOptions || []).map((variant) => [
          variant.id,
          `${variant.title} (${variant.sku})`,
        ]),
      ),
    [variantTargetOptions],
  );

  const filteredCampaigns = useMemo(() => {
    const keyword = campaignSearchKeyword.trim().toLowerCase();
    const list = (campaigns || []).filter((campaign) => {
      if (campaignStatusFilter !== 'ALL' && campaign.status !== campaignStatusFilter) {
        return false;
      }
      if (campaignTypeFilter !== 'ALL' && campaign.campaign_type !== campaignTypeFilter) {
        return false;
      }
      const period = getCampaignPeriod(
        campaign.starts_at,
        campaign.ends_at,
        CAMPAIGN_PERIOD_REFERENCE_MS,
      );
      if (campaignPeriodFilter !== 'ALL' && period !== campaignPeriodFilter) {
        return false;
      }
      if (!keyword) {
        return true;
      }
      const haystack = `${campaign.code} ${campaign.name} ${campaign.id}`.toLowerCase();
      return haystack.includes(keyword);
    });

    return list.sort((left, right) => {
      if (campaignSortKey === 'NAME_ASC') {
        return left.name.localeCompare(right.name, 'ko');
      }
      if (campaignSortKey === 'STARTS_ASC') {
        const leftStarts = left.starts_at ? new Date(left.starts_at).getTime() : Number.POSITIVE_INFINITY;
        const rightStarts = right.starts_at ? new Date(right.starts_at).getTime() : Number.POSITIVE_INFINITY;
        return leftStarts - rightStarts;
      }
      if (campaignSortKey === 'ENDS_ASC') {
        const leftEnds = left.ends_at ? new Date(left.ends_at).getTime() : Number.POSITIVE_INFINITY;
        const rightEnds = right.ends_at ? new Date(right.ends_at).getTime() : Number.POSITIVE_INFINITY;
        return leftEnds - rightEnds;
      }
      return new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime();
    });
  }, [
    campaignPeriodFilter,
    campaignSearchKeyword,
    campaigns,
    campaignSortKey,
    campaignStatusFilter,
    campaignTypeFilter,
  ]);

  const selectedTypeTargetOptions = useMemo(() => {
    if (newTargetType === 'PROJECT') {
      return (adminProjects || []).map((project) => ({
        id: project.id,
        label: `${project.name} (${project.slug})`,
      }));
    }
    if (newTargetType === 'PRODUCT') {
      return (adminProducts || []).map((product) => ({
        id: product.id,
        label: `${product.title} (${product.slug})`,
      }));
    }
    if (newTargetType === 'BUNDLE_DEFINITION') {
      return (bundleDefinitions || []).map((definition) => ({
        id: definition.id,
        label: `${definition.bundle_product_id} (v${definition.version_no})`,
      }));
    }
    return (variantTargetOptions || []).map((variant) => ({
      id: variant.id,
      label: `${variant.title} (${variant.sku})`,
    }));
  }, [adminProducts, adminProjects, bundleDefinitions, newTargetType, variantTargetOptions]);

  const resolveTargetLabel = (
    targetType: CampaignTargetTypeValue,
    targetId: string,
  ): string => {
    if (targetType === 'PROJECT') {
      return projectNameMap.get(targetId) ?? targetId;
    }
    if (targetType === 'PRODUCT') {
      return productNameMap.get(targetId) ?? targetId;
    }
    if (targetType === 'BUNDLE_DEFINITION') {
      return bundleLabelMap.get(targetId) ?? targetId;
    }
    return variantTitleMap.get(targetId) ?? targetId;
  };

  const campaignLabelMap = useMemo(
    () =>
      new Map((campaigns || []).map((campaign) => [campaign.id, `${campaign.code} (${campaign.name})`])),
    [campaigns],
  );

  const filteredPriceLists = useMemo(() => {
    const keyword = priceListSearchKeyword.trim().toLowerCase();
    const list = (priceLists || []).filter((priceList) => {
      if (priceListStatusFilter !== 'ALL' && priceList.status !== priceListStatusFilter) {
        return false;
      }
      if (priceListScopeFilter !== 'ALL' && priceList.scope_type !== priceListScopeFilter) {
        return false;
      }
      if (priceListCampaignFilter !== 'ALL') {
        if (priceListCampaignFilter === 'NONE') {
          if (priceList.campaign_id !== null) {
            return false;
          }
        } else if (priceList.campaign_id !== priceListCampaignFilter) {
          return false;
        }
      }
      if (!keyword) {
        return true;
      }
      const haystack = `${priceList.name} ${priceList.id} ${priceList.currency_code}`.toLowerCase();
      return haystack.includes(keyword);
    });

    return list.sort((left, right) => {
      if (priceListSortKey === 'PRIORITY_ASC') {
        return left.priority - right.priority;
      }
      if (priceListSortKey === 'PUBLISHED_DESC') {
        const leftPublished = left.published_at ? new Date(left.published_at).getTime() : 0;
        const rightPublished = right.published_at ? new Date(right.published_at).getTime() : 0;
        return rightPublished - leftPublished;
      }
      if (priceListSortKey === 'NAME_ASC') {
        return left.name.localeCompare(right.name, 'ko');
      }
      return new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime();
    });
  }, [
    priceListCampaignFilter,
    priceListScopeFilter,
    priceListSearchKeyword,
    priceListSortKey,
    priceListStatusFilter,
    priceLists,
  ]);

  const selectedPriceList = useMemo(
    () => (priceLists || []).find((priceList) => priceList.id === selectedPriceListId) ?? null,
    [priceLists, selectedPriceListId],
  );

  const newPriceItemVariantOptions = useMemo(
    () =>
      (newPriceItemVariants || []).map((variant) => ({
        id: variant.id,
        label: `${variant.title} (${variant.sku})`,
      })),
    [newPriceItemVariants],
  );
  const editingPriceItemVariantOptions = useMemo(
    () =>
      (editingPriceItemVariants || []).map((variant) => ({
        id: variant.id,
        label: `${variant.title} (${variant.sku})`,
      })),
    [editingPriceItemVariants],
  );

  const filteredPromotions = useMemo(() => {
    const keyword = promotionSearchKeyword.trim().toLowerCase();
    const list = (promotions || []).filter((promotion) => {
      if (promotionStatusFilter !== 'ALL' && promotion.status !== promotionStatusFilter) {
        return false;
      }
      if (promotionTypeFilter !== 'ALL' && promotion.promotion_type !== promotionTypeFilter) {
        return false;
      }
      if (promotionCouponRequiredFilter !== 'ALL') {
        if (promotionCouponRequiredFilter === 'YES' && !promotion.coupon_required) {
          return false;
        }
        if (promotionCouponRequiredFilter === 'NO' && promotion.coupon_required) {
          return false;
        }
      }
      if (promotionCampaignFilter !== 'ALL') {
        if (promotionCampaignFilter === 'NONE') {
          if (promotion.campaign_id !== null) {
            return false;
          }
        } else if (promotion.campaign_id !== promotionCampaignFilter) {
          return false;
        }
      }
      if (!keyword) {
        return true;
      }
      const haystack = `${promotion.name} ${promotion.id}`.toLowerCase();
      return haystack.includes(keyword);
    });

    return list.sort((left, right) => {
      if (promotionSortKey === 'PRIORITY_ASC') {
        return left.priority - right.priority;
      }
      if (promotionSortKey === 'NAME_ASC') {
        return left.name.localeCompare(right.name, 'ko');
      }
      return new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime();
    });
  }, [
    promotionCampaignFilter,
    promotionCouponRequiredFilter,
    promotionSearchKeyword,
    promotionSortKey,
    promotionStatusFilter,
    promotionTypeFilter,
    promotions,
  ]);

  const selectedPromotion = useMemo(
    () => (promotions || []).find((promotion) => promotion.id === selectedPromotionId) ?? null,
    [promotions, selectedPromotionId],
  );

  const promotionLabelMap = useMemo(
    () => new Map((promotions || []).map((promotion) => [promotion.id, promotion.name])),
    [promotions],
  );

  const filteredCoupons = useMemo(() => {
    const keyword = couponSearchKeyword.trim().toLowerCase();
    const list = (coupons || []).filter((coupon) => {
      if (couponStatusFilter !== 'ALL' && coupon.status !== couponStatusFilter) {
        return false;
      }
      if (couponPromotionFilter !== 'ALL') {
        if (couponPromotionFilter === 'NONE') {
          if (coupon.promotion_id !== null) {
            return false;
          }
        } else if (coupon.promotion_id !== couponPromotionFilter) {
          return false;
        }
      }
      if (!keyword) {
        return true;
      }
      const haystack = `${coupon.code} ${coupon.id}`.toLowerCase();
      return haystack.includes(keyword);
    });

    return list.sort((left, right) => {
      if (couponSortKey === 'CODE_ASC') {
        return left.code.localeCompare(right.code, 'ko');
      }
      if (couponSortKey === 'REDEEMED_DESC') {
        return right.redeemed_count - left.redeemed_count;
      }
      return new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime();
    });
  }, [
    couponPromotionFilter,
    couponSearchKeyword,
    couponSortKey,
    couponStatusFilter,
    coupons,
  ]);

  const sortedCouponRedemptions = useMemo(
    () =>
      [...(couponRedemptions || [])].sort(
        (left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime(),
      ),
    [couponRedemptions],
  );

  if (campaignsLoading || priceListsLoading || promotionsLoading || couponsLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loading size="lg" text="v2 pricing 운영 데이터를 불러오는 중입니다" />
      </div>
    );
  }

  if (campaignsError || priceListsError || promotionsError || couponsError) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">v2 pricing 운영 데이터를 불러오는데 실패했습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="sm:flex sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">V2 Pricing Ops</h1>
          <p className="mt-1 text-sm text-gray-500">
            campaign / price list / promotion / coupon 운영과 가격 계산 디버깅을 수행합니다.
          </p>
        </div>
        <Badge intent="warning" size="md">
          03 영역 운영 콘솔
        </Badge>
      </div>

      {message && (
        <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {message}
        </div>
      )}
      {errorMessage && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      <section className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            intent={activeTab === 'campaign' ? 'primary' : 'neutral'}
            onClick={() => setActiveTab('campaign')}
          >
            Campaign
          </Button>
          <Button
            type="button"
            size="sm"
            intent={activeTab === 'price-list' ? 'primary' : 'neutral'}
            onClick={() => setActiveTab('price-list')}
          >
            Price List
          </Button>
          <Button
            type="button"
            size="sm"
            intent={activeTab === 'promotion' ? 'primary' : 'neutral'}
            onClick={() => setActiveTab('promotion')}
          >
            Promotion
          </Button>
          <Button
            type="button"
            size="sm"
            intent={activeTab === 'coupon-ops' ? 'primary' : 'neutral'}
            onClick={() => setActiveTab('coupon-ops')}
          >
            Coupon Ops
          </Button>
          <Button
            type="button"
            size="sm"
            intent={activeTab === 'simulator' ? 'primary' : 'neutral'}
            onClick={() => setActiveTab('simulator')}
          >
            Simulator
          </Button>
        </div>
      </section>

      <section
        className={`rounded-lg border border-gray-200 bg-white p-6 ${
          activeTab === 'campaign' ? '' : 'hidden'
        }`}
      >
        <h2 className="text-lg font-semibold text-gray-900">Campaign Ops</h2>
        <form className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-8" onSubmit={handleCreateCampaign}>
          <Input
            placeholder="code"
            value={campaignCode}
            onChange={(event) => setCampaignCode(event.target.value)}
            required
          />
          <Input
            placeholder="name"
            value={campaignName}
            onChange={(event) => setCampaignName(event.target.value)}
            required
          />
          <select
            value={campaignType}
            onChange={(event) => setCampaignType(event.target.value as CampaignTypeValue)}
            className={FIELD_SELECT_CLASS_NAME}
          >
            {CAMPAIGN_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <Input
            placeholder="description (optional)"
            value={campaignDescription}
            onChange={(event) => setCampaignDescription(event.target.value)}
          />
          <Input
            type="datetime-local"
            value={campaignStartsAtInput}
            onChange={(event) => setCampaignStartsAtInput(event.target.value)}
          />
          <Input
            type="datetime-local"
            value={campaignEndsAtInput}
            onChange={(event) => setCampaignEndsAtInput(event.target.value)}
          />
          <Input
            placeholder="channel scope (WEB, MOBILE)"
            value={campaignChannelScopeInput}
            onChange={(event) => setCampaignChannelScopeInput(event.target.value)}
          />
          <Button type="submit" loading={createCampaign.isPending} className="md:col-span-1">
            campaign 생성
          </Button>
        </form>

        <div className="mt-6 rounded-md border border-gray-200 bg-gray-50 p-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
            <Input
              placeholder="code/name/id 검색"
              value={campaignSearchKeyword}
              onChange={(event) => setCampaignSearchKeyword(event.target.value)}
            />
            <select
              value={campaignStatusFilter}
              onChange={(event) => setCampaignStatusFilter(event.target.value as CampaignFilterStatus)}
              className={FIELD_SELECT_CLASS_NAME}
            >
              <option value="ALL">모든 상태</option>
              <option value="DRAFT">DRAFT</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="SUSPENDED">SUSPENDED</option>
              <option value="CLOSED">CLOSED</option>
              <option value="ARCHIVED">ARCHIVED</option>
            </select>
            <select
              value={campaignTypeFilter}
              onChange={(event) => setCampaignTypeFilter(event.target.value as CampaignFilterType)}
              className={FIELD_SELECT_CLASS_NAME}
            >
              <option value="ALL">모든 타입</option>
              {CAMPAIGN_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            <select
              value={campaignPeriodFilter}
              onChange={(event) => setCampaignPeriodFilter(event.target.value as CampaignPeriodFilter)}
              className={FIELD_SELECT_CLASS_NAME}
            >
              <option value="ALL">전체 기간</option>
              <option value="LIVE">진행중</option>
              <option value="UPCOMING">예정</option>
              <option value="ENDED">종료</option>
              <option value="NO_PERIOD">상시(기간 없음)</option>
            </select>
            <select
              value={campaignSortKey}
              onChange={(event) => setCampaignSortKey(event.target.value as CampaignSortKey)}
              className={FIELD_SELECT_CLASS_NAME}
            >
              <option value="UPDATED_DESC">최근 수정순</option>
              <option value="STARTS_ASC">시작일 빠른순</option>
              <option value="ENDS_ASC">종료일 빠른순</option>
              <option value="NAME_ASC">이름순</option>
            </select>
          </div>
          <p className="mt-2 text-xs text-gray-500">검색 결과 {filteredCampaigns.length}건</p>
        </div>

        <div className="mt-4 space-y-2">
          {filteredCampaigns.length === 0 && (
            <p className="rounded-md border border-dashed border-gray-300 px-3 py-5 text-center text-sm text-gray-500">
              조건에 맞는 campaign이 없습니다.
            </p>
          )}
          {filteredCampaigns.map((campaign) => {
            const period = getCampaignPeriod(
              campaign.starts_at,
              campaign.ends_at,
              CAMPAIGN_PERIOD_REFERENCE_MS,
            );
            return (
              <div
                key={campaign.id}
                className="space-y-2 rounded-md border border-gray-200 p-3"
              >
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="font-medium text-gray-900">
                      {campaign.code} - {campaign.name}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                      <Badge intent={getCampaignStatusBadgeIntent(campaign.status as CampaignStatusValue)}>
                        {campaign.status}
                      </Badge>
                      <Badge intent={getCampaignPeriodBadgeIntent(period)}>
                        {getCampaignPeriodLabel(period)}
                      </Badge>
                      <Badge intent="default">{campaign.campaign_type}</Badge>
                      <span>{campaign.id}</span>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      기간 {formatDateTime(campaign.starts_at)} ~ {formatDateTime(campaign.ends_at)} / 수정{' '}
                      {formatDateTime(campaign.updated_at)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" intent="neutral" onClick={() => handleStartCampaignEdit(campaign)}>
                      Edit
                    </Button>
                    <Button size="sm" intent="neutral" onClick={() => handleOpenCampaignTargets(campaign.id)}>
                      Targets
                    </Button>
                    <Button size="sm" intent="neutral" onClick={() => handleCampaignAction('activate', campaign.id)}>
                      Activate
                    </Button>
                    <Button size="sm" intent="neutral" onClick={() => handleCampaignAction('suspend', campaign.id)}>
                      Suspend
                    </Button>
                    <Button size="sm" intent="neutral" onClick={() => handleCampaignAction('close', campaign.id)}>
                      Close
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {editingCampaignId && (
          <form className="mt-6 rounded-md border border-indigo-200 bg-indigo-50 p-4" onSubmit={handleUpdateCampaign}>
            <p className="text-sm font-semibold text-indigo-900">Campaign 수정</p>
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-4">
              <Input
                placeholder="code"
                value={editingCampaignCode}
                onChange={(event) => setEditingCampaignCode(event.target.value)}
                required
              />
              <Input
                placeholder="name"
                value={editingCampaignName}
                onChange={(event) => setEditingCampaignName(event.target.value)}
                required
              />
              <select
                value={editingCampaignType}
                onChange={(event) => setEditingCampaignType(event.target.value as CampaignTypeValue)}
                className={FIELD_SELECT_CLASS_NAME}
              >
                {CAMPAIGN_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              <Input
                placeholder="description (optional)"
                value={editingCampaignDescription}
                onChange={(event) => setEditingCampaignDescription(event.target.value)}
              />
              <Input
                type="datetime-local"
                value={editingCampaignStartsAtInput}
                onChange={(event) => setEditingCampaignStartsAtInput(event.target.value)}
              />
              <Input
                type="datetime-local"
                value={editingCampaignEndsAtInput}
                onChange={(event) => setEditingCampaignEndsAtInput(event.target.value)}
              />
              <Input
                placeholder="channel scope (WEB, MOBILE)"
                value={editingCampaignChannelScopeInput}
                onChange={(event) => setEditingCampaignChannelScopeInput(event.target.value)}
              />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button type="submit" loading={updateCampaign.isPending}>
                저장
              </Button>
              <Button type="button" intent="neutral" onClick={handleCancelCampaignEdit}>
                취소
              </Button>
            </div>
          </form>
        )}

        {targetCampaignId && (
          <div className="mt-6 rounded-md border border-blue-200 bg-blue-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-blue-900">
                Campaign Targets · {selectedTargetCampaign?.code ?? targetCampaignId}
              </p>
              <Button type="button" size="sm" intent="neutral" onClick={() => setTargetCampaignId(null)}>
                닫기
              </Button>
            </div>

            <form className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-6" onSubmit={handleCreateCampaignTarget}>
              <select
                value={newTargetType}
                onChange={(event) => {
                  const nextType = event.target.value as CampaignTargetTypeValue;
                  setNewTargetType(nextType);
                  setNewTargetId('');
                  if (nextType !== 'VARIANT') {
                    setNewVariantTargetProductId('');
                  }
                }}
                className={FIELD_SELECT_CLASS_NAME}
              >
                {CAMPAIGN_TARGET_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              {newTargetType === 'VARIANT' ? (
                <select
                  value={newVariantTargetProductId}
                  onChange={(event) => {
                    setNewVariantTargetProductId(event.target.value);
                    setNewTargetId('');
                  }}
                  className={FIELD_SELECT_CLASS_NAME}
                >
                  <option value="">variant 조회 product 선택</option>
                  {(adminProducts || []).map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.title}
                    </option>
                  ))}
                </select>
              ) : (
                <select
                  value={newTargetId}
                  onChange={(event) => setNewTargetId(event.target.value)}
                  className={FIELD_SELECT_CLASS_NAME}
                >
                  <option value="">target 선택</option>
                  {selectedTypeTargetOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              )}
              {newTargetType === 'VARIANT' && (
                <select
                  value={newTargetId}
                  onChange={(event) => setNewTargetId(event.target.value)}
                  className={FIELD_SELECT_CLASS_NAME}
                >
                  <option value="">variant 선택</option>
                  {selectedTypeTargetOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              )}
              <Input
                placeholder="target_id (수동 입력 가능)"
                value={newTargetId}
                onChange={(event) => setNewTargetId(event.target.value)}
              />
              <Input
                placeholder="sort_order"
                value={newTargetSortOrder}
                onChange={(event) => setNewTargetSortOrder(event.target.value)}
              />
              <label className="flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={newTargetExcluded}
                  onChange={(event) => setNewTargetExcluded(event.target.checked)}
                />
                제외 대상
              </label>
              <Button type="submit" loading={createCampaignTarget.isPending}>
                Target 추가
              </Button>
            </form>

            <div className="mt-4 space-y-2">
              {campaignTargetsLoading && (
                <p className="text-sm text-gray-500">target 목록을 불러오는 중입니다...</p>
              )}
              {!campaignTargetsLoading && (campaignTargets || []).length === 0 && (
                <p className="text-sm text-gray-500">등록된 target이 없습니다.</p>
              )}
              {(campaignTargets || []).map((target) => (
                <div key={target.id} className="rounded-md border border-blue-100 bg-white p-3">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <Badge intent="default">{target.target_type}</Badge>
                        {target.is_excluded ? <Badge intent="warning">EXCLUDED</Badge> : <Badge intent="success">INCLUDED</Badge>}
                      </div>
                      <p className="text-sm font-medium text-gray-900">
                        {resolveTargetLabel(
                          target.target_type as CampaignTargetTypeValue,
                          target.target_id,
                        )}
                      </p>
                      <p className="text-xs text-gray-500">
                        target_id={target.target_id} / sort_order={target.sort_order}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" intent="neutral" onClick={() => handleStartTargetEdit(target)}>
                        Edit
                      </Button>
                      <Button size="sm" intent="neutral" loading={deleteCampaignTarget.isPending} onClick={() => handleDeleteTarget(target.id)}>
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {editingTargetId && (
              <form className="mt-4 rounded-md border border-gray-200 bg-white p-4" onSubmit={handleUpdateTarget}>
                <p className="text-sm font-semibold text-gray-900">Target 수정</p>
                <div className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-5">
                  <select
                    value={editingTargetType}
                    onChange={(event) => setEditingTargetType(event.target.value as CampaignTargetTypeValue)}
                    className={FIELD_SELECT_CLASS_NAME}
                  >
                    {CAMPAIGN_TARGET_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                  <Input
                    placeholder="target_id"
                    value={editingTargetEntityId}
                    onChange={(event) => setEditingTargetEntityId(event.target.value)}
                  />
                  <Input
                    placeholder="sort_order"
                    value={editingTargetSortOrder}
                    onChange={(event) => setEditingTargetSortOrder(event.target.value)}
                  />
                  <label className="flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm">
                    <input
                      type="checkbox"
                      checked={editingTargetExcluded}
                      onChange={(event) => setEditingTargetExcluded(event.target.checked)}
                    />
                    제외 대상
                  </label>
                </div>
                <div className="mt-3 flex gap-2">
                  <Button type="submit" loading={updateCampaignTarget.isPending}>
                    저장
                  </Button>
                  <Button type="button" intent="neutral" onClick={handleCancelTargetEdit}>
                    취소
                  </Button>
                </div>
              </form>
            )}
          </div>
        )}
      </section>

      <section
        className={`rounded-lg border border-gray-200 bg-white p-6 ${
          activeTab === 'price-list' ? '' : 'hidden'
        }`}
      >
        <h2 className="text-lg font-semibold text-gray-900">Price List Ops</h2>
        <form className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-8" onSubmit={handleCreatePriceList}>
          <Input
            placeholder="name"
            value={priceListName}
            onChange={(event) => setPriceListName(event.target.value)}
            required
          />
          <select
            value={priceListScope}
            onChange={(event) => setPriceListScope(event.target.value as PriceListScopeValue)}
            className={FIELD_SELECT_CLASS_NAME}
          >
            {PRICE_LIST_SCOPES.map((scope) => (
              <option key={scope} value={scope}>
                {scope}
              </option>
            ))}
          </select>
          <select
            value={priceListCampaignId}
            onChange={(event) => setPriceListCampaignId(event.target.value)}
            className={FIELD_SELECT_CLASS_NAME}
          >
            <option value="">campaign 없음</option>
            {(campaigns || []).map((campaign) => (
              <option key={campaign.id} value={campaign.id}>
                {campaign.code} ({campaign.name})
              </option>
            ))}
          </select>
          <Input
            placeholder="currency (KRW)"
            value={priceListCurrency}
            onChange={(event) => setPriceListCurrency(event.target.value)}
          />
          <Input
            placeholder="priority"
            value={priceListPriority}
            onChange={(event) => setPriceListPriority(event.target.value)}
          />
          <Input
            type="datetime-local"
            value={priceListStartsAtInput}
            onChange={(event) => setPriceListStartsAtInput(event.target.value)}
          />
          <Input
            type="datetime-local"
            value={priceListEndsAtInput}
            onChange={(event) => setPriceListEndsAtInput(event.target.value)}
          />
          <Input
            placeholder="channel scope (WEB, MOBILE)"
            value={priceListChannelScopeInput}
            onChange={(event) => setPriceListChannelScopeInput(event.target.value)}
          />
          <Button type="submit" loading={createPriceList.isPending} className="md:col-span-8 md:w-fit">
            price list 생성
          </Button>
        </form>

        <div className="mt-6 rounded-md border border-gray-200 bg-gray-50 p-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
            <Input
              placeholder="name/id/currency 검색"
              value={priceListSearchKeyword}
              onChange={(event) => setPriceListSearchKeyword(event.target.value)}
            />
            <select
              value={priceListStatusFilter}
              onChange={(event) => setPriceListStatusFilter(event.target.value as PriceListFilterStatus)}
              className={FIELD_SELECT_CLASS_NAME}
            >
              <option value="ALL">모든 상태</option>
              <option value="DRAFT">DRAFT</option>
              <option value="PUBLISHED">PUBLISHED</option>
              <option value="ROLLED_BACK">ROLLED_BACK</option>
              <option value="ARCHIVED">ARCHIVED</option>
            </select>
            <select
              value={priceListScopeFilter}
              onChange={(event) => setPriceListScopeFilter(event.target.value as PriceListFilterScope)}
              className={FIELD_SELECT_CLASS_NAME}
            >
              <option value="ALL">모든 scope</option>
              {PRICE_LIST_SCOPES.map((scope) => (
                <option key={scope} value={scope}>
                  {scope}
                </option>
              ))}
            </select>
            <select
              value={priceListCampaignFilter}
              onChange={(event) => setPriceListCampaignFilter(event.target.value as PriceListFilterCampaign)}
              className={FIELD_SELECT_CLASS_NAME}
            >
              <option value="ALL">모든 campaign</option>
              <option value="NONE">campaign 없음</option>
              {(campaigns || []).map((campaign) => (
                <option key={campaign.id} value={campaign.id}>
                  {campaign.code} ({campaign.name})
                </option>
              ))}
            </select>
            <select
              value={priceListSortKey}
              onChange={(event) => setPriceListSortKey(event.target.value as PriceListSortKey)}
              className={FIELD_SELECT_CLASS_NAME}
            >
              <option value="UPDATED_DESC">최근 수정순</option>
              <option value="PRIORITY_ASC">priority 낮은순</option>
              <option value="PUBLISHED_DESC">publish 최신순</option>
              <option value="NAME_ASC">이름순</option>
            </select>
          </div>
          <p className="mt-2 text-xs text-gray-500">검색 결과 {filteredPriceLists.length}건</p>
        </div>

        <div className="mt-4 space-y-2">
          {filteredPriceLists.length === 0 && (
            <p className="rounded-md border border-dashed border-gray-300 px-3 py-5 text-center text-sm text-gray-500">
              조건에 맞는 price list가 없습니다.
            </p>
          )}
          {filteredPriceLists.map((priceList) => (
            <div
              key={priceList.id}
              className="rounded-md border border-gray-200 p-3"
            >
              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="font-medium text-gray-900">{priceList.name}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                    <Badge intent={getPriceListStatusBadgeIntent(priceList.status as PriceListStatusValue)}>
                      {priceList.status}
                    </Badge>
                    <Badge intent={getPriceListScopeBadgeIntent(priceList.scope_type as PriceListScopeValue)}>
                      {priceList.scope_type}
                    </Badge>
                    <span>{priceList.currency_code}</span>
                    <span>priority={priceList.priority}</span>
                    <span>{priceList.id}</span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    campaign={priceList.campaign_id ? campaignLabelMap.get(priceList.campaign_id) ?? priceList.campaign_id : '없음'} / 기간{' '}
                    {formatDateTime(priceList.starts_at)} ~ {formatDateTime(priceList.ends_at)} / publish{' '}
                    {formatDateTime(priceList.published_at)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" intent="neutral" onClick={() => handleStartPriceListEdit(priceList)}>
                    Edit
                  </Button>
                  <Button size="sm" intent="neutral" onClick={() => handleOpenPriceListItems(priceList.id)}>
                    Items
                  </Button>
                  <Button size="sm" intent="neutral" onClick={() => handlePriceListAction('publish', priceList.id)}>
                    Publish
                  </Button>
                  <Button size="sm" intent="neutral" onClick={() => handlePriceListAction('rollback', priceList.id)}>
                    Rollback
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {editingPriceListId && (
          <form className="mt-6 rounded-md border border-indigo-200 bg-indigo-50 p-4" onSubmit={handleUpdatePriceList}>
            <p className="text-sm font-semibold text-indigo-900">Price List 수정</p>
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-5">
              <Input
                placeholder="name"
                value={editingPriceListName}
                onChange={(event) => setEditingPriceListName(event.target.value)}
                required
              />
              <select
                value={editingPriceListScope}
                onChange={(event) => setEditingPriceListScope(event.target.value as PriceListScopeValue)}
                className={FIELD_SELECT_CLASS_NAME}
              >
                {PRICE_LIST_SCOPES.map((scope) => (
                  <option key={scope} value={scope}>
                    {scope}
                  </option>
                ))}
              </select>
              <select
                value={editingPriceListStatus}
                onChange={(event) => setEditingPriceListStatus(event.target.value as PriceListStatusValue)}
                className={FIELD_SELECT_CLASS_NAME}
              >
                <option value="DRAFT">DRAFT</option>
                <option value="PUBLISHED">PUBLISHED</option>
                <option value="ROLLED_BACK">ROLLED_BACK</option>
                <option value="ARCHIVED">ARCHIVED</option>
              </select>
              <select
                value={editingPriceListCampaignId}
                onChange={(event) => setEditingPriceListCampaignId(event.target.value)}
                className={FIELD_SELECT_CLASS_NAME}
              >
                <option value="">campaign 없음</option>
                {(campaigns || []).map((campaign) => (
                  <option key={campaign.id} value={campaign.id}>
                    {campaign.code} ({campaign.name})
                  </option>
                ))}
              </select>
              <Input
                placeholder="currency"
                value={editingPriceListCurrency}
                onChange={(event) => setEditingPriceListCurrency(event.target.value)}
              />
              <Input
                placeholder="priority"
                value={editingPriceListPriority}
                onChange={(event) => setEditingPriceListPriority(event.target.value)}
              />
              <Input
                type="datetime-local"
                value={editingPriceListStartsAtInput}
                onChange={(event) => setEditingPriceListStartsAtInput(event.target.value)}
              />
              <Input
                type="datetime-local"
                value={editingPriceListEndsAtInput}
                onChange={(event) => setEditingPriceListEndsAtInput(event.target.value)}
              />
              <Input
                placeholder="channel scope (WEB, MOBILE)"
                value={editingPriceListChannelScopeInput}
                onChange={(event) => setEditingPriceListChannelScopeInput(event.target.value)}
              />
            </div>
            <div className="mt-3 flex gap-2">
              <Button type="submit" loading={updatePriceList.isPending}>
                저장
              </Button>
              <Button type="button" intent="neutral" onClick={handleCancelPriceListEdit}>
                취소
              </Button>
            </div>
          </form>
        )}

        {selectedPriceListId && (
          <div className="mt-6 rounded-md border border-blue-200 bg-blue-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-blue-900">
                Price List Items · {selectedPriceList?.name ?? selectedPriceListId}
              </p>
              <Button type="button" size="sm" intent="neutral" onClick={() => setSelectedPriceListId(null)}>
                닫기
              </Button>
            </div>

            <form className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-6" onSubmit={handleCreatePriceListItem}>
              <select
                value={newPriceItemProductId}
                onChange={(event) => {
                  setNewPriceItemProductId(event.target.value);
                  setNewPriceItemVariantId('');
                }}
                className={FIELD_SELECT_CLASS_NAME}
              >
                <option value="">product 선택</option>
                {(adminProducts || []).map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.title}
                  </option>
                ))}
              </select>
              <select
                value={newPriceItemVariantId}
                onChange={(event) => setNewPriceItemVariantId(event.target.value)}
                className={FIELD_SELECT_CLASS_NAME}
              >
                <option value="">variant 없음 (product 기본)</option>
                {newPriceItemVariantOptions.map((variant) => (
                  <option key={variant.id} value={variant.id}>
                    {variant.label}
                  </option>
                ))}
              </select>
              <select
                value={newPriceItemStatus}
                onChange={(event) => setNewPriceItemStatus(event.target.value as PriceItemStatusValue)}
                className={FIELD_SELECT_CLASS_NAME}
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
              <Input
                placeholder="unit_amount"
                value={newPriceItemUnitAmount}
                onChange={(event) => setNewPriceItemUnitAmount(event.target.value)}
              />
              <Input
                placeholder="compare_at_amount (optional)"
                value={newPriceItemCompareAtAmount}
                onChange={(event) => setNewPriceItemCompareAtAmount(event.target.value)}
              />
              <Input
                placeholder="min_qty"
                value={newPriceItemMinQuantity}
                onChange={(event) => setNewPriceItemMinQuantity(event.target.value)}
              />
              <Input
                placeholder="max_qty (optional)"
                value={newPriceItemMaxQuantity}
                onChange={(event) => setNewPriceItemMaxQuantity(event.target.value)}
              />
              <Input
                type="datetime-local"
                value={newPriceItemStartsAtInput}
                onChange={(event) => setNewPriceItemStartsAtInput(event.target.value)}
              />
              <Input
                type="datetime-local"
                value={newPriceItemEndsAtInput}
                onChange={(event) => setNewPriceItemEndsAtInput(event.target.value)}
              />
              <Input
                placeholder="channel scope (WEB, MOBILE)"
                value={newPriceItemChannelScopeInput}
                onChange={(event) => setNewPriceItemChannelScopeInput(event.target.value)}
              />
              <Button type="submit" loading={createPriceListItem.isPending}>
                Item 추가
              </Button>
            </form>

            <div className="mt-4 space-y-2">
              {priceListItemsLoading && (
                <p className="text-sm text-gray-500">item 목록을 불러오는 중입니다...</p>
              )}
              {!priceListItemsLoading && (priceListItems || []).length === 0 && (
                <p className="text-sm text-gray-500">등록된 item이 없습니다.</p>
              )}
              {(priceListItems || []).map((item) => (
                <div key={item.id} className="rounded-md border border-blue-100 bg-white p-3">
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {item.product?.title ?? item.product_id}
                        {item.variant ? ` / ${item.variant.title} (${item.variant.sku})` : ' / product 기본가'}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                        <Badge intent={item.status === 'ACTIVE' ? 'success' : 'warning'}>{item.status}</Badge>
                        <span>unit={item.unit_amount}</span>
                        <span>compare={item.compare_at_amount ?? '-'}</span>
                        <span>qty {item.min_purchase_quantity}~{item.max_purchase_quantity ?? '-'}</span>
                        <span>{item.id}</span>
                      </div>
                      <p className="mt-1 text-xs text-gray-500">
                        기간 {formatDateTime(item.starts_at)} ~ {formatDateTime(item.ends_at)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" intent="neutral" onClick={() => handleStartPriceItemEdit(item)}>
                        Edit
                      </Button>
                      <Button size="sm" intent="neutral" loading={deactivatePriceListItem.isPending} onClick={() => handleDeactivatePriceItem(item.id)}>
                        Deactivate
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {editingPriceItemId && (
              <form className="mt-4 rounded-md border border-gray-200 bg-white p-4" onSubmit={handleUpdatePriceItem}>
                <p className="text-sm font-semibold text-gray-900">Price Item 수정</p>
                <div className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-6">
                  <select
                    value={editingPriceItemProductId}
                    onChange={(event) => {
                      setEditingPriceItemProductId(event.target.value);
                      setEditingPriceItemVariantId('');
                    }}
                    className={FIELD_SELECT_CLASS_NAME}
                  >
                    <option value="">product 선택</option>
                    {(adminProducts || []).map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.title}
                      </option>
                    ))}
                  </select>
                  <select
                    value={editingPriceItemVariantId}
                    onChange={(event) => setEditingPriceItemVariantId(event.target.value)}
                    className={FIELD_SELECT_CLASS_NAME}
                  >
                    <option value="">variant 없음 (product 기본)</option>
                    {editingPriceItemVariantOptions.map((variant) => (
                      <option key={variant.id} value={variant.id}>
                        {variant.label}
                      </option>
                    ))}
                  </select>
                  <select
                    value={editingPriceItemStatus}
                    onChange={(event) => setEditingPriceItemStatus(event.target.value as PriceItemStatusValue)}
                    className={FIELD_SELECT_CLASS_NAME}
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                  <Input
                    placeholder="unit_amount"
                    value={editingPriceItemUnitAmount}
                    onChange={(event) => setEditingPriceItemUnitAmount(event.target.value)}
                  />
                  <Input
                    placeholder="compare_at_amount (optional)"
                    value={editingPriceItemCompareAtAmount}
                    onChange={(event) => setEditingPriceItemCompareAtAmount(event.target.value)}
                  />
                  <Input
                    placeholder="min_qty"
                    value={editingPriceItemMinQuantity}
                    onChange={(event) => setEditingPriceItemMinQuantity(event.target.value)}
                  />
                  <Input
                    placeholder="max_qty (optional)"
                    value={editingPriceItemMaxQuantity}
                    onChange={(event) => setEditingPriceItemMaxQuantity(event.target.value)}
                  />
                  <Input
                    type="datetime-local"
                    value={editingPriceItemStartsAtInput}
                    onChange={(event) => setEditingPriceItemStartsAtInput(event.target.value)}
                  />
                  <Input
                    type="datetime-local"
                    value={editingPriceItemEndsAtInput}
                    onChange={(event) => setEditingPriceItemEndsAtInput(event.target.value)}
                  />
                  <Input
                    placeholder="channel scope (WEB, MOBILE)"
                    value={editingPriceItemChannelScopeInput}
                    onChange={(event) => setEditingPriceItemChannelScopeInput(event.target.value)}
                  />
                </div>
                <div className="mt-3 flex gap-2">
                  <Button type="submit" loading={updatePriceListItem.isPending}>
                    저장
                  </Button>
                  <Button type="button" intent="neutral" onClick={handleCancelPriceItemEdit}>
                    취소
                  </Button>
                </div>
              </form>
            )}
          </div>
        )}
      </section>

      <section
        className={`rounded-lg border border-gray-200 bg-white p-6 ${
          activeTab === 'promotion' ? '' : 'hidden'
        }`}
      >
        <h2 className="text-lg font-semibold text-gray-900">Promotion / Coupon</h2>
        <form className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-10" onSubmit={handleCreatePromotion}>
          <Input
            placeholder="promotion name"
            value={promotionName}
            onChange={(event) => setPromotionName(event.target.value)}
            required
          />
          <Input
            placeholder="description (optional)"
            value={promotionDescription}
            onChange={(event) => setPromotionDescription(event.target.value)}
          />
          <select
            value={promotionType}
            onChange={(event) => setPromotionType(event.target.value as PromotionTypeValue)}
            className={FIELD_SELECT_CLASS_NAME}
          >
            {PROMOTION_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <select
            value={promotionStatus}
            onChange={(event) => setPromotionStatus(event.target.value as PromotionStatusValue)}
            className={FIELD_SELECT_CLASS_NAME}
          >
            <option value="DRAFT">DRAFT</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="SUSPENDED">SUSPENDED</option>
            <option value="ARCHIVED">ARCHIVED</option>
          </select>
          <select
            value={promotionCombinability}
            onChange={(event) =>
              setPromotionCombinability(event.target.value as PromotionCombinabilityValue)
            }
            className={FIELD_SELECT_CLASS_NAME}
          >
            <option value="STACKABLE">STACKABLE</option>
            <option value="EXCLUSIVE">EXCLUSIVE</option>
          </select>
          <Input
            placeholder="discount_value"
            value={promotionDiscountValue}
            onChange={(event) => setPromotionDiscountValue(event.target.value)}
          />
          <Input
            placeholder="max_discount_amount (optional)"
            value={promotionMaxDiscountAmount}
            onChange={(event) => setPromotionMaxDiscountAmount(event.target.value)}
          />
          <Input
            placeholder="priority"
            value={promotionPriority}
            onChange={(event) => setPromotionPriority(event.target.value)}
          />
          <select
            value={promotionCampaignId}
            onChange={(event) => setPromotionCampaignId(event.target.value)}
            className={FIELD_SELECT_CLASS_NAME}
          >
            <option value="">campaign 없음</option>
            {(campaigns || []).map((campaign) => (
              <option key={campaign.id} value={campaign.id}>
                {campaign.code} ({campaign.name})
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm">
            <input
              type="checkbox"
              checked={promotionCouponRequired}
              onChange={(event) => setPromotionCouponRequired(event.target.checked)}
            />
            coupon_required
          </label>
          <Input
            type="datetime-local"
            value={promotionStartsAtInput}
            onChange={(event) => setPromotionStartsAtInput(event.target.value)}
          />
          <Input
            type="datetime-local"
            value={promotionEndsAtInput}
            onChange={(event) => setPromotionEndsAtInput(event.target.value)}
          />
          <Input
            placeholder="channel scope (WEB, MOBILE)"
            value={promotionChannelScopeInput}
            onChange={(event) => setPromotionChannelScopeInput(event.target.value)}
          />
          <Button type="submit" loading={createPromotion.isPending} className="md:col-span-10 md:w-fit">
            promotion 생성
          </Button>
        </form>

        <div className="mt-6 rounded-md border border-gray-200 bg-gray-50 p-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-6">
            <Input
              placeholder="promotion 검색(name/id)"
              value={promotionSearchKeyword}
              onChange={(event) => setPromotionSearchKeyword(event.target.value)}
            />
            <select
              value={promotionStatusFilter}
              onChange={(event) => setPromotionStatusFilter(event.target.value as PromotionFilterStatus)}
              className={FIELD_SELECT_CLASS_NAME}
            >
              <option value="ALL">모든 상태</option>
              <option value="DRAFT">DRAFT</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="SUSPENDED">SUSPENDED</option>
              <option value="ARCHIVED">ARCHIVED</option>
            </select>
            <select
              value={promotionTypeFilter}
              onChange={(event) => setPromotionTypeFilter(event.target.value as PromotionFilterType)}
              className={FIELD_SELECT_CLASS_NAME}
            >
              <option value="ALL">모든 타입</option>
              {PROMOTION_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            <select
              value={promotionCouponRequiredFilter}
              onChange={(event) =>
                setPromotionCouponRequiredFilter(event.target.value as PromotionFilterCouponRequired)
              }
              className={FIELD_SELECT_CLASS_NAME}
            >
              <option value="ALL">coupon_required 전체</option>
              <option value="YES">required</option>
              <option value="NO">optional</option>
            </select>
            <select
              value={promotionCampaignFilter}
              onChange={(event) => setPromotionCampaignFilter(event.target.value)}
              className={FIELD_SELECT_CLASS_NAME}
            >
              <option value="ALL">모든 campaign</option>
              <option value="NONE">campaign 없음</option>
              {(campaigns || []).map((campaign) => (
                <option key={campaign.id} value={campaign.id}>
                  {campaign.code} ({campaign.name})
                </option>
              ))}
            </select>
            <select
              value={promotionSortKey}
              onChange={(event) => setPromotionSortKey(event.target.value as PromotionSortKey)}
              className={FIELD_SELECT_CLASS_NAME}
            >
              <option value="UPDATED_DESC">최근 수정순</option>
              <option value="PRIORITY_ASC">priority 낮은순</option>
              <option value="NAME_ASC">이름순</option>
            </select>
          </div>
          <p className="mt-2 text-xs text-gray-500">검색 결과 {filteredPromotions.length}건</p>
        </div>

        <div className="mt-4 space-y-2">
          {filteredPromotions.length === 0 && (
            <p className="rounded-md border border-dashed border-gray-300 px-3 py-5 text-center text-sm text-gray-500">
              조건에 맞는 promotion이 없습니다.
            </p>
          )}
          {filteredPromotions.map((promotion) => (
            <div key={promotion.id} className="rounded-md border border-gray-200 p-3">
              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="font-medium text-gray-900">{promotion.name}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                    <Badge intent={getPromotionStatusBadgeIntent(promotion.status as PromotionStatusValue)}>
                      {promotion.status}
                    </Badge>
                    <Badge intent="default">{promotion.promotion_type}</Badge>
                    <Badge intent={promotion.coupon_required ? 'warning' : 'default'}>
                      coupon_required={promotion.coupon_required ? 'YES' : 'NO'}
                    </Badge>
                    <span>priority={promotion.priority}</span>
                    <span>{promotion.id}</span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    discount={promotion.discount_value} / max={promotion.max_discount_amount ?? '-'} / campaign=
                    {promotion.campaign_id ? campaignLabelMap.get(promotion.campaign_id) ?? promotion.campaign_id : '없음'} / 기간{' '}
                    {formatDateTime(promotion.starts_at)} ~ {formatDateTime(promotion.ends_at)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" intent="neutral" onClick={() => handleStartPromotionEdit(promotion)}>
                    Edit
                  </Button>
                  <Button size="sm" intent="neutral" onClick={() => handleOpenPromotionRules(promotion.id)}>
                    Rules
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {editingPromotionId && (
          <form className="mt-6 rounded-md border border-indigo-200 bg-indigo-50 p-4" onSubmit={handleUpdatePromotion}>
            <p className="text-sm font-semibold text-indigo-900">Promotion 수정</p>
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-5">
              <Input
                placeholder="name"
                value={editingPromotionName}
                onChange={(event) => setEditingPromotionName(event.target.value)}
                required
              />
              <Input
                placeholder="description"
                value={editingPromotionDescription}
                onChange={(event) => setEditingPromotionDescription(event.target.value)}
              />
              <select
                value={editingPromotionType}
                onChange={(event) => setEditingPromotionType(event.target.value as PromotionTypeValue)}
                className={FIELD_SELECT_CLASS_NAME}
              >
                {PROMOTION_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              <select
                value={editingPromotionStatus}
                onChange={(event) => setEditingPromotionStatus(event.target.value as PromotionStatusValue)}
                className={FIELD_SELECT_CLASS_NAME}
              >
                <option value="DRAFT">DRAFT</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="SUSPENDED">SUSPENDED</option>
                <option value="ARCHIVED">ARCHIVED</option>
              </select>
              <select
                value={editingPromotionCombinability}
                onChange={(event) =>
                  setEditingPromotionCombinability(event.target.value as PromotionCombinabilityValue)
                }
                className={FIELD_SELECT_CLASS_NAME}
              >
                <option value="STACKABLE">STACKABLE</option>
                <option value="EXCLUSIVE">EXCLUSIVE</option>
              </select>
              <Input
                placeholder="discount_value"
                value={editingPromotionDiscountValue}
                onChange={(event) => setEditingPromotionDiscountValue(event.target.value)}
              />
              <Input
                placeholder="max_discount_amount (optional)"
                value={editingPromotionMaxDiscountAmount}
                onChange={(event) => setEditingPromotionMaxDiscountAmount(event.target.value)}
              />
              <Input
                placeholder="priority"
                value={editingPromotionPriority}
                onChange={(event) => setEditingPromotionPriority(event.target.value)}
              />
              <select
                value={editingPromotionCampaignId}
                onChange={(event) => setEditingPromotionCampaignId(event.target.value)}
                className={FIELD_SELECT_CLASS_NAME}
              >
                <option value="">campaign 없음</option>
                {(campaigns || []).map((campaign) => (
                  <option key={campaign.id} value={campaign.id}>
                    {campaign.code} ({campaign.name})
                  </option>
                ))}
              </select>
              <label className="flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={editingPromotionCouponRequired}
                  onChange={(event) => setEditingPromotionCouponRequired(event.target.checked)}
                />
                coupon_required
              </label>
              <Input
                type="datetime-local"
                value={editingPromotionStartsAtInput}
                onChange={(event) => setEditingPromotionStartsAtInput(event.target.value)}
              />
              <Input
                type="datetime-local"
                value={editingPromotionEndsAtInput}
                onChange={(event) => setEditingPromotionEndsAtInput(event.target.value)}
              />
              <Input
                placeholder="channel scope"
                value={editingPromotionChannelScopeInput}
                onChange={(event) => setEditingPromotionChannelScopeInput(event.target.value)}
              />
            </div>
            <div className="mt-3 flex gap-2">
              <Button type="submit" loading={updatePromotion.isPending}>
                저장
              </Button>
              <Button type="button" intent="neutral" onClick={handleCancelPromotionEdit}>
                취소
              </Button>
            </div>
          </form>
        )}

        {selectedPromotionId && (
          <div className="mt-6 rounded-md border border-blue-200 bg-blue-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-blue-900">
                Promotion Rules · {selectedPromotion?.name ?? selectedPromotionId}
              </p>
              <Button type="button" size="sm" intent="neutral" onClick={() => setSelectedPromotionId(null)}>
                닫기
              </Button>
            </div>
            <form className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-4" onSubmit={handleCreatePromotionRule}>
              <select
                value={newRuleType}
                onChange={(event) => setNewRuleType(event.target.value as PromotionRuleTypeValue)}
                className={FIELD_SELECT_CLASS_NAME}
              >
                {PROMOTION_RULE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              <select
                value={newRuleStatus}
                onChange={(event) => setNewRuleStatus(event.target.value as PriceItemStatusValue)}
                className={FIELD_SELECT_CLASS_NAME}
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
              <Input
                placeholder="sort_order"
                value={newRuleSortOrder}
                onChange={(event) => setNewRuleSortOrder(event.target.value)}
              />
              <Textarea
                rows={5}
                value={newRulePayloadJson}
                onChange={(event) => setNewRulePayloadJson(event.target.value)}
                placeholder='{"min_amount":50000}'
                className="md:col-span-3"
              />
              <Button type="submit" loading={createPromotionRule.isPending}>
                Rule 추가
              </Button>
            </form>
            <div className="mt-4 space-y-2">
              {promotionRulesLoading && (
                <p className="text-sm text-gray-500">rule 목록을 불러오는 중입니다...</p>
              )}
              {!promotionRulesLoading && (promotionRules || []).length === 0 && (
                <p className="text-sm text-gray-500">등록된 rule이 없습니다.</p>
              )}
              {(promotionRules || []).map((rule) => (
                <div key={rule.id} className="rounded-md border border-blue-100 bg-white p-3">
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                        <Badge intent="default">{rule.rule_type}</Badge>
                        <Badge intent={rule.status === 'ACTIVE' ? 'success' : 'warning'}>{rule.status}</Badge>
                        <span>sort={rule.sort_order}</span>
                        <span>{rule.id}</span>
                      </div>
                      <pre className="mt-2 overflow-auto rounded bg-gray-900 p-2 text-xs text-gray-100">
                        {JSON.stringify(rule.rule_payload ?? {}, null, 2)}
                      </pre>
                    </div>
                    <Button size="sm" intent="neutral" onClick={() => handleStartRuleEdit(rule)}>
                      Edit
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {editingRuleId && (
              <form className="mt-4 rounded-md border border-gray-200 bg-white p-4" onSubmit={handleUpdateRule}>
                <p className="text-sm font-semibold text-gray-900">Rule 수정</p>
                <div className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-4">
                  <select
                    value={editingRuleType}
                    onChange={(event) => setEditingRuleType(event.target.value as PromotionRuleTypeValue)}
                    className={FIELD_SELECT_CLASS_NAME}
                  >
                    {PROMOTION_RULE_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                  <select
                    value={editingRuleStatus}
                    onChange={(event) => setEditingRuleStatus(event.target.value as PriceItemStatusValue)}
                    className={FIELD_SELECT_CLASS_NAME}
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                  <Input
                    placeholder="sort_order"
                    value={editingRuleSortOrder}
                    onChange={(event) => setEditingRuleSortOrder(event.target.value)}
                  />
                  <Textarea
                    rows={5}
                    value={editingRulePayloadJson}
                    onChange={(event) => setEditingRulePayloadJson(event.target.value)}
                    className="md:col-span-3"
                  />
                </div>
                <div className="mt-3 flex gap-2">
                  <Button type="submit" loading={updatePromotionRule.isPending}>
                    저장
                  </Button>
                  <Button type="button" intent="neutral" onClick={handleCancelRuleEdit}>
                    취소
                  </Button>
                </div>
              </form>
            )}
          </div>
        )}

        <hr className="my-8 border-gray-200" />

        <h3 className="text-base font-semibold text-gray-900">Coupon 관리</h3>
        <form className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-8" onSubmit={handleCreateCoupon}>
          <Input
            placeholder="coupon code"
            value={couponCode}
            onChange={(event) => setCouponCode(event.target.value)}
            required
          />
          <select
            value={couponPromotionId}
            onChange={(event) => setCouponPromotionId(event.target.value)}
            className={FIELD_SELECT_CLASS_NAME}
          >
            <option value="">promotion 선택</option>
            {(promotions || []).map((promotion) => (
              <option key={promotion.id} value={promotion.id}>
                {promotion.name}
              </option>
            ))}
          </select>
          <select
            value={couponStatus}
            onChange={(event) => setCouponStatus(event.target.value as CouponStatusValue)}
            className={FIELD_SELECT_CLASS_NAME}
          >
            <option value="DRAFT">DRAFT</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="PAUSED">PAUSED</option>
            <option value="ARCHIVED">ARCHIVED</option>
          </select>
          <Input
            type="datetime-local"
            value={couponStartsAtInput}
            onChange={(event) => setCouponStartsAtInput(event.target.value)}
          />
          <Input
            type="datetime-local"
            value={couponEndsAtInput}
            onChange={(event) => setCouponEndsAtInput(event.target.value)}
          />
          <Input
            placeholder="max_issuance (optional)"
            value={couponMaxIssuance}
            onChange={(event) => setCouponMaxIssuance(event.target.value)}
          />
          <Input
            placeholder="max_redemptions_per_user"
            value={couponMaxPerUser}
            onChange={(event) => setCouponMaxPerUser(event.target.value)}
          />
          <Input
            placeholder="channel scope (WEB, MOBILE)"
            value={couponChannelScopeInput}
            onChange={(event) => setCouponChannelScopeInput(event.target.value)}
          />
          <Button type="submit" loading={createCoupon.isPending} className="md:col-span-8 md:w-fit">
            coupon 생성
          </Button>
        </form>

        <div className="mt-6 rounded-md border border-gray-200 bg-gray-50 p-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <Input
              placeholder="coupon 검색(code/id)"
              value={couponSearchKeyword}
              onChange={(event) => setCouponSearchKeyword(event.target.value)}
            />
            <select
              value={couponStatusFilter}
              onChange={(event) => setCouponStatusFilter(event.target.value as CouponFilterStatus)}
              className={FIELD_SELECT_CLASS_NAME}
            >
              <option value="ALL">모든 상태</option>
              <option value="DRAFT">DRAFT</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="PAUSED">PAUSED</option>
              <option value="EXHAUSTED">EXHAUSTED</option>
              <option value="EXPIRED">EXPIRED</option>
              <option value="ARCHIVED">ARCHIVED</option>
            </select>
            <select
              value={couponPromotionFilter}
              onChange={(event) => setCouponPromotionFilter(event.target.value)}
              className={FIELD_SELECT_CLASS_NAME}
            >
              <option value="ALL">모든 promotion</option>
              <option value="NONE">promotion 없음</option>
              {(promotions || []).map((promotion) => (
                <option key={promotion.id} value={promotion.id}>
                  {promotion.name}
                </option>
              ))}
            </select>
            <select
              value={couponSortKey}
              onChange={(event) => setCouponSortKey(event.target.value as CouponSortKey)}
              className={FIELD_SELECT_CLASS_NAME}
            >
              <option value="UPDATED_DESC">최근 수정순</option>
              <option value="CODE_ASC">코드순</option>
              <option value="REDEEMED_DESC">redeemed 많은순</option>
            </select>
          </div>
          <p className="mt-2 text-xs text-gray-500">검색 결과 {filteredCoupons.length}건</p>
        </div>

        <div className="mt-4 space-y-2">
          {filteredCoupons.length === 0 && (
            <p className="rounded-md border border-dashed border-gray-300 px-3 py-5 text-center text-sm text-gray-500">
              조건에 맞는 coupon이 없습니다.
            </p>
          )}
          {filteredCoupons.map((coupon) => (
            <div key={coupon.id} className="rounded-md border border-gray-200 p-3">
              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="font-medium text-gray-900">{coupon.code}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                    <Badge intent={getCouponStatusBadgeIntent(coupon.status as CouponStatusValue)}>
                      {coupon.status}
                    </Badge>
                    <span>promotion={coupon.promotion_id ? promotionLabelMap.get(coupon.promotion_id) ?? coupon.promotion_id : '없음'}</span>
                    <span>reserved={coupon.reserved_count}</span>
                    <span>redeemed={coupon.redeemed_count}</span>
                    <span>{coupon.id}</span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    기간 {formatDateTime(coupon.starts_at)} ~ {formatDateTime(coupon.ends_at)} / max_issuance=
                    {coupon.max_issuance ?? '-'} / per_user={coupon.max_redemptions_per_user}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" intent="neutral" onClick={() => handleStartCouponEdit(coupon)}>
                    Edit
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {editingCouponId && (
          <form className="mt-6 rounded-md border border-indigo-200 bg-indigo-50 p-4" onSubmit={handleUpdateCoupon}>
            <p className="text-sm font-semibold text-indigo-900">Coupon 수정</p>
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-5">
              <Input
                placeholder="coupon code"
                value={editingCouponCode}
                onChange={(event) => setEditingCouponCode(event.target.value)}
                required
              />
              <select
                value={editingCouponStatus}
                onChange={(event) => setEditingCouponStatus(event.target.value as CouponStatusValue)}
                className={FIELD_SELECT_CLASS_NAME}
              >
                <option value="DRAFT">DRAFT</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="PAUSED">PAUSED</option>
                <option value="EXHAUSTED">EXHAUSTED</option>
                <option value="EXPIRED">EXPIRED</option>
                <option value="ARCHIVED">ARCHIVED</option>
              </select>
              <select
                value={editingCouponPromotionId}
                onChange={(event) => setEditingCouponPromotionId(event.target.value)}
                className={FIELD_SELECT_CLASS_NAME}
              >
                <option value="">promotion 없음</option>
                {(promotions || []).map((promotion) => (
                  <option key={promotion.id} value={promotion.id}>
                    {promotion.name}
                  </option>
                ))}
              </select>
              <Input
                type="datetime-local"
                value={editingCouponStartsAtInput}
                onChange={(event) => setEditingCouponStartsAtInput(event.target.value)}
              />
              <Input
                type="datetime-local"
                value={editingCouponEndsAtInput}
                onChange={(event) => setEditingCouponEndsAtInput(event.target.value)}
              />
              <Input
                placeholder="max_issuance (optional)"
                value={editingCouponMaxIssuance}
                onChange={(event) => setEditingCouponMaxIssuance(event.target.value)}
              />
              <Input
                placeholder="max_redemptions_per_user"
                value={editingCouponMaxPerUser}
                onChange={(event) => setEditingCouponMaxPerUser(event.target.value)}
              />
              <Input
                placeholder="channel scope"
                value={editingCouponChannelScopeInput}
                onChange={(event) => setEditingCouponChannelScopeInput(event.target.value)}
              />
            </div>
            <div className="mt-3 flex gap-2">
              <Button type="submit" loading={updateCoupon.isPending}>
                저장
              </Button>
              <Button type="button" intent="neutral" onClick={handleCancelCouponEdit}>
                취소
              </Button>
            </div>
          </form>
        )}
      </section>

      <section
        className={`rounded-lg border border-gray-200 bg-white p-6 ${
          activeTab === 'simulator' ? '' : 'hidden'
        }`}
      >
        <h2 className="text-lg font-semibold text-gray-900">Pricing Quote / Debug</h2>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
          <Input
            placeholder="campaign_id (optional)"
            value={quoteCampaignId}
            onChange={(event) => setQuoteCampaignId(event.target.value)}
          />
          <Input
            placeholder="channel"
            value={quoteChannel}
            onChange={(event) => setQuoteChannel(event.target.value)}
          />
          <Input
            placeholder="coupon_code (optional)"
            value={quoteCouponCode}
            onChange={(event) => setQuoteCouponCode(event.target.value)}
          />
          <Input
            placeholder="user_id (optional)"
            value={quoteUserId}
            onChange={(event) => setQuoteUserId(event.target.value)}
          />
          <Input
            placeholder="shipping_amount"
            value={quoteShippingAmount}
            onChange={(event) => setQuoteShippingAmount(event.target.value)}
          />
        </div>
        <div className="mt-3">
          <Textarea
            rows={8}
            value={quoteLinesJson}
            onChange={(event) => setQuoteLinesJson(event.target.value)}
            placeholder='[{"variant_id":"...","quantity":1}]'
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button onClick={handleBuildQuote} loading={buildPriceQuote.isPending}>
            Quote 실행
          </Button>
          <Button
            intent="neutral"
            onClick={handleEvaluatePromotions}
            loading={evaluatePromotions.isPending}
          >
            Promotion Evaluate
          </Button>
          <Button
            intent="neutral"
            onClick={handlePricingDebug}
            loading={getPricingDebugTrace.isPending}
          >
            Pricing Debug
          </Button>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <pre className="overflow-auto rounded-md bg-gray-900 p-3 text-xs text-gray-100">
            {JSON.stringify(quoteResult, null, 2)}
          </pre>
          <pre className="overflow-auto rounded-md bg-gray-900 p-3 text-xs text-gray-100">
            {JSON.stringify(promotionEvaluationResult, null, 2)}
          </pre>
          <pre className="overflow-auto rounded-md bg-gray-900 p-3 text-xs text-gray-100">
            {JSON.stringify(pricingDebugResult, null, 2)}
          </pre>
        </div>
      </section>

      <section
        className={`rounded-lg border border-gray-200 bg-white p-6 ${
          activeTab === 'coupon-ops' ? '' : 'hidden'
        }`}
      >
        <h2 className="text-lg font-semibold text-gray-900">Coupon Reserve / Release / Redeem</h2>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <Input
            placeholder="validate code"
            value={couponValidateCode}
            onChange={(event) => setCouponValidateCode(event.target.value)}
          />
          <Input
            placeholder="validate user_id"
            value={couponValidateUserId}
            onChange={(event) => setCouponValidateUserId(event.target.value)}
          />
          <Button intent="neutral" onClick={handleValidateCoupon} loading={validateCoupon.isPending}>
            Validate Coupon
          </Button>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <select
            value={reserveCouponId}
            onChange={(event) => setReserveCouponId(event.target.value)}
            className={FIELD_SELECT_CLASS_NAME}
          >
            <option value="">reserve coupon 선택</option>
            {(coupons || []).map((coupon) => (
              <option key={coupon.id} value={coupon.id}>
                {coupon.code} ({coupon.status})
              </option>
            ))}
          </select>
          <Input
            placeholder="reserve user_id"
            value={reserveCouponUserId}
            onChange={(event) => setReserveCouponUserId(event.target.value)}
          />
          <Button intent="neutral" onClick={handleReserveCoupon} loading={reserveCoupon.isPending}>
            Reserve
          </Button>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <Input
            placeholder="release redemption_id"
            value={releaseRedemptionId}
            onChange={(event) => setReleaseRedemptionId(event.target.value)}
          />
          <Button intent="neutral" onClick={handleReleaseCoupon} loading={releaseCouponRedemption.isPending}>
            Release
          </Button>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <Input
            placeholder="redeem redemption_id"
            value={redeemRedemptionId}
            onChange={(event) => setRedeemRedemptionId(event.target.value)}
          />
          <Input
            placeholder="order_id (optional)"
            value={redeemOrderId}
            onChange={(event) => setRedeemOrderId(event.target.value)}
          />
          <Button intent="neutral" onClick={handleRedeemCoupon} loading={redeemCouponRedemption.isPending}>
            Redeem
          </Button>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <pre className="overflow-auto rounded-md bg-gray-900 p-3 text-xs text-gray-100">
            {JSON.stringify(couponValidationResult, null, 2)}
          </pre>
          <pre className="overflow-auto rounded-md bg-gray-900 p-3 text-xs text-gray-100">
            {JSON.stringify(couponOpResult, null, 2)}
          </pre>
        </div>

        <div className="mt-6 rounded-md border border-gray-200 bg-gray-50 p-4">
          <p className="text-sm font-semibold text-gray-900">Coupon Redemptions</p>
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-4">
            <select
              value={redemptionCouponFilter}
              onChange={(event) => setRedemptionCouponFilter(event.target.value)}
              className={FIELD_SELECT_CLASS_NAME}
            >
              <option value="">coupon 전체</option>
              {(coupons || []).map((coupon) => (
                <option key={coupon.id} value={coupon.id}>
                  {coupon.code}
                </option>
              ))}
            </select>
            <Input
              placeholder="user_id"
              value={redemptionUserIdFilter}
              onChange={(event) => setRedemptionUserIdFilter(event.target.value)}
            />
            <select
              value={redemptionStatusFilter}
              onChange={(event) =>
                setRedemptionStatusFilter(
                  event.target.value as 'ALL' | CouponRedemptionStatusValue,
                )
              }
              className={FIELD_SELECT_CLASS_NAME}
            >
              <option value="ALL">status 전체</option>
              <option value="RESERVED">RESERVED</option>
              <option value="APPLIED">APPLIED</option>
              <option value="RELEASED">RELEASED</option>
              <option value="CANCELED">CANCELED</option>
              <option value="EXPIRED">EXPIRED</option>
            </select>
            <Input
              placeholder="quote_reference"
              value={redemptionQuoteReferenceFilter}
              onChange={(event) => setRedemptionQuoteReferenceFilter(event.target.value)}
            />
          </div>

          <div className="mt-4 space-y-2">
            {couponRedemptionsLoading && (
              <p className="text-sm text-gray-500">redemption 목록을 불러오는 중입니다...</p>
            )}
            {!couponRedemptionsLoading && sortedCouponRedemptions.length === 0 && (
              <p className="text-sm text-gray-500">조건에 맞는 redemption이 없습니다.</p>
            )}
            {sortedCouponRedemptions.map((redemption) => (
              <div key={redemption.id} className="rounded-md border border-gray-200 bg-white p-3">
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                      <Badge intent="default">{redemption.status}</Badge>
                      <span>coupon={redemption.coupon_id}</span>
                      <span>user={redemption.user_id}</span>
                      <span>{redemption.id}</span>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      reserved={formatDateTime(redemption.reserved_at)} / applied=
                      {formatDateTime(redemption.applied_at)} / released=
                      {formatDateTime(redemption.released_at)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      intent="neutral"
                      onClick={() => setReleaseRedemptionId(redemption.id)}
                    >
                      Release ID 채우기
                    </Button>
                    <Button
                      size="sm"
                      intent="neutral"
                      onClick={() => setRedeemRedemptionId(redemption.id)}
                    >
                      Redeem ID 채우기
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        className={`rounded-lg border border-gray-200 bg-white p-6 ${
          activeTab === 'simulator' ? '' : 'hidden'
        }`}
      >
        <h2 className="text-lg font-semibold text-gray-900">Order Snapshot Contract</h2>
        <pre className="mt-4 overflow-auto rounded-md bg-gray-900 p-3 text-xs text-gray-100">
          {JSON.stringify(orderSnapshotContract, null, 2)}
        </pre>
      </section>
    </div>
  );
}
