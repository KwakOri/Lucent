"use client";

import { ContentPostForm } from "@/src/components/admin/content/ContentPostForm";
import {
  AdminPageHeader,
  adminLegacyBridgeClass,
} from "@/src/components/admin/AdminDesignSystem";

export default function NewContentPostPage() {
  return (
    <div className={`${adminLegacyBridgeClass} space-y-6`}>
      <AdminPageHeader
        eyebrow="content form"
        title="새 게시글"
        description="초안으로 저장한 뒤 검토 후 발행할 수 있습니다."
      />
      <ContentPostForm mode="create" />
    </div>
  );
}
