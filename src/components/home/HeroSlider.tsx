"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
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
      <h1 className="mb-6 text-[2.35rem] font-bold leading-[1.08] sm:text-5xl md:mb-8 md:text-[3.25rem] md:leading-none lg:text-[3.4rem] xl:text-[3.45rem]">
        {(
          titleLines as Array<{
            segments: Array<{ text: string; color: string }>;
            indent?: boolean;
          }>
        ).map((line, lineIndex) => (
          <span
            key={lineIndex}
            className={`block py-0.5 md:py-1 xl:whitespace-nowrap ${
              line.indent ? "ml-4 sm:ml-8" : ""
            }`}
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
      <h1 className="mb-6 text-[2.35rem] font-bold leading-[1.08] sm:text-5xl md:mb-8 md:text-6xl md:leading-tight">
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
    <section className="relative min-h-[31rem] overflow-hidden bg-[#f9f9ed] sm:min-h-[34rem] md:min-h-150">
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
          {slide.image && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 md:hidden"
            >
              <img
                src={slide.image}
                alt=""
                className={`absolute max-w-none object-contain opacity-30 ${
                  slide.type === "slogan"
                    ? "bottom-0 right-[-18%] h-[88%] w-[92%] object-bottom"
                    : "bottom-14 right-[-10%] h-[68%] w-[86%] object-center"
                }`}
              />
              <div className="absolute inset-0 bg-linear-to-r from-[#f9f9ed]/95 via-[#f9f9ed]/72 to-[#f9f9ed]/35" />
              <div className="absolute inset-x-0 bottom-0 h-28 bg-linear-to-t from-[#f9f9ed] to-[#f9f9ed]/0" />
            </div>
          )}

          <div className="flex h-full">
            {/* 텍스트 영역 - 슬로건과 동일한 구조 */}
            <div className="relative z-10 flex flex-1 items-start px-4 pt-28 sm:px-6 sm:pt-32 md:items-center md:pt-0 lg:px-8">
              <div className="ml-12 mr-auto max-w-2xl sm:ml-16 md:ml-8 lg:ml-60">
                {slide.type === "slogan"
                  ? renderSloganTitle(slide.titleLines)
                  : renderShopTitle(slide.titleLines)}

                {/* CTA Button */}
                {slide.cta && (
                  <Link
                    href={slide.cta.link}
                    className="group inline-flex items-center gap-2 text-[#1a1a2e]/70 transition-colors hover:text-[#66B5F3]"
                  >
                    <Sparkles className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span className="text-sm sm:text-base">{slide.cta.text}</span>
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1 sm:h-5 sm:w-5" />
                  </Link>
                )}
              </div>
            </div>

            {/* 이미지 영역 */}
            {slide.image && (
              <div className="hidden md:block relative w-1/2 h-full">
                <img
                  src={slide.image}
                  alt={
                    slide.type === "slogan"
                      ? "Lucent Character"
                      : "Lucent Goods"
                  }
                  className={`absolute inset-0 w-full h-full object-contain ${
                    slide.type === "slogan" ? "object-bottom" : "object-center"
                  }`}
                />
              </div>
            )}
          </div>
        </div>
      ))}

      {/* Slide Indicators */}
      <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-2 md:bottom-8">
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
