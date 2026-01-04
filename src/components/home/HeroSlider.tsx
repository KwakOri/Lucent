"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Sparkles } from "lucide-react";

// Hero slides data (static)
const HERO_SLIDES = [
  {
    id: "slogan",
    type: "slogan",
    titleLines: [
      {
        segments: [
          { text: "당신이 가진.", color: "text-[#1a1a2e]" },
          { text: "빛을 ", color: "text-[#ffcd27]" },
        ],
      },
      {
        segments: [{ text: "더 잘 닿을 수 있도록.", color: "text-[#1a1a2e]" }],
      },
      {
        segments: [
          { text: "루센트는 ", color: "text-[#ffcd27]" },
          { text: "그 순간을", color: "text-[#1a1a2e]" },
        ],
      },
      {
        segments: [{ text: " 함께합니다.", color: "text-[#1a1a2e]" }],
      },
    ],
    cta: {
      text: "루센트에 대해 더 알아보기",
      link: "/about",
    },
    image: "/slogun.png",
  },
  {
    id: "shop",
    type: "shop",
    titleLines: [
      { text: "특별한 순간을", color: "text-[#1a1a2e]" },
      { text: "담은 굿즈를", color: "text-[#66B5F3]" },
      { text: "만나보세요.", color: "text-[#1a1a2e]" },
    ],
    cta: {
      text: "굿즈샵 둘러보기",
      link: "/shop",
    },
    image: "/goods.png",
  },
];

export function HeroSlider() {
  const [currentSlide, setCurrentSlide] = useState(0);

  // Auto slide - 15초
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  // 슬로건 타입 렌더링 (segments 구조)
  const renderSloganTitle = (
    titleLines: (typeof HERO_SLIDES)[0]["titleLines"]
  ) => {
    return (
      <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold leading-none mb-8">
        {(
          titleLines as Array<{
            segments: Array<{ text: string; color: string }>;
            indent?: boolean;
          }>
        ).map((line, lineIndex) => (
          <span
            key={lineIndex}
            className={`block py-1 ${line.indent ? "ml-4 sm:ml-8" : ""}`}
          >
            {line.segments.map((segment, segIndex) => (
              <span key={segIndex} className={segment.color}>
                {segment.text}
              </span>
            ))}
          </span>
        ))}
      </h1>
    );
  };

  // 샵 타입 렌더링 (기존 구조)
  const renderShopTitle = (
    titleLines: (typeof HERO_SLIDES)[1]["titleLines"]
  ) => {
    return (
      <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold leading-tight mb-8">
        {(titleLines as Array<{ text: string; color: string }>).map(
          (line, lineIndex) => (
            <span
              key={lineIndex}
              className={`block ${line.color}`}
              style={{
                marginLeft: lineIndex % 2 === 1 ? "1rem" : "0",
              }}
            >
              {line.text}
            </span>
          )
        )}
      </h1>
    );
  };

  return (
    <section className="relative min-h-150 overflow-hidden bg-[#f9f9ed]">
      {/* Background decorative shapes */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -right-20 top-20 w-80 h-96 bg-[#F4D03F]/30 rounded-full blur-3xl" />
        <div className="absolute -left-20 bottom-20 w-60 h-72 bg-[#F4D03F]/20 rounded-full blur-3xl" />
      </div>

      {HERO_SLIDES.map((slide, index) => (
        <div
          key={slide.id}
          className={`absolute inset-0 transition-opacity duration-1000 ${
            index === currentSlide
              ? "opacity-100"
              : "opacity-0 pointer-events-none"
          }`}
        >
          <div className="h-full flex">
            {/* 텍스트 영역 - 슬로건과 동일한 구조 */}
            <div className="flex-1 flex items-center px-4 sm:px-6 lg:px-8">
              <div className="max-w-xl mr-auto ml-8 lg:ml-60">
                {slide.type === "slogan"
                  ? renderSloganTitle(slide.titleLines)
                  : renderShopTitle(slide.titleLines)}

                {/* CTA Button */}
                {slide.cta && (
                  <Link
                    href={slide.cta.link}
                    className="inline-flex items-center gap-2 text-[#1a1a2e]/70 hover:text-[#66B5F3] transition-colors group"
                  >
                    <Sparkles className="w-5 h-5" />
                    <span className="text-base">{slide.cta.text}</span>
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                )}
              </div>
            </div>

            {/* 이미지 영역 */}
            {slide.image && (
              <div className="hidden md:block relative w-1/2 h-full">
                <Image
                  src={slide.image}
                  alt={
                    slide.type === "slogan"
                      ? "Lucent Character"
                      : "Lucent Goods"
                  }
                  fill
                  className={`object-contain ${
                    slide.type === "slogan" ? "object-bottom" : "object-center"
                  }`}
                  priority
                />
              </div>
            )}
          </div>
        </div>
      ))}

      {/* Slide Indicators */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2">
        {HERO_SLIDES.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            className={`h-2 rounded-full transition-all duration-300 ${
              index === currentSlide
                ? "w-8 bg-[#1a1a2e]"
                : "w-2 bg-[#1a1a2e]/30 hover:bg-[#1a1a2e]/50"
            }`}
            aria-label={`슬라이드 ${index + 1}`}
          />
        ))}
      </div>
    </section>
  );
}
