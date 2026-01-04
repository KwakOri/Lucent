"use client";

import { VoicePackCover } from "@/components/order/VoicePackCover";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Loading } from "@/components/ui/loading";
import { useProducts } from "@/hooks";
import { Package, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ShopPage() {
  const router = useRouter();
  const { data: productsData, isLoading, error } = useProducts();

  const products = productsData?.data || [];
  const voicePacks = products.filter((p) => p.type === "VOICE_PACK");
  const physicalGoods = products.filter((p) => p.type === "PHYSICAL_GOODS");

  const handleProductClick = (productId: string) => {
    router.push(`/shop/${productId}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <Loading size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <EmptyState
          title="오류가 발생했습니다"
          description={
            error instanceof Error
              ? error.message
              : "상품을 불러오는 중 오류가 발생했습니다"
          }
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Hero Section */}
      <section className="relative bg-[#f9f9ed] py-20 px-4 overflow-hidden">
        <div className="max-w-6xl mx-auto relative">
          <h1 className="text-4xl sm:text-5xl font-bold leading-tight mb-6">
            <span className="text-[#1a1a2e]">루센트의 프로젝트에서,</span>
            <br />
            <span className="text-[#66B5F3]">이야기가 깃든 굿즈를</span>
            <br />
            <span className="text-[#1a1a2e]">만나보세요.</span>
          </h1>
          <p className="text-base text-[#1a1a2e]/60 max-w-xl leading-relaxed">
            루센트는 라이버의 굿즈 판매와 유통을 전담해 준비의 부담은 줄이고,
            팬에게는 더 가까운 가격으로 굿즈를 전달합니다.
          </p>
        </div>
      </section>

      {/* Voice Packs Section */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="mb-12">
            <h2 className="text-3xl font-bold text-text-primary mb-3">
              Voice Packs
            </h2>
            <p className="text-lg text-text-secondary">
              다양한 아티스트의 보이스팩을 만나보세요
            </p>
          </div>

          {voicePacks.length === 0 ? (
            <div className="bg-white rounded-xl border border-neutral-200 p-12">
              <EmptyState
                title="준비 중입니다"
                description="곧 멋진 보이스팩을 만나보실 수 있어요"
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {voicePacks.map((pack, index) => (
                <div
                  key={pack.id}
                  className="bg-white rounded-2xl border-2 border-primary-200 overflow-hidden hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer"
                  onClick={() => handleProductClick(pack.id)}
                >
                  {/* CD Cover Style Thumbnail */}
                  <VoicePackCover
                    index={index}
                    name={pack.name}
                    thumbnail={pack.main_image?.cdn_url || pack.main_image?.public_url || ""}
                  />

                  {/* Pack Info */}
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-text-primary mb-2">
                      {pack.name}
                    </h3>
                    <p className="text-sm text-text-secondary mb-4 line-clamp-2">
                      {pack.description || "보이스팩"}
                    </p>
                    <p className="text-2xl font-bold text-primary-700 mb-4">
                      {pack.price.toLocaleString()}원
                    </p>

                    {/* View Details Button */}
                    <Button intent="primary" size="md" fullWidth>
                      <ShoppingCart className="w-4 h-4" />
                      자세히 보기
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Physical Goods Section */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="mb-12">
            <h2 className="text-3xl font-bold text-text-primary mb-3">Goods</h2>
            <p className="text-lg text-text-secondary">실물 굿즈 컬렉션</p>
          </div>

          {physicalGoods.length === 0 ? (
            <div className="bg-neutral-50 rounded-xl border border-neutral-200 p-12">
              <EmptyState
                title="준비 중입니다"
                description="곧 다양한 굿즈를 만나보실 수 있어요"
              >
                <Link href="/projects">
                  <Button intent="primary" size="md">
                    <Package className="w-4 h-4" />
                    프로젝트 보러가기
                  </Button>
                </Link>
              </EmptyState>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {physicalGoods.map((goods) => (
                <div
                  key={goods.id}
                  className="bg-neutral-50 rounded-2xl border border-neutral-200 overflow-hidden hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer"
                  onClick={() => handleProductClick(goods.id)}
                >
                  {/* Goods Image */}
                  <div className="aspect-square bg-gradient-to-br from-neutral-100 to-neutral-200 relative flex items-center justify-center overflow-hidden">
                    {goods.main_image?.cdn_url || goods.main_image?.public_url ? (
                      <img
                        src={goods.main_image.cdn_url || goods.main_image.public_url}
                        alt={goods.main_image.alt_text || goods.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-6xl">📦</span>
                    )}
                  </div>

                  {/* Goods Info */}
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-text-primary mb-2">
                      {goods.name}
                    </h3>
                    <p className="text-sm text-text-secondary mb-4 line-clamp-2">
                      {goods.description || "굿즈"}
                    </p>
                    <p className="text-2xl font-bold text-primary-700 mb-4">
                      {goods.price.toLocaleString()}원
                    </p>

                    {/* Stock Info */}
                    {goods.stock !== null && goods.stock <= 0 && (
                      <p className="text-sm text-red-600 mb-2">품절</p>
                    )}

                    {/* View Details Button */}
                    <Button
                      intent="primary"
                      size="md"
                      fullWidth
                      disabled={goods.stock !== null && goods.stock <= 0}
                    >
                      <ShoppingCart className="w-4 h-4" />
                      {goods.stock !== null && goods.stock <= 0
                        ? "품절"
                        : "자세히 보기"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

    </div>
  );
}
