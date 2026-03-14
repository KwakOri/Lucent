'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { Loading } from '@/components/ui/loading';
import {
  useActivateV2Campaign,
  useBuildV2PriceQuote,
  useCloseV2Campaign,
  useCreateV2Campaign,
  useCreateV2Coupon,
  useCreateV2PriceList,
  useCreateV2Promotion,
  useEvaluateV2Promotions,
  usePublishV2PriceList,
  useRedeemV2CouponRedemption,
  useReleaseV2CouponRedemption,
  useReserveV2Coupon,
  useRollbackV2PriceList,
  useSuspendV2Campaign,
  useV2Campaigns,
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

export default function V2CatalogPricingPage() {
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [campaignCode, setCampaignCode] = useState('');
  const [campaignName, setCampaignName] = useState('');
  const [campaignType, setCampaignType] = useState<'POPUP' | 'EVENT' | 'SALE' | 'DROP' | 'ALWAYS_ON'>('EVENT');

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
  const { data: priceLists, isLoading: priceListsLoading, error: priceListsError } = useV2PriceLists();
  const { data: promotions, isLoading: promotionsLoading, error: promotionsError } = useV2Promotions();
  const { data: coupons, isLoading: couponsLoading, error: couponsError } = useV2Coupons();
  const { data: orderSnapshotContract } = useV2OrderSnapshotContract();

  const createCampaign = useCreateV2Campaign();
  const activateCampaign = useActivateV2Campaign();
  const suspendCampaign = useSuspendV2Campaign();
  const closeCampaign = useCloseV2Campaign();

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
      await createCampaign.mutateAsync({
        code: campaignCode.trim(),
        name: campaignName.trim(),
        campaign_type: campaignType,
      });
      setCampaignCode('');
      setCampaignName('');
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

      <section className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900">Campaign Ops</h2>
        <form className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4" onSubmit={handleCreateCampaign}>
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
            onChange={(event) => setCampaignType(event.target.value as typeof campaignType)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="EVENT">EVENT</option>
            <option value="POPUP">POPUP</option>
            <option value="SALE">SALE</option>
            <option value="DROP">DROP</option>
            <option value="ALWAYS_ON">ALWAYS_ON</option>
          </select>
          <Button type="submit" loading={createCampaign.isPending}>
            campaign 생성
          </Button>
        </form>

        <div className="mt-4 space-y-2">
          {(campaigns || []).map((campaign) => (
            <div
              key={campaign.id}
              className="flex flex-col gap-2 rounded-md border border-gray-200 p-3 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <p className="font-medium text-gray-900">
                  {campaign.code} - {campaign.name}
                </p>
                <p className="text-xs text-gray-500">
                  {campaign.campaign_type} / {campaign.status} / {campaign.id}
                </p>
              </div>
              <div className="flex gap-2">
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
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-6">
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

      <section className="rounded-lg border border-gray-200 bg-white p-6">
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

      <section className="rounded-lg border border-gray-200 bg-white p-6">
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

      <section className="rounded-lg border border-gray-200 bg-white p-6">
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

      <section className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900">Order Snapshot Contract</h2>
        <pre className="mt-4 overflow-auto rounded-md bg-gray-900 p-3 text-xs text-gray-100">
          {JSON.stringify(orderSnapshotContract, null, 2)}
        </pre>
      </section>
    </div>
  );
}
