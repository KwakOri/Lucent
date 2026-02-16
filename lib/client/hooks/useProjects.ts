/**
 * Project API Hooks
 *
 * 프로젝트 관련 React Query hooks
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { ProjectsAPI } from '@/lib/client/api/projects.api';
import type { GetProjectsParams } from '@/lib/client/api/projects.api';
import { queryKeys } from './query-keys';

/**
 * 프로젝트 목록 조회 Hook
 */
export function useProjects(params?: GetProjectsParams) {
  return useQuery({
    queryKey: queryKeys.projects.list(params),
    queryFn: async () => {
      const response = await ProjectsAPI.getProjects(params);
      return response.data;
    },
    staleTime: 1000 * 60 * 10,
  });
}

/**
 * 프로젝트 상세 조회 Hook
 */
export function useProject(projectId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.projects.detail(projectId || ''),
    queryFn: async () => {
      const response = await ProjectsAPI.getProject(projectId!);
      return response.data;
    },
    enabled: !!projectId,
    staleTime: 1000 * 60 * 10,
  });
}

/**
 * Slug로 프로젝트 조회 Hook
 */
export function useProjectBySlug(slug: string | null | undefined) {
  return useQuery({
    queryKey: ['projects', 'slug', slug],
    queryFn: async () => {
      const response = await ProjectsAPI.getProjectBySlug(slug!);
      return response.data;
    },
    enabled: !!slug,
    staleTime: 1000 * 60 * 10,
  });
}
