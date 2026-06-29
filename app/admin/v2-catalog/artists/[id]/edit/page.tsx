'use client';

import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { Loading } from '@/components/ui/loading';
import {
  AdminPageHeader,
  AdminSurface,
  adminButtonClass,
  adminInputClass,
  adminPrimaryButtonClass,
  adminSelectClass,
} from '@/src/components/admin/AdminDesignSystem';
import { ImageUpload } from '@/src/components/admin/ImageUpload';
import type { V2Artist, V2ArtistStatus } from '@/lib/client/api/v2-catalog-admin.api';
import {
  useUpdateV2Artist,
  useV2AdminArtist,
} from '@/lib/client/hooks/useV2CatalogAdmin';

const ARTIST_STATUS_VALUES: V2ArtistStatus[] = ['DRAFT', 'ACTIVE', 'ARCHIVED'];

function getErrorMessage(error: unknown): string {
  if (error && typeof error === 'object') {
    const maybeError = error as {
      message?: string;
      response?: { data?: { message?: string } };
    };
    if (maybeError.response?.data?.message) {
      return maybeError.response.data.message;
    }
    if (maybeError.message) {
      return maybeError.message;
    }
  }
  return '요청 처리 중 오류가 발생했습니다.';
}

type ArtistEditFormProps = {
  artist: V2Artist;
  onCancel: () => void;
};

function ArtistEditForm({ artist, onCancel }: ArtistEditFormProps) {
  const updateArtist = useUpdateV2Artist();

  const [name, setName] = useState(artist.name);
  const [slug, setSlug] = useState(artist.slug);
  const [bio, setBio] = useState(artist.bio || '');
  const [profileImageUrl, setProfileImageUrl] = useState(artist.profile_image_url || '');
  const [status, setStatus] = useState<V2ArtistStatus>(artist.status);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleUpdateArtist = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    try {
      await updateArtist.mutateAsync({
        id: artist.id,
        data: {
          name: name.trim(),
          slug: slug.trim(),
          bio: bio.trim() || null,
          profile_image_url: profileImageUrl.trim() || null,
          status,
        },
      });
      onCancel();
    } catch (updateError) {
      setErrorMessage(getErrorMessage(updateError));
    }
  };

  return (
    <>
      {errorMessage && (
        <div className="rounded-[14px] border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {errorMessage}
        </div>
      )}

      <AdminSurface padding="lg">
        <form className="grid grid-cols-1 gap-3 lg:grid-cols-2" onSubmit={handleUpdateArtist}>
          <Input
            placeholder="이름"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            className={adminInputClass}
          />
          <Input
            placeholder="slug"
            value={slug}
            onChange={(event) => setSlug(event.target.value)}
            required
            className={adminInputClass}
          />
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as V2ArtistStatus)}
            className={adminSelectClass}
          >
            {ARTIST_STATUS_VALUES.map((statusValue) => (
              <option key={statusValue} value={statusValue}>
                {statusValue}
              </option>
            ))}
          </select>
          <Input
            placeholder="profile_image_url"
            value={profileImageUrl}
            onChange={(event) => setProfileImageUrl(event.target.value)}
            className={adminInputClass}
          />
          <div className="lg:col-span-2">
            <ImageUpload
              imageType="artist_profile"
              label="프로필 이미지 업로드"
              currentImageUrl={profileImageUrl || undefined}
              altText={name || undefined}
              onUploadSuccess={(_imageId, publicUrl) => {
                setProfileImageUrl(publicUrl);
              }}
            />
          </div>
          <div className="lg:col-span-2">
            <Textarea
              placeholder="소개"
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              rows={3}
              className={adminInputClass}
            />
          </div>
          <div className="lg:col-span-2 flex gap-2">
            <Button type="submit" className={adminPrimaryButtonClass} loading={updateArtist.isPending}>
              저장
            </Button>
            <Button type="button" intent="neutral" className={adminButtonClass} onClick={onCancel}>
              취소
            </Button>
          </div>
        </form>
      </AdminSurface>
    </>
  );
}

export default function V2CatalogArtistEditPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();

  const artistId = useMemo(() => {
    const raw = params?.id;
    if (Array.isArray(raw)) {
      return raw[0] || '';
    }
    return raw || '';
  }, [params]);

  const { data: artist, isLoading, error } = useV2AdminArtist(artistId);

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loading size="lg" text="아티스트 정보를 불러오는 중입니다." />
      </div>
    );
  }

  if (error || !artist) {
    return (
      <div className="space-y-4">
        <div className="rounded-[20px] border border-red-200 bg-red-50 p-5 text-sm font-bold text-red-700">
          아티스트 정보를 불러오지 못했습니다.
        </div>
        <Button intent="neutral" className={adminButtonClass} onClick={() => router.push('/admin/v2-catalog/artists')}>
          목록으로
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5 text-[#1a1a2e]">
      <AdminPageHeader
        eyebrow="artist form"
        title="v2 아티스트 수정"
        description={`${artist.name} 정보를 수정합니다.`}
        actions={
          <Button intent="neutral" className={adminButtonClass} onClick={() => router.push('/admin/v2-catalog/artists')}>
            목록으로
          </Button>
        }
      />

      <ArtistEditForm
        artist={artist}
        onCancel={() => router.push('/admin/v2-catalog/artists')}
      />
    </div>
  );
}
