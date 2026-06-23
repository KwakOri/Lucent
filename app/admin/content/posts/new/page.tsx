"use client";

import { ContentPostForm } from "@/src/components/admin/content/ContentPostForm";

export default function NewContentPostPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">새 게시글</h1>
        <p className="mt-1 text-sm text-gray-500">
          초안으로 저장한 뒤 검토 후 발행할 수 있습니다.
        </p>
      </div>
      <ContentPostForm mode="create" />
    </div>
  );
}
