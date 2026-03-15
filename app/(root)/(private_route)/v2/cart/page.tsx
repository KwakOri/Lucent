'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Minus, Plus, ShoppingCart, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Loading } from '@/components/ui/loading';
import {
  useV2CheckoutCart,
  useV2RemoveCartItem,
  useV2UpdateCartItemQuantity,
} from '@/lib/client/hooks/useV2Checkout';
import { ApiError } from '@/lib/client/utils/api-error';
import { useToast } from '@/src/components/toast';

const BASE_SHIPPING_FEE = 3500;

function readNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function readUnitAmount(snapshot: Record<string, unknown> | null): number {
  if (!snapshot) {
    return 0;
  }
  const candidates = [
    snapshot.final_unit_amount,
    snapshot.sale_unit_amount,
    snapshot.unit_amount,
    snapshot.amount,
  ];
  for (const candidate of candidates) {
    const amount = readNumber(candidate);
    if (amount !== null) {
      return amount;
    }
  }
  return 0;
}

function formatCurrency(amount: number): string {
  return `${Math.max(0, amount).toLocaleString()}원`;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return '요청 처리 중 오류가 발생했습니다.';
}

export default function V2CartPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { data: cart, isLoading, error, refetch } = useV2CheckoutCart();
  const updateQuantity = useV2UpdateCartItemQuantity();
  const removeCartItem = useV2RemoveCartItem();

  const items = cart?.items ?? [];
  const isEmpty = items.length === 0;
  const hasAuthError = error instanceof ApiError && error.isAuthError();
  const hasShippingItem = items.some(
    (item) => item.variant?.requires_shipping === true,
  );
  const totalAmount = items.reduce((sum, item) => {
    const unit = readUnitAmount(
      (item.display_price_snapshot as Record<string, unknown> | null) || null,
    );
    return sum + unit * item.quantity;
  }, 0);
  const estimatedShippingFee = hasShippingItem ? BASE_SHIPPING_FEE : 0;
  const estimatedPayableAmount = totalAmount + estimatedShippingFee;

  const isUpdating = updateQuantity.isPending || removeCartItem.isPending;

  async function handleQuantityChange(itemId: string, nextQuantity: number) {
    if (nextQuantity <= 0) {
      return;
    }

    try {
      await updateQuantity.mutateAsync({
        itemId,
        data: { quantity: nextQuantity },
      });
    } catch (mutationError) {
      showToast(getErrorMessage(mutationError), { type: 'error' });
    }
  }

  async function handleRemoveItem(itemId: string) {
    try {
      await removeCartItem.mutateAsync(itemId);
      showToast('상품을 장바구니에서 삭제했습니다.', { type: 'info' });
    } catch (mutationError) {
      showToast(getErrorMessage(mutationError), { type: 'error' });
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
      <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
        <EmptyState
          icon={ShoppingCart}
          title={hasAuthError ? '로그인이 필요합니다' : '장바구니를 불러오지 못했습니다'}
          description={
            hasAuthError
              ? '로그인 후 장바구니를 확인할 수 있습니다.'
              : getErrorMessage(error)
          }
          action={
            hasAuthError ? (
              <Link href="/login?redirect=/cart">
                <Button intent="primary" size="md">
                  로그인하러 가기
                </Button>
              </Link>
            ) : (
              <Button
                intent="primary"
                size="md"
                onClick={() => {
                  void refetch();
                }}
              >
                다시 시도
              </Button>
            )
          }
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 py-8">
      <div className="mx-auto max-w-5xl px-4">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-text-primary">장바구니</h1>
            <p className="mt-1 text-sm text-text-secondary">
              담아둔 상품을 확인하고 결제를 진행하세요.
            </p>
          </div>
          <Link href="/shop">
            <Button intent="secondary" size="sm">
              상품 더 보기
            </Button>
          </Link>
        </div>

        {isEmpty ? (
          <div className="rounded-2xl border border-neutral-200 bg-white p-8">
            <EmptyState
              icon={ShoppingCart}
              title="장바구니가 비어 있습니다"
              description="상점에서 원하는 상품을 담아보세요."
              action={
                <Link href="/shop">
                  <Button intent="primary" size="md">
                    상점으로 이동
                  </Button>
                </Link>
              }
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
            <section className="space-y-4">
              {items.map((item) => {
                const unitAmount = readUnitAmount(
                  (item.display_price_snapshot as Record<string, unknown> | null) ||
                    null,
                );
                const lineTotal = unitAmount * item.quantity;
                return (
                  <article
                    key={item.id}
                    className="rounded-xl border border-neutral-200 bg-white p-5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-lg font-semibold text-text-primary">
                          {item.variant?.title || '옵션 정보 없음'}
                        </p>
                        <p className="text-sm text-text-secondary">
                          {item.variant?.product?.title || '상품 정보 없음'}
                        </p>
                        <p className="mt-2 text-sm text-text-secondary">
                          개당 {formatCurrency(unitAmount)}
                        </p>
                      </div>
                      <Button
                        intent="ghost"
                        size="sm"
                        disabled={isUpdating}
                        onClick={() => void handleRemoveItem(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                        삭제
                      </Button>
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Button
                          intent="secondary"
                          size="sm"
                          disabled={item.quantity <= 1 || isUpdating}
                          onClick={() =>
                            void handleQuantityChange(item.id, item.quantity - 1)
                          }
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="w-10 text-center text-sm font-semibold text-text-primary">
                          {item.quantity}
                        </span>
                        <Button
                          intent="secondary"
                          size="sm"
                          disabled={isUpdating}
                          onClick={() =>
                            void handleQuantityChange(item.id, item.quantity + 1)
                          }
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>

                      <p className="text-base font-semibold text-text-primary">
                        {formatCurrency(lineTotal)}
                      </p>
                    </div>
                  </article>
                );
              })}
            </section>

            <aside className="h-fit rounded-xl border border-neutral-200 bg-white p-5">
              <h2 className="text-lg font-semibold text-text-primary">주문 요약</h2>
              <dl className="mt-4 space-y-2 text-sm text-text-secondary">
                <div className="flex items-center justify-between">
                  <dt>상품 개수</dt>
                  <dd className="font-medium text-text-primary">{cart?.item_count ?? 0}개</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt>총 수량</dt>
                  <dd className="font-medium text-text-primary">
                    {cart?.quantity_total ?? 0}개
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt>기본 배송비 (예상)</dt>
                  <dd className="font-medium text-text-primary">
                    {formatCurrency(estimatedShippingFee)}
                  </dd>
                </div>
                <div className="flex items-center justify-between pt-2 text-base">
                  <dt className="font-semibold text-text-primary">예상 결제 금액</dt>
                  <dd className="font-bold text-primary-700">
                    {formatCurrency(estimatedPayableAmount)}
                  </dd>
                </div>
              </dl>
              <Button
                intent="primary"
                size="lg"
                fullWidth
                className="mt-5"
                onClick={() => router.push('/checkout')}
              >
                체크아웃 진행
              </Button>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
