'use client';

import Link from 'next/link';
import { Loading } from '@/components/ui/loading';
import { useArtists } from '@/lib/client/hooks/useArtists';
import {
  AdminPageHeader,
  adminLegacyBridgeClass,
  adminPrimaryButtonClass,
} from '@/src/components/admin/AdminDesignSystem';
import { ArtistsTable } from '@/src/components/admin/artists/ArtistsTable';

export default function AdminArtistsPage() {
  const { data: artists, isLoading, error } = useArtists({
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
        <p className="text-red-600">아티스트 목록을 불러오는데 실패했습니다.</p>
      </div>
    );
  }

  return (
    <div className={`${adminLegacyBridgeClass} space-y-6`}>
      <AdminPageHeader
        eyebrow="legacy"
        title="아티스트 관리"
        description="레이블 소속 아티스트를 관리합니다."
        actions={
          <Link
            href="/admin/artists/new"
            className={adminPrimaryButtonClass}
          >
            + 아티스트 등록
          </Link>
        }
      />

      <ArtistsTable artists={artists || []} />
    </div>
  );
}
