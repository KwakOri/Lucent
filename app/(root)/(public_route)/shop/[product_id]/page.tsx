"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Headphones, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Loading } from "@/components/ui/loading";
import {
  useSession,
  useV2AddCartItem,
  useV2ShopCampaigns,
  useV2ShopProduct,
} from "@/lib/client/hooks";
import type {
  V2ShopDisplayPrice,
  V2ShopProductDetail,
} from "@/lib/client/api/v2-shop.api";
import { ApiError } from "@/lib/client/utils/api-error";
import { useToast } from "@/src/components/toast";

function formatPrice(
  price: V2ShopProductDetail["variants"][number]["display_price"] | null,
) {
  if (!price) {
    return "가격 확인 필요";
  }
  return `${price.amount.toLocaleString()}원`;
}

function variantStockLabel(
  variant: V2ShopProductDetail["variants"][number],
): string | null {
  if (variant.availability.sellable) {
    return null;
  }
  if (variant.availability.reason === "OUT_OF_STOCK") {
    return "품절";
  }
  return "판매 준비 중";
}

function buildDisplayPriceSnapshot(displayPrice: V2ShopDisplayPrice | null) {
  if (!displayPrice) {
    return null;
  }

  return {
    amount: displayPrice.amount,
    unit_amount: displayPrice.amount,
    final_unit_amount: displayPrice.amount,
    compare_at_amount: displayPrice.compare_at_amount,
    currency_code: displayPrice.currency_code,
    source: displayPrice.source,
  };
}

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "요청 처리 중 오류가 발생했습니다.";
}

