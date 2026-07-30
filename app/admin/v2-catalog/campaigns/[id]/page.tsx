'use client';

import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ChevronDown,
  ChevronUp,
  Minus,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loading } from '@/components/ui/loading';
import { Content, Footer, Header, type ModalProps } from '@/components/modal';
import { useModal } from '@/components/modal';
import {
  AdminPageHeader,
  AdminStatCard,
  adminButtonClass,
  adminInputClass,
  adminLegacyBridgeClass,
  adminPrimaryButtonClass,
  adminSelectClass,
} from '@/src/components/admin/AdminDesignSystem';
import { useAdminFeedback } from '@/src/components/admin/AdminFeedback';
import { useToast } from '@/src/components/toast';
import type {
  ApplyV2CampaignProductEditorResult,
  V2CampaignTarget,
  V2PriceList,
  V2PriceListItem,
  V2Product,
  V2ProductMedia,
  V2Variant,
} from '@/lib/client/api/v2-catalog-admin.api';
import {
  useApplyV2CampaignProductEditor,
  useActivateV2Campaign,
  useCloseV2Campaign,
  useSuspendV2Campaign,
  useV2CampaignDetailContext,
} from '@/lib/client/hooks/useV2CatalogAdmin';
import {
  CAMPAIGN_STATUS_LABELS,
  CAMPAIGN_TYPE_LABELS,
  formatChannelScope,
  formatDateRange,
  getCampaignPeriod,
  getCampaignPeriodIntent,
  getCampaignStatusIntent,
  getErrorMessage,
} from '@/lib/client/utils/v2-campaign-admin';
function formatCurrency(amount: number): string {
  return `${amount.toLocaleString('ko-KR')}원`;
}

type DiscountInputMode = 'NONE' | 'PERCENT' | 'FIXED' | 'DIRECT';

type DiscountDraft = {
  mode: DiscountInputMode;
  value: string;
};

type VariantCampaignState = 'BASE' | 'OVERRIDE' | 'MISSING_BASE' | 'NOT_INCLUDED';

type VariantCampaignRow = {
  variant: V2Variant;
  baseItem: V2PriceListItem | null;
  campaignItem: V2PriceListItem | null;
  included: boolean;
  state: VariantCampaignState;
  effectiveAmount: number | null;
  variantIncludeTarget: V2CampaignTarget | null;
  productIncludeTarget: V2CampaignTarget | null;
  variantExcludeTarget: V2CampaignTarget | null;
  productExcludeTarget: V2CampaignTarget | null;
  projectExcludeTarget: V2CampaignTarget | null;
};

type ProductCampaignRow = {
  product: V2Product;
  variants: VariantCampaignRow[];
  includedCount: number;
  baseUsingCount: number;
  overrideCount: number;
  missingBaseCount: number;
  notIncludedCount: number;
};

const EMPTY_CAMPAIGN_TARGETS: V2CampaignTarget[] = [];
const EMPTY_PRICE_LISTS: V2PriceList[] = [];
const EMPTY_PRICE_ITEMS: V2PriceListItem[] = [];
const EMPTY_PRODUCTS: V2Product[] = [];
const EMPTY_VARIANTS_BY_PRODUCT_ID: Record<string, V2Variant[]> = {};
const EMPTY_MEDIA_BY_PRODUCT_ID: Record<string, V2ProductMedia[]> = {};

type PriceItemWithJoinedPriceList = V2PriceListItem & {
  price_list?: Pick<V2PriceList, 'priority'> | null;
};

function getJoinedPriceListPriority(item: V2PriceListItem): number {
  return ((item as PriceItemWithJoinedPriceList).price_list?.priority ?? 0);
}

function pickBestPriceItem(items: V2PriceListItem[]): V2PriceListItem | null {
  if (items.length === 0) {
    return null;
  }
  const exactActiveItems = items.filter((item) => item.status === 'ACTIVE');
  if (exactActiveItems.length === 0) {
    return null;
  }
  return [...exactActiveItems].sort((a, b) => {
    const priorityDiff = getJoinedPriceListPriority(b) - getJoinedPriceListPriority(a);
    if (priorityDiff !== 0) {
      return priorityDiff;
    }
    const updatedDiff = b.updated_at.localeCompare(a.updated_at);
    if (updatedDiff !== 0) {
      return updatedDiff;
    }
    return b.created_at.localeCompare(a.created_at);
  })[0] || null;
}

function findVariantPriceItem(params: {
  items: V2PriceListItem[];
  productId: string;
  variantId: string;
}): V2PriceListItem | null {
  const matched = params.items.filter(
    (item) =>
      item.product_id === params.productId &&
      (item.variant_id === params.variantId || item.variant_id === null),
  );
  const exact = matched.filter((item) => item.variant_id === params.variantId);
  return pickBestPriceItem(exact.length > 0 ? exact : matched);
}

function getCoverMedia(mediaList: V2ProductMedia[]): V2ProductMedia | null {
  const active = mediaList.filter((media) => media.status === 'ACTIVE');
  return (
    active.find((media) => media.is_primary) ||
    active.find((media) => media.media_role === 'PRIMARY') ||
    null
  );
}

function getProductTypeBadge(product: V2Product): {
  label: string;
  intent: 'default' | 'success' | 'warning' | 'error' | 'info';
} {
  if (product.product_kind === 'BUNDLE') {
    return {
      label: '번들',
      intent: 'warning',
    };
  }

  if (product.fulfillment_type === 'DIGITAL') {
    return {
      label: '디지털',
      intent: 'success',
    };
  }

  if (product.fulfillment_type === 'PHYSICAL') {
    return {
      label: '실물',
      intent: 'info',
    };
  }

  return {
    label: '실물',
    intent: 'info',
  };
}

function findCampaignTarget(params: {
  targets: V2CampaignTarget[];
  targetType: V2CampaignTarget['target_type'];
  targetId: string;
  isExcluded: boolean;
}): V2CampaignTarget | null {
  return (
    params.targets.find(
      (target) =>
        target.target_type === params.targetType &&
        target.target_id === params.targetId &&
        target.is_excluded === params.isExcluded,
    ) || null
  );
}

