"use client";

import { useParams } from "next/navigation";
import { Loading } from "@/components/ui/loading";
import { useV2ContentAdminPost } from "@/lib/client/hooks/useV2ContentAdmin";
import { ContentPostForm } from "@/src/components/admin/content/ContentPostForm";
import {
  AdminPageHeader,
  adminLegacyBridgeClass,
} from "@/src/components/admin/AdminDesignSystem";

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
      <div className="rounded-[14px] border border-red-200 bg-red-50 p-4 font-medium text-red-700">
        게시글 정보를 불러오지 못했습니다.
      </div>
    );
  }

  return (
    <div className={`${adminLegacyBridgeClass} space-y-6`}>
      <AdminPageHeader
        eyebrow="content form"
        title="게시글 수정"
        description="저장 후 발행하면 공개 뉴스 페이지에 노출됩니다."
      />
      <ContentPostForm mode="edit" post={post} />
    </div>
  );
}
