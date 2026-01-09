"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

// 임시 뉴스 데이터
const NEWS_DATA = [
  {
    id: 1,
    title: "'시로우미 미루루' 재야의 종소리 보이스팩",
    description: "시로우미 미루루의 2025년 마지막 보이스팩을 만나보세요!",
    image: "/news3.png",
    link: "/news/3",
  },
  {
    id: 2,
    title: "[재판매 공지] '시로우미 미루루' 할로윈 강시 보이스팩",
    description:
      "시로우미 미루루가 2026년도 1월1일 기점으로 루센트 프로젝트에 정식 등록 되었습니다.",
    image: "/news1.png",
    link: "/news/1",
  },
  {
    id: 3,
    title: "루센트 0th 프로젝트 시로우미 미루루 등장",
    description:
      "시로우미 미루루가 2026년도 1월1일 기점으로 루센트 프로젝트에 정식 등록 되었습니다.",
    image: "/news2.png",
    link: "/news/2",
  },
];

export function NewsSection() {
  return (
    <section id="news" className="py-12 md:py-20 px-4 bg-[#f9f9ed]">
      <div className="max-w-6xl mx-auto">
        {/* 헤더 */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-8 md:mb-12 gap-4">
          <div>
            <h2 className="text-3xl md:text-5xl font-bold text-[#1a1a2e] leading-tight mb-3 md:mb-4">
              <span className="block">루센트 새소식</span>
            </h2>
            <p className="text-base md:text-lg text-[#1a1a2e]/70">
              이벤트와 크리에이터들에 대한 최신 소식을 확인해 보세요!
            </p>
          </div>

          <Link
            href="/news"
            className="flex items-center gap-2 md:gap-3 bg-[#66B5F3] text-white px-5 md:px-6 py-2.5 md:py-3 rounded-full hover:bg-[#5aa0d9] transition-colors self-start"
          >
            <span className="font-medium text-sm md:text-base">더보기</span>
            <ArrowRight className="w-4 h-4 md:w-5 md:h-5" />
          </Link>
        </div>

        {/* 뉴스 카드 리스트 */}
        <div className="flex flex-col gap-4 md:gap-6">
          {NEWS_DATA.map((news) => (
            <Link key={news.id} href={news.link} className="group block">
              <div className="relative bg-linear-to-r from-[#d4f1f9] to-[#e8f7fc] rounded-2xl md:rounded-3xl p-4 md:p-6 overflow-hidden hover:shadow-lg transition-shadow">
                <div className="relative flex flex-col md:flex-row md:items-center gap-4 md:gap-8">
                  {/* 썸네일 이미지 */}
                  <div className="shrink-0 w-full md:w-52 h-40 md:h-44 bg-white rounded-xl md:rounded-2xl overflow-hidden shadow-sm">
                    <img
                      src={news.image}
                      alt={news.title}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* 텍스트 콘텐츠 */}
                  <div className="flex-1 md:pr-16">
                    <h3 className="text-lg md:text-2xl font-bold text-[#1a1a2e] mb-2 md:mb-3 group-hover:text-[#66B5F3] transition-colors">
                      {news.title}
                    </h3>
                    <p className="text-sm md:text-base text-[#1a1a2e]/60 leading-relaxed">
                      {news.description}
                    </p>
                  </div>

                  {/* 화살표 */}
                  <div className="absolute right-4 md:right-6 bottom-4 md:top-1/2 md:-translate-y-1/2">
                    <ArrowRight className="w-6 h-6 md:w-8 md:h-8 text-[#1a1a2e]/40 group-hover:text-[#66B5F3] group-hover:translate-x-2 transition-all" />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