function getTargetBuckets(targets: V2CampaignTarget[]) {
  const include = {
    projectIds: new Set<string>(),
    productIds: new Set<string>(),
    variantIds: new Set<string>(),
  };
  const exclude = {
    projectIds: new Set<string>(),
    productIds: new Set<string>(),
    variantIds: new Set<string>(),
  };

  targets.forEach((target) => {
    const bucket = target.is_excluded ? exclude : include;
    if (target.target_type === 'PROJECT') {
      bucket.projectIds.add(target.target_id);
    }
    if (target.target_type === 'PRODUCT') {
      bucket.productIds.add(target.target_id);
    }
    if (target.target_type === 'VARIANT') {
      bucket.variantIds.add(target.target_id);
    }
  });

  return { include, exclude };
}

function isVariantIncludedInCampaign(params: {
  isAlwaysOnCampaign: boolean;
  product: V2Product;
  variant: V2Variant;
  targets: V2CampaignTarget[];
}) {
  const buckets = getTargetBuckets(params.targets);
  const excluded =
    buckets.exclude.projectIds.has(params.product.project_id) ||
    buckets.exclude.productIds.has(params.product.id) ||
    buckets.exclude.variantIds.has(params.variant.id);
  if (excluded) {
    return false;
  }

  if (params.isAlwaysOnCampaign) {
    return true;
  }

  const included =
    buckets.include.productIds.has(params.product.id) ||
    buckets.include.variantIds.has(params.variant.id);
  return included;
}

function parseDiscountValue(mode: DiscountInputMode, rawValue: string): number {
  if (mode === 'PERCENT') {
    const value = Number.parseFloat(rawValue);
    if (!Number.isFinite(value) || value < 0 || value > 100) {
      throw new Error('할인율은 0~100 사이 숫자로 입력해 주세요.');
    }
    return value;
  }
  const value = Number.parseInt(rawValue, 10);
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(mode === 'DIRECT' ? '판매가는 0 이상의 정수여야 합니다.' : '할인 금액은 0 이상의 정수여야 합니다.');
  }
  return value;
}

function computeEffectiveAmount(baseAmount: number, draft: DiscountDraft): number {
  if (draft.mode === 'NONE') {
    return baseAmount;
  }
  const value = parseDiscountValue(draft.mode, draft.value);
  if (draft.mode === 'PERCENT') {
    return Math.max(0, Math.round(baseAmount * ((100 - value) / 100)));
  }
  if (draft.mode === 'FIXED') {
    return Math.max(0, baseAmount - value);
  }
  return value;
}

function getDraftPreviewAmount(baseAmount: number | null, draft: DiscountDraft): number | null {
  if (baseAmount === null) {
    return null;
  }
  try {
    return computeEffectiveAmount(baseAmount, draft);
  } catch {
    return null;
  }
}

function getDiscountMetadata(baseAmount: number, draft: DiscountDraft) {
  if (draft.mode === 'NONE') {
    return undefined;
  }
  return {
    pricing_mode:
      draft.mode === 'PERCENT'
        ? 'PERCENT_DISCOUNT'
        : draft.mode === 'FIXED'
          ? 'FIXED_DISCOUNT'
          : 'DIRECT_PRICE',
    discount_value: parseDiscountValue(draft.mode, draft.value),
    base_amount: baseAmount,
  };
}

type EditorTab = 'INCLUDED' | 'NOT_INCLUDED';

type PendingPriceChange = {
  productId: string;
  productTitle: string;
  variantId: string;
  variantTitle: string;
  previousAmount: number | null;
  nextAmount: number | null;
  compareAtAmount: number | null;
  useBasePrice: boolean;
  metadata?: Record<string, unknown>;
};

type CampaignProductEditorModalProps =
  ModalProps<ApplyV2CampaignProductEditorResult> & {
    campaignId: string;
    isAlwaysOnCampaign: boolean;
    includedProductRows: ProductCampaignRow[];
    notIncludedProductRows: ProductCampaignRow[];
    mediaByProductId: Record<string, V2ProductMedia[]>;
  };

