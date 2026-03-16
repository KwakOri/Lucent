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
  useCreateV2Promotion,
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
  useV2AdminProducts,
  useV2AdminProjects,
  useV2AdminVariants,
  useV2BundleDefinitions,
  useV2Campaigns,
  useV2CampaignTargets,
  useV2Coupons,
  useV2OrderSnapshotContract,
  useV2PriceLists,
  useV2PricingDebugTrace,
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

const CAMPAIGN_TYPES: CampaignTypeValue[] = ['EVENT', 'POPUP', 'SALE', 'DROP', 'ALWAYS_ON'];
const CAMPAIGN_TARGET_TYPES: CampaignTargetTypeValue[] = [
  'PROJECT',
  'PRODUCT',
  'VARIANT',
  'BUNDLE_DEFINITION',
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
  const [priceListScope, setPriceListScope] = useState<'BASE' | 'OVERRIDE'>('BASE');
  const [priceListCampaignId, setPriceListCampaignId] = useState('');
  const [priceListCurrency, setPriceListCurrency] = useState('KRW');
  const [priceListPriority, setPriceListPriority] = useState('0');

  const [promotionName, setPromotionName] = useState('');
  const [promotionType, setPromotionType] = useState<
    'ITEM_PERCENT' | 'ITEM_FIXED' | 'ORDER_PERCENT' | 'ORDER_FIXED' | 'SHIPPING_PERCENT' | 'SHIPPING_FIXED'
  >('ORDER_PERCENT');
  const [promotionDiscountValue, setPromotionDiscountValue] = useState('10');
  const [promotionCampaignId, setPromotionCampaignId] = useState('');
  const [promotionCouponRequired, setPromotionCouponRequired] = useState(false);

  const [couponCode, setCouponCode] = useState('');
  const [couponPromotionId, setCouponPromotionId] = useState('');

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
  const { data: promotions, isLoading: promotionsLoading, error: promotionsError } = useV2Promotions();
  const { data: coupons, isLoading: couponsLoading, error: couponsError } = useV2Coupons();
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
  const publishPriceList = usePublishV2PriceList();
  const rollbackPriceList = useRollbackV2PriceList();

  const createPromotion = useCreateV2Promotion();
  const createCoupon = useCreateV2Coupon();

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
      const priority = Number.parseInt(priceListPriority, 10);
      if (!Number.isInteger(priority) || priority < 0) {
        throw new Error('price list priority는 0 이상의 정수여야 합니다.');
      }
      await createPriceList.mutateAsync({
        name: priceListName.trim(),
        scope_type: priceListScope,
        campaign_id: toNullable(priceListCampaignId),
        currency_code: priceListCurrency.trim().toUpperCase(),
        priority,
      });
      setPriceListName('');
      setPriceListCampaignId('');
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

  const handleCreatePromotion = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await runWithNotice(async () => {
      const discountValue = Number.parseFloat(promotionDiscountValue);
      if (!Number.isFinite(discountValue) || discountValue < 0) {
        throw new Error('discount_value는 0 이상의 숫자여야 합니다.');
      }
      await createPromotion.mutateAsync({
        name: promotionName.trim(),
        campaign_id: toNullable(promotionCampaignId),
        promotion_type: promotionType,
        discount_value: discountValue,
        coupon_required: promotionCouponRequired,
      });
      setPromotionName('');
      setMessage('promotion을 생성했습니다.');
    });
  };

  const handleCreateCoupon = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await runWithNotice(async () => {
      const promotionId = toNullable(couponPromotionId);
      if (!promotionId) {
        throw new Error('coupon 생성 시 promotion_id는 필수입니다.');
      }
      await createCoupon.mutateAsync({
        code: couponCode.trim(),
        promotion_id: promotionId,
      });
      setCouponCode('');
      setMessage('coupon을 생성했습니다.');
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
        <form className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-5" onSubmit={handleCreatePriceList}>
          <Input
            placeholder="name"
            value={priceListName}
            onChange={(event) => setPriceListName(event.target.value)}
            required
          />
          <select
            value={priceListScope}
            onChange={(event) => setPriceListScope(event.target.value as typeof priceListScope)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="BASE">BASE</option>
            <option value="OVERRIDE">OVERRIDE</option>
          </select>
          <Input
            placeholder="campaign_id (optional)"
            value={priceListCampaignId}
            onChange={(event) => setPriceListCampaignId(event.target.value)}
          />
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
          <Button type="submit" loading={createPriceList.isPending} className="md:col-span-5 md:w-fit">
            price list 생성
          </Button>
        </form>

        <div className="mt-4 space-y-2">
          {(priceLists || []).map((priceList) => (
            <div
              key={priceList.id}
              className="flex flex-col gap-2 rounded-md border border-gray-200 p-3 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <p className="font-medium text-gray-900">
                  {priceList.name} ({priceList.scope_type})
                </p>
                <p className="text-xs text-gray-500">
                  {priceList.status} / priority={priceList.priority} / {priceList.id}
                </p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" intent="neutral" onClick={() => handlePriceListAction('publish', priceList.id)}>
                  Publish
                </Button>
                <Button size="sm" intent="neutral" onClick={() => handlePriceListAction('rollback', priceList.id)}>
                  Rollback
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section
        className={`rounded-lg border border-gray-200 bg-white p-6 ${
          activeTab === 'promotion' ? '' : 'hidden'
        }`}
      >
        <h2 className="text-lg font-semibold text-gray-900">Promotion / Coupon</h2>
        <form className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-5" onSubmit={handleCreatePromotion}>
          <Input
            placeholder="promotion name"
            value={promotionName}
            onChange={(event) => setPromotionName(event.target.value)}
            required
          />
          <select
            value={promotionType}
            onChange={(event) => setPromotionType(event.target.value as typeof promotionType)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="ORDER_PERCENT">ORDER_PERCENT</option>
            <option value="ORDER_FIXED">ORDER_FIXED</option>
            <option value="ITEM_PERCENT">ITEM_PERCENT</option>
            <option value="ITEM_FIXED">ITEM_FIXED</option>
            <option value="SHIPPING_PERCENT">SHIPPING_PERCENT</option>
            <option value="SHIPPING_FIXED">SHIPPING_FIXED</option>
          </select>
          <Input
            placeholder="discount_value"
            value={promotionDiscountValue}
            onChange={(event) => setPromotionDiscountValue(event.target.value)}
          />
          <Input
            placeholder="campaign_id (optional)"
            value={promotionCampaignId}
            onChange={(event) => setPromotionCampaignId(event.target.value)}
          />
          <label className="flex items-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm">
            <input
              type="checkbox"
              checked={promotionCouponRequired}
              onChange={(event) => setPromotionCouponRequired(event.target.checked)}
            />
            coupon_required
          </label>
          <Button type="submit" loading={createPromotion.isPending} className="md:col-span-5 md:w-fit">
            promotion 생성
          </Button>
        </form>

        <form className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-3" onSubmit={handleCreateCoupon}>
          <Input
            placeholder="coupon code"
            value={couponCode}
            onChange={(event) => setCouponCode(event.target.value)}
            required
          />
          <Input
            placeholder="promotion_id"
            value={couponPromotionId}
            onChange={(event) => setCouponPromotionId(event.target.value)}
            required
          />
          <Button type="submit" loading={createCoupon.isPending}>
            coupon 생성
          </Button>
        </form>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <p className="text-sm font-medium text-gray-700">Promotions</p>
            <div className="mt-2 space-y-2">
              {(promotions || []).map((promotion) => (
                <div key={promotion.id} className="rounded border border-gray-200 p-2 text-xs">
                  <p className="font-medium text-gray-900">{promotion.name}</p>
                  <p className="text-gray-500">
                    {promotion.promotion_type} / {promotion.status} / discount={promotion.discount_value}
                  </p>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700">Coupons</p>
            <div className="mt-2 space-y-2">
              {(coupons || []).map((coupon) => (
                <div key={coupon.id} className="rounded border border-gray-200 p-2 text-xs">
                  <p className="font-medium text-gray-900">{coupon.code}</p>
                  <p className="text-gray-500">
                    {coupon.status} / reserved={coupon.reserved_count} / redeemed={coupon.redeemed_count}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
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
          <Input
            placeholder="reserve coupon_id"
            value={reserveCouponId}
            onChange={(event) => setReserveCouponId(event.target.value)}
          />
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
