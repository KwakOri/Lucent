/**
 * Logs API Tests
 *
 * 로그 API 엔드포인트 테스트
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET as logsGET } from '@/app/api/logs/route';
import { LogService } from '@/lib/server/services/log.service';
import { isAdmin } from '@/lib/server/utils/supabase';
import { createMockRequest, parseResponse } from '../utils';
import { mockLog } from '../utils/fixtures';

// Mock services
vi.mock('@/lib/server/services/log.service', () => ({
  LogService: {
    getLogs: vi.fn(),
    getStats: vi.fn(),
    logEvent: vi.fn(),
    logAuth: vi.fn(),
    logProduct: vi.fn(),
    logOrder: vi.fn(),
  },
}));

vi.mock('@/lib/server/utils/supabase', () => ({
  isAdmin: vi.fn(),
  getCurrentUser: vi.fn(),
  createServerClient: vi.fn(),
}));

describe('Logs API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/logs', () => {
    it('관리자의 로그 목록 조회 성공', async () => {
      vi.mocked(isAdmin).mockResolvedValue(true);
      vi.mocked(LogService.getLogs).mockResolvedValue({
        logs: [mockLog],
        total: 1,
      });

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/logs',
        searchParams: {
          page: '1',
          limit: '50',
        },
      });

      const response = await logsGET(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.status).toBe('success');
      expect(data.data).toHaveLength(1);
      expect(data.pagination).toEqual({
        total: 1,
        page: 1,
        limit: 50,
        totalPages: 1,
      });
    });

    it('관리자 권한 없이 로그 조회 시 403 에러', async () => {
      vi.mocked(isAdmin).mockResolvedValue(false);

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/logs',
      });

      const response = await logsGET(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(403);
      expect(data.status).toBe('error');
      expect(data.message).toContain('관리자');
    });

    it('이벤트 카테고리별 필터링', async () => {
      vi.mocked(isAdmin).mockResolvedValue(true);
      vi.mocked(LogService.getLogs).mockResolvedValue({
        logs: [mockLog],
        total: 1,
      });

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/logs',
        searchParams: {
          'filter[event_category]': 'auth',
        },
      });

      const response = await logsGET(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(LogService.getLogs).toHaveBeenCalledWith(
        expect.objectContaining({
          eventCategory: 'auth',
        })
      );
    });

    it('이벤트 타입별 필터링', async () => {
      vi.mocked(isAdmin).mockResolvedValue(true);
      vi.mocked(LogService.getLogs).mockResolvedValue({
        logs: [],
        total: 0,
      });

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/logs',
        searchParams: {
          'filter[event_type]': 'signup',
        },
      });

      const response = await logsGET(request);

      expect(response.status).toBe(200);
      expect(LogService.getLogs).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'signup',
        })
      );
    });

    it('심각도별 필터링', async () => {
      vi.mocked(isAdmin).mockResolvedValue(true);
      vi.mocked(LogService.getLogs).mockResolvedValue({
        logs: [],
        total: 0,
      });

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/logs',
        searchParams: {
          'filter[severity]': 'error',
        },
      });

      const response = await logsGET(request);

      expect(response.status).toBe(200);
      expect(LogService.getLogs).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'error',
        })
      );
    });

    it('사용자 ID별 필터링', async () => {
      vi.mocked(isAdmin).mockResolvedValue(true);
      vi.mocked(LogService.getLogs).mockResolvedValue({
        logs: [],
        total: 0,
      });

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/logs',
        searchParams: {
          'filter[user_id]': 'user-123',
        },
      });

      const response = await logsGET(request);

      expect(response.status).toBe(200);
      expect(LogService.getLogs).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
        })
      );
    });

    it('날짜 범위별 필터링', async () => {
      vi.mocked(isAdmin).mockResolvedValue(true);
      vi.mocked(LogService.getLogs).mockResolvedValue({
        logs: [],
        total: 0,
      });

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/logs',
        searchParams: {
          'filter[date_from]': '2024-01-01',
          'filter[date_to]': '2024-01-31',
        },
      });

      const response = await logsGET(request);

      expect(response.status).toBe(200);
      expect(LogService.getLogs).toHaveBeenCalledWith(
        expect.objectContaining({
          dateFrom: '2024-01-01',
          dateTo: '2024-01-31',
        })
      );
    });

    it('검색어로 필터링', async () => {
      vi.mocked(isAdmin).mockResolvedValue(true);
      vi.mocked(LogService.getLogs).mockResolvedValue({
        logs: [],
        total: 0,
      });

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/logs',
        searchParams: {
          search: 'test@example.com',
        },
      });

      const response = await logsGET(request);

      expect(response.status).toBe(200);
      expect(LogService.getLogs).toHaveBeenCalledWith(
        expect.objectContaining({
          search: 'test@example.com',
        })
      );
    });

    it('정렬 파라미터 처리', async () => {
      vi.mocked(isAdmin).mockResolvedValue(true);
      vi.mocked(LogService.getLogs).mockResolvedValue({
        logs: [],
        total: 0,
      });

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/logs',
        searchParams: {
          sortBy: 'created_at',
          order: 'asc',
        },
      });

      const response = await logsGET(request);

      expect(response.status).toBe(200);
      expect(LogService.getLogs).toHaveBeenCalledWith(
        expect.objectContaining({
          sortBy: 'created_at',
          order: 'asc',
        })
      );
    });

    it('페이지네이션 제한 처리 (최대 200)', async () => {
      vi.mocked(isAdmin).mockResolvedValue(true);
      vi.mocked(LogService.getLogs).mockResolvedValue({
        logs: [],
        total: 0,
      });

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/logs',
        searchParams: {
          limit: '500', // 200을 초과하는 값
        },
      });

      const response = await logsGET(request);

      expect(response.status).toBe(200);
      expect(LogService.getLogs).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 200, // 최대값으로 제한됨
        })
      );
    });

    it('복합 필터 조합', async () => {
      vi.mocked(isAdmin).mockResolvedValue(true);
      vi.mocked(LogService.getLogs).mockResolvedValue({
        logs: [],
        total: 0,
      });

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/logs',
        searchParams: {
          page: '2',
          limit: '100',
          'filter[event_category]': 'order',
          'filter[severity]': 'info',
          'filter[date_from]': '2024-01-01',
          sortBy: 'created_at',
          order: 'desc',
        },
      });

      const response = await logsGET(request);

      expect(response.status).toBe(200);
      expect(LogService.getLogs).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 2,
          limit: 100,
          eventCategory: 'order',
          severity: 'info',
          dateFrom: '2024-01-01',
          sortBy: 'created_at',
          order: 'desc',
        })
      );
    });
  });
});
