'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AddressInput } from '@/components/form';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Loading } from '@/components/ui/loading';
import { Select } from '@/components/ui/select';
import { useProfile } from '@/lib/client/hooks';
import {
  useV2CheckoutCart,
  useV2CreateOrder,
  useV2ValidateCheckout,
} from '@/lib/client/hooks/useV2Checkout';
import { useV2ShopCampaigns, useV2ShopCoupons } from '@/lib/client/hooks/useV2Shop';
import { ApiError } from '@/lib/client/utils/api-error';
import { useToast } from '@/src/components/toast';

interface AddressFormState {
  recipient_name: string;
  phone: string;
  postcode: string;
  line1: string;
  line2: string;
  memo: string;
}

const DEFAULT_ADDRESS: AddressFormState = {
  recipient_name: '',
  phone: '',
  postcode: '',
  line1: '',
  line2: '',
  memo: '',
};
const BASE_SHIPPING_FEE = 3500;

function readNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
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

function readQuoteSummary(quote: Record<string, unknown> | null) {
  const summary =
    quote && typeof quote.summary === 'object'
      ? (quote.summary as Record<string, unknown>)
      : {};

  return {
    subtotal: readNumber(summary.subtotal),
    itemDiscount: readNumber(summary.item_discount_total),
    orderDiscount: readNumber(summary.order_level_discount_total),
    shipping: readNumber(summary.shipping_amount),
    shippingDiscount: readNumber(summary.shipping_discount_total),
    total: readNumber(summary.total_payable_amount),
  };
}

