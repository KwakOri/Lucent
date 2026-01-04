/**
 * Order Confirmation Page
 *
 * 주문 완료 안내 및 계좌이체 정보 제공 페이지
 */

"use client";

import { BankAccountInfo } from "@/components/order";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Loading } from "@/components/ui/loading";
import { SHIPPING_FEE } from "@/constants";
import { useOrder } from "@/hooks/useOrders";
import { CheckCircle, FileText, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

export default function OrderConfirmationPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.order_id as string;

  const { data: order, isLoading, error } = useOrder(orderId);

  // 상품 타입 확인
  const hasPhysicalGoods = order?.items?.some(
    (item) =>
      item.product_type === "PHYSICAL_GOODS" || item.product_type === "BUNDLE"
  );
  const hasDigitalProducts = order?.items?.some(
    (item) => item.product_type === "VOICE_PACK"
  );

  // 배송비 계산 (실물 굿즈가 포함된 경우)
  const shippingFee = hasPhysicalGoods ? SHIPPING_FEE : 0;
  const productTotal = order ? order.total_price - shippingFee : 0;

  // 날짜 포맷
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loading size="lg" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <EmptyState
          title="주문을 찾을 수 없습니다"
          description={
            error instanceof Error
              ? error.message
              : "주문 정보를 불러올 수 없습니다"
          }
        >
          <Link href="/mypage/orders">
            <Button intent="primary" size="md">
              내 주문 목록 보기
            </Button>
          </Link>
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4">
        {/* Success Header */}
        <section className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6 animate-scale-in">
            <CheckCircle size={48} className="text-green-600" />
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-3">
            주문이 완료되었습니다
          </h1>

          <p className="text-lg text-gray-600 mb-8">
            입금 확인 후 {hasDigitalProducts ? "다운로드 가능" : "상품이 발송"}
            됩니다
          </p>

          <div className="bg-white rounded-lg border border-gray-200 p-6 inline-block">
            <dl className="grid grid-cols-2 gap-6 text-left">
              <div>
                <dt className="text-sm text-gray-500 mb-1">주문번호</dt>
                <dd className="font-mono font-semibold text-gray-900">
                  {order.order_number}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500 mb-1">주문일시</dt>
                <dd className="font-medium text-gray-900">
                  {formatDateTime(order.created_at)}
                </dd>
              </div>
            </dl>
          </div>
        </section>

        {/* Bank Account Info */}
        <div className="mb-8">
          <BankAccountInfo
            depositorName={order.buyer_name as string}
            totalAmount={order.total_price}
          />
        </div>

        {/* Order Items */}
        <section className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span>📦</span>
            주문 상품
          </h2>

          <div className="space-y-4">
            {order.items?.map((item) => (
              <div
                key={item.id}
                className="flex gap-4 p-4 bg-gray-50 rounded-lg"
              >
                <div className="w-20 h-20 bg-gray-200 rounded-lg flex items-center justify-center">
                  <span className="text-3xl">
                    {item.product_type === "VOICE_PACK" ? "🎵" : "📦"}
                  </span>
                </div>

                <div className="flex-1">
                  <h3 className="font-medium text-gray-900 mb-1">
                    {item.product_name}
                  </h3>
                  <p className="text-sm text-gray-500 mb-2">
                    {item.product_type === "VOICE_PACK"
                      ? "디지털 상품"
                      : "실물 굿즈"}
                  </p>
                  <p className="text-sm font-medium text-gray-900">
                    {item.price_snapshot.toLocaleString()}원
                  </p>
                </div>
              </div>
            ))}

            <div className="pt-4 border-t border-gray-200 space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">상품 금액</span>
                <span className="font-medium text-gray-900">
                  {productTotal.toLocaleString()}원
                </span>
              </div>

              {shippingFee > 0 && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">배송비</span>
                  <span className="font-medium text-gray-900">
                    {shippingFee.toLocaleString()}원
                  </span>
                </div>
              )}

              <div className="pt-2 border-t border-gray-200 flex justify-between items-center">
                <span className="text-base font-semibold text-gray-900">
                  총 결제 금액
                </span>
                <span className="text-2xl font-bold text-primary-600">
                  {order.total_price.toLocaleString()}원
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Shipping Info (Physical Goods Only) */}
        {hasPhysicalGoods && order.shipping_main_address && (
          <section className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span>🚚</span>
              배송 정보
            </h2>

            <dl className="space-y-3">
              <div className="flex">
                <dt className="w-24 text-sm text-gray-500">수령인</dt>
                <dd className="flex-1 text-sm font-medium text-gray-900">
                  {order.shipping_name}
                </dd>
              </div>

              <div className="flex">
                <dt className="w-24 text-sm text-gray-500">연락처</dt>
                <dd className="flex-1 text-sm font-medium text-gray-900">
                  {order.shipping_phone}
                </dd>
              </div>

              <div className="flex">
                <dt className="w-24 text-sm text-gray-500">배송 주소</dt>
                <dd className="flex-1 text-sm font-medium text-gray-900">
                  {order.shipping_main_address}{" "}
                  {order.shipping_detail_address || ""}
                </dd>
              </div>

              {order.shipping_memo && (
                <div className="flex">
                  <dt className="w-24 text-sm text-gray-500">배송 메모</dt>
                  <dd className="flex-1 text-sm text-gray-600">
                    {order.shipping_memo}
                  </dd>
                </div>
              )}
            </dl>
          </section>
        )}

        {/* Payment Guide */}
        <section className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold text-blue-900 mb-4 flex items-center gap-2">
            <span>📝</span>
            입금 안내
          </h2>

          <ul className="space-y-2 text-sm text-blue-800">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">•</span>
              <span>
                <strong>입금자명</strong>은 주문자 본인 이름(
                <code className="bg-blue-100 px-1 py-0.5 rounded font-semibold">
                  {order.buyer_name}
                </code>
                )으로 입금해주세요
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">•</span>
              <span>입금 확인까지 영업일 기준 1-2일 소요됩니다</span>
            </li>
            {hasDigitalProducts && (
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>
                  디지털 상품은 입금 확인 즉시 마이페이지에서 다운로드
                  가능합니다
                </span>
              </li>
            )}
            {hasPhysicalGoods && (
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>실물 굿즈는 입금 확인 후 3-5일 이내 배송됩니다</span>
              </li>
            )}
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">•</span>
              <span>주문 내역은 마이페이지에서 확인하실 수 있습니다</span>
            </li>
          </ul>
        </section>

        {/* Next Steps Timeline */}
        <section className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">
            다음 단계
          </h2>

          <div className="relative pl-8">
            {/* Timeline Line */}
            <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-gray-200"></div>

            {/* Step 1 - Current */}
            <div className="relative mb-6">
              <div className="absolute -left-8 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                <span className="text-xs text-white font-bold">1</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">주문 완료</h3>
                <p className="text-sm text-gray-600">
                  주문이 정상적으로 접수되었습니다
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="relative mb-6">
              <div className="absolute -left-8 w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center">
                <span className="text-xs text-white font-bold">2</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">입금 대기</h3>
                <p className="text-sm text-gray-600">계좌이체로 입금해주세요</p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="relative mb-6">
              <div className="absolute -left-8 w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center">
                <span className="text-xs text-white font-bold">3</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">입금 확인</h3>
                <p className="text-sm text-gray-600">영업일 기준 1-2일 소요</p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="relative">
              <div className="absolute -left-8 w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center">
                <span className="text-xs text-white font-bold">4</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">
                  {hasDigitalProducts ? "다운로드 가능" : "배송 시작"}
                </h3>
                <p className="text-sm text-gray-600">
                  {hasDigitalProducts
                    ? "마이페이지에서 다운로드"
                    : "3-5일 이내 배송 완료"}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Link href={`/mypage/orders/${order.id}`} className="flex-1">
            <Button
              intent="secondary"
              size="lg"
              fullWidth
              className="flex items-center justify-center gap-2"
            >
              <FileText size={18} />
              주문 상세 보기
            </Button>
          </Link>

          <Link href="/shop" className="flex-1">
            <Button
              intent="primary"
              size="lg"
              fullWidth
              className="flex items-center justify-center gap-2"
            >
              <ShoppingBag size={18} />
              쇼핑 계속하기
            </Button>
          </Link>
        </div>
      </div>

      <style jsx>{`
        @keyframes scale-in {
          from {
            transform: scale(0);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }

        .animate-scale-in {
          animation: scale-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
