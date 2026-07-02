'use client';

import { Loading } from '@/components/ui/loading';
import { useProjects } from '@/lib/client/hooks/useProjects';
import {
  AdminPageHeader,
  adminLegacyBridgeClass,
} from '@/src/components/admin/AdminDesignSystem';
import { ArtistForm } from '@/src/components/admin/artists/ArtistForm';

export default function NewArtistPage() {
  const { data: projects, isLoading, error } = useProjects({
    isActive: 'all',
  });

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loading size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">프로젝트 목록을 불러오는데 실패했습니다.</p>
      </div>
    );
  }

  return (
    <div className={`${adminLegacyBridgeClass} space-y-6`}>
      <AdminPageHeader
        eyebrow="legacy form"
        title="아티스트 등록"
        description="새로운 아티스트를 등록합니다."
      />

      <ArtistForm projects={projects || []} />
    </div>
  );
}
