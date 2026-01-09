"use client";

import { ArrowRight } from "lucide-react";

export function AboutSection() {
  return (
    <section id="about" className="py-16 md:py-24 px-4 bg-white">
      <div className="max-w-4xl mx-auto">
        {/* 헤더 */}
        <div className="text-center mb-8 md:mb-12">
          <h2 className="text-3xl md:text-5xl font-bold text-[#1a1a2e] mb-3 md:mb-4">
            Lucent Management
          </h2>
          <div className="w-12 md:w-16 h-1 bg-[#66B5F3] mx-auto rounded-full" />
        </div>

        {/* 메인 콘텐츠 */}
        <div className="space-y-6 md:space-y-8 text-center">
          <p className="text-lg md:text-xl text-[#1a1a2e]/70 leading-relaxed px-4">
            우리는 버츄얼 MCN이 아니라{" "}
            <strong className="text-[#1a1a2e] font-bold">
              매니지먼트 레이블
            </strong>
            입니다.
          </p>

          <div className="bg-[#f9f9ed] rounded-2xl md:rounded-3xl p-6 md:p-8">
            <p className="text-base md:text-lg text-[#1a1a2e]/80 leading-loose">
              혼자서는 막막한 첫 데뷔의 순간부터
              <br />
              방송 콘텐츠와 프로젝트 관리,
              <br />
              굿즈 제작과 판매까지.
              <br />
              <br />
              루센트는 버튜버의 시작과 성장을
              <br />
              함께 만드는 레이블입니다.
            </p>
          </div>

          {/* CTA */}
          <div className="pt-2 md:pt-4">
            <a
              href="https://x.com/LUCENTproject"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-[#1a1a2e]/70 hover:text-[#66B5F3] transition-colors group px-4"
            >
              <svg className="w-4 h-4 md:w-5 md:h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              <span className="text-sm md:text-base">루센트 공식 트위터 팔로우하기</span>
              <ArrowRight className="w-4 h-4 md:w-5 md:h-5 group-hover:translate-x-1 transition-transform" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
