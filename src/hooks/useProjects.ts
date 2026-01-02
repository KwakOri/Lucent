/**
 * Project API Hooks
 *
 * 프로젝트 관련 React Query hooks
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import type { Tables, ApiResponse } from '@/types';

/**
 * 프로젝트 목록 조회 Hook
 *
 * @example
 * const { data, isLoading } = useProjects();
 */
export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const response = await fetch('/api/projects');
      if (!response.ok) {
        throw new Error('프로젝트 목록 조회 실패');
      }
      const data: ApiResponse<Tables<'projects'>[]> = await response.json();
      return data.data;
    },
    staleTime: 1000 * 60 * 10, // 10분 (프로젝트 정보는 거의 변경되지 않음)
  });
}

/**
 * 프로젝트 상세 조회 Hook
 *
 * @example
 * const { data, isLoading } = useProject('project-id');
 */
export function useProject(projectId: string | null) {
  return useQuery({
    queryKey: ['projects', projectId],
    queryFn: async () => {
      if (!projectId) throw new Error('Project ID is required');
      const response = await fetch(`/api/projects/${projectId}`);
      if (!response.ok) {
        throw new Error('프로젝트 조회 실패');
      }
      const data: ApiResponse<Tables<'projects'>> = await response.json();
      return data.data;
    },
    enabled: !!projectId,
    staleTime: 1000 * 60 * 10, // 10분
  });
}

/**
 * Slug로 프로젝트 조회 Hook
 *
 * @example
 * const { data, isLoading } = useProjectBySlug('project-slug');
 */
export function useProjectBySlug(slug: string | null) {
  return useQuery({
    queryKey: ['projects', 'slug', slug],
    queryFn: async () => {
      if (!slug) throw new Error('Slug is required');
      // Note: Slug로 조회하는 API 엔드포인트가 필요하면 추가해야 함
      // 현재는 전체 목록에서 찾는 방식으로 구현
      const response = await fetch('/api/projects');
      if (!response.ok) {
        throw new Error('프로젝트 조회 실패');
      }
      const data: ApiResponse<Tables<'projects'>[]> = await response.json();
      const project = data.data.find((p) => p.slug === slug);
      if (!project) {
        throw new Error('프로젝트를 찾을 수 없습니다');
      }
      return project;
    },
    enabled: !!slug,
    staleTime: 1000 * 60 * 10, // 10분
  });
}
