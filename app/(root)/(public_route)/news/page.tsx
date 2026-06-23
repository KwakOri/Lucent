"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Loading } from "@/components/ui/loading";
import { useV2ContentPosts } from "@/lib/client/hooks";
import {
  CONTENT_POST_TYPE_LABELS,
  formatContentDate,
} from "@/lib/client/utils/v2-content";

export default function NewsPage() {
  const { data, isLoading, isError } = useV2ContentPosts({
    limit: 24,
    post_type: "NEWS",
    sort: "LATEST",
  });
  const posts = data?.data || [];

  return (
    <main className="min-h-screen bg-[#f9f9ed] px-4 py-16">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10">
          <p className="text-sm font-semibold text-[#4a88b9]">NEWS</p>
          <h1 className="mt-2 text-4xl font-bold text-[#1a1a2e] md:text-5xl">
            루센트 새소식
          </h1>
          <p className="mt-4 text-base text-[#1a1a2e]/65">
            이벤트와 크리에이터들에 대한 최신 소식을 확인해 보세요.
          </p>
        </div>

        {isLoading ? (
          <div className="flex min-h-80 items-center justify-center rounded-3xl bg-white">
            <Loading size="lg" text="새소식을 불러오는 중입니다." />
          </div>
        ) : null}

        {!isLoading && isError ? (
          <div className="rounded-3xl border border-[#ffd8d8] bg-[#fff7f7] px-6 py-10 text-center text-[#ad3f3f]">
            새소식을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
          </div>
        ) : null}

        {!isLoading && !isError && posts.length === 0 ? (
          <div className="rounded-3xl bg-white px-6 py-16">
            <EmptyState
              title="공개된 새소식이 없습니다"
              description="새 공지가 준비되면 이곳에 표시됩니다."
            />
          </div>
        ) : null}

        {!isLoading && !isError && posts.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2">
            {posts.map((post) => (
              <Link
                key={post.id}
                href={`/news/${post.slug}`}
                className="group overflow-hidden rounded-3xl border border-[#d8e7f6] bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="aspect-[16/9] bg-[#e8f7fc]">
                  {post.cover_media_asset?.public_url ? (
                    <img
                      src={post.cover_media_asset.public_url}
                      alt={post.cover_alt_text || post.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-2xl font-bold text-[#1a1a2e]/35">
                      LUCENT
                    </div>
                  )}
                </div>
                <div className="p-6">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#4a88b9]">
                    <span>{CONTENT_POST_TYPE_LABELS[post.post_type]}</span>
                    <span>·</span>
                    <span>{formatContentDate(post.published_at)}</span>
                  </div>
                  <h2 className="mt-3 text-xl font-bold text-[#1a1a2e] group-hover:text-[#66B5F3]">
                    {post.title}
                  </h2>
                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-[#1a1a2e]/65">
                    {post.summary || post.body_text}
                  </p>
                  <div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#4a88b9]">
                    자세히 보기
                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : null}
      </div>
    </main>
  );
}
