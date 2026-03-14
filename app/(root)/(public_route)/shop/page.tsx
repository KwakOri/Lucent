"use client";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Loading } from "@/components/ui/loading";
import { useV2ShopProducts } from "@/lib/client/hooks";
import type { V2ShopListItem } from "@/lib/client/api/v2-shop.api";
import { Headphones, Package } from "lucide-react";
import { useRouter } from "next/navigation";

function formatDisplayPrice(item: V2ShopListItem): string {
  if (!item.display_price) {
    return "가격 확인 필요";
  }
  return `${item.display_price.amount.toLocaleString()}원`;
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

function ProductCard({
  item,
  onClick,
}: {
  item: V2ShopListItem;
  onClick: () => void;
}) {
  const isDigital = item.fulfillment_type === "DIGITAL";

  return (
    <div
      className="cursor-pointer overflow-hidden rounded-2xl border border-neutral-200 bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
      onClick={onClick}
    >
      <div className="relative aspect-square bg-neutral-100">
        {item.thumbnail_url ? (
          <img
            src={item.thumbnail_url}
            alt={item.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-neutral-400">
            {isDigital ? (
              <Headphones className="h-16 w-16" />
            ) : (
              <Package className="h-16 w-16" />
            )}
          </div>
        )}
      </div>

      <div className="space-y-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="line-clamp-2 text-lg font-bold text-text-primary">
            {item.title}
          </h3>
          {renderSellableBadge(item)}
        </div>

        <p className="line-clamp-2 min-h-10 text-sm text-text-secondary">
          {item.short_description || "상품 설명이 준비 중입니다."}
        </p>

        <div className="flex items-center justify-between">
          <p className="text-2xl font-bold text-primary-700">
            {formatDisplayPrice(item)}
          </p>
          <Button
            intent="secondary"
            size="sm"
            onClick={(event) => {
              event.stopPropagation();
              onClick();
            }}
          >
            자세히 보기
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function ShopPage() {
  const router = useRouter();
  const { data, isLoading, error } = useV2ShopProducts({
    limit: 60,
    sort: "SORT_ORDER",
  });

  const items = data?.items || [];
  const digitalProducts = items.filter(
    (item) => item.fulfillment_type === "DIGITAL",
  );
  const physicalProducts = items.filter(
    (item) => item.fulfillment_type !== "DIGITAL",
  );

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
      <section className="bg-[#f9f9ed] px-4 py-20">
        <div className="mx-auto max-w-6xl">
          <h1 className="mb-6 text-4xl font-bold leading-tight text-[#1a1a2e] sm:text-5xl">
            루센트 상점
          </h1>
          <p className="max-w-2xl text-base leading-relaxed text-[#1a1a2e]/70">
            v2 카탈로그 기준으로 구성된 상품 목록입니다. 상품 상세에서 옵션/구매 조건을
            확인하고 다음 단계에서 장바구니 담기를 진행할 수 있습니다.
          </p>
        </div>
      </section>

      <section className="px-4 py-14">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold text-text-primary">Digital</h2>
              <p className="text-sm text-text-secondary">디지털 상품</p>
            </div>
            <span className="text-sm text-text-secondary">
              {digitalProducts.length}개
            </span>
          </div>

          {digitalProducts.length === 0 ? (
            <div className="rounded-xl border border-neutral-200 bg-white p-10">
              <EmptyState
                title="디지털 상품이 없습니다"
                description="곧 새로운 상품이 등록될 예정입니다."
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {digitalProducts.map((item) => (
                <ProductCard
                  key={item.product_id}
                  item={item}
                  onClick={() => router.push(`/shop/${item.product_id}`)}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="bg-white px-4 py-14">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold text-text-primary">Goods & Bundle</h2>
              <p className="text-sm text-text-secondary">실물/번들 상품</p>
            </div>
            <span className="text-sm text-text-secondary">
              {physicalProducts.length}개
            </span>
          </div>

          {physicalProducts.length === 0 ? (
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-10">
              <EmptyState
                title="실물/번들 상품이 없습니다"
                description="곧 다양한 굿즈가 추가됩니다."
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {physicalProducts.map((item) => (
                <ProductCard
                  key={item.product_id}
                  item={item}
                  onClick={() => router.push(`/shop/${item.product_id}`)}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