function createIdempotencyKey() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `checkout-${crypto.randomUUID()}`;
  }
  return `checkout-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizePostcode(value: string): string | null {
  const digits = value.replace(/\D/g, '');
  if (!/^\d{5}$/.test(digits)) {
    return null;
  }
  return digits;
}

function extractPostcodeFromAddress(value: string | null | undefined): string {
  if (!value) {
    return '';
  }
  const matched = value.match(/\b\d{5}\b/);
  return matched ? matched[0] : '';
}

interface CustomerTouchedState {
  name: boolean;
  email: boolean;
  phone: boolean;
}

interface AddressTouchedState {
  recipient_name: boolean;
  phone: boolean;
  postcode: boolean;
  line1: boolean;
  line2: boolean;
  memo: boolean;
}

export default function V2CheckoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const { data: profile } = useProfile();
  const { data: cart, isLoading, error, refetch } = useV2CheckoutCart();
  const validateCheckout = useV2ValidateCheckout();
  const createOrder = useV2CreateOrder();
  const campaignIdFromRoute = searchParams.get('campaign_id')?.trim() || '';

  const [campaignId, setCampaignId] = useState(campaignIdFromRoute);
  const [campaignTouched, setCampaignTouched] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [shippingAddress, setShippingAddress] = useState<AddressFormState>({
    ...DEFAULT_ADDRESS,
  });
  const [billingSameAsShipping, setBillingSameAsShipping] = useState(true);
  const [billingAddress, setBillingAddress] = useState<AddressFormState>({
    ...DEFAULT_ADDRESS,
  });
  const [quoteSnapshot, setQuoteSnapshot] = useState<Record<string, unknown> | null>(
    null,
  );
  const [isOrderTransitioning, setIsOrderTransitioning] = useState(false);
  const [customerTouched, setCustomerTouched] = useState<CustomerTouchedState>({
    name: false,
    email: false,
    phone: false,
  });
  const [shippingTouched, setShippingTouched] = useState<AddressTouchedState>({
    recipient_name: false,
    phone: false,
    postcode: false,
    line1: false,
    line2: false,
    memo: false,
  });
  const [billingTouched, setBillingTouched] = useState<AddressTouchedState>({
    recipient_name: false,
    phone: false,
    postcode: false,
    line1: false,
    line2: false,
    memo: false,
  });

  const hasAuthError = error instanceof ApiError && error.isAuthError();
  const items = cart?.items ?? [];
  const isCartEmpty = items.length === 0;
  const { data: campaignOptionsData = [] } = useV2ShopCampaigns({
    channel: 'WEB',
    include_upcoming: true,
  });

  const cartCampaignIds = useMemo(
    () =>
      Array.from(
        new Set(
          (cart?.items || [])
            .map((item) => item.campaign_id)
            .filter((value): value is string => Boolean(value)),
        ),
      ),
    [cart?.items],
  );
  const effectiveCampaignId = useMemo(() => {
    if (campaignTouched) {
      return campaignId.trim();
    }
    if (campaignId.trim()) {
      return campaignId.trim();
    }
    if (campaignIdFromRoute) {
      return campaignIdFromRoute;
    }
    if (cartCampaignIds.length === 1) {
      return cartCampaignIds[0];
    }
    return '';
  }, [campaignId, campaignIdFromRoute, campaignTouched, cartCampaignIds]);

  const selectedCampaign = useMemo(
    () =>
      campaignOptionsData.find((campaign) => campaign.id === effectiveCampaignId) ||
      null,
    [campaignOptionsData, effectiveCampaignId],
  );
  const campaignSelectOptions = useMemo(() => {
    const base = [
      {
        value: '',
        label: '상시 판매(기본)',
      },
      ...campaignOptionsData.map((campaign) => ({
        value: campaign.id,
        label: campaign.name,
      })),
    ];

    if (
      effectiveCampaignId &&
      !base.some((option) => option.value === effectiveCampaignId)
    ) {
      return [
        ...base,
        {
          value: effectiveCampaignId,
          label: `선택된 캠페인 (${effectiveCampaignId.slice(0, 8)}...)`,
        },
      ];
    }
    return base;
  }, [campaignOptionsData, effectiveCampaignId]);
  const { data: couponOptionsData = [] } = useV2ShopCoupons({
    channel: 'WEB',
    campaign_id: effectiveCampaignId || undefined,
  });
  const couponSelectOptions = useMemo(
    () => [
      { value: '', label: '쿠폰 선택 안 함' },
      ...couponOptionsData.map((coupon) => ({
        value: coupon.code,
        label: `${coupon.code} (${coupon.promotion_name})`,
      })),
    ],
    [couponOptionsData],
  );
  const couponCodeForSelect = useMemo(() => {
    const normalized = couponCode.trim();
    if (!normalized) {
      return '';
    }
    return couponSelectOptions.some((option) => option.value === normalized)
      ? normalized
      : '';
  }, [couponCode, couponSelectOptions]);

  const shippingRequired = items.some(
    (item) => item.variant?.requires_shipping === true,
  );

  const fallbackSubtotal = items.reduce((sum, item) => {
    const snapshot =
      (item.display_price_snapshot as Record<string, unknown> | null) || null;
    const unit =
      readNumber(snapshot?.final_unit_amount) ||
      readNumber(snapshot?.sale_unit_amount) ||
      readNumber(snapshot?.unit_amount) ||
      readNumber(snapshot?.amount);
    return sum + unit * item.quantity;
  }, 0);

  const quoteTotals = useMemo(() => {
    if (!quoteSnapshot) {
      const fallbackShipping = shippingRequired ? BASE_SHIPPING_FEE : 0;
      return {
        subtotal: fallbackSubtotal,
        itemDiscount: 0,
        orderDiscount: 0,
        shipping: fallbackShipping,
        shippingDiscount: 0,
        total: fallbackSubtotal + fallbackShipping,
      };
    }
    return readQuoteSummary(quoteSnapshot);
  }, [fallbackSubtotal, quoteSnapshot, shippingRequired]);

  const profileAddressPrefill = useMemo(
    () => ({
      recipient_name: profile?.name || '',
      phone: profile?.phone || '',
      postcode: extractPostcodeFromAddress(profile?.main_address),
      line1: profile?.main_address || '',
      line2: profile?.detail_address || '',
      memo: '',
    }),
    [profile],
  );

  const effectiveCustomer = useMemo(
    () => ({
      name: customerTouched.name ? customerName : customerName || profile?.name || '',
      email: customerTouched.email
        ? customerEmail
        : customerEmail || profile?.email || '',
      phone: customerTouched.phone ? customerPhone : customerPhone || profile?.phone || '',
    }),
    [customerEmail, customerName, customerPhone, customerTouched, profile],
  );

  const effectiveShippingAddress = useMemo(
    () => ({
      recipient_name: shippingTouched.recipient_name
        ? shippingAddress.recipient_name
        : shippingAddress.recipient_name || profileAddressPrefill.recipient_name,
      phone: shippingTouched.phone
        ? shippingAddress.phone
        : shippingAddress.phone || profileAddressPrefill.phone,
      postcode: shippingTouched.postcode
        ? shippingAddress.postcode
        : shippingAddress.postcode || profileAddressPrefill.postcode,
      line1: shippingTouched.line1
        ? shippingAddress.line1
        : shippingAddress.line1 || profileAddressPrefill.line1,
      line2: shippingTouched.line2
        ? shippingAddress.line2
        : shippingAddress.line2 || profileAddressPrefill.line2,
      memo: shippingTouched.memo ? shippingAddress.memo : shippingAddress.memo || '',
    }),
    [profileAddressPrefill, shippingAddress, shippingTouched],
  );

  const effectiveBillingAddress = useMemo(
    () => ({
      recipient_name: billingTouched.recipient_name
        ? billingAddress.recipient_name
        : billingAddress.recipient_name || profileAddressPrefill.recipient_name,
      phone: billingTouched.phone
        ? billingAddress.phone
        : billingAddress.phone || profileAddressPrefill.phone,
      postcode: billingTouched.postcode
        ? billingAddress.postcode
        : billingAddress.postcode || profileAddressPrefill.postcode,
      line1: billingTouched.line1
        ? billingAddress.line1
        : billingAddress.line1 || profileAddressPrefill.line1,
      line2: billingTouched.line2
        ? billingAddress.line2
        : billingAddress.line2 || profileAddressPrefill.line2,
      memo: billingTouched.memo ? billingAddress.memo : billingAddress.memo || '',
    }),
    [billingAddress, billingTouched, profileAddressPrefill],
  );

  function requestLogin() {
    const checkoutPath = effectiveCampaignId
      ? `/checkout?campaign_id=${encodeURIComponent(effectiveCampaignId)}`
      : '/checkout';
    router.push(`/login?redirect=${encodeURIComponent(checkoutPath)}`);
  }

  async function runCheckoutValidation(options?: {
    shippingPostcodeOverride?: string | null;
    silent?: boolean;
  }) {
    const shippingPostcode = shippingRequired
      ? options?.shippingPostcodeOverride ??
        normalizePostcode(effectiveShippingAddress.postcode)
      : null;

    if (shippingRequired && !shippingPostcode) {
      setQuoteSnapshot(null);
      if (!options?.silent) {
        showToast('배송비 계산을 위해 5자리 우편번호를 입력해 주세요.', {
          type: 'warning',
        });
      }
      return null;
    }

    try {
      const result = await validateCheckout.mutateAsync({
        campaign_id: effectiveCampaignId || null,
        coupon_code: couponCode.trim() || null,
        channel: 'WEB',
        shipping_postcode: shippingPostcode,
      });
      const nextQuote = (result.quote as Record<string, unknown>) || null;
      setQuoteSnapshot(nextQuote);
      if (!options?.silent) {
        showToast('주문 금액 검증이 완료되었습니다.', { type: 'success' });
      }
      return nextQuote;
    } catch (mutationError) {
      if (mutationError instanceof ApiError && mutationError.isAuthError()) {
        requestLogin();
        return null;
      }
      showToast(getErrorMessage(mutationError), { type: 'error' });
      return null;
    }
  }

  async function handleCreateOrder() {
    const shippingPostcode = shippingRequired
      ? normalizePostcode(effectiveShippingAddress.postcode)
      : null;

    if (shippingRequired && !effectiveShippingAddress.line1.trim()) {
      showToast('배송지 주소를 입력해 주세요.', { type: 'warning' });
      return;
    }
    if (shippingRequired && !shippingPostcode) {
      showToast('배송비 계산을 위해 5자리 우편번호를 입력해 주세요.', {
        type: 'warning',
      });
      return;
    }

    const ensuredQuote =
      quoteSnapshot ||
      (await runCheckoutValidation({
        shippingPostcodeOverride: shippingPostcode,
        silent: true,
      }));
    if (!ensuredQuote) {
      return;
    }

    try {
      const selectedBillingAddress = billingSameAsShipping
        ? effectiveShippingAddress
        : effectiveBillingAddress;

      setIsOrderTransitioning(true);
      const result = await createOrder.mutateAsync({
        idempotency_key: createIdempotencyKey(),
        campaign_id: effectiveCampaignId || null,
        coupon_code: couponCode.trim() || null,
        channel: 'WEB',
        shipping_postcode: shippingPostcode,
        customer_snapshot: {
          name: effectiveCustomer.name.trim() || null,
          email: effectiveCustomer.email.trim() || null,
          phone: effectiveCustomer.phone.trim() || null,
        },
        shipping_address_snapshot: shippingRequired
          ? {
              ...effectiveShippingAddress,
            }
          : null,
        billing_address_snapshot: selectedBillingAddress.line1.trim()
          ? {
              ...selectedBillingAddress,
            }
          : null,
        metadata: {
          source: 'checkout-page',
        },
      });

      showToast('주문이 생성되었습니다.', { type: 'success' });
      router.push(`/order/processing/${result.order.id}`);
    } catch (mutationError) {
      if (mutationError instanceof ApiError && mutationError.isAuthError()) {
        setIsOrderTransitioning(false);
        requestLogin();
        return;
      }
      setIsOrderTransitioning(false);
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
          title={hasAuthError ? '로그인이 필요합니다' : '체크아웃 정보를 불러오지 못했습니다'}
          description={
            hasAuthError
              ? '로그인 후 결제를 진행할 수 있습니다.'
              : getErrorMessage(error)
          }
          action={
            hasAuthError ? (
              <Link href="/login?redirect=/checkout">
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

  if (isOrderTransitioning) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
        <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-8 text-center">
          <Loading size="lg" />
          <h1 className="mt-6 text-2xl font-bold text-text-primary">
            주문 정보를 처리 중입니다
          </h1>
          <p className="mt-2 text-sm text-text-secondary">
            잠시만 기다려 주세요. 주문 완료 화면으로 이동합니다.
          </p>
        </div>
      </div>
    );
  }

  if (isCartEmpty) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
        <EmptyState
          title="장바구니가 비어 있습니다"
          description="상품을 장바구니에 담은 뒤 결제를 진행해 주세요."
          action={
            <Link href="/shop">
              <Button intent="primary" size="md">
                상점으로 이동
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 py-8">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-4 lg:grid-cols-[1fr_360px]">
        <section className="space-y-6 rounded-2xl border border-neutral-200 bg-white p-6">
          <div>
            <h1 className="text-3xl font-bold text-text-primary">체크아웃</h1>
            <p className="mt-1 text-sm text-text-secondary">
              주문자 정보를 입력하고 금액을 검증한 뒤 주문을 생성합니다.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-text-primary">주문 상품</h2>
            {items.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-neutral-200 bg-neutral-50 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-text-primary">
                      {item.variant?.title || '옵션 정보 없음'}
                    </p>
                    <p className="text-sm text-text-secondary">
                      {item.variant?.product?.title || '상품 정보 없음'}
                    </p>
                  </div>
                  <p className="text-sm font-medium text-text-primary">
                    수량 {item.quantity}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-text-primary">
                주문자 이름
              </label>
              <Input
                value={effectiveCustomer.name}
                onChange={(event) => {
                  setCustomerTouched((prev) => ({ ...prev, name: true }));
                  setCustomerName(event.target.value);
                }}
                placeholder="홍길동"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-text-primary">
                주문자 이메일
              </label>
              <Input
                type="email"
                value={effectiveCustomer.email}
                onChange={(event) => {
                  setCustomerTouched((prev) => ({ ...prev, email: true }));
                  setCustomerEmail(event.target.value);
                }}
                placeholder="name@example.com"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-text-primary">
                주문자 연락처
              </label>
              <Input
                value={effectiveCustomer.phone}
                onChange={(event) => {
                  setCustomerTouched((prev) => ({ ...prev, phone: true }));
                  setCustomerPhone(event.target.value);
                }}
                placeholder="010-0000-0000"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-text-primary">
                캠페인 (선택)
              </label>
              <Select
                size="md"
                className="bg-white"
                value={effectiveCampaignId}
                onChange={(event) => {
                  setCampaignTouched(true);
                  setCampaignId(event.target.value);
                  setQuoteSnapshot(null);
                }}
                options={campaignSelectOptions}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-text-primary">
                추천 쿠폰 (선택)
              </label>
              <Select
                size="md"
                className="bg-white"
                value={couponCodeForSelect}
                onChange={(event) => {
                  setCouponCode(event.target.value);
                  setQuoteSnapshot(null);
                }}
                options={couponSelectOptions}
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-text-primary">
                쿠폰 코드 (직접 입력 가능)
              </label>
              <Input
                value={couponCode}
                onChange={(event) => {
                  setCouponCode(event.target.value);
                  setQuoteSnapshot(null);
                }}
                placeholder="쿠폰 코드 입력"
              />
              <p className="mt-1 text-xs text-text-secondary">
                추천 쿠폰을 선택하거나 쿠폰 코드를 직접 입력할 수 있습니다.
              </p>
            </div>
          </div>

          {(selectedCampaign || cartCampaignIds.length > 1) && (
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-sm text-text-secondary">
              {selectedCampaign
                ? `현재 "${selectedCampaign.name}" 캠페인 기준으로 결제를 검증합니다.`
                : `장바구니에 여러 캠페인 상품이 포함되어 있습니다. 결제 기준 캠페인을 선택하세요.`}
            </div>
          )}

          {shippingRequired && (
            <div className="space-y-3 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
              <h3 className="font-semibold text-text-primary">배송 정보</h3>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Input
                  value={effectiveShippingAddress.recipient_name}
                  className="bg-white"
                  onChange={(event) =>
                    {
                      setShippingTouched((prev) => ({
                        ...prev,
                        recipient_name: true,
                      }));
                      setShippingAddress((prev) => ({
                        ...prev,
                        recipient_name: event.target.value,
                      }));
                    }
                  }
                  placeholder="수령인"
                />
                <Input
                  value={effectiveShippingAddress.phone}
                  className="bg-white"
                  onChange={(event) =>
                    {
                      setShippingTouched((prev) => ({ ...prev, phone: true }));
                      setShippingAddress((prev) => ({ ...prev, phone: event.target.value }));
                    }
                  }
                  placeholder="연락처"
                />
              </div>
              <div>
                <AddressInput
                  mainAddressId="shipping-line1"
                  mainAddressLabel="배송 주소"
                  mainAddressValue={effectiveShippingAddress.line1}
                  onMainAddressChange={(value) => {
                    const extractedPostcode = extractPostcodeFromAddress(value);
                    setShippingTouched((prev) => ({
                      ...prev,
                      line1: true,
                      postcode: true,
                    }));
                    setShippingAddress((prev) => ({
                      ...prev,
                      line1: value,
                      postcode: extractedPostcode,
                    }));
                    if (extractedPostcode) {
                      void runCheckoutValidation({
                        shippingPostcodeOverride: extractedPostcode,
                        silent: true,
                      });
                    } else {
                      setQuoteSnapshot(null);
                    }
                  }}
                  detailAddressId="shipping-line2"
                  detailAddressLabel="상세 주소"
                  detailAddressValue={effectiveShippingAddress.line2}
                  onDetailAddressChange={(value) => {
                    setShippingTouched((prev) => ({ ...prev, line2: true }));
                    setShippingAddress((prev) => ({
                      ...prev,
                      line2: value,
                    }));
                  }}
                  detailAddressInputClassName="bg-white"
                  showDetailAlways
                  searchButtonText="배송지 주소 검색"
                  searchButtonClassName="bg-white"
                />
              </div>
            </div>
          )}

          <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
            <label className="flex items-center gap-2 text-sm text-text-primary">
              <input
                type="checkbox"
                checked={billingSameAsShipping}
                onChange={(event) => setBillingSameAsShipping(event.target.checked)}
              />
              청구지 정보는 배송지와 동일
            </label>

            {!billingSameAsShipping && (
              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                <Input
                  value={effectiveBillingAddress.recipient_name}
                  onChange={(event) =>
                    {
                      setBillingTouched((prev) => ({
                        ...prev,
                        recipient_name: true,
                      }));
                      setBillingAddress((prev) => ({
                        ...prev,
                        recipient_name: event.target.value,
                      }));
                    }
                  }
                  placeholder="청구지 수령인"
                />
                <Input
                  value={effectiveBillingAddress.phone}
                  onChange={(event) =>
                    {
                      setBillingTouched((prev) => ({ ...prev, phone: true }));
                      setBillingAddress((prev) => ({ ...prev, phone: event.target.value }));
                    }
                  }
                  placeholder="청구지 연락처"
                />
                <Input
                  value={effectiveBillingAddress.postcode}
                  onChange={(event) =>
                    {
                      setBillingTouched((prev) => ({ ...prev, postcode: true }));
                      setBillingAddress((prev) => ({
                        ...prev,
                        postcode: event.target.value,
                      }));
                    }
                  }
                  placeholder="청구지 우편번호"
                />
                <Input
                  value={effectiveBillingAddress.line1}
                  onChange={(event) =>
                    {
                      setBillingTouched((prev) => ({ ...prev, line1: true }));
                      setBillingAddress((prev) => ({ ...prev, line1: event.target.value }));
                    }
                  }
                  placeholder="청구지 기본 주소"
                />
                <div className="md:col-span-2">
                  <Input
                    value={effectiveBillingAddress.line2}
                    onChange={(event) =>
                      {
                        setBillingTouched((prev) => ({ ...prev, line2: true }));
                        setBillingAddress((prev) => ({
                          ...prev,
                          line2: event.target.value,
                        }));
                      }
                    }
                    placeholder="청구지 상세 주소"
                  />
                </div>
              </div>
            )}
          </div>
        </section>

        <aside className="h-fit rounded-2xl border border-neutral-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-text-primary">결제 요약</h2>
          <dl className="mt-4 space-y-2 text-sm text-text-secondary">
            <div className="flex justify-between">
              <dt>상품 금액</dt>
              <dd className="font-medium text-text-primary">
                {formatCurrency(quoteTotals.subtotal)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt>상품 할인</dt>
              <dd>-{formatCurrency(quoteTotals.itemDiscount)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>주문 할인</dt>
              <dd>-{formatCurrency(quoteTotals.orderDiscount)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>배송비</dt>
              <dd>{formatCurrency(quoteTotals.shipping)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>배송 할인</dt>
              <dd>-{formatCurrency(quoteTotals.shippingDiscount)}</dd>
            </div>
            <div className="mt-3 flex justify-between border-t border-neutral-200 pt-3 text-base">
              <dt className="font-semibold text-text-primary">최종 결제 금액</dt>
              <dd className="font-bold text-primary-700">
                {formatCurrency(quoteTotals.total)}
              </dd>
            </div>
          </dl>

          <div className="mt-5 space-y-2">
            <Button
              intent="primary"
              size="lg"
              fullWidth
              loading={
                createOrder.isPending ||
                validateCheckout.isPending ||
                isOrderTransitioning
              }
              disabled={validateCheckout.isPending || isOrderTransitioning}
              onClick={() => void handleCreateOrder()}
            >
              주문 생성
            </Button>
            <p className="text-xs text-text-secondary">
              배송지 주소 검색 시 금액이 자동으로 검증됩니다.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
