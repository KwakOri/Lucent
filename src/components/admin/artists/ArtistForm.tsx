'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ImageUpload } from '@/src/components/admin/ImageUpload';

interface Project {
  id: string;
  name: string;
  slug: string;
}

interface Artist {
  id: string;
  name: string;
  slug: string;
  project_id: string;
  profile_image_id: string | null;
  profile_image?: {
    id: string;
    public_url: string;
    cdn_url?: string | null;
    alt_text: string | null;
  };
  description?: string | null;
  is_active: boolean;
}

interface ArtistFormProps {
  projects: Project[];
  artist?: Artist;
}

export function ArtistForm({ projects, artist }: ArtistFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: artist?.name || '',
    slug: artist?.slug || '',
    project_id: artist?.project_id || projects[0]?.id || '',
    profile_image_id: artist?.profile_image_id || '',
    description: artist?.description || '',
    is_active: artist?.is_active ?? true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const url = artist
        ? `/api/artists/${artist.id}`
        : '/api/artists';

      const method = artist ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '저장에 실패했습니다');
      }

      router.push('/admin/artists');
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : '저장에 실패했습니다');
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl">
      <div className="space-y-6 bg-white px-4 py-5 shadow sm:rounded-lg sm:p-6">
        {/* 이름 */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium leading-6 text-gray-900">
            이름 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="name"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="mt-2 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 px-3"
            placeholder="미루루"
          />
        </div>

        {/* 슬러그 */}
        <div>
          <label htmlFor="slug" className="block text-sm font-medium leading-6 text-gray-900">
            슬러그 (URL) <span className="text-red-500">*</span>
          </label>
          <div className="mt-2">
            <input
              type="text"
              id="slug"
              required
              pattern="[a-z0-9-]+"
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 px-3"
              placeholder="miruru"
            />
            <p className="mt-1 text-sm text-gray-500">
              → /goods/{formData.slug || 'slug'}
            </p>
          </div>
        </div>

        {/* 프로젝트 */}
        <div>
          <label htmlFor="project_id" className="block text-sm font-medium leading-6 text-gray-900">
            소속 프로젝트 <span className="text-red-500">*</span>
          </label>
          <select
            id="project_id"
            required
            value={formData.project_id}
            onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
            className="mt-2 block w-full rounded-md bg-white border-2 border-gray-400 py-2 pl-3 pr-10 text-gray-900 font-medium focus:border-primary-600 focus:ring-2 focus:ring-primary-500 sm:text-sm"
          >
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>

        {/* 프로필 이미지 */}
        <div>
          <ImageUpload
            imageType="artist_profile"
            label="프로필 이미지"
            currentImageUrl={
              artist?.profile_image?.cdn_url ||
              artist?.profile_image?.public_url
            }
            altText={formData.name}
            onUploadSuccess={(imageId, publicUrl) => {
              setFormData({ ...formData, profile_image_id: imageId });
            }}
          />
        </div>

        {/* 설명 */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium leading-6 text-gray-900">
            설명 (선택)
          </label>
          <textarea
            id="description"
            rows={4}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="mt-2 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 px-3"
            placeholder="아티스트 소개..."
          />
        </div>

        {/* 활성 상태 */}
        <div className="relative flex items-start">
          <div className="flex h-6 items-center">
            <input
              id="is_active"
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600"
            />
          </div>
          <div className="ml-3 text-sm leading-6">
            <label htmlFor="is_active" className="font-medium text-gray-900">
              활성화
            </label>
            <p className="text-gray-500">아티스트를 공개 페이지에 표시합니다</p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-x-3 mt-6">
        <Link
          href="/admin/artists"
          className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
        >
          취소
        </Link>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50"
        >
          {isSubmitting ? '저장 중...' : '저장'}
        </button>
      </div>
    </form>
  );
}
