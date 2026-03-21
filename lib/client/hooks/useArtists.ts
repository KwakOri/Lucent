/**
 * Artists Hooks
 *
 * 아티스트 관련 React Query Hooks
 */

import { useQuery } from '@tanstack/react-query';
import { ArtistsAPI } from '@/lib/client/api/artists.api';
import type { GetArtistsParams } from '@/lib/client/api/artists.api';
import { queryKeys } from './query-keys';

/**
 * 아티스트 목록 조회 Hook
 */
export function useArtists(params?: GetArtistsParams) {
  return useQuery({
    queryKey: queryKeys.artists.list(params),
    queryFn: async () => {
      const response = await ArtistsAPI.getArtists(params);
      return response.data;
    },
    staleTime: 1000 * 60 * 10, // 10분 (아티스트 정보는 자주 변경되지 않음)
  });
}

/**
 * 아티스트 단일 조회 Hook (Slug)
 */
export function useArtist(slug: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.artists.detail(slug || ''),
    queryFn: async () => {
      const response = await ArtistsAPI.getArtistBySlug(slug!);
      return response.data;
    },
    enabled: !!slug,
    staleTime: 1000 * 60 * 10, // 10분
  });
}

/**
 * 아티스트 단일 조회 Hook (ID)
 */
export function useArtistById(id: string | null | undefined) {
  return useQuery({
    queryKey: ['artists', 'id', id || ''],
    queryFn: async () => {
      const response = await ArtistsAPI.getArtistById(id!);
      return response.data;
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 10, // 10분
  });
}
