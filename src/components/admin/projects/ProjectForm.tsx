'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ImageUpload } from '@/src/components/admin/ImageUpload';
import type { ProjectWithDetails } from '@/lib/server/services/project.service';

interface ProjectFormProps {
  project?: ProjectWithDetails;
}

export function ProjectForm({ project }: ProjectFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Helper to safely access external_links
  const getExternalLinks = () => {
    if (!project?.external_links || typeof project.external_links !== 'object') {
      return { youtube: '', spotify: '', other: '' };
    }
    const links = project.external_links as Record<string, any>;
    return {
      youtube: (links.youtube as string) || '',
      spotify: (links.spotify as string) || '',
      other: (links.other as string) || '',
    };
  };

  const [formData, setFormData] = useState({
    name: project?.name || '',
    slug: project?.slug || '',
    cover_image_id: project?.cover_image_id || '',
    description: project?.description || '',
    release_date: project?.release_date || '',
    external_links: getExternalLinks(),
    is_active: project?.is_active ?? true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const url = project
        ? `/api/projects/${project.id}`
        : '/api/projects';

      const method = project ? 'PATCH' : 'POST';

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

      router.push('/admin/projects');
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
            프로젝트 이름 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="name"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="mt-2 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 px-3"
            placeholder="0th Project"
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
              placeholder="0th"
            />
            <p className="mt-1 text-sm text-gray-500">
              → /projects/{formData.slug || 'slug'}
            </p>
          </div>
        </div>

        {/* 커버 이미지 */}
        <div>
          <ImageUpload
            imageType="project_cover"
            label="커버 이미지"
            currentImageUrl={
              project?.cover_image?.cdn_url ||
              project?.cover_image?.public_url
            }
            altText={formData.name}
            onUploadSuccess={(imageId, publicUrl) => {
              setFormData({ ...formData, cover_image_id: imageId });
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
            placeholder="프로젝트 소개..."
          />
        </div>

        {/* 발매일 */}
        <div>
          <label htmlFor="release_date" className="block text-sm font-medium leading-6 text-gray-900">
            발매일 (선택)
          </label>
          <input
            type="date"
            id="release_date"
            value={formData.release_date}
            onChange={(e) => setFormData({ ...formData, release_date: e.target.value })}
            className="mt-2 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 px-3"
          />
        </div>

        {/* 외부 링크 */}
        <div>
          <h3 className="text-sm font-medium leading-6 text-gray-900 mb-2">
            외부 링크 (선택)
          </h3>

          <div className="space-y-3">
            <div>
              <label htmlFor="youtube" className="block text-sm text-gray-700">
                YouTube
              </label>
              <input
                type="url"
                id="youtube"
                value={formData.external_links.youtube}
                onChange={(e) => setFormData({
                  ...formData,
                  external_links: { ...formData.external_links, youtube: e.target.value }
                })}
                className="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 px-3"
                placeholder="https://youtube.com/..."
              />
            </div>

            <div>
              <label htmlFor="spotify" className="block text-sm text-gray-700">
                Spotify
              </label>
              <input
                type="url"
                id="spotify"
                value={formData.external_links.spotify}
                onChange={(e) => setFormData({
                  ...formData,
                  external_links: { ...formData.external_links, spotify: e.target.value }
                })}
                className="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 px-3"
                placeholder="https://open.spotify.com/..."
              />
            </div>

            <div>
              <label htmlFor="other" className="block text-sm text-gray-700">
                기타
              </label>
              <input
                type="url"
                id="other"
                value={formData.external_links.other}
                onChange={(e) => setFormData({
                  ...formData,
                  external_links: { ...formData.external_links, other: e.target.value }
                })}
                className="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 px-3"
                placeholder="https://..."
              />
            </div>
          </div>
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
            <p className="text-gray-500">프로젝트를 공개 페이지에 표시합니다</p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-x-3 mt-6">
        <Link
          href="/admin/projects"
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
