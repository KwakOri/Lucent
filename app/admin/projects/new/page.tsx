import { ProjectForm } from '@/src/components/admin/projects/ProjectForm';
import {
  AdminPageHeader,
  adminLegacyBridgeClass,
} from '@/src/components/admin/AdminDesignSystem';

export default function NewProjectPage() {
  return (
    <div className={`${adminLegacyBridgeClass} space-y-6`}>
      <AdminPageHeader
        eyebrow="legacy form"
        title="프로젝트 등록"
        description="새로운 프로젝트를 등록합니다."
      />

      <ProjectForm />
    </div>
  );
}
