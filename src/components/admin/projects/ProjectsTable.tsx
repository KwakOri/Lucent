'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/outline';

interface Project {
  id: string;
  name: string;
  slug: string;
  order_index: number | null;
  is_active: boolean;
  created_at: string;
  cover_image?: {
    id: string;
    public_url: string;
    cdn_url?: string | null;
    alt_text?: string | null;
  } | null;
}

interface ProjectsTableProps {
  projects: Project[];
}

export function ProjectsTable({ projects: initialProjects }: ProjectsTableProps) {
  const router = useRouter();
  const [projects, setProjects] = useState(initialProjects);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [reordering, setReordering] = useState(false);

  const handleDelete = async (project: Project) => {
    if (!confirm(`"${project.name}" 프로젝트를 삭제하시겠습니까?`)) {
      return;
    }

    setDeletingId(project.id);

    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('삭제 실패');
      }

      setProjects(projects.filter((p) => p.id !== project.id));
      router.refresh();
    } catch (error) {
      alert('프로젝트 삭제에 실패했습니다.');
      console.error(error);
    } finally {
      setDeletingId(null);
    }
  };

  const moveProject = async (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= projects.length) return;

    const newProjects = [...projects];
    [newProjects[index], newProjects[newIndex]] = [newProjects[newIndex], newProjects[index]];

    // Update order_index
    const orders = newProjects.map((p, i) => ({
      id: p.id,
      order_index: i,
    }));

    setReordering(true);
    setProjects(newProjects);

    try {
      const response = await fetch('/api/projects/reorder', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orders }),
      });

      if (!response.ok) {
        throw new Error('순서 변경 실패');
      }

      router.refresh();
    } catch (error) {
      alert('순서 변경에 실패했습니다.');
      console.error(error);
      // Revert
      setProjects(initialProjects);
    } finally {
      setReordering(false);
    }
  };

  return (
    <div>
      {/* Mobile: Card List */}
      <div className="md:hidden space-y-4">
        {projects.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <p className="text-sm text-gray-500">등록된 프로젝트가 없습니다</p>
          </div>
        ) : (
          projects.map((project, index) => (
            <div
              key={project.id}
              className="bg-white rounded-lg border border-gray-200 p-4"
            >
              {/* 첫 줄: 순서 변경 + 이미지 + 이름 + 상태 */}
              <div className="flex items-start gap-3 mb-3">
                {/* 순서 변경 버튼 */}
                <div className="flex flex-col gap-0.5 pt-1">
                  <button
                    onClick={() => moveProject(index, 'up')}
                    disabled={index === 0 || reordering}
                    className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                    aria-label="위로 이동"
                  >
                    <ArrowUpIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => moveProject(index, 'down')}
                    disabled={index === projects.length - 1 || reordering}
                    className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                    aria-label="아래로 이동"
                  >
                    <ArrowDownIcon className="h-4 w-4" />
                  </button>
                  <span className="text-xs text-gray-500 text-center mt-1">{index + 1}</span>
                </div>

                {/* 커버 이미지 */}
                <div className="h-16 w-24 flex-shrink-0">
                  {project.cover_image ? (
                    <img
                      src={project.cover_image.cdn_url || project.cover_image.public_url}
                      alt={project.name}
                      className="h-16 w-24 rounded object-cover"
                    />
                  ) : (
                    <div className="h-16 w-24 rounded bg-gray-200" />
                  )}
                </div>

                {/* 프로젝트 정보 */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-gray-900 truncate">
                    {project.name}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    {project.slug}
                  </p>
                  <span
                    className={`inline-flex mt-2 rounded-full px-2 py-1 text-xs font-semibold ${
                      project.is_active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {project.is_active ? '활성' : '비활성'}
                  </span>
                </div>
              </div>

              {/* 둘째 줄: 등록일 */}
              <div className="text-sm mb-3 pb-3 border-b border-gray-200">
                <span className="text-xs text-gray-500">등록일</span>
                <p className="font-medium text-gray-900">
                  {new Date(project.created_at).toLocaleDateString('ko-KR')}
                </p>
              </div>

              {/* 셋째 줄: 수정/삭제 버튼 */}
              <div className="flex items-center justify-end gap-3">
                <Link
                  href={`/admin/projects/${project.id}/edit`}
                  className="text-sm font-medium text-blue-600 hover:text-blue-900"
                >
                  수정
                </Link>
                <button
                  onClick={() => handleDelete(project)}
                  disabled={deletingId === project.id}
                  className="text-sm font-medium text-red-600 hover:text-red-900 disabled:opacity-50"
                >
                  {deletingId === project.id ? '삭제 중...' : '삭제'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop: Table */}
      <div className="hidden md:block mt-8 flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                      순서
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      커버 이미지
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      이름
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      슬러그
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      상태
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      등록일
                    </th>
                    <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                      <span className="sr-only">작업</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {projects.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-3 py-8 text-center text-sm text-gray-500">
                        등록된 프로젝트가 없습니다
                      </td>
                    </tr>
                  ) : (
                    projects.map((project, index) => (
                      <tr key={project.id}>
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 sm:pl-6">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => moveProject(index, 'up')}
                              disabled={index === 0 || reordering}
                              className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                            >
                              <ArrowUpIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => moveProject(index, 'down')}
                              disabled={index === projects.length - 1 || reordering}
                              className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                            >
                              <ArrowDownIcon className="h-4 w-4" />
                            </button>
                            <span className="ml-2 text-sm text-gray-500">{index + 1}</span>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4">
                          <div className="h-10 w-16 flex-shrink-0">
                            {project.cover_image ? (
                              <img
                                src={project.cover_image.cdn_url || project.cover_image.public_url}
                                alt={project.name}
                                className="h-10 w-16 rounded object-cover"
                              />
                            ) : (
                              <div className="h-10 w-16 rounded bg-gray-200" />
                            )}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm font-medium text-gray-900">
                          {project.name}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {project.slug}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm">
                          <span
                            className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                              project.is_active
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {project.is_active ? '활성' : '비활성'}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {new Date(project.created_at).toLocaleDateString('ko-KR')}
                        </td>
                        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                          <Link
                            href={`/admin/projects/${project.id}/edit`}
                            className="text-blue-600 hover:text-blue-900 mr-4"
                          >
                            수정
                          </Link>
                          <button
                            onClick={() => handleDelete(project)}
                            disabled={deletingId === project.id}
                            className="text-red-600 hover:text-red-900 disabled:opacity-50"
                          >
                            {deletingId === project.id ? '삭제 중...' : '삭제'}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
