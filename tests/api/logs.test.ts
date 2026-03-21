/**
 * Logs API Tests
 *
 * logs 라우트는 backend 프록시 동작을 검증한다.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GET as logsGET } from '@/app/api/logs/route';
import { GET as logStatsGET } from '@/app/api/logs/stats/route';
import { GET as logDetailGET } from '@/app/api/logs/[id]/route';
import { createMockRequest, parseResponse } from '../utils';

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('Logs API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.BACKEND_API_URL = 'http://backend.test';
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('GET /api/logs 요청을 검색 파라미터와 함께 backend로 프록시한다', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({
        status: 'success',
        data: [{ id: 'log-1' }],
        pagination: { total: 1, page: 1, limit: 50, totalPages: 1 },
      }),
    );

    const request = createMockRequest({
      method: 'GET',
      url: 'http://localhost:3000/api/logs',
      searchParams: {
        page: '1',
        limit: '50',
        'filter[event_category]': 'auth',
        order: 'asc',
      },
    });

    const response = await logsGET(request);
    const data = await parseResponse(response);

    expect(response.status).toBe(200);
    expect(data.status).toBe('success');
    expect(fetch).toHaveBeenCalledWith(
      'http://backend.test/api/logs?page=1&limit=50&filter%5Bevent_category%5D=auth&order=asc',
      expect.objectContaining({ method: 'GET', redirect: 'manual' }),
    );
  });

  it('GET /api/logs 에러 응답을 그대로 전달한다', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse(
        {
          status: 'error',
          message: '관리자 권한이 필요합니다',
          errorCode: 'UNAUTHORIZED',
        },
        403,
      ),
    );

    const request = createMockRequest({
      method: 'GET',
      url: 'http://localhost:3000/api/logs',
    });

    const response = await logsGET(request);
    const data = await parseResponse(response);

    expect(response.status).toBe(403);
    expect(data.status).toBe('error');
  });

  it('GET /api/logs/stats 요청을 backend로 프록시한다', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({
        status: 'success',
        data: {
          totalLogs: 100,
          bySeverity: { info: 80, error: 20 },
        },
      }),
    );

    const request = createMockRequest({
      method: 'GET',
      url: 'http://localhost:3000/api/logs/stats',
      searchParams: {
        date_from: '2024-01-01',
        date_to: '2024-01-31',
      },
    });

    const response = await logStatsGET(request);
    const data = await parseResponse(response);

    expect(response.status).toBe(200);
    expect(data.status).toBe('success');
    expect(fetch).toHaveBeenCalledWith(
      'http://backend.test/api/logs/stats?date_from=2024-01-01&date_to=2024-01-31',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('GET /api/logs/[id] 요청을 backend로 프록시한다', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({
        status: 'success',
        data: { id: 'log-123', message: 'sample log' },
      }),
    );

    const request = createMockRequest({
      method: 'GET',
      url: 'http://localhost:3000/api/logs/log-123',
    });

    const response = await logDetailGET(request, {
      params: Promise.resolve({ id: 'log-123' }),
    });
    const data = await parseResponse(response);

    expect(response.status).toBe(200);
    expect(data.status).toBe('success');
    expect(fetch).toHaveBeenCalledWith(
      'http://backend.test/api/logs/log-123',
      expect.objectContaining({ method: 'GET' }),
    );
  });
});
