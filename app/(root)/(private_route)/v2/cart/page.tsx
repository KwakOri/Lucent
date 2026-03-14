'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowRight, Minus, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { Loading } from '@/components/ui/loading';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import {
  useV2AddCartItem,
  useV2CheckoutCart,
  useV2RemoveCartItem,
  useV2UpdateCartItemQuantity,
} from '@/lib/client/hooks/useV2Checkout';
import {
  useV2AdminProducts,
  useV2AdminVariants,
} from '@/lib/client/hooks/useV2CatalogAdmin';

function getErrorMessage(error: unknown): string {
  if (error && typeof error === 'object') {
    const maybe = error as {
      message?: string;
      response?: { data?: { message?: string } };
    };
    if (maybe.response?.data?.message) {
      return maybe.response.data.message;
    }
    if (maybe.message) {
      return maybe.message;
    }
  }
  return '요청 처리 중 오류가 발생했습니다.';
}

function parseOptionalObject(
  raw: string,
  fieldName: string,
): Record<string, unknown> | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = JSON.parse(trimmed);
  if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') {
    throw new Error(`${fieldName}은 JSON object여야 합니다.`);
  }
  return parsed as Record<string, unknown>;
}

function toNullable(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export default function V2CartPage() {
  const [selectedProductId, setSelectedProductId] = useState('');
  const [variantId, setVariantId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [campaignId, setCampaignId] = useState('');
  const [bundleConfigText, setBundleConfigText] = useState('');
  const [displayPriceText, setDisplayPriceText] = useState('');
  const [metadataText, setMetadataText] = useState('{}');
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [processingItemId, setProcessingItemId] = useState<string | null>(null);

  const {
    data: cart,
    isLoading,
    error,
    refetch,
  } = useV2CheckoutCart();
  const addCartItem = useV2AddCartItem();
  const updateQuantity = useV2UpdateCartItemQuantity();
  const removeCartItem = useV2RemoveCartItem();

  const { data: products, error: productsError } = useV2AdminProducts({
    status: 'ACTIVE',
  });
  const { data: variants, error: variantsError } = useV2AdminVariants(
    selectedProductId || null,
  );

  const itemCount = cart?.item_count ?? 0;
  const quantityTotal = cart?.quantity_total ?? 0;
  const items = cart?.items ?? [];

  async function handleAddItem() {
    setMessage(null);
    setErrorMessage(null);

    try {
      const parsedQuantity = Number.parseInt(quantity, 10);
      if (!variantId.trim()) {
        throw new Error('variant_id를 입력하세요.');
      }
      if (!Number.isInteger(parsedQuantity) || parsedQuantity <= 0) {
        throw new Error('수량은 1 이상의 정수여야 합니다.');
      }

      const payload = {
        variant_id: variantId.trim(),
        quantity: parsedQuantity,
        campaign_id: toNullable(campaignId),
        bundle_configuration_snapshot: parseOptionalObject(
          bundleConfigText,
          'bundle_configuration_snapshot',
        ),
        display_price_snapshot: parseOptionalObject(
          displayPriceText,
          'display_price_snapshot',
        ),
        metadata: parseOptionalObject(metadataText, 'metadata'),
      };

      await addCartItem.mutateAsync(payload);
      setMessage('v2 cart에 item을 추가했습니다.');
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  }

  async function handleQuantityChange(itemId: string, nextQuantity: number) {
    if (nextQuantity <= 0) {
      return;
    }
    setProcessingItemId(itemId);
    setMessage(null);
    setErrorMessage(null);

    try {
      await updateQuantity.mutateAsync({
        itemId,
        data: { quantity: nextQuantity },
      });
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setProcessingItemId(null);
    }
  }

  async function handleRemove(itemId: string) {
    setProcessingItemId(itemId);
    setMessage(null);
    setErrorMessage(null);

    try {
      await removeCartItem.mutateAsync(itemId);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setProcessingItemId(null);
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <Loading size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
        <EmptyState
          title="v2 장바구니를 불러오지 못했습니다"
          description={getErrorMessage(error)}
          action={{
            label: '다시 시도',
            onClick: () => {
              void refetch();
            },
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 py-8">
      <div className="max-w-5xl mx-auto px-4 space-y-6">
        <section className="bg-white rounded-xl border border-neutral-200 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-text-primary">
                v2 장바구니 테스트 페이지
              </h1>
              <p className="text-sm text-text-secondary mt-1">
                기존 v1 경로와 분리된 v2 전용 장바구니 경로입니다.
              </p>
              <div className="mt-3 flex items-center gap-3 text-sm text-text-secondary">
                <span>item_count: {itemCount}</span>
                <span>quantity_total: {quantityTotal}</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/cart">
                <Button intent="secondary" size="sm">
                  v1 장바구니
                </Button>
              </Link>
              <Link href="/v2/checkout">
                <Button intent="primary" size="sm">
                  v2 체크아웃
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-xl border border-neutral-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-text-primary">v2 cart item 추가</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                제품 선택(관리자 전용 조회)
              </label>
              <select
                className="w-full h-11 px-3 border border-neutral-200 rounded-lg text-sm"
                value={selectedProductId}
                onChange={(event) => {
                  const next = event.target.value;
                  setSelectedProductId(next);
                  setVariantId('');
                }}
              >
                <option value="">직접 variant_id 입력</option>
                {(products ?? []).map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.title} ({product.id.slice(0, 8)}...)
                  </option>
                ))}
              </select>
              {productsError ? (
                <p className="text-xs text-amber-600 mt-1">
                  제품 목록 조회 실패(관리자 권한 필요): {getErrorMessage(productsError)}
                </p>
              ) : null}
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                variant 선택(관리자 전용 조회)
              </label>
              <select
                className="w-full h-11 px-3 border border-neutral-200 rounded-lg text-sm"
                value={variantId}
                onChange={(event) => setVariantId(event.target.value)}
              >
                <option value="">variant_id 직접 입력 또는 선택</option>
                {(variants ?? []).map((variant) => (
                  <option key={variant.id} value={variant.id}>
                    {variant.title} / {variant.sku} ({variant.id.slice(0, 8)}...)
                  </option>
                ))}
              </select>
              {variantsError ? (
                <p className="text-xs text-amber-600 mt-1">
                  variant 목록 조회 실패: {getErrorMessage(variantsError)}
                </p>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                variant_id
              </label>
              <Input
                value={variantId}
                onChange={(event) => setVariantId(event.target.value)}
                placeholder="UUID"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                quantity
              </label>
              <Input
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                placeholder="1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                campaign_id (optional)
              </label>
              <Input
                value={campaignId}
                onChange={(event) => setCampaignId(event.target.value)}
                placeholder="UUID"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                bundle_configuration_snapshot (JSON)
              </label>
              <Textarea
                rows={3}
                value={bundleConfigText}
                onChange={(event) => setBundleConfigText(event.target.value)}
                placeholder='{"component_id":"variant_id"}'
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                display_price_snapshot (JSON)
              </label>
              <Textarea
                rows={3}
                value={displayPriceText}
                onChange={(event) => setDisplayPriceText(event.target.value)}
                placeholder='{"unit_amount":10000}'
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                metadata (JSON)
              </label>
              <Textarea
                rows={3}
                value={metadataText}
                onChange={(event) => setMetadataText(event.target.value)}
                placeholder='{"source":"v2-cart-page"}'
              />
            </div>
          </div>

          {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
          {errorMessage ? <p className="text-sm text-red-600">{errorMessage}</p> : null}

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => {
                void handleAddItem();
              }}
              loading={addCartItem.isPending}
            >
              item 추가
            </Button>
            <Button
              intent="secondary"
              onClick={() => {
                void refetch();
              }}
              loading={isLoading}
            >
              <RefreshCw className="w-4 h-4" />
              새로고침
            </Button>
          </div>
        </section>

        <section className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-neutral-200">
            <h2 className="text-lg font-semibold text-text-primary">현재 v2 cart items</h2>
          </div>

          {items.length === 0 ? (
            <div className="p-6">
              <EmptyState
                title="v2 장바구니가 비어 있습니다"
                description="variant_id를 입력해 item을 추가한 뒤 체크아웃 흐름을 테스트하세요."
              />
            </div>
          ) : (
            <div className="divide-y divide-neutral-200">
              {items.map((item) => {
                const disabled = processingItemId === item.id;
                const productTitle =
                  item.variant?.product?.title || item.variant?.title || item.variant_id;

                return (
                  <div key={item.id} className={`p-6 ${disabled ? 'opacity-50' : ''}`}>
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div className="space-y-1">
                        <p className="font-semibold text-text-primary">{productTitle}</p>
                        <p className="text-sm text-text-secondary">
                          variant_id: {item.variant_id}
                        </p>
                        <p className="text-xs text-text-secondary">
                          product_kind: {item.product_kind_snapshot} / added_via:{' '}
                          {item.added_via}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          className="w-8 h-8 border border-neutral-300 rounded-lg flex items-center justify-center hover:bg-neutral-100 disabled:opacity-50"
                          onClick={() =>
                            void handleQuantityChange(item.id, item.quantity - 1)
                          }
                          disabled={disabled || item.quantity <= 1}
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-10 text-center font-semibold">
                          {item.quantity}
                        </span>
                        <button
                          className="w-8 h-8 border border-neutral-300 rounded-lg flex items-center justify-center hover:bg-neutral-100 disabled:opacity-50"
                          onClick={() =>
                            void handleQuantityChange(item.id, item.quantity + 1)
                          }
                          disabled={disabled}
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                        <Button
                          intent="ghost"
                          size="sm"
                          onClick={() => {
                            void handleRemove(item.id);
                          }}
                          disabled={disabled}
                        >
                          <Trash2 className="w-4 h-4" />
                          삭제
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
