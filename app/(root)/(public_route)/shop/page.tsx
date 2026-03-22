"use client";

import { VoicePackCover } from "@/components/order/VoicePackCover";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Loading } from "@/components/ui/loading";
import {
  useSession,
  useV2AddCartItem,
  useV2ShopCampaigns,
  useV2ShopProducts,
} from "@/lib/client/hooks";
import type {
  V2ShopDisplayPrice,
  V2ShopListItem,
} from "@/lib/client/api/v2-shop.api";
import { ApiError } from "@/lib/client/utils/api-error";
import { ShoppingCart } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { useToast } from "@/src/components/toast";

function formatDisplayPrice(item: V2ShopListItem): string {
  if (!item.display_price) {
    return "가격 확인 필요";
  }
  return `${item.display_price.amount.toLocaleString()}원`;
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

function renderSellableBadge(item: V2ShopListItem) {
  if (item.availability.sellable) {
    return null;
  }

  if (item.availability.reason === "OUT_OF_STOCK") {
    return (
      <span className="inline-flex rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-700">
        품절
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-full bg-neutral-200 px-2 py-1 text-xs font-semibold text-neutral-700">
      판매 준비 중
    </span>
  );
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

function ShopPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated } = useSession();
  const { showToast } = useToast();
  const addCartItem = useV2AddCartItem();
  const [addingToCart, setAddingToCart] = useState<string | null>(null);
  const selectedCampaignId = searchParams.get("campaign_id")?.trim() || "";
  const { data: campaigns = [] } = useV2ShopCampaigns({
    channel: "WEB",
    include_upcoming: true,
  });
  const { data, isLoading, error } = useV2ShopProducts({
    limit: 60,
    sort: "SORT_ORDER",
    channel: "WEB",
    campaign_id: selectedCampaignId || undefined,
  });
  const selectedCampaign = useMemo(
    () => campaigns.find((campaign) => campaign.id === selectedCampaignId) || null,
    [campaigns, selectedCampaignId],
  );
  const selectedCampaignBannerUrl =
    selectedCampaign?.shop_banner_public_url || null;
  const showCampaignHeroBanner =
    !!selectedCampaignId && !!selectedCampaignBannerUrl;

  const products = useMemo(() => data?.items ?? [], [data?.items]);
  const exposedProducts = useMemo(() => {
    const visibleProducts = products.filter((item) => item.display_price !== null);

    if (!selectedCampaignId) {
      return visibleProducts;
    }

    return [...visibleProducts].sort((left, right) => {
      const leftAmount = left.display_price?.amount ?? 0;
      const rightAmount = right.display_price?.amount ?? 0;
      const amountDiff = rightAmount - leftAmount;
      if (amountDiff !== 0) {
        return amountDiff;
      }
      return left.product_id.localeCompare(right.product_id);
    });
  }, [products, selectedCampaignId]);
  const voicePacks = useMemo(
    () => exposedProducts.filter((item) => item.fulfillment_type === "DIGITAL"),
    [exposedProducts],
  );
  const physicalGoods = useMemo(
    () => exposedProducts.filter((item) => item.fulfillment_type !== "DIGITAL"),
    [exposedProducts],
  );

  const getShopPath = (campaignId: string | null | undefined) =>
    campaignId ? `/shop?campaign_id=${encodeURIComponent(campaignId)}` : "/shop";

  const buildProductDetailPath = (productId: string) =>
    selectedCampaignId
      ? `/shop/${productId}?campaign_id=${encodeURIComponent(selectedCampaignId)}`
      : `/shop/${productId}`;

  const requestLogin = () => {
    router.push(
      `/login?redirect=${encodeURIComponent(getShopPath(selectedCampaignId))}`,
    );
  };

  const handleProductClick = (productId: string) => {
    router.push(buildProductDetailPath(productId));
  };

  const canAddToCart = (item: V2ShopListItem) =>
    item.availability.sellable && !!item.primary_variant_id;

  async function handleAddToCart(
    event: React.MouseEvent,
    item: V2ShopListItem,
  ) {
    event.stopPropagation();

    if (!item.primary_variant_id) {
      showToast("선택 가능한 상품 옵션이 없습니다.", { type: "warning" });
      return;
    }

    if (!item.availability.sellable) {
      showToast("현재 구매할 수 없는 상품입니다.", { type: "warning" });
      return;
    }

    if (!isAuthenticated) {
      requestLogin();
      return;
    }

    setAddingToCart(item.product_id);

    try {
      await addCartItem.mutateAsync({
        variant_id: item.primary_variant_id,
        quantity: 1,
        campaign_id: selectedCampaignId || null,
        display_price_snapshot: buildDisplayPriceSnapshot(item.display_price),
        added_via: "SHOP_LIST",
        metadata: {
          source: "shop-list",
          product_id: item.product_id,
          campaign_id: selectedCampaignId || null,
        },
      });

      showToast("장바구니에 상품을 담았습니다.", { type: "success" });
    } catch (submitError) {
      if (submitError instanceof ApiError && submitError.isAuthError()) {
        requestLogin();
        return;
      }
      showToast(getErrorMessage(submitError), { type: "error" });
    } finally {
      setAddingToCart(null);
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50">
        <Loading size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50">
        <EmptyState
          title="상점을 불러오지 못했습니다"
          description={
            error instanceof Error
              ? error.message
              : "잠시 후 다시 시도해 주세요."
          }
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <section
        className={`relative overflow-hidden bg-[#7bb8e9] px-4 ${
          showCampaignHeroBanner ? "py-0" : "py-20"
        }`}
      >
        {showCampaignHeroBanner ? (
          <div className="w-full">
            <div className="mx-auto w-full max-w-[1152px] overflow-hidden bg-white/60">
              <img
                src={selectedCampaignBannerUrl || ""}
                alt={
                  selectedCampaign?.shop_banner_alt_text ||
                  `${selectedCampaign?.name || "캠페인"} 배너`
                }
                className="aspect-[12/5] w-full object-cover"
              />
            </div>
          </div>
        ) : (
          <div className="relative mx-auto max-w-6xl">
            <h1 className="mb-6 text-4xl font-bold leading-tight sm:text-5xl">
              <span className="text-[#1a1a2e]">루센트의 프로젝트에서,</span>
              <br />
              <span className="text-[#66B5F3]">이야기가 깃든 굿즈를</span>
              <br />
              <span className="text-[#1a1a2e]">만나보세요.</span>
            </h1>
            <p className="max-w-xl text-base leading-relaxed text-[#1a1a2e]/60">
              루센트는 라이버의 굿즈 판매와 유통을 전담해 준비의 부담은 줄이고,
              팬에게는 더 가까운 가격으로 굿즈를 전달합니다.
            </p>
            {selectedCampaignId ? (
              <div className="mt-5 inline-flex rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-[#1a1a2e]/80">
                {selectedCampaign
                  ? `${selectedCampaign.name} 캠페인 기준 상품을 보고 있습니다.`
                  : "캠페인 기준 상품을 보고 있습니다."}
              </div>
            ) : null}
          </div>
        )}
      </section>

      {voicePacks.length > 0 ? (
        <section className="px-4 py-16">
          <div className="mx-auto max-w-6xl">
            <div className="mb-12">
              <h2 className="mb-3 text-3xl font-bold text-text-primary">
                Voice Packs
              </h2>
              <p className="text-lg text-text-secondary">
                아티스트의 다양한 보이스팩을 만나보세요
              </p>
            </div>

            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
              {voicePacks.map((pack, index) => (
                <div
                  key={pack.product_id}
                  className="cursor-pointer overflow-hidden rounded-2xl border-2 border-primary-200 bg-white transition-all duration-300 hover:scale-105 hover:shadow-xl"
                  onClick={() => handleProductClick(pack.product_id)}
                >
                  <VoicePackCover
                    index={index}
                    name={pack.title}
                    thumbnail={pack.thumbnail_url}
                  />

                  <div className="p-6">
                    <h3 className="mb-2 text-xl font-bold text-text-primary">
                      {pack.title}
                    </h3>
                    <p className="mb-4 line-clamp-2 text-sm text-text-secondary">
                      {pack.short_description || "보이스팩"}
                    </p>
                    <p className="mb-4 text-2xl font-bold text-primary-700">
                      {formatDisplayPrice(pack)}
                    </p>
                    <div className="mb-3">{renderSellableBadge(pack)}</div>

                    <div className="flex gap-2">
                      <Button
                        intent="secondary"
                        size="md"
                        fullWidth
                        onClick={(event) => {
                          event.stopPropagation();
                          handleProductClick(pack.product_id);
                        }}
                      >
                        자세히 보기
                      </Button>
                      <Button
                        intent="primary"
                        size="md"
                        disabled={
                          !canAddToCart(pack) || addingToCart === pack.product_id
                        }
                        onClick={(event) => void handleAddToCart(event, pack)}
                      >
                        <ShoppingCart className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {physicalGoods.length > 0 ? (
        <section className="bg-white px-4 py-16">
          <div className="mx-auto max-w-6xl">
            <div className="mb-12">
              <h2 className="mb-3 text-3xl font-bold text-text-primary">Goods</h2>
              <p className="text-lg text-text-secondary">
                아티스트의 다양한 굿즈를 만나보세요
              </p>
            </div>

            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
              {physicalGoods.map((goods) => {
                const soldOut = goods.availability.reason === "OUT_OF_STOCK";
                const canAdd = canAddToCart(goods);
                return (
                  <div
                    key={goods.product_id}
                    className="cursor-pointer overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-50 transition-all duration-300 hover:scale-105 hover:shadow-xl"
                    onClick={() => handleProductClick(goods.product_id)}
                  >
                    <div className="relative flex aspect-square items-center justify-center overflow-hidden bg-gradient-to-br from-neutral-100 to-neutral-200">
                      {goods.thumbnail_url ? (
                        <img
                          src={goods.thumbnail_url}
                          alt={goods.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-6xl">📦</span>
                      )}
                    </div>

                    <div className="p-6">
                      <h3 className="mb-2 text-xl font-bold text-text-primary">
                        {goods.title}
                      </h3>
                      <p className="mb-4 line-clamp-2 text-sm text-text-secondary">
                        {goods.short_description || "굿즈"}
                      </p>
                      <p className="mb-4 text-2xl font-bold text-primary-700">
                        {formatDisplayPrice(goods)}
                      </p>

                      {!goods.availability.sellable ? (
                        <p className="mb-2 text-sm text-red-600">
                          {soldOut ? "품절" : "판매 준비 중"}
                        </p>
                      ) : null}

                      {!canAdd ? (
                        <Button intent="primary" size="md" fullWidth disabled>
                          {soldOut ? "품절" : "판매 준비 중"}
                        </Button>
                      ) : (
                        <div className="flex gap-2">
                          <Button
                            intent="secondary"
                            size="md"
                            fullWidth
                            onClick={(event) => {
                              event.stopPropagation();
                              handleProductClick(goods.product_id);
                            }}
                          >
                            자세히 보기
                          </Button>
                          <Button
                            intent="primary"
                            size="md"
                            disabled={addingToCart === goods.product_id}
                            onClick={(event) => void handleAddToCart(event, goods)}
                          >
                            <ShoppingCart className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}

export default function ShopPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-neutral-50">
          <Loading size="lg" />
        </div>
      }
    >
      <ShopPageContent />
    </Suspense>
  );
}
