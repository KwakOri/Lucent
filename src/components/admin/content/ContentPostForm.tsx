"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Archive, ExternalLink, Eye, Send, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileInput } from "@/components/ui/file-input";
import { Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type {
  V2ContentAdminPost,
  UpsertV2ContentAdminPostData,
} from "@/lib/client/api/v2-content-admin.api";
import type {
  TiptapJsonNode,
  V2ContentPostType,
} from "@/lib/client/api/v2-content.api";
import {
  useArchiveV2ContentAdminPost,
  useCreateV2ContentAdminPost,
  usePublishV2ContentAdminPost,
  useUpdateV2ContentAdminPost,
} from "@/lib/client/hooks/useV2ContentAdmin";
import { useUploadV2MediaAssetFile } from "@/lib/client/hooks/useV2CatalogAdmin";
import {
  buildContentSlug,
  CONTENT_POST_TYPE_LABELS,
  CONTENT_POST_TYPES,
  createEmptyTiptapDocument,
  extractInlineMediaAssetIdsFromTiptapDocument,
  extractTextFromTiptapDocument,
  formatContentDate,
  formatContentDateTimeInput,
  getContentPostStatusIntent,
  getErrorMessage,
  parseContentDateTimeInput,
} from "@/lib/client/utils/v2-content";
import { PostBodyRenderer } from "@/src/components/content/PostBodyRenderer";
import { TiptapPostEditor } from "./TiptapPostEditor";

interface ContentPostFormProps {
  mode: "create" | "edit";
  post?: V2ContentAdminPost | null;
}

function isImageFile(file: File): boolean {
  if (file.type.toLowerCase().startsWith("image/")) {
    return true;
  }
  return /\.(png|jpg|jpeg|webp|gif|svg)$/i.test(file.name);
}

export function ContentPostForm({ mode, post }: ContentPostFormProps) {
  const router = useRouter();
  const createPost = useCreateV2ContentAdminPost();
  const updatePost = useUpdateV2ContentAdminPost();
  const publishPost = usePublishV2ContentAdminPost();
  const archivePost = useArchiveV2ContentAdminPost();
  const uploadMediaAssetFile = useUploadV2MediaAssetFile();

  const [title, setTitle] = useState(post?.title || "");
  const [slug, setSlug] = useState(post?.slug || "");
  const [slugTouched, setSlugTouched] = useState(mode === "edit");
  const [summary, setSummary] = useState(post?.summary || "");
  const [postType, setPostType] = useState<V2ContentPostType>(
    post?.post_type || "NEWS",
  );
  const [bodyJson, setBodyJson] = useState<TiptapJsonNode>(
    post?.body_json || createEmptyTiptapDocument(),
  );
  const [coverMediaAssetId, setCoverMediaAssetId] = useState(
    post?.cover_media_asset_id || "",
  );
  const [coverPreviewUrl, setCoverPreviewUrl] = useState(
    post?.cover_media_asset?.public_url || "",
  );
  const [coverFileName, setCoverFileName] = useState(
    post?.cover_media_asset?.file_name || "",
  );
  const [coverAltText, setCoverAltText] = useState(post?.cover_alt_text || "");
  const [ctaLabel, setCtaLabel] = useState(post?.cta_label || "");
  const [ctaUrl, setCtaUrl] = useState(post?.cta_url || "");
  const [featuredOnHome, setFeaturedOnHome] = useState(
    post?.featured_on_home || false,
  );
  const [sortOrder, setSortOrder] = useState(String(post?.sort_order || 0));
  const [startsAtInput, setStartsAtInput] = useState(
    formatContentDateTimeInput(post?.starts_at),
  );
  const [endsAtInput, setEndsAtInput] = useState(
    formatContentDateTimeInput(post?.ends_at),
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);

  useEffect(() => {
    if (mode !== "create" || slugTouched) {
      return;
    }
    setSlug(buildContentSlug(title));
  }, [mode, slugTouched, title]);

  const bodyText = useMemo(
    () => extractTextFromTiptapDocument(bodyJson),
    [bodyJson],
  );
  const inlineMediaAssetIds = useMemo(
    () => extractInlineMediaAssetIdsFromTiptapDocument(bodyJson),
    [bodyJson],
  );

  const isSubmitting =
    createPost.isPending ||
    updatePost.isPending ||
    publishPost.isPending ||
    archivePost.isPending ||
    uploadMediaAssetFile.isPending;

  const uploadCoverImage = async (file: File) => {
    if (!isImageFile(file)) {
      setErrorMessage("커버 이미지는 이미지 파일만 사용할 수 있습니다.");
      return;
    }
    setErrorMessage(null);
    setNoticeMessage(null);

    try {
      const uploaded = await uploadMediaAssetFile.mutateAsync({
        data: {
          file,
          asset_kind: "IMAGE",
          status: "ACTIVE",
          metadata: {
            source: "v2-content-cover-upload",
            post_id: post?.id || null,
          },
        },
      });
      setCoverMediaAssetId(uploaded.data.id);
      setCoverPreviewUrl(uploaded.data.public_url || "");
      setCoverFileName(uploaded.data.file_name || file.name);
      setNoticeMessage("커버 이미지를 연결했습니다. 저장하면 반영됩니다.");
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  };

  const buildPayload = (): UpsertV2ContentAdminPostData => {
    const normalizedTitle = title.trim();
    if (!normalizedTitle) {
      throw new Error("제목을 입력해 주세요.");
    }
    const normalizedSlug = buildContentSlug(slug || normalizedTitle);
    if (!normalizedSlug) {
      throw new Error("slug를 입력해 주세요.");
    }
    if (!bodyText) {
      throw new Error("본문을 입력해 주세요.");
    }

    const startsAt = parseContentDateTimeInput(startsAtInput);
    const endsAt = parseContentDateTimeInput(endsAtInput);
    if (startsAt && endsAt && Date.parse(startsAt) > Date.parse(endsAt)) {
      throw new Error("종료 시점은 시작 시점보다 늦어야 합니다.");
    }

    return {
      title: normalizedTitle,
      slug: normalizedSlug,
      summary: summary.trim() || null,
      body_json: bodyJson,
      body_text: bodyText,
      post_type: postType,
      cover_media_asset_id: coverMediaAssetId.trim() || null,
      cover_alt_text: coverMediaAssetId.trim()
        ? coverAltText.trim() || null
        : null,
      cta_label: ctaLabel.trim() || null,
      cta_url: ctaUrl.trim() || null,
      featured_on_home: featuredOnHome,
      sort_order: Number.parseInt(sortOrder, 10) || 0,
      starts_at: startsAt,
      ends_at: endsAt,
      metadata: {
        ...(post?.metadata || {}),
        inline_media_asset_ids: inlineMediaAssetIds,
        inline_image_count: inlineMediaAssetIds.length,
      },
    };
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setNoticeMessage(null);

    try {
      const payload = buildPayload();
      if (mode === "create") {
        const created = await createPost.mutateAsync({
          ...payload,
          status: "DRAFT",
        });
        router.replace(`/admin/content/posts/${created.data.id}`);
        return;
      }
      if (!post) {
        throw new Error("수정할 게시글 정보를 찾을 수 없습니다.");
      }
      await updatePost.mutateAsync({ id: post.id, data: payload });
      setNoticeMessage("게시글을 저장했습니다.");
      router.refresh();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  };

  const handlePublish = async () => {
    if (!post) {
      return;
    }
    setErrorMessage(null);
    setNoticeMessage(null);
    try {
      await updatePost.mutateAsync({ id: post.id, data: buildPayload() });
      await publishPost.mutateAsync(post.id);
      setNoticeMessage("게시글을 발행했습니다.");
      router.refresh();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  };

  const handleArchive = async () => {
    if (!post) {
      return;
    }
    setErrorMessage(null);
    setNoticeMessage(null);
    try {
      await archivePost.mutateAsync(post.id);
      setNoticeMessage("게시글을 보관했습니다.");
      router.refresh();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  };

  const publicPath = slug ? `/news/${encodeURIComponent(slug)}` : "/news";
  const previewDate = formatContentDate(
    post?.published_at || post?.created_at || new Date().toISOString(),
  );
  const normalizedPreviewTitle = title.trim() || "제목 없음";
  const normalizedPreviewSummary = summary.trim();
  const normalizedPreviewCtaLabel = ctaLabel.trim();
  const normalizedPreviewCtaUrl = ctaUrl.trim();

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      {errorMessage ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}
      {noticeMessage ? (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {noticeMessage}
        </div>
      ) : null}

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">기본 정보</h2>
            <p className="mt-1 text-sm text-gray-500">
              홈 새소식과 뉴스 목록에서 함께 사용됩니다.
            </p>
          </div>
          {post ? (
            <Badge intent={getContentPostStatusIntent(post.status)}>
              {post.status}
            </Badge>
          ) : null}
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              제목
            </label>
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="예: 루센트 새 프로젝트 안내"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              slug
            </label>
            <Input
              value={slug}
              onChange={(event) => {
                setSlugTouched(true);
                setSlug(event.target.value);
              }}
              placeholder="lucent-new-project"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              유형
            </label>
            <Select
              value={postType}
              onChange={(event) => setPostType(event.target.value as V2ContentPostType)}
              options={CONTENT_POST_TYPES.map((type) => ({
                label: CONTENT_POST_TYPE_LABELS[type],
                value: type,
              }))}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              홈 노출 순서
            </label>
            <Input
              type="number"
              min={0}
              value={sortOrder}
              onChange={(event) => setSortOrder(event.target.value)}
            />
          </div>

          <div className="lg:col-span-2">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              요약
            </label>
            <Textarea
              rows={3}
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
              placeholder="목록 카드에 표시될 짧은 설명"
            />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-gray-900">커버 이미지</h2>
            <p className="mt-1 text-sm text-gray-500">
              홈 카드와 뉴스 목록의 썸네일로 사용됩니다.
            </p>
            <div className="mt-4 max-w-md">
              <FileInput
                accept="image/*"
                triggerLabel={
                  uploadMediaAssetFile.isPending
                    ? "이미지 업로드 중..."
                    : "커버 이미지 선택"
                }
                disabled={isSubmitting}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (file) {
                    void uploadCoverImage(file);
                  }
                }}
              />
            </div>
            {coverFileName ? (
              <p className="mt-2 text-xs text-gray-500">파일: {coverFileName}</p>
            ) : null}
            {coverMediaAssetId ? (
              <div className="mt-4">
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  대체 텍스트
                </label>
                <Input
                  value={coverAltText}
                  onChange={(event) => setCoverAltText(event.target.value)}
                  placeholder="이미지를 설명하는 문장"
                />
                <Button
                  intent="neutral"
                  size="sm"
                  className="mt-3"
                  onClick={() => {
                    setCoverMediaAssetId("");
                    setCoverPreviewUrl("");
                    setCoverFileName("");
                    setCoverAltText("");
                  }}
                >
                  연결 해제
                </Button>
              </div>
            ) : null}
          </div>

          <div className="w-full lg:w-80">
            {coverPreviewUrl ? (
              <img
                src={coverPreviewUrl}
                alt={coverAltText || "게시글 커버 미리보기"}
                className="aspect-[16/10] w-full rounded-xl border border-gray-100 object-cover"
              />
            ) : (
              <div className="flex aspect-[16/10] w-full items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50 text-sm text-gray-400">
                <Upload className="mr-2 h-4 w-4" />
                커버 없음
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)]">
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">본문 작성</h2>
          <div className="mt-4">
            <TiptapPostEditor
              value={bodyJson}
              onChange={setBodyJson}
              disabled={isSubmitting}
            />
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-[#f9f9ed] shadow-sm xl:sticky xl:top-6 xl:self-start">
          <div className="border-b border-gray-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-gray-900">미리보기</h2>
          </div>

          <article className="max-h-[calc(100vh-10rem)] overflow-y-auto px-5 py-6">
            <header>
              <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-[#4a88b9]">
                <span>{CONTENT_POST_TYPE_LABELS[postType]}</span>
                <span>·</span>
                <time>{previewDate}</time>
              </div>
              <h1 className="mt-3 text-3xl font-bold leading-tight text-[#1a1a2e]">
                {normalizedPreviewTitle}
              </h1>
              {normalizedPreviewSummary ? (
                <p className="mt-4 text-base leading-7 text-[#1a1a2e]/65">
                  {normalizedPreviewSummary}
                </p>
              ) : null}
            </header>

            {coverPreviewUrl ? (
              <img
                src={coverPreviewUrl}
                alt={coverAltText || normalizedPreviewTitle}
                className="mt-6 max-h-[360px] w-full rounded-2xl object-cover shadow-sm"
              />
            ) : null}

            <section className="mt-6 rounded-2xl bg-white px-4 py-5 shadow-sm">
              {bodyText ? (
                <PostBodyRenderer body={bodyJson} />
              ) : (
                <p className="text-sm text-neutral-400">본문 없음</p>
              )}

              {normalizedPreviewCtaLabel && normalizedPreviewCtaUrl ? (
                <div className="mt-8 border-t border-neutral-100 pt-6">
                  <span className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white">
                    {normalizedPreviewCtaLabel}
                    <ExternalLink className="h-4 w-4" />
                  </span>
                </div>
              ) : null}
            </section>
          </article>
        </section>
      </div>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">노출 설정</h2>
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <label className="flex items-center gap-3 rounded-lg border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700">
            <input
              type="checkbox"
              checked={featuredOnHome}
              onChange={(event) => setFeaturedOnHome(event.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            홈 새소식 섹션에 노출
          </label>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              CTA 라벨
            </label>
            <Input
              value={ctaLabel}
              onChange={(event) => setCtaLabel(event.target.value)}
              placeholder="자세히 보기"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              CTA URL
            </label>
            <Input
              value={ctaUrl}
              onChange={(event) => setCtaUrl(event.target.value)}
              placeholder="/shop 또는 https://..."
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              노출 시작
            </label>
            <Input
              type="datetime-local"
              value={startsAtInput}
              onChange={(event) => setStartsAtInput(event.target.value)}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              노출 종료
            </label>
            <Input
              type="datetime-local"
              value={endsAtInput}
              onChange={(event) => setEndsAtInput(event.target.value)}
            />
          </div>
        </div>
      </section>

      <div className="sticky bottom-0 z-10 -mx-4 border-t border-gray-200 bg-white/95 px-4 py-4 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="text-sm text-gray-500">
            본문 {bodyText.length.toLocaleString()}자
          </div>
          <div className="flex flex-wrap gap-2">
            {mode === "edit" && post?.status === "PUBLISHED" ? (
              <Button
                intent="neutral"
                onClick={() => router.push(publicPath)}
              >
                <Eye className="h-4 w-4" />
                공개 페이지
              </Button>
            ) : null}
            <Button
              intent="secondary"
              onClick={() => router.push("/admin/content/posts")}
            >
              목록
            </Button>
            {mode === "edit" && post?.status !== "ARCHIVED" ? (
              <Button
                intent="neutral"
                onClick={handleArchive}
                loading={archivePost.isPending}
              >
                <Archive className="h-4 w-4" />
                보관
              </Button>
            ) : null}
            <Button type="submit" loading={createPost.isPending || updatePost.isPending}>
              저장
            </Button>
            {mode === "edit" && post?.status !== "PUBLISHED" ? (
              <Button
                intent="primary"
                onClick={handlePublish}
                loading={publishPost.isPending}
              >
                <Send className="h-4 w-4" />
                발행
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </form>
  );
}
