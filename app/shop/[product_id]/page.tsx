'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Loading } from '@/components/ui/loading';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, ShoppingCart, ArrowLeft, Package } from 'lucide-react';
import { useProduct, usePlaySample } from '@/hooks';

export default function ProductDetailPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.product_id as string;

  const { data: productData, isLoading, error } = useProduct(productId);
  const { mutate: playSample, isPending: isPlaying } = usePlaySample();
  const [isPlayingSample, setIsPlayingSample] = useState(false);

  const product = productData?.data;
  const isVoicePack = product?.type === 'VOICE_PACK';
  const isPhysicalGoods = product?.type === 'PHYSICAL_GOODS';

  const handlePlaySample = () => {
    if (!product?.sample_audio_url) return;

    if (isPlayingSample) {
      setIsPlayingSample(false);
      // TODO: Stop current audio
    } else {
      playSample(productId, {
        onSuccess: () => {
          setIsPlayingSample(true);
        },
        onError: (error) => {
          console.error('샘플 재생 실패:', error);
          alert('샘플 재생에 실패했습니다. 다시 시도해주세요.');
        },
      });
    }
  };

  const handlePurchase = () => {
    // TODO: Check login status and redirect to order page
    router.push(`/order/${productId}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <Loading size="lg" />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <EmptyState
          title="상품을 찾을 수 없습니다"
          description="존재하지 않거나 삭제된 상품입니다"
        >
          <Link href="/shop">
            <Button intent="primary" size="md">
              <ArrowLeft className="w-4 h-4" />
              상점으로 돌아가기
            </Button>
          </Link>
        </EmptyState>
      </div>
    );
  }

  const isOutOfStock = product.stock !== null && product.stock <= 0;

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Back Button */}
        <Link
          href="/shop"
          className="inline-flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors mb-8"
        >
          <ArrowLeft className="w-5 h-5" />
          상점으로 돌아가기
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Product Image/Preview */}
          <div>
            {isVoicePack ? (
              <div className="aspect-square bg-gradient-to-br from-primary-50 to-primary-100 rounded-2xl flex items-center justify-center border-2 border-primary-200">
                <div className="w-64 h-64 rounded-full bg-white/30 backdrop-blur-sm flex items-center justify-center">
                  <div className="w-52 h-52 rounded-full bg-gradient-to-br from-primary-200 to-primary-100 flex items-center justify-center">
                    <span className="text-7xl">🎵</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="aspect-square bg-gradient-to-br from-neutral-100 to-neutral-200 rounded-2xl flex items-center justify-center border border-neutral-300">
                <span className="text-9xl">📦</span>
              </div>
            )}
          </div>

          {/* Product Info */}
          <div>
            {/* Product Type Badge */}
            <Badge variant="default" className="mb-4">
              {isVoicePack ? 'Voice Pack' : 'Physical Goods'}
            </Badge>

            {/* Product Name */}
            <h1 className="text-4xl font-bold text-text-primary mb-4">
              {product.name}
            </h1>

            {/* Price */}
            <p className="text-3xl font-bold text-primary-700 mb-6">
              {product.price.toLocaleString()}원
            </p>

            {/* Stock Status */}
            {isPhysicalGoods && (
              <div className="mb-6">
                {isOutOfStock ? (
                  <Badge variant="error">품절</Badge>
                ) : product.stock !== null ? (
                  <p className="text-sm text-text-secondary">
                    재고: {product.stock}개
                  </p>
                ) : null}
              </div>
            )}

            {/* Description */}
            {product.description && (
              <div className="mb-8">
                <h2 className="text-xl font-bold text-text-primary mb-3">
                  상품 설명
                </h2>
                <p className="text-text-secondary whitespace-pre-wrap">
                  {product.description}
                </p>
              </div>
            )}

            {/* Sample Play Button for Voice Packs */}
            {isVoicePack && product.sample_audio_url && (
              <div className="mb-6">
                <Button
                  intent="secondary"
                  size="lg"
                  fullWidth
                  onClick={handlePlaySample}
                  disabled={isPlaying}
                >
                  {isPlayingSample ? (
                    <>
                      <Pause className="w-5 h-5" />
                      일시정지
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5" />
                      샘플 듣기
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Purchase Button */}
            <Button
              intent="primary"
              size="lg"
              fullWidth
              onClick={handlePurchase}
              disabled={isOutOfStock}
            >
              <ShoppingCart className="w-5 h-5" />
              {isOutOfStock ? '품절' : '구매하기'}
            </Button>

            {/* Additional Info */}
            <div className="mt-8 space-y-4">
              <div className="p-4 bg-white rounded-lg border border-neutral-200">
                <h3 className="font-bold text-text-primary mb-2">
                  {isVoicePack ? '다운로드 안내' : '배송 안내'}
                </h3>
                <p className="text-sm text-text-secondary">
                  {isVoicePack
                    ? '결제 완료 후 마이페이지에서 즉시 다운로드 가능합니다.'
                    : '주문 후 영업일 기준 3-5일 이내 배송됩니다.'}
                </p>
              </div>

              <div className="p-4 bg-white rounded-lg border border-neutral-200">
                <h3 className="font-bold text-text-primary mb-2">
                  환불 정책
                </h3>
                <p className="text-sm text-text-secondary">
                  {isVoicePack
                    ? '디지털 상품은 다운로드 전까지만 환불 가능합니다.'
                    : '실물 굿즈는 배송 전까지 취소 가능합니다.'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Related Products Section */}
        <section className="mt-20">
          <h2 className="text-2xl font-bold text-text-primary mb-8">
            다른 상품 둘러보기
          </h2>
          <div className="text-center">
            <Link href="/shop">
              <Button intent="secondary" size="md">
                <Package className="w-4 h-4" />
                전체 상품 보기
              </Button>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
