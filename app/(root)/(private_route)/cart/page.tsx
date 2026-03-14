"use client";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Loading } from "@/components/ui/loading";
import {
  useCart,
  useUpdateCartItem,
  useRemoveCartItem,
  useClearCart,
} from "@/lib/client/hooks";
import { ShoppingBag, Trash2, Minus, Plus, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { SHIPPING_FEE } from "@/constants";

export default function CartPage() {
  const router = useRouter();
  const { data: cartData, isLoading, error } = useCart();
  const updateCartItem = useUpdateCartItem();
  const removeCartItem = useRemoveCartItem();
  const clearCart = useClearCart();

  const [processingItemId, setProcessingItemId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <Loading size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <EmptyState
          title="오류가 발생했습니다"
          description={
            error instanceof Error
              ? error.message
              : "장바구니를 불러오는 중 오류가 발생했습니다"
          }
        />
      </div>
    );
  }

  const items = cartData?.items || [];
  const productPrice = cartData?.totalPrice || 0;

  // 실물 굿즈 또는 번들 상품이 포함되어 있는지 확인
  const hasPhysicalGoods = items.some(
    (item) =>
      item.product.type === "PHYSICAL_GOODS" || item.product.type === "BUNDLE"
  );

  // 배송비 계산
  const shippingFee = hasPhysicalGoods ? SHIPPING_FEE : 0;
  const totalPrice = productPrice + shippingFee;

  const handleQuantityChange = async (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) return;
    setProcessingItemId(itemId);
    try {
      await updateCartItem.mutateAsync({ item_id: itemId, quantity: newQuantity });
    } finally {
      setProcessingItemId(null);
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    if (!confirm("이 상품을 장바구니에서 삭제하시겠습니까?")) return;
    setProcessingItemId(itemId);
    try {
      await removeCartItem.mutateAsync(itemId);
    } finally {
      setProcessingItemId(null);
    }
  };

  const handleClearCart = async () => {
    if (!confirm("장바구니를 모두 비우시겠습니까?")) return;
    await clearCart.mutateAsync();
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-neutral-50 py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <EmptyState
            title="장바구니가 비어있습니다"
            description="마음에 드는 상품을 담아보세요"
          >
            <Link href="/shop">
              <Button intent="primary" size="md">
                <ShoppingBag className="w-4 h-4" />
                쇼핑 계속하기
              </Button>
            </Link>
          </EmptyState>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <section className="bg-[#f9f9ed] py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-text-primary mb-2">장바구니</h1>
          <p className="text-text-secondary">
            {items.length}개의 상품이 담겨있습니다
          </p>
          <div className="mt-4">
            <Link href="/v2/cart">
              <Button intent="secondary" size="sm">
                v2 장바구니 테스트 열기
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Cart Items */}
      <section className="py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
            {/* Items List */}
            <div className="divide-y divide-neutral-200">
              {items.map((item) => {
                const product = item.product;
                if (!product) return null;

                const isProcessing = processingItemId === item.id;
                const imageUrl = product.main_image?.cdn_url || product.main_image?.public_url;

                return (
                  <div
                    key={item.id}
                    className={`p-6 ${isProcessing ? "opacity-50" : ""}`}
                  >
                    <div className="flex gap-6">
                      {/* Product Image */}
                      <div className="w-24 h-24 bg-gradient-to-br from-primary-100 to-primary-200 rounded-xl overflow-hidden flex-shrink-0">
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={product.main_image?.alt_text || product.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ShoppingCart className="w-8 h-8 text-primary-500" />
                          </div>
                        )}
                      </div>

                      {/* Product Info */}
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-text-primary mb-1">
                          {product.name}
                        </h3>
                        <p className="text-sm text-text-secondary mb-3">
                          {product.type === "VOICE_PACK"
                            ? "보이스팩"
                            : product.type === "PHYSICAL_GOODS"
                            ? "실물 굿즈"
                            : "번들"}
                        </p>

                        <div className="flex items-center justify-between">
                          {/* Quantity Controls */}
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() =>
                                handleQuantityChange(item.id, item.quantity - 1)
                              }
                              disabled={isProcessing || item.quantity <= 1}
                              className="w-8 h-8 border border-neutral-300 rounded-lg flex items-center justify-center hover:bg-neutral-100 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <span className="w-12 text-center font-medium">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() =>
                                handleQuantityChange(item.id, item.quantity + 1)
                              }
                              disabled={
                                isProcessing ||
                                (product.stock !== null &&
                                  item.quantity >= product.stock)
                              }
                              className="w-8 h-8 border border-neutral-300 rounded-lg flex items-center justify-center hover:bg-neutral-100 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Price */}
                          <div className="text-right">
                            <p className="text-xl font-bold text-text-primary">
                              {(product.price * item.quantity).toLocaleString()}원
                            </p>
                            {item.quantity > 1 && (
                              <p className="text-sm text-text-secondary">
                                개당 {product.price.toLocaleString()}원
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Stock Warning */}
                        {product.stock !== null && product.stock <= 5 && (
                          <p className="text-sm text-orange-600 mt-2">
                            남은 재고: {product.stock}개
                          </p>
                        )}
                      </div>

                      {/* Remove Button */}
                      <button
                        onClick={() => handleRemoveItem(item.id)}
                        disabled={isProcessing}
                        className="text-neutral-400 hover:text-red-500 transition-colors disabled:opacity-50"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Summary */}
            <div className="bg-neutral-50 p-6 border-t border-neutral-200">
              <div className="space-y-3 mb-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-secondary">
                    상품 금액 ({items.length}개)
                  </span>
                  <span className="text-text-primary">
                    {productPrice.toLocaleString()}원
                  </span>
                </div>

                {shippingFee > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-text-secondary">배송비</span>
                    <span className="text-text-primary">
                      {shippingFee.toLocaleString()}원
                    </span>
                  </div>
                )}

                <div className="pt-3 border-t-2 border-neutral-900">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-text-primary">
                      총 결제 금액
                    </span>
                    <span className="text-2xl font-bold text-primary-600">
                      {totalPrice.toLocaleString()}원
                    </span>
                  </div>
                </div>
              </div>

              {/* 버튼 영역 - 모바일: 세로 배치, 데스크톱: 가로 배치 */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="w-full sm:flex-1">
                  <Button
                    intent="ghost"
                    size="md"
                    onClick={handleClearCart}
                    disabled={clearCart.isPending}
                    fullWidth
                  >
                    <Trash2 className="w-4 h-4" />
                    장바구니 비우기
                  </Button>
                </div>
                <Link href="/shop" className="w-full sm:flex-1">
                  <Button intent="secondary" size="md" fullWidth>
                    <ShoppingBag className="w-4 h-4" />
                    쇼핑 계속하기
                  </Button>
                </Link>
                <Link href="/checkout" className="w-full sm:flex-1">
                  <Button intent="primary" size="md" fullWidth>
                    주문하기
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
