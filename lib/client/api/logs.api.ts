/**
 * Logs API Client
 *
 * 관리자 로그 조회 API 호출
 */

import { apiClient } from '@/lib/client/utils/api-client';
import type { ApiResponse, Json, PaginatedResponse } from '@/types';

export interface LogWithRelations {
  id: string;
  event_type: string;
  event_category: string;
  severity: string;
  user_id: string | null;
  admin_id: string | null;
  resource_type: string | null;
  resource_id: string | null;
  message: string;
  metadata: Json | null;
  ip_address: string | null;
  user_agent: string | null;
  request_path: string | null;
  changes: Json | null;
  created_at: string | null;
  user?: {
    email: string;
    name: string | null;
  } | null;
  admin?: {
    email: string;
    name: string | null;
  } | null;
}

export interface GetLogsParams {
  page?: string | number;
  limit?: string | number;
  sortBy?: 'created_at';
  order?: 'asc' | 'desc';
  eventCategory?: string;
  eventType?: string;
  severity?: 'info' | 'warning' | 'error' | 'critical';
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export interface LogStats {
  total: number;
  byCategory: Record<string, number>;
  bySeverity: Record<string, number>;
}

export const LogsAPI = {
  async getLogs(params?: GetLogsParams): Promise<PaginatedResponse<LogWithRelations>> {
    const searchParams = new URLSearchParams();

    if (params?.page !== undefined) searchParams.set('page', String(params.page));
    if (params?.limit !== undefined) searchParams.set('limit', String(params.limit));
    if (params?.sortBy) searchParams.set('sortBy', params.sortBy);
    if (params?.order) searchParams.set('order', params.order);
    if (params?.eventCategory)
      searchParams.set('filter[event_category]', params.eventCategory);
    if (params?.eventType) searchParams.set('filter[event_type]', params.eventType);
    if (params?.severity) searchParams.set('filter[severity]', params.severity);
    if (params?.userId) searchParams.set('filter[user_id]', params.userId);
    if (params?.dateFrom) searchParams.set('filter[date_from]', params.dateFrom);
    if (params?.dateTo) searchParams.set('filter[date_to]', params.dateTo);
    if (params?.search) searchParams.set('search', params.search);

    const queryString = searchParams.toString();
    return apiClient.get(`/api/logs${queryString ? `?${queryString}` : ''}`);
  },

  async getLogById(id: string): Promise<ApiResponse<LogWithRelations>> {
    return apiClient.get(`/api/logs/${id}`);
  },

  async getStats(params?: {
    dateFrom?: string;
    dateTo?: string;
  }): Promise<ApiResponse<LogStats>> {
    const searchParams = new URLSearchParams();
    if (params?.dateFrom) searchParams.set('date_from', params.dateFrom);
    if (params?.dateTo) searchParams.set('date_to', params.dateTo);

    const queryString = searchParams.toString();
    return apiClient.get(`/api/logs/stats${queryString ? `?${queryString}` : ''}`);
  },
};
