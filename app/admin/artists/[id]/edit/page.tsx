'use client';

import { useParams } from 'next/navigation';
import { Loading } from '@/components/ui/loading';
import { useArtistById } from '@/lib/client/hooks/useArtists';
import { useProjects } from '@/lib/client/hooks/useProjects';
import { ArtistForm } from '@/src/components/admin/artists/ArtistForm';

export default function EditArtistPage() {
  const params = useParams<{ id: string }>();
  const { data: artist, isLoading: isArtistLoading, error: artistError } =
    useArtistById(params.id);
  const { data: projects, isLoading: isProjectsLoading, error: projectsError } =
    useProjects({ isActive: 'all' });

  if (isArtistLoading || isProjectsLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loading size="lg" />
      </div>
    );
  }

  if (artistError || projectsError || !artist) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">아티스트 정보를 불러오는데 실패했습니다.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">아티스트 수정</h1>
        <p className="mt-1 text-sm text-gray-500">
          {artist.name} 정보를 수정합니다
        </p>
      </div>

      <ArtistForm projects={projects || []} artist={artist} />
    </div>
  );
}
