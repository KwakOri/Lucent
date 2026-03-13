'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Loading } from '@/components/ui/loading';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
import { /* Play, Pause, */ ShoppingCart, ArrowLeft, Package, Plus /* , Volume2, VolumeX */ } from 'lucide-react';
import { useProduct, useAddToCart } from '@/lib/client/hooks';
import { useToast } from '@/src/components/toast';

export default function ProductDetailPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.product_id as string;
  const { showToast } = useToast();

  const { data: product, isLoading, error } = useProduct(productId);
  const { mutate: addToCart, isPending: isAddingToCart } = useAddToCart();

  // ===== 샘플 오디오 기능 주석 처리 (Google Drive 링크 방식으로 전환) =====
  // const [isPlayingSample, setIsPlayingSample] = useState(false);
  // const [volume, setVolume] = useState(0.3); // 기본 음량 30%
  // const [currentTime, setCurrentTime] = useState(0); // 현재 재생 시간
  // const [duration, setDuration] = useState(0); // 총 재생 시간
  // const audioRef = useRef<HTMLAudioElement | null>(null);

  const isVoicePack = product?.type === 'VOICE_PACK';
  const isPhysicalGoods = product?.type === 'PHYSICAL_GOODS';

  // // 오디오 완전 정지 헬퍼 함수
  // const stopAudio = () => {
  //   if (audioRef.current) {
  //     audioRef.current.pause();
  //     audioRef.current.src = ''; // 소스 완전 제거
  //     audioRef.current.onended = null; // 이벤트 리스너 제거
  //     audioRef.current.onerror = null;
  //     audioRef.current.ontimeupdate = null;
  //     audioRef.current.onloadedmetadata = null;
  //     audioRef.current = null;
  //   }
  //   setIsPlayingSample(false);
  //   setCurrentTime(0);
  //   setDuration(0);
  // };

  // // 초기 음량 설정 로드 (localStorage)
  // useEffect(() => {
  //   const savedVolume = localStorage.getItem('sampleVolume');
  //   if (savedVolume !== null) {
  //     setVolume(parseFloat(savedVolume));
  //   }
  // }, []);

  // // Cleanup: 컴포넌트 언마운트 시 오디오 정지
  // useEffect(() => {
  //   return () => {
  //     stopAudio();
  //   };
  // }, []);

  // const handlePlaySample = () => {
  //   if (!product?.sample_audio_url) return;

  //   // 이미 재생 중이면 정지
  //   if (audioRef.current) {
  //     stopAudio();
  //   } else {
  //     // 새로 재생
  //     try {
  //       const audio = new Audio(product.sample_audio_url);
  //       audio.volume = volume; // 음량 설정

  //       // 메타데이터 로드 시 총 재생 시간 설정
  //       audio.onloadedmetadata = () => {
  //         setDuration(audio.duration);
  //       };

  //       // 재생 시간 업데이트
  //       audio.ontimeupdate = () => {
  //         setCurrentTime(audio.currentTime);
  //       };

  //       // 재생 종료 시 상태 업데이트
  //       audio.onended = () => {
  //         stopAudio();
  //       };

  //       // 에러 처리
  //       audio.onerror = () => {
  //         console.error('샘플 로드 실패');
  //         alert('샘플을 불러올 수 없습니다.');
  //         stopAudio();
  //       };

  //       // Race Condition 방지: 재생 전에 먼저 참조와 상태 설정
  //       audioRef.current = audio;
  //       setIsPlayingSample(true);

  //       // 그 다음 재생 시작
  //       audio.play().catch((error) => {
  //         console.error('샘플 재생 실패:', error);
  //         alert('샘플 재생에 실패했습니다. 다시 시도해주세요.');
  //         stopAudio();
  //       });
  //     } catch (error) {
  //       console.error('샘플 재생 중 오류:', error);
  //       alert('샘플 재생에 실패했습니다.');
  //       stopAudio();
  //     }
  //   }
  // };

  // const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  //   const newVolume = parseFloat(e.target.value);
  //   setVolume(newVolume);

  //   // 재생 중인 오디오의 음량도 즉시 변경
  //   if (audioRef.current) {
  //     audioRef.current.volume = newVolume;
  //   }

  //   // localStorage에 저장
  //   localStorage.setItem('sampleVolume', newVolume.toString());
  // };

  // const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
  //   if (!audioRef.current || !duration) return;

  //   const rect = e.currentTarget.getBoundingClientRect();
  //   const x = e.clientX - rect.left;
  //   const percentage = x / rect.width;
  //   const newTime = percentage * duration;

  //   audioRef.current.currentTime = newTime;
  //   setCurrentTime(newTime);
  // };

  // const formatTime = (seconds: number) => {
  //   if (!seconds || isNaN(seconds)) return '0:00';
  //   const mins = Math.floor(seconds / 60);
  //   const secs = Math.floor(seconds % 60);
  //   return `${mins}:${secs.toString().padStart(2, '0')}`;
  // };
  // ===== 샘플 오디오 기능 주석 처리 끝 =====

  const handlePurchase = () => {
    router.push(`/checkout?product_id=${productId}`);
  };

  const handleAddToCart = () => {
    addToCart(
      { product_id: productId, quantity: 1 },
      {
        onSuccess: () => {
          showToast('장바구니에 추가되었습니다', { type: 'success' });
        },
        onError: (error) => {
          showToast(
            error instanceof Error ? error.message : '장바구니 추가에 실패했습니다',
            { type: 'error' }
          );
        },
      }
    );
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
            {product.main_image?.cdn_url || product.main_image?.public_url ? (
              <div className="aspect-square bg-gradient-to-br from-neutral-100 to-neutral-200 rounded-2xl overflow-hidden border-2 border-primary-200">
                <img
                  src={product.main_image.cdn_url || product.main_image.public_url}
                  alt={product.main_image.alt_text || product.name}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : isVoicePack ? (
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
            <Badge intent="default" className="mb-4">
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

            {isVoicePack && (
              <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4">
                <div className="mb-2">
                  <Badge intent="error" size="md">
                    디지털 상품 환불 불가
                  </Badge>
                </div>
                <p className="text-sm text-red-800 leading-relaxed">
                  본 상품은 결제 완료 후 즉시 이용 가능한 디지털 콘텐츠로,
                  전자상거래법 제17조 제2항에 따라 환불이 제한됩니다.
                </p>
                <Link
                  href="/policy"
                  className="mt-2 inline-block text-sm text-red-900 underline underline-offset-2"
                >
                  배송/교환/환불 정책 확인하기
                </Link>
              </div>
            )}

            {/* Stock Status */}
            {isPhysicalGoods && (
              <div className="mb-6">
                {isOutOfStock ? (
                  <Badge intent="error">품절</Badge>
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

            {/* ===== 샘플 오디오 플레이어 UI 주석 처리 ===== */}
            {/* {isVoicePack && product.sample_audio_url && (
              <div className="mb-6 space-y-3">
                <div className="space-y-1">
                  <div
                    className="h-2 bg-neutral-200 rounded-full cursor-pointer overflow-hidden group"
                    onClick={handleSeek}
                  >
                    <div
                      className="h-full bg-primary-600 transition-all duration-100 group-hover:bg-primary-700"
                      style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-text-secondary px-1">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>

                <Button
                  intent="secondary"
                  size="lg"
                  fullWidth
                  onClick={handlePlaySample}
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

                <div className="flex items-center gap-3 px-2">
                  <button
                    onClick={() => {
                      const newVolume = volume > 0 ? 0 : 0.3;
                      setVolume(newVolume);
                      if (audioRef.current) {
                        audioRef.current.volume = newVolume;
                      }
                      localStorage.setItem('sampleVolume', newVolume.toString());
                    }}
                    className="text-text-secondary hover:text-text-primary transition-colors"
                    aria-label={volume > 0 ? '음소거' : '음소거 해제'}
                  >
                    {volume > 0 ? (
                      <Volume2 className="w-5 h-5" />
                    ) : (
                      <VolumeX className="w-5 h-5" />
                    )}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={volume}
                    onChange={handleVolumeChange}
                    className="flex-1 h-2 bg-neutral-200 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary-600 [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-primary-600 [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
                    aria-label="음량 조절"
                  />
                  <span className="text-sm text-text-secondary w-10 text-right">
                    {Math.round(volume * 100)}%
                  </span>
                </div>
              </div>
            )} */}
            {/* ===== 샘플 오디오 플레이어 UI 주석 처리 끝 ===== */}

            {/* Action Buttons */}
            <div className="space-y-3">
              {/* Add to Cart Button */}
              <Button
                intent="secondary"
                size="lg"
                fullWidth
                onClick={handleAddToCart}
                disabled={isOutOfStock || isAddingToCart}
              >
                <Plus className="w-5 h-5" />
                {isAddingToCart ? '추가 중...' : '장바구니에 담기'}
              </Button>

              {/* Purchase Button */}
              <Button
                intent="primary"
                size="lg"
                fullWidth
                onClick={handlePurchase}
                disabled={isOutOfStock}
              >
                <ShoppingCart className="w-5 h-5" />
                {isOutOfStock ? '품절' : '바로 구매하기'}
              </Button>
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
