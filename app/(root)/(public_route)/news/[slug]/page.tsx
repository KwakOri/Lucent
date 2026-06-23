"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Loading } from "@/components/ui/loading";
import { useV2ContentPostBySlug } from "@/lib/client/hooks";
import {
  CONTENT_POST_TYPE_LABELS,
  formatContentDate,
} from "@/lib/client/utils/v2-content";
import { PostBodyRenderer } from "@/src/components/content/PostBodyRenderer";

export default function NewsDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const { data: post, isLoading, isError } = useV2ContentPostBySlug(slug);

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f9f9ed]">
        <Loading size="lg" text="새소식을 불러오는 중입니다." />
      </main>
    );
  }

  if (isError || !post) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f9f9ed] px-4">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-bold text-[#1a1a2e]">
            게시글을 찾을 수 없습니다
          </h1>
          <p className="mt-3 text-[#1a1a2e]/60">
            삭제되었거나 아직 공개되지 않은 새소식입니다.
          </p>
          <Link
            href="/news"
            className="mt-8 inline-flex items-center gap-2 rounded-lg bg-[#1a1a2e] px-5 py-3 text-sm font-semibold text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            목록으로
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f9f9ed] px-4 py-12">
      <article className="mx-auto max-w-4xl">
        <Link
          href="/news"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#4a88b9] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          새소식 목록
        </Link>

        <header className="mt-8">
          <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-[#4a88b9]">
            <span>{CONTENT_POST_TYPE_LABELS[post.post_type]}</span>
            <span>·</span>
            <time>{formatContentDate(post.published_at)}</time>
          </div>
          <h1 className="mt-4 text-4xl font-bold leading-tight text-[#1a1a2e] md:text-5xl">
            {post.title}
          </h1>
          {post.summary ? (
            <p className="mt-5 text-lg leading-8 text-[#1a1a2e]/65">
              {post.summary}
            </p>
          ) : null}
        </header>

        {post.cover_media_asset?.public_url ? (
          <img
            src={post.cover_media_asset.public_url}
            alt={post.cover_alt_text || post.title}
            className="mt-10 max-h-[560px] w-full rounded-3xl object-cover shadow-sm"
          />
        ) : null}

        <section className="mt-10 rounded-3xl bg-white px-5 py-8 shadow-sm md:px-10">
          <PostBodyRenderer body={post.body_json} />

          {post.cta_label && post.cta_url ? (
            <div className="mt-10 border-t border-neutral-100 pt-8">
              {post.cta_url.startsWith("/") ? (
                <Link href={post.cta_url}>
                  <Button>
                    {post.cta_label}
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </Link>
              ) : (
                <a href={post.cta_url} target="_blank" rel="noreferrer">
                  <Button>
                    {post.cta_label}
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </a>
              )}
            </div>
          ) : null}
        </section>
      </article>
    </main>
  );
}
