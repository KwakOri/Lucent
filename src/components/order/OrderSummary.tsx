/**
 * OrderSummary Component
 *
 * 주문 요약 정보를 표시하는 컴포넌트
 */

'use client';

interface OrderSummaryProps {
  product: {
    id: string;
    name: string;
    type: 'VOICE_PACK' | 'PHYSICAL_GOODS' | 'BUNDLE';
    price: number;
    main_image?: {
      public_url?: string;
      alt_text?: string;
    } | null;
  };
  quantity?: number;
  shippingFee?: number;
}

export function OrderSummary({
  product,
  quantity = 1,
  shippingFee = 0,
}: OrderSummaryProps) {
  const productAmount = product.price * quantity;
  const totalAmount = productAmount + shippingFee;

  return (
    <aside className="bg-white rounded-lg border border-gray-200 p-6 sticky top-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">주문 상품</h2>

      {/* Product Card */}
      <div className="flex gap-4 mb-6 pb-6 border-b border-gray-200">
        {product.main_image?.public_url ? (
          <img
            src={product.main_image.public_url}
            alt={product.main_image.alt_text || product.name}
            className="w-20 h-20 object-cover rounded-lg"
          />
        ) : (
          <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center">
            <span className="text-3xl">
              {product.type === 'VOICE_PACK' ? '🎵' : '📦'}
            </span>
          </div>
        )}

        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-900 mb-1 line-clamp-2">
            {product.name}
          </h3>
          <p className="text-sm text-gray-500 mb-2">
            {product.type === 'VOICE_PACK' ? '디지털 상품' : '실물 굿즈'}
          </p>
          <p className="text-sm font-medium text-gray-900">
            {product.price.toLocaleString()}원
          </p>
        </div>
      </div>

      {/* Payment Summary */}
      <div className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">상품 금액</span>
          <span className="text-gray-900">
            {productAmount.toLocaleString()}원
          </span>
        </div>

        {quantity > 1 && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">수량</span>
            <span className="text-gray-900">{quantity}개</span>
          </div>
        )}

        {shippingFee > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">배송비</span>
            <span className="text-gray-900">
              {shippingFee.toLocaleString()}원
            </span>
          </div>
        )}

        <div className="pt-3 border-t-2 border-gray-900">
          <div className="flex justify-between items-center">
            <span className="text-base font-semibold text-gray-900">
              총 결제 금액
            </span>
            <span className="text-xl font-bold text-primary-600">
              {totalAmount.toLocaleString()}원
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
