'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Artist {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  created_at: string;
  profile_image?: {
    id: string;
    public_url: string;
    cdn_url?: string | null;
    alt_text: string | null;
  };
  project?: {
    id: string;
    name: string;
    slug: string;
  };
}

interface ArtistsTableProps {
  artists: Artist[];
}

export function ArtistsTable({ artists: initialArtists }: ArtistsTableProps) {
  const router = useRouter();
  const [artists, setArtists] = useState(initialArtists);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (artist: Artist) => {
    if (!confirm(`"${artist.name}" 아티스트를 삭제하시겠습니까?`)) {
      return;
    }

    setDeletingId(artist.id);

    try {
      const response = await fetch(`/api/artists/${artist.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('삭제 실패');
      }

      // UI에서 제거
      setArtists(artists.filter((a) => a.id !== artist.id));
      router.refresh();
    } catch (error) {
      alert('아티스트 삭제에 실패했습니다.');
      console.error(error);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      {/* Mobile: Card List */}
      <div className="md:hidden space-y-4">
        {artists.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <p className="text-sm text-gray-500">등록된 아티스트가 없습니다</p>
          </div>
        ) : (
          artists.map((artist) => (
            <div
              key={artist.id}
              className="bg-white rounded-lg border border-gray-200 p-4"
            >
              {/* 첫 줄: 프로필 + 이름 + 상태 */}
              <div className="flex items-start gap-3 mb-3">
                <div className="h-12 w-12 flex-shrink-0">
                  {artist.profile_image ? (
                    <img
                      src={artist.profile_image.cdn_url || artist.profile_image.public_url}
                      alt={artist.name}
                      className="h-12 w-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-gray-200" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-gray-900">
                    {artist.name}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    {artist.slug}
                  </p>
                  <span
                    className={`inline-flex mt-2 rounded-full px-2 py-1 text-xs font-semibold ${
                      artist.is_active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {artist.is_active ? '활성' : '비활성'}
                  </span>
                </div>
              </div>

              {/* 둘째 줄: 프로젝트, 등록일 */}
              <div className="flex items-center justify-between text-sm mb-3 pb-3 border-b border-gray-200">
                <div>
                  <span className="text-xs text-gray-500">프로젝트</span>
                  <p className="font-medium text-gray-900">{artist.project?.name || '-'}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-gray-500">등록일</span>
                  <p className="font-medium text-gray-900">
                    {new Date(artist.created_at).toLocaleDateString('ko-KR')}
                  </p>
                </div>
              </div>

              {/* 셋째 줄: 수정/삭제 버튼 */}
              <div className="flex items-center justify-end gap-3">
                <Link
                  href={`/admin/artists/${artist.id}/edit`}
                  className="text-sm font-medium text-blue-600 hover:text-blue-900"
                >
                  수정
                </Link>
                <button
                  onClick={() => handleDelete(artist)}
                  disabled={deletingId === artist.id}
                  className="text-sm font-medium text-red-600 hover:text-red-900 disabled:opacity-50"
                >
                  {deletingId === artist.id ? '삭제 중...' : '삭제'}
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
                      프로필
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      이름
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      슬러그
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      프로젝트
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
                  {artists.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-3 py-8 text-center text-sm text-gray-500">
                        등록된 아티스트가 없습니다
                      </td>
                    </tr>
                  ) : (
                    artists.map((artist) => (
                      <tr key={artist.id}>
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 sm:pl-6">
                          <div className="h-10 w-10 flex-shrink-0">
                            {artist.profile_image ? (
                              <img
                                src={artist.profile_image.cdn_url || artist.profile_image.public_url}
                                alt={artist.name}
                                className="h-10 w-10 rounded-full object-cover"
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-full bg-gray-200" />
                            )}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm font-medium text-gray-900">
                          {artist.name}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {artist.slug}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {artist.project?.name || '-'}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm">
                          <span
                            className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                              artist.is_active
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {artist.is_active ? '활성' : '비활성'}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {new Date(artist.created_at).toLocaleDateString('ko-KR')}
                        </td>
                        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                          <Link
                            href={`/admin/artists/${artist.id}/edit`}
                            className="text-blue-600 hover:text-blue-900 mr-4"
                          >
                            수정
                          </Link>
                          <button
                            onClick={() => handleDelete(artist)}
                            disabled={deletingId === artist.id}
                            className="text-red-600 hover:text-red-900 disabled:opacity-50"
                          >
                            {deletingId === artist.id ? '삭제 중...' : '삭제'}
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
