'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// Hero slides data (static)
const HERO_SLIDES = [
  {
    id: 'slogan',
    type: 'slogan',
    title: 'Lucent Management',
    description: '숨겨진 감정과 목소리가 자연스럽게 드러나는 순간을 기록하는 레이블',
    background: 'bg-gradient-to-br from-primary-50 to-primary-100',
  },
  {
    id: 'shop',
    type: 'shop',
    title: 'Shop',
    description: 'Lucent Management의 모든 상품을 만나보세요',
    background: 'bg-gradient-to-br from-[#E3F2FD] to-[#A8D5E2]',
    link: '/shop',
  },
];

export function HeroSlider() {
  const [currentSlide, setCurrentSlide] = useState(0);

  // Auto slide
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  const handlePrevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + HERO_SLIDES.length) % HERO_SLIDES.length);
  };

  const handleNextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length);
  };

  return (
    <section className="relative h-[600px] overflow-hidden">
      {HERO_SLIDES.map((slide, index) => (
        <div
          key={slide.id}
          className={`absolute inset-0 transition-opacity duration-1000 ${
            index === currentSlide ? 'opacity-100' : 'opacity-0'
          } ${slide.background}`}
        >
          <div className="h-full flex items-center justify-center px-4">
            <div className="max-w-4xl text-center">
              <h1 className="text-5xl md:text-6xl font-bold text-text-primary mb-6">
                {slide.title}
              </h1>
              <p className="text-xl md:text-2xl text-text-secondary mb-8">
                {slide.description}
              </p>
              {slide.link && (
                <Link href={slide.link}>
                  <Button intent="primary" size="lg">
                    자세히 보기
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      ))}

      {/* Slide Navigation */}
      <button
        onClick={handlePrevSlide}
        className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/80 hover:bg-white flex items-center justify-center transition-colors"
        aria-label="이전 슬라이드"
      >
        <ChevronLeft className="w-6 h-6 text-text-primary" />
      </button>
      <button
        onClick={handleNextSlide}
        className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/80 hover:bg-white flex items-center justify-center transition-colors"
        aria-label="다음 슬라이드"
      >
        <ChevronRight className="w-6 h-6 text-text-primary" />
      </button>

      {/* Slide Indicators */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2">
        {HERO_SLIDES.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            className={`w-2 h-2 rounded-full transition-all ${
              index === currentSlide
                ? 'w-8 bg-primary-700'
                : 'bg-white/50'
            }`}
            aria-label={`슬라이드 ${index + 1}`}
          />
        ))}
      </div>
    </section>
  );
}