function CampaignProductEditorModal({
  campaignId,
  isAlwaysOnCampaign,
  includedProductRows,
  notIncludedProductRows,
  mediaByProductId,
  onSubmit,
  onAbort,
}: CampaignProductEditorModalProps) {
  const applyProductEditor = useApplyV2CampaignProductEditor();
  const [activeTab, setActiveTab] = useState<EditorTab>('INCLUDED');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedProductIds, setExpandedProductIds] = useState<Record<string, boolean>>({});
  const [editingVariantId, setEditingVariantId] = useState<string | null>(null);
  const [discountDrafts, setDiscountDrafts] = useState<Record<string, DiscountDraft>>({});
  const [pendingAddProductIds, setPendingAddProductIds] = useState<Record<string, true>>({});
  const [pendingRemoveProductIds, setPendingRemoveProductIds] = useState<Record<string, true>>({});
  const [pendingPriceChanges, setPendingPriceChanges] = useState<Record<string, PendingPriceChange>>({});
  const [modalError, setModalError] = useState<string | null>(null);

  const allRowsByProductId = useMemo(() => {
    const map = new Map<string, ProductCampaignRow>();
    [...includedProductRows, ...notIncludedProductRows].forEach((row) => {
      map.set(row.product.id, row);
    });
    return map;
  }, [includedProductRows, notIncludedProductRows]);

  const pendingAddRows = useMemo(
    () => Object.keys(pendingAddProductIds)
      .map((productId) => allRowsByProductId.get(productId))
      .filter((row): row is ProductCampaignRow => Boolean(row)),
    [allRowsByProductId, pendingAddProductIds],
  );
  const pendingRemoveRows = useMemo(
    () => Object.keys(pendingRemoveProductIds)
      .map((productId) => allRowsByProductId.get(productId))
      .filter((row): row is ProductCampaignRow => Boolean(row)),
    [allRowsByProductId, pendingRemoveProductIds],
  );
  const pendingPriceChangeRows = useMemo(
    () => Object.values(pendingPriceChanges),
    [pendingPriceChanges],
  );
  const pendingChangeCount =
    pendingAddRows.length + pendingRemoveRows.length + pendingPriceChangeRows.length;

  const normalizedSearchTerm = searchTerm.trim().toLocaleLowerCase('ko-KR');
  const rowsForActiveTab = activeTab === 'INCLUDED' ? includedProductRows : notIncludedProductRows;
  const filteredRows = useMemo(() => {
    if (!normalizedSearchTerm) {
      return rowsForActiveTab;
    }
    return rowsForActiveTab.filter((row) => {
      const variantText = row.variants
        .map((variantRow) => variantRow.variant.title || variantRow.variant.sku)
        .join(' ');
      return `${row.product.title} ${row.product.slug} ${variantText}`
        .toLocaleLowerCase('ko-KR')
        .includes(normalizedSearchTerm);
    });
  }, [normalizedSearchTerm, rowsForActiveTab]);

  const getDraftForVariant = (variantId: string): DiscountDraft =>
    discountDrafts[variantId] || { mode: 'NONE', value: '' };

  const updateDiscountDraft = (
    variantId: string,
    patch: Partial<DiscountDraft>,
  ) => {
    setDiscountDrafts((previous) => {
      const current = previous[variantId] || { mode: 'NONE', value: '' };
      const next = { ...current, ...patch };
      if (next.mode === 'NONE') {
        next.value = '';
      }
      return {
        ...previous,
        [variantId]: next,
      };
    });
  };

  const toggleProductExpanded = (productId: string) => {
    setExpandedProductIds((previous) => ({
      ...previous,
      [productId]: !previous[productId],
    }));
  };

  const markProductForAdd = (row: ProductCampaignRow) => {
    setModalError(null);
    setPendingAddProductIds((previous) => ({ ...previous, [row.product.id]: true }));
    setPendingRemoveProductIds((previous) => {
      const next = { ...previous };
      delete next[row.product.id];
      return next;
    });
  };

  const markProductForRemove = (row: ProductCampaignRow) => {
    setModalError(null);
    setPendingRemoveProductIds((previous) => ({ ...previous, [row.product.id]: true }));
    setPendingAddProductIds((previous) => {
      const next = { ...previous };
      delete next[row.product.id];
      return next;
    });
    setPendingPriceChanges((previous) => {
      const next = { ...previous };
      row.variants.forEach((variantRow) => {
        delete next[variantRow.variant.id];
      });
      return next;
    });
    if (row.variants.some((variantRow) => variantRow.variant.id === editingVariantId)) {
      setEditingVariantId(null);
    }
  };

  const undoProductAdd = (productId: string) => {
    setPendingAddProductIds((previous) => {
      const next = { ...previous };
      delete next[productId];
      return next;
    });
  };

  const undoProductRemove = (productId: string) => {
    setPendingRemoveProductIds((previous) => {
      const next = { ...previous };
      delete next[productId];
      return next;
    });
  };

  const undoPriceChange = (variantId: string) => {
    setPendingPriceChanges((previous) => {
      const next = { ...previous };
      delete next[variantId];
      return next;
    });
  };

  const startPriceEdit = (variantRow: VariantCampaignRow) => {
    setModalError(null);
    setEditingVariantId(variantRow.variant.id);
    setDiscountDrafts((previous) => ({
      ...previous,
      [variantRow.variant.id]: previous[variantRow.variant.id] || {
        mode: 'NONE',
        value: '',
      },
    }));
  };

  const completePriceEdit = (product: V2Product, variantRow: VariantCampaignRow) => {
    setModalError(null);
    if (!variantRow.baseItem) {
      setModalError('기본가가 없는 옵션은 캠페인 가격을 변경할 수 없습니다.');
      return;
    }
    const draft = getDraftForVariant(variantRow.variant.id);
    const baseItem = variantRow.baseItem;

    if (draft.mode === 'NONE') {
      if (variantRow.campaignItem) {
        setPendingPriceChanges((previous) => ({
          ...previous,
          [variantRow.variant.id]: {
            productId: product.id,
            productTitle: product.title,
            variantId: variantRow.variant.id,
            variantTitle: variantRow.variant.title || '기본 옵션',
            previousAmount: variantRow.effectiveAmount,
            nextAmount: variantRow.baseItem?.unit_amount ?? null,
            compareAtAmount: variantRow.baseItem?.unit_amount ?? null,
            useBasePrice: true,
          },
        }));
      } else {
        undoPriceChange(variantRow.variant.id);
      }
      setEditingVariantId(null);
      return;
    }

    try {
      const nextAmount = computeEffectiveAmount(baseItem.unit_amount, draft);
      setPendingPriceChanges((previous) => ({
        ...previous,
        [variantRow.variant.id]: {
          productId: product.id,
          productTitle: product.title,
          variantId: variantRow.variant.id,
          variantTitle: variantRow.variant.title || '기본 옵션',
          previousAmount: variantRow.effectiveAmount,
          nextAmount,
          compareAtAmount:
            baseItem.unit_amount >= nextAmount
              ? baseItem.unit_amount
              : null,
          useBasePrice: false,
          metadata: getDiscountMetadata(baseItem.unit_amount, draft),
        },
      }));
      setEditingVariantId(null);
    } catch (draftError) {
      setModalError(getErrorMessage(draftError));
    }
  };

  const handleSave = async () => {
    setModalError(null);
    if (pendingChangeCount === 0) {
      setModalError('저장할 변경 예정 내역이 없습니다.');
      return;
    }

    try {
      const response = await applyProductEditor.mutateAsync({
        campaignId,
        data: {
          add_product_ids: Object.keys(pendingAddProductIds),
          remove_product_ids: Object.keys(pendingRemoveProductIds),
          price_changes: Object.values(pendingPriceChanges).map((change) => ({
            product_id: change.productId,
            variant_id: change.variantId,
            use_base_price: change.useBasePrice,
            unit_amount: change.useBasePrice ? null : change.nextAmount,
            compare_at_amount: change.compareAtAmount,
            metadata: change.metadata,
          })),
        },
      });
      onSubmit(response.data);
    } catch (saveError) {
      setModalError(getErrorMessage(saveError));
    }
  };

  const renderProductImage = (row: ProductCampaignRow) => {
    const coverMedia = getCoverMedia(mediaByProductId[row.product.id] || []);
    return (
      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-[12px] border border-[#e7e3d3] bg-[#faf9f3]">
        {coverMedia?.public_url ? (
          // eslint-disable-next-line @next/next/no-img-element -- project policy uses native img instead of next/image.
          <img
            src={coverMedia.public_url}
            alt={coverMedia.alt_text || `${row.product.title} 대표 이미지`}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[10px] font-bold text-[#1a1a2e]/35">
            없음
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <Header title="캠페인 상품 구성 편집" onClose={() => onAbort('cancel')} />
      <Content className="bg-[#faf9f3]">
        <div className="grid min-h-[min(68vh,760px)] gap-4 xl:grid-cols-[0.88fr_1.35fr]">
          <section className="rounded-[18px] border border-[#e7e3d3] bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-black text-[#1a1a2e]">변경 예정 내역</h3>
                <p className="mt-1 text-xs font-medium text-[#1a1a2e]/45">
                  저장 시 적용될 작업만 모아 보여줍니다.
                </p>
              </div>
              <Badge intent={pendingChangeCount > 0 ? 'warning' : 'default'} size="sm">
                {pendingChangeCount}건
              </Badge>
            </div>

            <div className="mt-4 space-y-3">
              {pendingChangeCount === 0 ? (
                <div className="rounded-[16px] border border-dashed border-[#e7e3d3] bg-[#faf9f3] px-4 py-10 text-center text-sm font-medium text-[#1a1a2e]/45">
                  아직 변경 예정 내역이 없습니다.
                </div>
              ) : null}

              {pendingAddRows.length > 0 ? (
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-[#297c3b]">추가 예정</p>
                  <div className="mt-2 space-y-2">
                    {pendingAddRows.map((row) => (
                      <div key={row.product.id} className="flex items-center justify-between gap-3 rounded-[14px] bg-[#eafaea] px-3 py-2">
                        <span className="min-w-0 truncate text-sm font-bold text-[#1a1a2e]">{row.product.title}</span>
                        <Button size="sm" intent="neutral" onClick={() => undoProductAdd(row.product.id)}>
                          되돌리기
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {pendingRemoveRows.length > 0 ? (
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-[#ca2a30]">제거 예정</p>
                  <div className="mt-2 space-y-2">
                    {pendingRemoveRows.map((row) => (
                      <div key={row.product.id} className="flex items-center justify-between gap-3 rounded-[14px] bg-[#fff0f0] px-3 py-2">
                        <span className="min-w-0 truncate text-sm font-bold text-[#1a1a2e]">{row.product.title}</span>
                        <Button size="sm" intent="neutral" onClick={() => undoProductRemove(row.product.id)}>
                          되돌리기
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {pendingPriceChangeRows.length > 0 ? (
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-[#a35200]">가격 변경 예정</p>
                  <div className="mt-2 space-y-2">
                    {pendingPriceChangeRows.map((change) => (
                      <div key={change.variantId} className="rounded-[14px] bg-[#fff4d5] px-3 py-2">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-[#1a1a2e]">{change.productTitle}</p>
                            <p className="mt-1 truncate text-xs font-medium text-[#1a1a2e]/55">
                              {change.variantTitle} · {change.previousAmount === null ? '없음' : formatCurrency(change.previousAmount)}
                              {' → '}
                              {change.nextAmount === null ? '기본가' : formatCurrency(change.nextAmount)}
                            </p>
                          </div>
                          <Button size="sm" intent="neutral" onClick={() => undoPriceChange(change.variantId)}>
                            되돌리기
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </section>

          <section className="min-h-0 rounded-[18px] border border-[#e7e3d3] bg-white p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="inline-flex rounded-[14px] bg-[#f5f3e8] p-1">
                {([
                  ['INCLUDED', '포함 상품', includedProductRows.length],
                  ['NOT_INCLUDED', '미포함 상품', notIncludedProductRows.length],
                ] as const).map(([tab, label, count]) => (
                  <button
                    key={tab}
                    type="button"
                    className={`rounded-[11px] px-3 py-2 text-sm font-black transition ${
                      activeTab === tab
                        ? 'bg-white text-[#1a1a2e] shadow-sm'
                        : 'text-[#1a1a2e]/45 hover:text-[#a35200]'
                    }`}
                    onClick={() => setActiveTab(tab)}
                  >
                    {label} {count.toLocaleString('ko-KR')}
                  </button>
                ))}
              </div>

              <label className="relative block w-full lg:w-80">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#1a1a2e]/35" />
                <Input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="상품명 또는 옵션 검색"
                  className={`${adminInputClass} pl-9`}
                />
              </label>
            </div>

            <div className="mt-4 max-h-[min(56vh,640px)] space-y-2 overflow-y-auto pr-1">
              {filteredRows.length === 0 ? (
                <div className="rounded-[16px] border border-dashed border-[#e7e3d3] bg-[#faf9f3] px-4 py-10 text-center text-sm font-medium text-[#1a1a2e]/45">
                  조건에 맞는 상품이 없습니다.
                </div>
              ) : (
                filteredRows.map((row) => {
                  const expanded = Boolean(expandedProductIds[row.product.id]);
                  const isPendingAdd = Boolean(pendingAddProductIds[row.product.id]);
                  const isPendingRemove = Boolean(pendingRemoveProductIds[row.product.id]);
                  const productTypeBadge = getProductTypeBadge(row.product);
                  const variants =
                    activeTab === 'INCLUDED'
                      ? row.variants.filter((variantRow) => variantRow.included)
                      : row.variants.filter((variantRow) => variantRow.state === 'NOT_INCLUDED');
                  const canAdd =
                    isAlwaysOnCampaign || variants.some((variantRow) => Boolean(variantRow.baseItem));

                  return (
                    <div
                      key={row.product.id}
                      className={`rounded-[16px] border border-[#eee7d6] bg-white shadow-sm transition ${
                        isPendingAdd || isPendingRemove ? 'opacity-70' : ''
                      }`}
                    >
                      <div className="flex flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          {renderProductImage(row)}
                          <Badge intent={productTypeBadge.intent} size="sm" className="w-14 shrink-0">
                            {productTypeBadge.label}
                          </Badge>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate text-sm font-black text-[#1a1a2e]">{row.product.title}</p>
                              {isPendingAdd ? <Badge intent="success" size="sm">추가 예정</Badge> : null}
                              {isPendingRemove ? <Badge intent="error" size="sm">제거 예정</Badge> : null}
                              {row.variants.some((variantRow) => pendingPriceChanges[variantRow.variant.id]) ? (
                                <Badge intent="warning" size="sm">가격 변경 예정</Badge>
                              ) : null}
                            </div>
                            <p className="mt-1 text-xs font-medium text-[#1a1a2e]/45">
                              옵션 {row.variants.length}개 · 포함 {row.includedCount}개 · 할인 {row.overrideCount}개
                            </p>
                          </div>
                        </div>

                        <div className="flex shrink-0 flex-wrap items-center gap-2">
                          <Button size="sm" intent="neutral" onClick={() => toggleProductExpanded(row.product.id)}>
                            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            {expanded ? '접기' : '펼치기'}
                          </Button>
                          {activeTab === 'INCLUDED' ? (
                            isPendingRemove ? (
                              <Button size="sm" intent="neutral" onClick={() => undoProductRemove(row.product.id)}>
                                <RotateCcw className="h-4 w-4" />
                                되돌리기
                              </Button>
                            ) : (
                              <Button size="sm" intent="danger" onClick={() => markProductForRemove(row)}>
                                <Minus className="h-4 w-4" />
                                제거 예정
                              </Button>
                            )
                          ) : isPendingAdd ? (
                            <Button size="sm" intent="neutral" onClick={() => undoProductAdd(row.product.id)}>
                              <RotateCcw className="h-4 w-4" />
                              되돌리기
                            </Button>
                          ) : (
                            <Button size="sm" onClick={() => markProductForAdd(row)} disabled={!canAdd}>
                              <Plus className="h-4 w-4" />
                              추가 예정
                            </Button>
                          )}
                        </div>
                      </div>

                      {expanded ? (
                        <div className="space-y-2 border-t border-[#eee7d6] bg-[#faf9f3] px-4 py-3">
                          {variants.length === 0 ? (
                            <div className="rounded-[14px] border border-dashed border-[#e7e3d3] bg-white px-4 py-5 text-center text-sm font-medium text-[#1a1a2e]/45">
                              표시할 옵션이 없습니다.
                            </div>
                          ) : (
                            variants.map((variantRow) => {
                              const draft = getDraftForVariant(variantRow.variant.id);
                              const previewAmount = getDraftPreviewAmount(
                                variantRow.baseItem?.unit_amount ?? null,
                                draft,
                              );
                              const isEditing = editingVariantId === variantRow.variant.id;
                              const pendingPriceChange = pendingPriceChanges[variantRow.variant.id];
                              const priceEditDisabled = isPendingRemove || !variantRow.baseItem;

                              return (
                                <div key={variantRow.variant.id} className="rounded-[14px] border border-[#eee7d6] bg-white p-3">
                                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                    <div className="min-w-0">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <p className="text-sm font-black text-[#1a1a2e]">
                                          {variantRow.variant.title || '기본 옵션'}
                                        </p>
                                        <Badge
                                          intent={
                                            variantRow.state === 'OVERRIDE'
                                              ? 'warning'
                                              : variantRow.state === 'MISSING_BASE'
                                                ? 'error'
                                                : variantRow.state === 'BASE'
                                                  ? 'success'
                                                  : 'default'
                                          }
                                          size="sm"
                                        >
                                          {variantRow.state === 'OVERRIDE'
                                            ? '할인/특가'
                                            : variantRow.state === 'MISSING_BASE'
                                              ? '기본가 없음'
                                              : variantRow.state === 'BASE'
                                                ? '기본가 사용'
                                                : '미포함'}
                                        </Badge>
                                        {pendingPriceChange ? <Badge intent="warning" size="sm">변경 예정</Badge> : null}
                                      </div>
                                      <p className="mt-1 text-xs font-medium text-[#1a1a2e]/50">
                                        기본가 {variantRow.baseItem ? formatCurrency(variantRow.baseItem.unit_amount) : '없음'} · 적용가{' '}
                                        {variantRow.effectiveAmount === null ? '없음' : formatCurrency(variantRow.effectiveAmount)}
                                      </p>
                                    </div>
                                    {activeTab === 'INCLUDED' ? (
                                      <div className="flex flex-wrap items-center gap-2">
                                        {pendingPriceChange ? (
                                          <Button size="sm" intent="neutral" onClick={() => undoPriceChange(variantRow.variant.id)}>
                                            되돌리기
                                          </Button>
                                        ) : null}
                                        {isEditing ? (
                                          <>
                                            <Button size="sm" onClick={() => completePriceEdit(row.product, variantRow)}>
                                              편집 완료
                                            </Button>
                                            <Button size="sm" intent="neutral" onClick={() => setEditingVariantId(null)}>
                                              취소
                                            </Button>
                                          </>
                                        ) : (
                                          <Button
                                            size="sm"
                                            intent="neutral"
                                            onClick={() => startPriceEdit(variantRow)}
                                            disabled={priceEditDisabled}
                                          >
                                            <Pencil className="h-4 w-4" />
                                            가격 편집
                                          </Button>
                                        )}
                                      </div>
                                    ) : !variantRow.baseItem && !isAlwaysOnCampaign ? (
                                      <p className="text-xs font-bold text-[#ca2a30]">기본가 등록 후 추가할 수 있습니다.</p>
                                    ) : null}
                                  </div>

                                  {isEditing ? (
                                    <div className="mt-3 grid gap-2 rounded-[14px] border border-[#e7e3d3] bg-[#fdfcf4] p-3 sm:grid-cols-[180px_1fr_auto] sm:items-center">
                                      <select
                                        className={adminSelectClass}
                                        value={draft.mode}
                                        onChange={(event) =>
                                          updateDiscountDraft(variantRow.variant.id, {
                                            mode: event.target.value as DiscountInputMode,
                                          })
                                        }
                                      >
                                        <option value="NONE">할인 없음</option>
                                        <option value="PERCENT">% 할인</option>
                                        <option value="FIXED">금액 할인</option>
                                        <option value="DIRECT">직접 가격</option>
                                      </select>
                                      <Input
                                        className={adminInputClass}
                                        placeholder={draft.mode === 'PERCENT' ? '10' : '1000'}
                                        value={draft.value}
                                        onChange={(event) =>
                                          updateDiscountDraft(variantRow.variant.id, {
                                            value: event.target.value,
                                          })
                                        }
                                        disabled={draft.mode === 'NONE'}
                                      />
                                      <span className="text-xs font-bold text-[#1a1a2e]/50">
                                        예상 {previewAmount === null ? '-' : formatCurrency(previewAmount)}
                                      </span>
                                    </div>
                                  ) : null}
                                </div>
                              );
                            })
                          )}
                        </div>
                      ) : null}
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </div>

        {modalError ? (
          <div className="mt-4 rounded-[14px] border border-[#f3d6d6] bg-[#fff0f0] px-4 py-3 text-sm font-bold text-[#ca2a30]">
            {modalError}
          </div>
        ) : null}
      </Content>
      <Footer>
        <Button className={adminButtonClass} onClick={() => onAbort('cancel')} disabled={applyProductEditor.isPending}>
          닫기
        </Button>
        <Button
          className={adminPrimaryButtonClass}
          onClick={handleSave}
          loading={applyProductEditor.isPending}
          disabled={pendingChangeCount === 0}
        >
          변경사항 저장
        </Button>
      </Footer>
    </>
  );
}

export default function V2CatalogCampaignDetailPage() {
  const router = useRouter();
  const { openModal } = useModal();
  const { confirm } = useAdminFeedback();
  const { showToast } = useToast();
  const params = useParams<{ id: string }>();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [expandedProductIds, setExpandedProductIds] = useState<Record<string, boolean>>({});

  const campaignId = useMemo(() => {
    const raw = params?.id;
    if (Array.isArray(raw)) {
      return raw[0] || '';
    }
    return raw || '';
  }, [params]);

  const {
    data: detailContext,
    isLoading: detailContextLoading,
    isFetching: detailContextFetching,
    error: detailContextError,
  } = useV2CampaignDetailContext(campaignId);
  const campaign = detailContext?.campaign || null;
  const targets = detailContext?.targets ?? EMPTY_CAMPAIGN_TARGETS;
  const priceLists = detailContext?.priceLists ?? EMPTY_PRICE_LISTS;
  const campaignPriceItems =
    detailContext?.campaignPriceItems ?? EMPTY_PRICE_ITEMS;
  const basePriceItems = detailContext?.basePriceItems ?? EMPTY_PRICE_ITEMS;
  const projects = detailContext?.projects || [];
  const products = detailContext?.products ?? EMPTY_PRODUCTS;
  const bundleDefinitions = detailContext?.bundleDefinitions || [];
  const variantsByProductId =
    detailContext?.variantsByProductId ?? EMPTY_VARIANTS_BY_PRODUCT_ID;
  const mediaByProductId =
    detailContext?.mediaByProductId ?? EMPTY_MEDIA_BY_PRODUCT_ID;

  const activateCampaign = useActivateV2Campaign();
  const suspendCampaign = useSuspendV2Campaign();
  const closeCampaign = useCloseV2Campaign();

  const isAlwaysOnCampaign = campaign?.campaign_type === 'ALWAYS_ON';
  const period = useMemo(
    () => (campaign ? getCampaignPeriod(campaign.starts_at, campaign.ends_at) : 'NO_PERIOD'),
    [campaign],
  );

  const campaignListPath = useMemo(() => {
    if (!campaign) {
      return '/admin/v2-catalog/campaigns';
    }

    const projectScopeIds = new Set<string>();
    if (campaign.project_id) {
      projectScopeIds.add(campaign.project_id);
    }
    targets
      .filter((target) => !target.is_excluded && target.target_type === 'PROJECT')
      .forEach((target) => projectScopeIds.add(target.target_id));

    if (projectScopeIds.size === 1) {
      const [projectId] = Array.from(projectScopeIds);
      return `/admin/v2-catalog/projects/${projectId}/campaigns`;
    }

    return '/admin/v2-catalog/campaigns';
  }, [campaign, targets]);

  const candidateProducts = useMemo(() => {
    if (!campaign) {
      return [];
    }

    const projectScopeIds = new Set<string>();
    if (campaign.project_id) {
      projectScopeIds.add(campaign.project_id);
    }
    targets
      .filter((target) => !target.is_excluded && target.target_type === 'PROJECT')
      .forEach((target) => projectScopeIds.add(target.target_id));

    return products.filter((product) => {
      const activeEnough = product.status === 'ACTIVE' || product.status === 'DRAFT';
      if (!activeEnough) {
        return false;
      }
      if (projectScopeIds.size === 0) {
        return true;
      }
      return projectScopeIds.has(product.project_id);
    });
  }, [campaign, products, targets]);

  const isLoading = detailContextLoading;

  const campaignPriceItemsByProductId = useMemo(() => {
    const map = new Map<string, V2PriceListItem[]>();
    (campaignPriceItems || [])
      .filter((item) => item.status === 'ACTIVE')
      .forEach((item) => {
        const list = map.get(item.product_id) || [];
        list.push(item);
        map.set(item.product_id, list);
      });
    return map;
  }, [campaignPriceItems]);

  const basePriceItemsByProductId = useMemo(() => {
    const map = new Map<string, V2PriceListItem[]>();
    (basePriceItems || [])
      .filter((item) => item.status === 'ACTIVE')
      .forEach((item) => {
        const list = map.get(item.product_id) || [];
        list.push(item);
        map.set(item.product_id, list);
      });
    return map;
  }, [basePriceItems]);

  const productCampaignRows = useMemo<ProductCampaignRow[]>(() => {
    if (!campaign) {
      return [];
    }

    return candidateProducts.map((product) => {
      const variants = variantsByProductId[product.id] || [];
      const variantRows = variants.map((variant) => {
        const variantIncludeTarget = findCampaignTarget({
          targets: targets || [],
          targetType: 'VARIANT',
          targetId: variant.id,
          isExcluded: false,
        });
        const productIncludeTarget = findCampaignTarget({
          targets: targets || [],
          targetType: 'PRODUCT',
          targetId: product.id,
          isExcluded: false,
        });
        const variantExcludeTarget = findCampaignTarget({
          targets: targets || [],
          targetType: 'VARIANT',
          targetId: variant.id,
          isExcluded: true,
        });
        const productExcludeTarget = findCampaignTarget({
          targets: targets || [],
          targetType: 'PRODUCT',
          targetId: product.id,
          isExcluded: true,
        });
        const projectExcludeTarget = findCampaignTarget({
          targets: targets || [],
          targetType: 'PROJECT',
          targetId: product.project_id,
          isExcluded: true,
        });
        const baseItem = findVariantPriceItem({
          items: basePriceItemsByProductId.get(product.id) || [],
          productId: product.id,
          variantId: variant.id,
        });
        const campaignItem = findVariantPriceItem({
          items: campaignPriceItemsByProductId.get(product.id) || [],
          productId: product.id,
          variantId: variant.id,
        });
        const included = isVariantIncludedInCampaign({
          isAlwaysOnCampaign,
          product,
          variant,
          targets: targets || [],
        });
        const state: VariantCampaignState = !included
          ? 'NOT_INCLUDED'
          : campaignItem
            ? 'OVERRIDE'
            : baseItem
              ? 'BASE'
              : 'MISSING_BASE';

        return {
          variant,
          baseItem,
          campaignItem,
          included,
          state,
          effectiveAmount: campaignItem?.unit_amount ?? baseItem?.unit_amount ?? null,
          variantIncludeTarget,
          productIncludeTarget,
          variantExcludeTarget,
          productExcludeTarget,
          projectExcludeTarget,
        };
      });

      return {
        product,
        variants: variantRows,
        includedCount: variantRows.filter((row) => row.included).length,
        baseUsingCount: variantRows.filter((row) => row.state === 'BASE').length,
        overrideCount: variantRows.filter((row) => row.state === 'OVERRIDE').length,
        missingBaseCount: variantRows.filter((row) => row.state === 'MISSING_BASE').length,
        notIncludedCount: variantRows.filter((row) => row.state === 'NOT_INCLUDED').length,
      };
    });
  }, [
    basePriceItemsByProductId,
    campaign,
    campaignPriceItemsByProductId,
    candidateProducts,
    isAlwaysOnCampaign,
    targets,
    variantsByProductId,
  ]);

  const includedProductRows = useMemo(
    () => productCampaignRows.filter((row) => row.includedCount > 0),
    [productCampaignRows],
  );
  const notIncludedProductRows = useMemo(
    () => productCampaignRows.filter((row) => row.notIncludedCount > 0),
    [productCampaignRows],
  );
  const missingBaseVariantCount = useMemo(
    () => productCampaignRows.reduce((sum, row) => sum + row.missingBaseCount, 0),
    [productCampaignRows],
  );
  const includedVariantCount = useMemo(
    () => productCampaignRows.reduce((sum, row) => sum + row.includedCount, 0),
    [productCampaignRows],
  );
  const overrideVariantCount = useMemo(
    () => productCampaignRows.reduce((sum, row) => sum + row.overrideCount, 0),
    [productCampaignRows],
  );
  const baseUsingVariantCount = useMemo(
    () => productCampaignRows.reduce((sum, row) => sum + row.baseUsingCount, 0),
    [productCampaignRows],
  );
  const handleRunAction = async (task: () => Promise<unknown>) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await task();
    } catch (actionError) {
      setErrorMessage(getErrorMessage(actionError));
    }
  };

  const handleOpenProductEditor = async () => {
    if (!campaign) {
      return;
    }

    try {
      setErrorMessage(null);
      setSuccessMessage(null);
      const result = await openModal<ApplyV2CampaignProductEditorResult>(
        CampaignProductEditorModal,
        {
          size: 'full',
          disableBackdropClick: true,
          campaignId: campaign.id,
          isAlwaysOnCampaign,
          includedProductRows,
          notIncludedProductRows,
          mediaByProductId,
        },
      );
      setSuccessMessage(
        `변경사항을 저장했습니다. 추가 ${result.added_products}개, 제거 ${result.removed_products}개, 가격 변경 ${result.price_changes}건`,
      );
    } catch {
      // 사용자가 모달을 닫은 경우는 조용히 무시합니다.
    }
  };

  const toggleProductExpanded = (productId: string) => {
    setExpandedProductIds((previous) => ({
      ...previous,
      [productId]: !previous[productId],
    }));
  };

  const handleCopyCampaignLink = async () => {
    if (!campaign) {
      return;
    }

    const campaignPath = `/shop?campaign_id=${encodeURIComponent(campaign.id)}`;
    const absoluteLink =
      typeof window !== 'undefined'
        ? `${window.location.origin}${campaignPath}`
        : campaignPath;

    if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
      showToast('클립보드 복사를 지원하지 않는 환경입니다.', { type: 'warning' });
      return;
    }

    try {
      await navigator.clipboard.writeText(absoluteLink);
      showToast(`${campaign.name} 링크를 복사했습니다.`, { type: 'success' });
    } catch {
      showToast('링크 복사에 실패했습니다. 다시 시도해 주세요.', { type: 'error' });
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loading size="lg" text="캠페인 상세 정보를 불러오는 중입니다." />
      </div>
    );
  }

  if (
    detailContextError ||
    !detailContext ||
    !campaign ||
    !projects ||
    !products ||
    !bundleDefinitions ||
    !priceLists
  ) {
    return (
      <div className="space-y-4">
        <div className="rounded-[14px] border border-red-200 bg-red-50 p-4 font-medium text-red-700">
          캠페인 상세 정보를 불러오지 못했습니다.
        </div>
        <Button intent="neutral" className={adminButtonClass} onClick={() => router.push(campaignListPath)}>
          목록으로
        </Button>
      </div>
    );
  }

  const hasPricingData = includedVariantCount > 0;
  const canActivate =
    campaign.status === 'DRAFT' ||
    campaign.status === 'SUSPENDED' ||
    campaign.status === 'CLOSED';
  const canSuspend = campaign.status === 'ACTIVE';
  const canClose = campaign.status === 'ACTIVE' || campaign.status === 'SUSPENDED';
  const activateButtonLabel =
    campaign.status === 'CLOSED'
      ? '재활성화'
      : campaign.status === 'SUSPENDED'
      ? '다시 활성화'
      : '활성화';
  const periodChipLabel =
    period === 'LIVE'
      ? '진행 중'
      : period === 'UPCOMING'
      ? '시작 전'
      : period === 'ENDED'
      ? '기간 종료'
      : '기간 제한 없음';

  return (
    <div className={`${adminLegacyBridgeClass} space-y-6`}>
      <AdminPageHeader
        eyebrow="campaign detail"
        title={campaign.name}
        description={`${formatDateRange(campaign.starts_at, campaign.ends_at)} · 현재 상태: ${CAMPAIGN_STATUS_LABELS[campaign.status]}${campaign.status === 'CLOSED' ? ' (필요 시 재활성화 가능)' : ''}`}
        actions={
          <>
            <Button intent="neutral" className={adminButtonClass} onClick={() => router.push(campaignListPath)}>
              목록으로
            </Button>
            <Button
              intent="neutral"
              className={adminButtonClass}
              onClick={() => void handleCopyCampaignLink()}
            >
              링크 복사
            </Button>
            <Button intent="neutral" className={adminButtonClass} onClick={() => router.push(`/admin/v2-catalog/campaigns/${campaign.id}/edit`)}>
              캠페인 수정
            </Button>
          </>
        }
      />

      <div className="flex flex-col gap-3 rounded-[18px] border border-[#e7e3d3] bg-white p-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap gap-2">
            <Badge intent={getCampaignStatusIntent(campaign.status)}>
              운영: {CAMPAIGN_STATUS_LABELS[campaign.status]}
            </Badge>
            <Badge intent={getCampaignPeriodIntent(period)}>기간: {periodChipLabel}</Badge>
            <Badge intent="default">유형: {CAMPAIGN_TYPE_LABELS[campaign.campaign_type]}</Badge>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            className={adminPrimaryButtonClass}
            onClick={() => handleRunAction(() => activateCampaign.mutateAsync(campaign.id))}
            disabled={!canActivate}
          >
            {activateButtonLabel}
          </Button>
          <Button
            size="sm"
            intent="neutral"
            className={adminButtonClass}
            onClick={() => handleRunAction(() => suspendCampaign.mutateAsync(campaign.id))}
            disabled={!canSuspend}
          >
            일시 중지
          </Button>
          <Button
            size="sm"
            intent="neutral"
            className={adminButtonClass}
            onClick={async () => {
              const confirmed = await confirm({
                title: '캠페인 종료',
                message: '캠페인을 종료 상태로 전환하시겠습니까?',
                description: '종료 후에도 재활성화할 수 있습니다.',
                confirmText: '종료',
                tone: 'warning',
              });
              if (!confirmed) {
                return;
              }
              void handleRunAction(() => closeCampaign.mutateAsync(campaign.id));
            }}
            disabled={!canClose}
          >
            종료
          </Button>
        </div>
      </div>

      {errorMessage && (
        <div className="rounded-[14px] border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {errorMessage}
        </div>
      )}
      {successMessage && (
        <div className="rounded-[14px] border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
          {successMessage}
        </div>
      )}

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <AdminStatCard label="후보 상품" value={candidateProducts.length} />
        <AdminStatCard label="포함 상품" value={includedProductRows.length} caption="현재 캠페인에 표시" />
        <AdminStatCard label="캠페인 포함 옵션" value={includedVariantCount} caption={`기본가 사용 ${baseUsingVariantCount}개`} />
        <AdminStatCard label="할인/특가 적용" value={overrideVariantCount} caption="캠페인 가격 변경 옵션" />
        <AdminStatCard
          label="운영 상태"
          value={CAMPAIGN_STATUS_LABELS[campaign.status]}
          caption={`채널 범위: ${formatChannelScope(campaign.channel_scope_json)}`}
        />
      </section>

      {missingBaseVariantCount > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          기본가가 없는 포함 옵션이 {missingBaseVariantCount}개 있습니다. 상품 옵션 상세에서 기본 판매가를 먼저 등록해야 판매 가능 상태가 됩니다.
        </div>
      )}

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold text-gray-900">캠페인 포함 상품</h2>
              <Badge intent="success" size="sm">{includedProductRows.length}개</Badge>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              현재 캠페인에 포함된 상품과 옵션별 적용 가격을 조회합니다. 추가, 제거, 가격 변경은 편집 모달에서 일괄 저장합니다.
            </p>
          </div>
          <Button className={adminPrimaryButtonClass} onClick={handleOpenProductEditor}>
            <SlidersHorizontal className="h-4 w-4" aria-hidden />
            캠페인 상품 편집
          </Button>
        </div>

        <div className="mt-4 space-y-2 rounded-xl border border-gray-100 bg-gray-50 p-4">
          {includedProductRows.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-200 bg-white px-4 py-8 text-center text-sm text-gray-500">
              아직 캠페인에 포함된 상품/옵션이 없습니다.
            </div>
          ) : (
            includedProductRows.map((row) => {
              const expanded = Boolean(expandedProductIds[row.product.id]);
              const includedVariants = row.variants.filter((variantRow) => variantRow.included);
              const coverMedia = getCoverMedia(mediaByProductId[row.product.id] || []);
              const productTypeBadge = getProductTypeBadge(row.product);
              return (
                <div key={row.product.id} className="rounded-lg border border-white bg-white shadow-sm">
                  <div className="flex flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                        {coverMedia?.public_url ? (
                          // eslint-disable-next-line @next/next/no-img-element -- project policy uses native img instead of next/image.
                          <img
                            src={coverMedia.public_url}
                            alt={coverMedia.alt_text || `${row.product.title} 대표 이미지`}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[10px] text-gray-400">
                            없음
                          </div>
                        )}
                      </div>
                      <Badge
                        intent={productTypeBadge.intent}
                        size="sm"
                        className="w-14 shrink-0"
                      >
                        {productTypeBadge.label}
                      </Badge>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-gray-900">{row.product.title}</p>
                        <p className="mt-1 text-xs text-gray-500">
                          옵션 {row.variants.length}개 · 포함 {row.includedCount}개 · 할인 {row.overrideCount}개
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      intent="neutral"
                      onClick={() => toggleProductExpanded(row.product.id)}
                    >
                      {expanded ? <ChevronUp className="h-4 w-4" aria-hidden /> : <ChevronDown className="h-4 w-4" aria-hidden />}
                      {expanded ? '접기' : '펼치기'}
                    </Button>
                  </div>
                  {expanded && (
                    <div className="space-y-2 border-t border-gray-100 px-4 py-3">
                      {includedVariants.map((variantRow) => (
                        <div key={variantRow.variant.id} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                          <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-semibold text-gray-900">
                                  {variantRow.variant.title || '기본 옵션'}
                                </p>
                                <Badge
                                  intent={
                                    variantRow.state === 'OVERRIDE'
                                      ? 'warning'
                                      : variantRow.state === 'MISSING_BASE'
                                        ? 'error'
                                        : variantRow.state === 'BASE'
                                          ? 'success'
                                          : 'default'
                                  }
                                  size="sm"
                                >
                                  {variantRow.state === 'OVERRIDE'
                                    ? '할인/특가'
                                    : variantRow.state === 'MISSING_BASE'
                                      ? '기본가 없음'
                                      : variantRow.state === 'BASE'
                                        ? '기본가 사용'
                                        : '미포함'}
                                </Badge>
                              </div>
                              <p className="mt-1 text-xs text-gray-500">
                                기본가 {variantRow.baseItem ? formatCurrency(variantRow.baseItem.unit_amount) : '없음'} · 적용가{' '}
                                {variantRow.effectiveAmount === null ? '없음' : formatCurrency(variantRow.effectiveAmount)}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
        {detailContextFetching && (
          <p className="mt-3 text-xs text-gray-500">옵션 정보를 최신 상태로 갱신하는 중입니다.</p>
        )}
      </section>

      {!hasPricingData && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          아직 캠페인에 포함된 옵션이 없습니다. 캠페인 상품 편집에서 상품을 추가해 주세요.
        </div>
      )}
    </div>
  );
}
