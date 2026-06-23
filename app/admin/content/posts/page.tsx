"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Edit3, Plus, Send, Archive } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loading } from "@/components/ui/loading";
import { Select } from "@/components/ui/select";
import type {
  V2ContentPostStatus,
  V2ContentPostType,
} from "@/lib/client/api/v2-content.api";
import {
  useArchiveV2ContentAdminPost,
  usePublishV2ContentAdminPost,
  useV2ContentAdminPosts,
} from "@/lib/client/hooks/useV2ContentAdmin";
import {
  CONTENT_POST_STATUS_LABELS,
  CONTENT_POST_STATUSES,
  CONTENT_POST_TYPE_LABELS,
  CONTENT_POST_TYPES,
  formatContentDate,
  getContentPostStatusIntent,
  getErrorMessage,
} from "@/lib/client/utils/v2-content";

type StatusFilter = V2ContentPostStatus | "ALL";
type TypeFilter = V2ContentPostType | "ALL";

export default function ContentPostsAdminPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("ALL");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const params = useMemo(
    () => ({
      limit: 100,
      search: search.trim() || undefined,
      status: statusFilter === "ALL" ? undefined : statusFilter,
      post_type: typeFilter === "ALL" ? undefined : typeFilter,
    }),
    [search, statusFilter, typeFilter],
  );
  const { data, isLoading, error } = useV2ContentAdminPosts(params);
  const publishPost = usePublishV2ContentAdminPost();
  const archivePost = useArchiveV2ContentAdminPost();

  const posts = data?.data || [];

  const handlePublish = async (postId: string) => {
    setErrorMessage(null);
    try {
      await publishPost.mutateAsync(postId);
    } catch (publishError) {
      setErrorMessage(getErrorMessage(publishError));
    }
  };

  const handleArchive = async (postId: string) => {
    setErrorMessage(null);
    try {
      await archivePost.mutateAsync(postId);
    } catch (archiveError) {
      setErrorMessage(getErrorMessage(archiveError));
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loading size="lg" text="게시글을 불러오는 중입니다." />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
        게시글 정보를 불러오지 못했습니다.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">게시글 관리</h1>
          <p className="mt-1 text-sm text-gray-500">
            홈 새소식, 공지, 배너형 콘텐츠를 작성하고 발행합니다.
          </p>
        </div>
        <Button onClick={() => router.push("/admin/content/posts/new")}>
          <Plus className="h-4 w-4" />
          새 게시글
        </Button>
      </div>

      {errorMessage ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[1fr_180px_180px]">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="제목, 요약, slug 검색"
          />
          <Select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
            options={[
              { label: "전체 상태", value: "ALL" },
              ...CONTENT_POST_STATUSES.map((status) => ({
                label: CONTENT_POST_STATUS_LABELS[status],
                value: status,
              })),
            ]}
          />
          <Select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value as TypeFilter)}
            options={[
              { label: "전체 유형", value: "ALL" },
              ...CONTENT_POST_TYPES.map((type) => ({
                label: CONTENT_POST_TYPE_LABELS[type],
                value: type,
              })),
            ]}
          />
        </div>
      </section>

      <section className="space-y-3">
        {posts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-6 py-12 text-center text-sm text-gray-500">
            조건에 맞는 게시글이 없습니다.
          </div>
        ) : null}

        {posts.map((post) => (
          <article
            key={post.id}
            className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap gap-2">
                  <Badge intent={getContentPostStatusIntent(post.status)}>
                    {CONTENT_POST_STATUS_LABELS[post.status]}
                  </Badge>
                  <Badge intent="info">{CONTENT_POST_TYPE_LABELS[post.post_type]}</Badge>
                  {post.featured_on_home ? <Badge intent="success">홈 노출</Badge> : null}
                </div>
                <h2 className="mt-3 text-lg font-semibold text-gray-900">
                  {post.title}
                </h2>
                <p className="mt-1 break-all text-sm text-gray-500">/{post.slug}</p>
                <p className="mt-3 line-clamp-2 text-sm text-gray-600">
                  {post.summary || post.body_text || "요약이 없습니다."}
                </p>
                <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-500">
                  <span>발행일 {formatContentDate(post.published_at)}</span>
                  <span>수정일 {formatContentDate(post.updated_at)}</span>
                  <span>정렬 {post.sort_order}</span>
                </div>
              </div>

              {post.cover_media_asset?.public_url ? (
                <img
                  src={post.cover_media_asset.public_url}
                  alt={post.cover_alt_text || post.title}
                  className="h-28 w-full rounded-xl object-cover lg:w-44"
                />
              ) : null}

              <div className="flex flex-wrap gap-2 lg:w-64 lg:justify-end">
                <Button
                  intent="neutral"
                  size="sm"
                  onClick={() => router.push(`/admin/content/posts/${post.id}`)}
                >
                  <Edit3 className="h-4 w-4" />
                  수정
                </Button>
                {post.status !== "PUBLISHED" ? (
                  <Button
                    size="sm"
                    loading={publishPost.isPending}
                    onClick={() => handlePublish(post.id)}
                  >
                    <Send className="h-4 w-4" />
                    발행
                  </Button>
                ) : null}
                {post.status !== "ARCHIVED" ? (
                  <Button
                    intent="neutral"
                    size="sm"
                    loading={archivePost.isPending}
                    onClick={() => handleArchive(post.id)}
                  >
                    <Archive className="h-4 w-4" />
                    보관
                  </Button>
                ) : null}
              </div>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
