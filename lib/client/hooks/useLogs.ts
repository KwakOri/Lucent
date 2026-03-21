/**
 * Logs API Hooks
 *
 * 관리자 로그 관련 React Query hooks
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import {
  LogsAPI,
  type GetLogsParams,
  type LogStats,
  type LogWithRelations,
} from '@/lib/client/api/logs.api';

export type { LogStats, LogWithRelations };

export function useLogs(params?: GetLogsParams) {
  return useQuery({
    queryKey: ['logs', params],
    queryFn: async () => {
      return LogsAPI.getLogs(params);
    },
    staleTime: 1000 * 60,
  });
}

export function useLog(logId: string | null) {
  return useQuery({
    queryKey: ['logs', logId],
    queryFn: async () => {
      if (!logId) {
        throw new Error('Log ID is required');
      }
      const response = await LogsAPI.getLogById(logId);
      return response.data;
    },
    enabled: !!logId,
    staleTime: 1000 * 30,
  });
}

export function useLogStats(params?: { dateFrom?: string; dateTo?: string }) {
  return useQuery({
    queryKey: ['logs', 'stats', params],
    queryFn: async (): Promise<LogStats> => {
      const response = await LogsAPI.getStats(params);
      return response.data;
    },
    staleTime: 1000 * 60 * 5,
  });
}
