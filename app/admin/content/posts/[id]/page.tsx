"use client";

import { useParams } from "next/navigation";
import { Loading } from "@/components/ui/loading";
import { useV2ContentAdminPost } from "@/lib/client/hooks/useV2ContentAdmin";
import { ContentPostForm } from "@/src/components/admin/content/ContentPostForm";

export default function EditContentPostPage() {
  const params = useParams<{ id: string }>();
  const postId = params.id;
  const { data: post, isLoading, error } = useV2ContentAdminPost(postId);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loading size="lg" text="게시글을 불러오는 중입니다." />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
        게시글 정보를 불러오지 못했습니다.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">게시글 수정</h1>
        <p className="mt-1 text-sm text-gray-500">
          저장 후 발행하면 공개 뉴스 페이지에 노출됩니다.
        </p>
      </div>
      <ContentPostForm mode="edit" post={post} />
    </div>
  );
}
