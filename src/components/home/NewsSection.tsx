"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useV2ContentPosts } from "@/lib/client/hooks";
import { formatContentDate } from "@/lib/client/utils/v2-content";

export function NewsSection() {
  const { data, isLoading, isError } = useV2ContentPosts({
    limit: 3,
    featured_on_home: true,
    post_type: "NEWS",
    sort: "SORT_ORDER",
  });
  const posts = data?.data || [];

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
          {isLoading ? (
            <div className="rounded-3xl border border-[#d8e7f6] bg-white px-6 py-10 text-center text-[#1a1a2e]/60">
              새소식을 불러오는 중입니다.
            </div>
          ) : null}

          {!isLoading && isError ? (
            <div className="rounded-3xl border border-[#ffd8d8] bg-[#fff7f7] px-6 py-10 text-center text-[#ad3f3f]">
              새소식을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
            </div>
          ) : null}

          {!isLoading && !isError && posts.length === 0 ? (
            <div className="rounded-3xl border border-[#d8e7f6] bg-white px-6 py-10 text-center text-[#1a1a2e]/60">
              공개된 새소식이 없습니다.
            </div>
          ) : null}

          {posts.map((post) => (
            <Link key={post.id} href={`/news/${post.slug}`} className="group block">
              <div className="relative bg-linear-to-r from-[#d4f1f9] to-[#e8f7fc] rounded-2xl md:rounded-3xl p-4 md:p-6 overflow-hidden hover:shadow-lg transition-shadow">
                <div className="relative flex flex-col md:flex-row md:items-center gap-4 md:gap-8">
                  {/* 썸네일 이미지 */}
                  <div className="shrink-0 w-full md:w-52 h-40 md:h-44 bg-white rounded-xl md:rounded-2xl overflow-hidden shadow-sm">
                    {post.cover_media_asset?.public_url ? (
                      <img
                        src={post.cover_media_asset.public_url}
                        alt={post.cover_alt_text || post.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center px-4 text-center text-lg font-semibold text-[#1a1a2e]/50">
                        LUCENT
                      </div>
                    )}
                  </div>

                  {/* 텍스트 콘텐츠 */}
                  <div className="flex-1 md:pr-16">
                    <p className="mb-2 text-xs font-semibold text-[#4a88b9]">
                      {formatContentDate(post.published_at)}
                    </p>
                    <h3 className="text-lg md:text-2xl font-bold text-[#1a1a2e] mb-2 md:mb-3 group-hover:text-[#66B5F3] transition-colors">
                      {post.title}
                    </h3>
                    <p className="text-sm md:text-base text-[#1a1a2e]/60 leading-relaxed">
                      {post.summary || post.body_text}
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
