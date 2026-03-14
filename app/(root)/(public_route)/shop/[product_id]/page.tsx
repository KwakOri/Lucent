"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Headphones, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Loading } from "@/components/ui/loading";
import { useV2ShopProduct } from "@/lib/client/hooks";
import type { V2ShopProductDetail } from "@/lib/client/api/v2-shop.api";

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

export default function ProductDetailPage() {
  const params = useParams();
  const productId = params.product_id as string;
  const { data, isLoading, error } = useV2ShopProduct(productId);

  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);

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
          <Link href="/shop">
            <Button intent="primary" size="md">
              <ArrowLeft className="h-4 w-4" />
              상점으로 돌아가기
            </Button>
          </Link>
        </EmptyState>
      </div>
    );
  }

  const mediaList = data.media.length > 0 ? data.media : [];
  const selectedMedia = mediaList[selectedMediaIndex] || null;
  const soldOut = data.purchase_constraints.sold_out;

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <Link
          href="/shop"
          className="mb-8 inline-flex items-center gap-2 text-text-secondary transition-colors hover:text-text-primary"
        >
          <ArrowLeft className="h-5 w-5" />
          상점으로 돌아가기
        </Link>

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
              {selectedMedia?.public_url ? (
                <img
                  src={selectedMedia.public_url}
                  alt={selectedMedia.alt_text || data.product.title}
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

            {mediaList.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {mediaList.map((media, index) => (
                  <button
                    key={media.id}
                    type="button"
                    onClick={() => setSelectedMediaIndex(index)}
                    className={`overflow-hidden rounded-lg border ${
                      index === selectedMediaIndex
                        ? "border-primary-500"
                        : "border-neutral-200"
                    }`}
                  >
                    {media.public_url ? (
                      <img
                        src={media.public_url}
                        alt={media.alt_text || `${data.product.title}-${index + 1}`}
                        className="aspect-square h-full w-full object-cover"
                      />
                    ) : (
                      <div className="aspect-square bg-neutral-100" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge intent="default">
                  {data.product.product_kind === "BUNDLE" ? "Bundle" : "Standard"}
                </Badge>
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
                      onClick={() => setSelectedVariantId(variant.id)}
                      className={`w-full rounded-lg border p-3 text-left transition-colors ${
                        selected
                          ? "border-primary-500 bg-primary-50"
                          : "border-neutral-200 hover:bg-neutral-50"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold text-text-primary">{variant.title}</p>
                          <p className="text-xs text-text-secondary">{variant.sku}</p>
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

            <div className="space-y-2">
              <Button intent="primary" size="lg" fullWidth disabled>
                장바구니 담기 (02 단계에서 연결)
              </Button>
              <Button intent="secondary" size="lg" fullWidth disabled>
                바로 구매 (02 단계에서 연결)
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