export default function ProductDetailPage() {
  const router = useRouter();
  const { isAuthenticated } = useSession();
  const { showToast } = useToast();
  const addCartItem = useV2AddCartItem();
  const params = useParams();
  const searchParams = useSearchParams();
  const productId = params.product_id as string;
  const selectedCampaignId = searchParams.get("campaign_id")?.trim() || "";
  const shopPath = selectedCampaignId
    ? `/shop?campaign_id=${encodeURIComponent(selectedCampaignId)}`
    : "/shop";
  const detailPath = selectedCampaignId
    ? `/shop/${productId}?campaign_id=${encodeURIComponent(selectedCampaignId)}`
    : `/shop/${productId}`;
  const { data: campaigns = [] } = useV2ShopCampaigns({
    channel: "WEB",
  });
  const selectedCampaign = useMemo(
    () =>
      campaigns.find((campaign) => campaign.id === selectedCampaignId) || null,
    [campaigns, selectedCampaignId],
  );
  const { data, isLoading, error } = useV2ShopProduct(productId, {
    channel: "WEB",
    campaign_id: selectedCampaignId || undefined,
  });

  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [pendingAction, setPendingAction] = useState<"ADD" | "BUY_NOW" | null>(
    null,
  );

  const selectedVariant = useMemo(() => {
    if (!data) {
      return null;
    }
    if (selectedVariantId) {
      return data.variants.find((variant) => variant.id === selectedVariantId) || null;
    }
    return data.variants.find((variant) => variant.is_primary) || data.variants[0] || null;
  }, [data, selectedVariantId]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50">
        <Loading size="lg" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50">
        <EmptyState
          title="상품을 찾을 수 없습니다"
          description={
            error instanceof Error
              ? error.message
              : "요청하신 상품 정보를 불러오지 못했습니다."
          }
        >
          <Link href={shopPath}>
            <Button intent="primary" size="md">
              <ArrowLeft className="h-4 w-4" />
              상점으로 돌아가기
            </Button>
          </Link>
        </EmptyState>
      </div>
    );
  }

  const activeMedia = data.media.filter((media) => media.status === "ACTIVE");
  const coverMedia =
    activeMedia.find((media) => media.is_primary) ||
    activeMedia.find((media) => media.media_role === "PRIMARY") ||
    null;
  const detailMedia = activeMedia
    .filter(
      (media) =>
        (media.media_role === "DETAIL" || media.media_role === "GALLERY") &&
        media.id !== coverMedia?.id,
    )
    .sort((left, right) => {
      if (left.sort_order !== right.sort_order) {
        return left.sort_order - right.sort_order;
      }
      return left.created_at.localeCompare(right.created_at);
    });
  const soldOut = data.purchase_constraints.sold_out;
  const minQuantity = Math.max(
    1,
    selectedVariant?.purchase_constraints.min_quantity ||
      data.purchase_constraints.min_quantity ||
      1,
  );
  const maxQuantity =
    selectedVariant?.purchase_constraints.max_quantity ||
    data.purchase_constraints.max_quantity;
  const hasSelectedVariant = !!selectedVariant;
  const canPurchase =
    hasSelectedVariant && selectedVariant.availability.sellable && !soldOut;

  const requestLogin = () => {
    router.push(`/login?redirect=${encodeURIComponent(detailPath)}`);
  };

  const handleQuantityChange = (nextQuantity: number) => {
    if (nextQuantity < minQuantity) {
      setQuantity(minQuantity);
      return;
    }
    if (maxQuantity && nextQuantity > maxQuantity) {
      setQuantity(maxQuantity);
      return;
    }
    setQuantity(nextQuantity);
  };

  async function handleSubmitCart(buyNow: boolean) {
    if (!hasSelectedVariant || !selectedVariant) {
      showToast("구매할 옵션을 선택해 주세요.", { type: "warning" });
      return;
    }

    if (!selectedVariant.availability.sellable || soldOut) {
      showToast("현재 구매할 수 없는 옵션입니다.", { type: "warning" });
      return;
    }

    if (!isAuthenticated) {
      requestLogin();
      return;
    }

    const normalizedQuantity = maxQuantity
      ? Math.min(Math.max(quantity, minQuantity), maxQuantity)
      : Math.max(quantity, minQuantity);

    setPendingAction(buyNow ? "BUY_NOW" : "ADD");
    try {
      await addCartItem.mutateAsync({
        variant_id: selectedVariant.id,
        quantity: normalizedQuantity,
        campaign_id: selectedCampaignId || null,
        display_price_snapshot: buildDisplayPriceSnapshot(
          selectedVariant.display_price,
        ),
        added_via: buyNow ? "BUY_NOW" : "SHOP_DETAIL",
        metadata: {
          source: "shop-detail",
          product_id: data?.product.id || productId,
          campaign_id: selectedCampaignId || null,
        },
      });

      if (buyNow) {
        router.push(
          selectedCampaignId
            ? `/checkout?campaign_id=${selectedCampaignId}`
            : "/checkout",
        );
        return;
      }

      showToast("장바구니에 상품을 담았습니다.", { type: "success" });
    } catch (submitError) {
      if (submitError instanceof ApiError && submitError.isAuthError()) {
        requestLogin();
        return;
      }
      showToast(getErrorMessage(submitError), { type: "error" });
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <Link
          href={shopPath}
          className="mb-8 inline-flex items-center gap-2 text-text-secondary transition-colors hover:text-text-primary"
        >
          <ArrowLeft className="h-5 w-5" />
          상점으로 돌아가기
        </Link>

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
              {coverMedia?.public_url ? (
                <img
                  src={coverMedia.public_url}
                  alt={coverMedia.alt_text || data.product.title}
                  className="aspect-square h-full w-full object-cover"
                />
              ) : (
                <div className="flex aspect-square items-center justify-center bg-neutral-100 text-neutral-400">
                  {data.product.product_kind === "BUNDLE" ||
                  selectedVariant?.fulfillment_type === "PHYSICAL" ? (
                    <Package className="h-16 w-16" />
                  ) : (
                    <Headphones className="h-16 w-16" />
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge intent="default">
                  {data.product.product_kind === "BUNDLE" ? "Bundle" : "Standard"}
                </Badge>
                {selectedCampaign && (
                  <Badge intent="info">{selectedCampaign.name}</Badge>
                )}
                {!data.product.availability.sellable && (
                  <Badge intent="error">
                    {data.product.availability.reason === "OUT_OF_STOCK"
                      ? "품절"
                      : "판매 준비 중"}
                  </Badge>
                )}
              </div>
              <h1 className="text-4xl font-bold text-text-primary">
                {data.product.title}
              </h1>
              <p className="text-3xl font-bold text-primary-700">
                {formatPrice(selectedVariant?.display_price ?? null)}
              </p>
              {data.product.short_description && (
                <p className="text-text-secondary">{data.product.short_description}</p>
              )}
            </div>

            <div className="rounded-xl border border-neutral-200 bg-white p-5">
              <p className="mb-3 text-sm font-semibold text-text-primary">구매 옵션</p>
              <div className="space-y-2">
                {data.variants.map((variant) => {
                  const selected = selectedVariant?.id === variant.id;
                  const stockLabel = variantStockLabel(variant);

                  return (
                    <button
                      key={variant.id}
                      type="button"
                      onClick={() => {
                        setSelectedVariantId(variant.id);
                        setQuantity(
                          Math.max(
                            1,
                            variant.purchase_constraints.min_quantity ||
                              data.purchase_constraints.min_quantity ||
                              1,
                          ),
                        );
                      }}
                      className={`w-full rounded-lg border p-3 text-left transition-colors ${
                        selected
                          ? "border-primary-500 bg-primary-50"
                          : "border-neutral-200 hover:bg-neutral-50"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold text-text-primary">{variant.title}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-text-primary">
                            {formatPrice(variant.display_price)}
                          </p>
                          {stockLabel && (
                            <p className="text-xs text-red-600">{stockLabel}</p>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {data.product.description && (
              <div className="rounded-xl border border-neutral-200 bg-white p-5">
                <h2 className="mb-3 text-lg font-bold text-text-primary">상품 설명</h2>
                <p className="whitespace-pre-wrap text-sm text-text-secondary">
                  {data.product.description}
                </p>
              </div>
            )}

            <div className="rounded-xl border border-neutral-200 bg-white p-5">
              <h2 className="mb-3 text-lg font-bold text-text-primary">구매 조건</h2>
              <div className="space-y-1 text-sm text-text-secondary">
                <p>최소 수량: {data.purchase_constraints.min_quantity}</p>
                <p>
                  최대 수량:{" "}
                  {data.purchase_constraints.max_quantity ?? "제한 없음"}
                </p>
                <p>
                  판매 상태: {soldOut ? "품절/비판매" : "구매 가능"}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-neutral-200 bg-white p-5">
              <p className="mb-3 text-sm font-semibold text-text-primary">수량</p>
              <div className="flex items-center gap-2">
                <Button
                  intent="secondary"
                  size="sm"
                  disabled={quantity <= minQuantity}
                  onClick={() => handleQuantityChange(quantity - 1)}
                >
                  -
                </Button>
                <input
                  type="number"
                  min={minQuantity}
                  max={maxQuantity ?? undefined}
                  value={quantity}
                  onChange={(event) => {
                    const next = Number.parseInt(event.target.value, 10);
                    if (!Number.isFinite(next)) {
                      return;
                    }
                    handleQuantityChange(next);
                  }}
                  className="h-10 w-20 rounded-lg border border-neutral-200 px-3 text-center text-sm"
                />
                <Button
                  intent="secondary"
                  size="sm"
                  disabled={!!maxQuantity && quantity >= maxQuantity}
                  onClick={() => handleQuantityChange(quantity + 1)}
                >
                  +
                </Button>
              </div>
              <p className="mt-2 text-xs text-text-secondary">
                최소 {minQuantity} / 최대 {maxQuantity ?? "제한 없음"}
              </p>
            </div>

            <div className="space-y-2">
              <Button
                intent="primary"
                size="lg"
                fullWidth
                disabled={!canPurchase || pendingAction !== null}
                onClick={() => void handleSubmitCart(false)}
              >
                {pendingAction === "ADD" ? "담는 중..." : "장바구니 담기"}
              </Button>
              <Button
                intent="secondary"
                size="lg"
                fullWidth
                disabled={!canPurchase || pendingAction !== null}
                onClick={() => void handleSubmitCart(true)}
              >
                {pendingAction === "BUY_NOW" ? "이동 중..." : "바로 구매"}
              </Button>
            </div>
          </div>
        </div>

        {detailMedia.length > 0 && (
          <section className="mt-10 rounded-xl border border-neutral-200 bg-white p-5">
            <h2 className="text-lg font-bold text-text-primary">상세 이미지</h2>
            <div className="mt-4 space-y-4">
              {detailMedia.map((media, index) => (
                <div
                  key={media.id}
                  className="overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50"
                >
                  {media.public_url ? (
                    <img
                      src={media.public_url}
                      alt={
                        media.alt_text ||
                        `${data.product.title} 상세 이미지 ${index + 1}`
                      }
                      className="w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-40 items-center justify-center text-sm text-neutral-400">
                      이미지가 준비되지 않았습니다.
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
