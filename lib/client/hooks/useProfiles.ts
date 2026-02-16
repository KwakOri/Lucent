/**
 * Profile API Hooks
 *
 * 프로필 관련 React Query hooks
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import type { TablesUpdate } from '@/types/database';
import { ProfilesAPI } from '@/lib/client/api/profiles.api';

type ProfileUpdate = TablesUpdate<'profiles'>;

/**
 * 내 프로필 조회 Hook
 *
 * @example
 * const { data: profile, isLoading } = useMyProfile();
 */
export function useMyProfile() {
  return useQuery({
    queryKey: ['profiles', 'me'],
    queryFn: async () => {
      const result = await ProfilesAPI.getMyProfile();
      return result.data;
    },
    retry: 1,
    staleTime: 1000 * 60 * 5, // 5분
  });
}

/**
 * 프로필 수정 Hook
 *
 * @example
 * const { mutate: updateProfile, isPending } = useUpdateProfile();
 * updateProfile({ name: '홍길동', phone: '010-1234-5678' });
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async (data: ProfileUpdate) => {
      const result = await ProfilesAPI.updateProfile(data);
      return result.data;
    },
    onSuccess: () => {
      // 프로필 캐시 무효화
      queryClient.invalidateQueries({ queryKey: ['profiles', 'me'] });
      // 세션 캐시도 무효화 (이름이 변경되었을 수 있음)
      queryClient.invalidateQueries({ queryKey: ['auth', 'session'] });
      // 페이지 새로고침
      router.refresh();
    },
  });
}
