'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Twitter } from 'lucide-react';
import { useProjects } from '@/hooks';

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
    id: 'miruru-goods',
    type: 'goods',
    title: '미루루 보이스팩',
    description: '포근하고 다정한 미루루의 보이스를 만나보세요',
    background: 'bg-gradient-to-br from-[#E3F2FD] to-[#A8D5E2]',
    link: '/goods/miruru',
  },
];

// Project display config
const PROJECT_DISPLAY_CONFIG: Record<string, {
  emoji?: string;
  color?: string;
  artist?: string;
}> = {
  '0th': {
    emoji: '🌸',
    color: 'from-[#E3F2FD] to-[#A8D5E2]',
    artist: '미루루',
  },
  '1st': {
    emoji: '💧',
    color: 'from-neutral-100 to-neutral-200',
    artist: 'Drips',
  },
};

export default function HomePage() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const { data: projects } = useProjects();

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
    <div className="min-h-screen bg-white">
      {/* Navigation Bar */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="text-xl font-bold text-text-primary hover:text-primary-700 transition-colors">
              Lucent
            </Link>

            {/* Main Navigation Links */}
            <div className="hidden md:flex items-center gap-6">
              <Link href="/projects" className="text-text-secondary hover:text-text-primary transition-colors">
                Projects
              </Link>
              <Link href="/goods" className="text-text-secondary hover:text-text-primary transition-colors">
                Goods
              </Link>
              <Link href="/mypage" className="text-text-secondary hover:text-text-primary transition-colors">
                MyPage
              </Link>
            </div>

            {/* Auth Buttons */}
            <div className="flex items-center gap-3">
              <Link href="/login">
                <Button intent="neutral" size="sm">
                  로그인
                </Button>
              </Link>
              <Link href="/signup">
                <Button intent="primary" size="sm">
                  회원가입
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
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

      {/* Projects Preview Section */}
      <section className="py-20 px-4 bg-neutral-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-text-primary mb-4">
              Projects
            </h2>
            <p className="text-lg text-text-secondary">
              Lucent Management 소속 아티스트를 만나보세요
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {projects && projects.length > 0 ? (
              projects.map((project) => {
                const displayConfig = PROJECT_DISPLAY_CONFIG[project.slug] || {};
                const isDisabled = !project.is_active;

                return (
                  <Link
                    key={project.id}
                    href={`/projects/${project.slug}`}
                    className={`block bg-white rounded-2xl border-2 border-neutral-200 overflow-hidden hover:shadow-xl transition-all duration-300 ${
                      !isDisabled ? 'hover:scale-105' : 'opacity-60 cursor-not-allowed pointer-events-none'
                    }`}
                  >
                    <div className={`aspect-video bg-gradient-to-br ${displayConfig.color || 'from-neutral-100 to-neutral-200'} flex items-center justify-center`}>
                      <div className="text-center">
                        <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-white/50 backdrop-blur-sm flex items-center justify-center">
                          <span className="text-6xl">{displayConfig.emoji || '📦'}</span>
                        </div>
                        <h3 className="text-3xl font-bold text-text-primary">
                          {project.name}
                        </h3>
                      </div>
                    </div>
                    <div className="p-6">
                      <p className="text-xl font-semibold text-text-primary mb-2">
                        {displayConfig.artist || project.name}
                      </p>
                      <p className="text-text-secondary">
                        {project.description || '프로젝트 설명'}
                      </p>
                    </div>
                  </Link>
                );
              })
            ) : (
              <div className="col-span-2 text-center py-12">
                <p className="text-text-secondary">프로젝트를 불러오는 중...</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* About Lucent Section */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-text-primary mb-8">
            Lucent Management
          </h2>
          <div className="space-y-6 text-lg text-text-secondary">
            <p>
              우리는 버츄얼 MCN이 아니라 <strong className="text-text-primary">매니지먼트 레이블</strong>입니다.
            </p>
            <p>
              프로젝트를 기록하고 관리하는 레이블로서,<br />
              숨겨진 감정과 목소리가 자연스럽게 드러나는 순간을 포착합니다.
            </p>
            <p>
              각 프로젝트의 고유한 정체성을 존중하며,<br />
              그들의 이야기를 세상에 전합니다.
            </p>
          </div>
        </div>
      </section>

      {/* Social Link Section */}
      <section className="py-20 px-4 bg-neutral-50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-text-primary mb-8">
            Follow Us
          </h2>
          <a
            href="https://twitter.com/lucent_mgmt"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 px-8 py-4 bg-[#1DA1F2] hover:bg-[#1a8cd8] text-white rounded-full font-medium transition-colors"
          >
            <Twitter className="w-6 h-6" />
            공식 트위터 팔로우하기
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-neutral-900 text-white py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            {/* About */}
            <div>
              <h3 className="text-lg font-bold mb-4">Lucent Management</h3>
              <p className="text-neutral-400 text-sm">
                숨겨진 감정과 목소리가 자연스럽게 드러나는 순간을 기록하는 레이블
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="text-lg font-bold mb-4">Quick Links</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="/projects" className="text-neutral-400 hover:text-white transition-colors text-sm">
                    프로젝트
                  </Link>
                </li>
                <li>
                  <Link href="/goods" className="text-neutral-400 hover:text-white transition-colors text-sm">
                    굿즈
                  </Link>
                </li>
                <li>
                  <Link href="/mypage" className="text-neutral-400 hover:text-white transition-colors text-sm">
                    마이페이지
                  </Link>
                </li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h3 className="text-lg font-bold mb-4">Legal</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="/terms" className="text-neutral-400 hover:text-white transition-colors text-sm">
                    이용약관
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="text-neutral-400 hover:text-white transition-colors text-sm">
                    개인정보처리방침
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Copyright */}
          <div className="border-t border-neutral-800 pt-8 text-center">
            <p className="text-neutral-500 text-sm">
              © {new Date().getFullYear()} Lucent Management. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
