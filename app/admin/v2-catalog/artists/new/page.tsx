'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { ImageUpload } from '@/src/components/admin/ImageUpload';
import type { V2ArtistStatus } from '@/lib/client/api/v2-catalog-admin.api';
import { useCreateV2Artist } from '@/lib/client/hooks/useV2CatalogAdmin';

const ARTIST_STATUS_VALUES: V2ArtistStatus[] = ['DRAFT', 'ACTIVE', 'ARCHIVED'];
const SELECT_CLASS =
  'h-11 rounded-lg border border-neutral-200 bg-white px-3 text-sm text-text-primary focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20';

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

export default function V2CatalogArtistCreatePage() {
  const router = useRouter();
  const createArtist = useCreateV2Artist();

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [bio, setBio] = useState('');
  const [profileImageUrl, setProfileImageUrl] = useState('');
  const [status, setStatus] = useState<V2ArtistStatus>('DRAFT');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleCreateArtist = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    try {
      await createArtist.mutateAsync({
        name: name.trim(),
        slug: slug.trim(),
        bio: bio.trim() || null,
        profile_image_url: profileImageUrl.trim() || null,
        status,
      });
      router.push('/admin/v2-catalog/artists');
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  };

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">v2 아티스트 생성</h1>
          <p className="mt-1 text-sm text-gray-500">새 아티스트를 등록합니다.</p>
        </div>
        <div className="mt-3 sm:mt-0">
          <Button intent="neutral" onClick={() => router.push('/admin/v2-catalog/artists')}>
            목록으로
          </Button>
        </div>
      </div>

      {errorMessage && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <form className="grid grid-cols-1 gap-3 lg:grid-cols-2" onSubmit={handleCreateArtist}>
          <Input
            placeholder="이름"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
          <Input
            placeholder="slug (예: rosie)"
            value={slug}
            onChange={(event) => setSlug(event.target.value)}
            required
          />
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as V2ArtistStatus)}
            className={SELECT_CLASS}
          >
            {ARTIST_STATUS_VALUES.map((statusValue) => (
              <option key={statusValue} value={statusValue}>
                {statusValue}
              </option>
            ))}
          </select>
          <Input
            placeholder="profile_image_url (직접 입력 가능)"
            value={profileImageUrl}
            onChange={(event) => setProfileImageUrl(event.target.value)}
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
              placeholder="소개 (선택)"
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              rows={3}
            />
          </div>
          <div className="lg:col-span-2 flex gap-2">
            <Button type="submit" loading={createArtist.isPending}>
              생성
            </Button>
            <Button
              type="button"
              intent="neutral"
              onClick={() => router.push('/admin/v2-catalog/artists')}
            >
              취소
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
