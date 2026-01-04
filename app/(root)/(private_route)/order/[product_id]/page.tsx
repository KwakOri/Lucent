/**
 * Checkout Page
 *
 * 주문/결제 페이지
 */

'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Loading } from '@/components/ui/loading';
import { EmptyState } from '@/components/ui/empty-state';
import { Checkbox } from '@/components/ui/checkbox';
import { FormField } from '@/components/ui/form-field';
import { OrderSummary, ShippingForm, BuyerInfoForm, type ShippingInfo, type BuyerInfo } from '@/components/order';
import { useProduct } from '@/hooks/useProducts';
import { useCreateOrder } from '@/hooks/useOrders';
import { useSession } from '@/hooks/useAuth';
import { useMyProfile } from '@/hooks';
import { SHIPPING_FEE } from '@/constants';

export default function CheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.product_id as string;

  const { data: product, isLoading, error } = useProduct(productId);
  const { mutate: createOrder, isPending: isCreatingOrder } = useCreateOrder();
  const { user, isLoading: isLoadingUser } = useSession();
  const { data: profile, isLoading: isLoadingProfile } = useMyProfile();

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

  // 사용자 정보로 기본값 설정
  useEffect(() => {
    if (user && profile) {
      // 주문자 정보 설정
      setBuyerInfo({
        name: profile.name || '',
        email: profile.email || user.email || '',
        phone: profile.phone || '',
      });

      // 배송 정보 설정 (프로필에 주소가 있는 경우)
      if (profile.main_address) {
        setShippingInfo((prev) => ({
          ...prev,
          name: profile.name || '',
          phone: profile.phone || '',
          mainAddress: profile.main_address || '',
          detailAddress: profile.detail_address || '',
        }));
      }
    }
  }, [user, profile]);

  const isPhysicalGoods = product?.type === 'PHYSICAL_GOODS';
  const isOutOfStock = product ? product.stock !== null && product.stock <= 0 : false;

  // 배송비 (실물 굿즈 또는 번들 상품인 경우)
  const needsShipping = product?.type === 'PHYSICAL_GOODS' || product?.type === 'BUNDLE';
  const shippingFee = needsShipping ? SHIPPING_FEE : 0;

  // 검증
  const isBuyerInfoValid =
    buyerInfo.name.trim().length >= 2 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(buyerInfo.email) &&
    /^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/.test(buyerInfo.phone.replace(/-/g, ''));

  const isShippingValid = !isPhysicalGoods || (
    shippingInfo.name.trim().length >= 2 &&
    /^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/.test(shippingInfo.phone.replace(/-/g, '')) &&
    shippingInfo.mainAddress.trim().length > 0 &&
    shippingInfo.detailAddress.trim().length >= 2
  );

  const isFormValid = agreedToTerms && isBuyerInfoValid && isShippingValid;

  const handleSubmit = () => {
    if (!product || !isFormValid) return;

    const orderData: any = {
      items: [{
        productId: product.id,
        quantity: 1,
      }],
      // 주문자 정보
      buyerName: buyerInfo.name,
      buyerEmail: buyerInfo.email,
      buyerPhone: buyerInfo.phone,
    };

    // 실물 굿즈인 경우 배송 정보 추가
    if (isPhysicalGoods) {
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

  if (error || !product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <EmptyState
          title="상품을 찾을 수 없습니다"
          description={error instanceof Error ? error.message : '상품 정보를 불러올 수 없습니다'}
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

  if (isOutOfStock) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <EmptyState
          title="죄송합니다"
          description="현재 품절된 상품입니다"
        >
          <Link href="/shop">
            <Button intent="primary" size="md">
              다른 상품 보기
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
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Section - Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* 주문자 정보 */}
            <section className="bg-white rounded-lg border border-gray-200 p-6">
              <BuyerInfoForm
                value={buyerInfo}
                onChange={setBuyerInfo}
              />
            </section>

            {/* 배송 정보 (실물 굿즈만) */}
            {isPhysicalGoods && (
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
            </section>

            {/* 결제 안내 */}
            <section className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="font-semibold text-blue-900 mb-3">
                💡 결제 안내
              </h3>
              <ul className="text-sm text-blue-800 space-y-2">
                <li>• 본 상점은 계좌이체로만 결제 가능합니다</li>
                <li>• 주문 후 계좌번호가 안내됩니다</li>
                <li>• 입금 확인 후 {isPhysicalGoods ? '상품이 발송' : '다운로드 가능'}됩니다</li>
                {!isPhysicalGoods && (
                  <li>• 디지털 상품은 입금 확인 즉시 마이페이지에서 다운로드 가능합니다</li>
                )}
              </ul>
            </section>
          </div>

          {/* Right Section - Order Summary */}
          <div className="lg:col-span-1">
            <OrderSummary
              product={product}
              quantity={1}
              shippingFee={shippingFee}
            />
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="mt-8 flex gap-4 justify-end">
          <Button
            intent="secondary"
            size="lg"
            onClick={() => router.back()}
          >
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
              : `${(product.price + shippingFee).toLocaleString()}원 주문하기`}
          </Button>
        </div>
      </div>
    </div>
  );
}
