/**
 * Cart Checkout Page
 *
 * 장바구니 주문/결제 페이지
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Loading } from '@/components/ui/loading';
import { EmptyState } from '@/components/ui/empty-state';
import { Checkbox } from '@/components/ui/checkbox';
import { CartOrderSummary } from '@/components/order/CartOrderSummary';
import { OrderSummary } from '@/components/order';
import { ShippingForm, BuyerInfoForm, type ShippingInfo, type BuyerInfo } from '@/components/order';
import { useCart, useClearCart } from '@/lib/client/hooks/useCart';
import { useCreateOrder } from '@/lib/client/hooks/useOrders';
import { useSession } from '@/lib/client/hooks/useAuth';
import { useProfile } from '@/lib/client/hooks';
import { useProduct } from '@/lib/client/hooks/useProducts';
import { SHIPPING_FEE } from '@/constants';

export default function CheckoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const productId = searchParams.get('product_id');

  // 단일 상품 주문 또는 장바구니 주문
  const { data: singleProduct, isLoading: isLoadingSingleProduct, error: singleProductError } = useProduct(productId || null);
  const { data: cartData, isLoading: isLoadingCart, error: cartError } = useCart();
  const { mutate: createOrder, isPending: isCreatingOrder } = useCreateOrder();
  const { mutate: clearCart } = useClearCart();
  const { user } = useSession();
  const { data: profile, isLoading: isLoadingProfile } = useProfile();

  // 주문 모드 결정
  const isSingleProductMode = !!productId;
  const isLoading = isSingleProductMode ? isLoadingSingleProduct : isLoadingCart;
  const error = isSingleProductMode ? singleProductError : cartError;

  const [buyerInfo, setBuyerInfo] = useState<BuyerInfo>({
    name: '',
    email: '',
    phone: '',
  });
  const [shippingInfo, setShippingInfo] = useState<ShippingInfo>({
    name: '',
    phone: '',
    mainAddress: '',
    detailAddress: '',
    memo: '',
  });
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [agreedToDigitalRefundPolicy, setAgreedToDigitalRefundPolicy] =
    useState(false);

  // 사용자 정보로 기본값 설정
  useEffect(() => {
    if (user && profile) {
      const nextBuyerInfo: BuyerInfo = {
        name: profile.name || '',
        email: profile.email || user.email || '',
        phone: profile.phone || '',
      };

      const nextShippingInfo: ShippingInfo = {
        name: profile.name || '',
        phone: profile.phone || '',
        mainAddress: profile.main_address || '',
        detailAddress: profile.detail_address || '',
        memo: '',
      };

      const timer = window.setTimeout(() => {
        setBuyerInfo(nextBuyerInfo);
        setShippingInfo(nextShippingInfo);
      }, 0);

      return () => window.clearTimeout(timer);
    }

    return undefined;
  }, [user, profile]);

  // 주문 상품 목록 및 배송비 계산
  const items = isSingleProductMode ? [] : (cartData?.items || []);
  const hasPhysicalGoods = isSingleProductMode
    ? singleProduct?.type === 'PHYSICAL_GOODS' || singleProduct?.type === 'BUNDLE'
    : items.some((item) => item.product.type === 'PHYSICAL_GOODS' || item.product.type === 'BUNDLE');
  const hasDigitalGoods = isSingleProductMode
    ? singleProduct?.type === 'VOICE_PACK'
    : items.some((item) => item.product.type === 'VOICE_PACK');

  // 배송비 (실물 굿즈 또는 번들 상품이 포함된 경우)
  const shippingFee = hasPhysicalGoods ? SHIPPING_FEE : 0;

  // 품절 확인 (단일 상품 모드)
  const isOutOfStock = isSingleProductMode && singleProduct
    ? singleProduct.stock !== null && singleProduct.stock <= 0
    : false;

  // 검증
  const isBuyerInfoValid =
    buyerInfo.name.trim().length >= 2 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(buyerInfo.email) &&
    /^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/.test(buyerInfo.phone.replace(/-/g, ''));

  const isShippingValid =
    !hasPhysicalGoods ||
    (shippingInfo.name.trim().length >= 2 &&
      /^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/.test(
        shippingInfo.phone.replace(/-/g, '')
      ) &&
      shippingInfo.mainAddress.trim().length > 0 &&
      shippingInfo.detailAddress.trim().length >= 2);

  const isFormValid =
    agreedToTerms &&
    (!hasDigitalGoods || agreedToDigitalRefundPolicy) &&
    isBuyerInfoValid &&
    isShippingValid;

  const handleSubmit = () => {
    if (!isFormValid) return;

    // 단일 상품 모드에서 상품이 없거나 품절인 경우
    if (isSingleProductMode && (!singleProduct || isOutOfStock)) return;

    // 장바구니 모드에서 상품이 없는 경우
    if (!isSingleProductMode && items.length === 0) return;

    const orderData: {
      items: Array<{ productId: string; quantity: number }>;
      buyerName: string;
      buyerEmail: string;
      buyerPhone: string;
      shippingName?: string;
      shippingPhone?: string;
      shippingMainAddress?: string;
      shippingDetailAddress?: string;
      shippingMemo?: string;
    } = {
      items: isSingleProductMode && singleProduct
        ? [{ productId: singleProduct.id, quantity: 1 }]
        : items.map((item) => ({
            productId: item.product_id,
            quantity: item.quantity,
          })),
      // 주문자 정보
      buyerName: buyerInfo.name,
      buyerEmail: buyerInfo.email,
      buyerPhone: buyerInfo.phone,
    };

    // 실물 굿즈가 포함된 경우 배송 정보 추가
    if (hasPhysicalGoods) {
      orderData.shippingName = shippingInfo.name;
      orderData.shippingPhone = shippingInfo.phone;
      orderData.shippingMainAddress = shippingInfo.mainAddress;
      orderData.shippingDetailAddress = shippingInfo.detailAddress;
      if (shippingInfo.memo) {
        orderData.shippingMemo = shippingInfo.memo;
      }
    }

    createOrder(orderData, {
      onSuccess: (order) => {
        // 장바구니 모드인 경우에만 장바구니 비우기
        if (!isSingleProductMode) {
          clearCart();
        }
        router.push(`/order/complete/${order.id}`);
      },
      onError: (error) => {
        alert(error.message || '주문 처리 중 오류가 발생했습니다');
      },
    });
  };

  if (isLoading || isLoadingProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loading size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <EmptyState
          title="오류가 발생했습니다"
          description={
            error instanceof Error
              ? error.message
              : '장바구니를 불러오는 중 오류가 발생했습니다'
          }
        >
          <Link href="/shop">
            <Button intent="primary" size="md">
              쇼핑 계속하기
            </Button>
          </Link>
        </EmptyState>
      </div>
    );
  }

  // 단일 상품 모드 - 품절 체크
  if (isSingleProductMode && isOutOfStock) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <EmptyState title="죄송합니다" description="현재 품절된 상품입니다">
          <Link href="/shop">
            <Button intent="primary" size="md">
              다른 상품 보기
            </Button>
          </Link>
        </EmptyState>
      </div>
    );
  }

  // 장바구니 모드 - 빈 장바구니 체크
  if (!isSingleProductMode && items.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <EmptyState
          title="장바구니가 비어있습니다"
          description="주문할 상품을 장바구니에 담아주세요"
        >
          <Link href="/shop">
            <Button intent="primary" size="md">
              <ShoppingBag className="w-4 h-4" />
              쇼핑 하러 가기
            </Button>
          </Link>
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft size={20} />
          뒤로 가기
        </button>

        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">주문/결제</h1>
          <p className="mt-1 text-sm text-gray-500">
            주문 정보를 확인하고 결제를 진행합니다
          </p>
          <div className="mt-4">
            <Link href="/v2/checkout">
              <Button intent="secondary" size="sm">
                v2 체크아웃 테스트 열기
              </Button>
            </Link>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Section - Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* 주문자 정보 */}
            <section className="bg-white rounded-lg border border-gray-200 p-6">
              <BuyerInfoForm value={buyerInfo} onChange={setBuyerInfo} />
            </section>

            {/* 배송 정보 (실물 굿즈 포함 시) */}
            {hasPhysicalGoods && (
              <section className="bg-white rounded-lg border border-gray-200 p-6">
                <ShippingForm
                  initialValues={shippingInfo}
                  customerInfo={{
                    name: buyerInfo.name,
                    phone: buyerInfo.phone,
                  }}
                  onChange={setShippingInfo}
                />
              </section>
            )}

            {/* 약관 동의 */}
            <section className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                약관 동의
              </h2>
              <div className="space-y-4">
                <Checkbox
                  label={
                    <span className="text-sm">
                      <Link
                        href="/terms"
                        target="_blank"
                        className="text-primary-600 hover:underline"
                      >
                        이용약관
                      </Link>
                      {' 및 '}
                      <Link
                        href="/privacy"
                        target="_blank"
                        className="text-primary-600 hover:underline"
                      >
                        개인정보처리방침
                      </Link>
                      에 동의합니다
                    </span>
                  }
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                />

                {hasDigitalGoods && (
                  <>
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                      <p className="text-sm font-semibold text-amber-900">
                        디지털 상품 환불 불가 안내
                      </p>
                      <p className="mt-2 text-sm text-amber-800 leading-relaxed">
                        디지털 상품은 결제 완료 후 즉시 이용 가능 상품으로
                        전자상거래법 제17조 제2항에 따라 청약철회(환불)가
                        제한됩니다. 다운로드 여부와 관계없이 환불이 불가합니다.
                      </p>
                      <Link
                        href="/policy"
                        target="_blank"
                        className="mt-2 inline-block text-sm text-amber-900 underline underline-offset-2"
                      >
                        배송/교환/환불 정책 전체 보기
                      </Link>
                    </div>

                    <Checkbox
                      label={
                        <span className="text-sm">
                          [필수] 본 상품은 디지털 콘텐츠로, 결제 완료 즉시 이용이
                          가능하며 전자상거래법 제17조 제2항에 따라 환불이
                          불가함에 동의합니다.
                        </span>
                      }
                      checked={agreedToDigitalRefundPolicy}
                      onChange={(e) =>
                        setAgreedToDigitalRefundPolicy(e.target.checked)
                      }
                    />
                  </>
                )}
              </div>
            </section>

            {/* 결제 안내 */}
            <section className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="font-semibold text-blue-900 mb-3">
                💡 결제 안내
              </h3>
              <ul className="text-sm text-blue-800 space-y-2">
                <li>• 본 상점은 계좌이체로만 결제 가능합니다</li>
                <li>• 주문 후 계좌번호가 안내됩니다</li>
                <li>
                  • 입금 확인 후{' '}
                  {hasPhysicalGoods ? '상품이 발송' : '다운로드 가능'}됩니다
                </li>
                {!hasPhysicalGoods && (
                  <li>
                    • 디지털 상품은 입금 확인 즉시 마이페이지에서 다운로드
                    가능합니다
                  </li>
                )}
                {hasDigitalGoods && (
                  <li>
                    • 디지털 상품은 전자상거래법 제17조 제2항에 따라 환불이
                    제한됩니다
                  </li>
                )}
              </ul>
            </section>
          </div>

          {/* Right Section - Order Summary */}
          <div className="lg:col-span-1">
            {isSingleProductMode && singleProduct ? (
              <OrderSummary
                product={singleProduct}
                quantity={1}
                shippingFee={shippingFee}
              />
            ) : (
              <CartOrderSummary items={items} shippingFee={shippingFee} />
            )}
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="mt-8 flex gap-4 justify-end">
          <Button intent="secondary" size="lg" onClick={() => router.back()}>
            취소
          </Button>

          <Button
            intent="primary"
            size="lg"
            onClick={handleSubmit}
            disabled={!isFormValid || isCreatingOrder}
          >
            {isCreatingOrder
              ? '주문 중...'
              : `${(
                  isSingleProductMode && singleProduct
                    ? singleProduct.price + shippingFee
                    : items.reduce(
                        (sum, item) => sum + item.product.price * item.quantity,
                        0
                      ) + shippingFee
                ).toLocaleString()}원 주문하기`}
          </Button>
        </div>
      </div>
    </div>
  );
}
