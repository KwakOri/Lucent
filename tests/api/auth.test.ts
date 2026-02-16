/**
 * Auth API Tests
 *
 * auth 라우트는 backend 프록시 동작을 검증한다.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { POST as loginPOST } from '@/app/api/auth/login/route';
import { POST as logoutPOST } from '@/app/api/auth/logout/route';
import { GET as sessionGET } from '@/app/api/auth/session/route';
import { POST as sendVerificationPOST } from '@/app/api/auth/send-verification/route';
import { POST as verifyCodePOST } from '@/app/api/auth/verify-code/route';
import { POST as signupPOST } from '@/app/api/auth/signup/route';
import { POST as resetPasswordPOST } from '@/app/api/auth/reset-password/route';
import { POST as updatePasswordPOST } from '@/app/api/auth/update-password/route';
import { GET as verifyEmailGET } from '@/app/api/auth/verify-email/route';
import { createMockRequest, parseResponse } from '../utils';

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('Auth API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.BACKEND_API_URL = 'http://backend.test';
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('GET /api/auth/session 요청을 backend로 프록시한다', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({
        status: 'success',
        data: {
          user: { id: 'user-123', email: 'test@example.com' },
          isAdmin: false,
        },
      }),
    );

    const request = createMockRequest({
      method: 'GET',
      url: 'http://localhost:3000/api/auth/session',
    });

    const response = await sessionGET(request);
    const data = await parseResponse(response);

    expect(response.status).toBe(200);
    expect(data.status).toBe('success');
    expect(fetch).toHaveBeenCalledWith(
      'http://backend.test/api/auth/session',
      expect.objectContaining({ method: 'GET', redirect: 'manual' }),
    );
  });

  it('POST /api/auth/login 요청을 backend로 프록시한다', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({
        status: 'success',
        data: {
          user: { id: 'user-123', email: 'test@example.com' },
          session: {
            accessToken: 'access-token',
            refreshToken: 'refresh-token',
            expiresAt: 1234567890,
          },
        },
      }),
    );

    const request = createMockRequest({
      method: 'POST',
      url: 'http://localhost:3000/api/auth/login',
      body: {
        email: 'test@example.com',
        password: 'password123',
      },
    });

    const response = await loginPOST(request);
    const data = await parseResponse(response);

    expect(response.status).toBe(200);
    expect(data.status).toBe('success');
    expect(fetch).toHaveBeenCalledWith(
      'http://backend.test/api/auth/login',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
        }),
      }),
    );
  });

  it('POST /api/auth/logout 요청의 에러 상태를 그대로 전달한다', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse(
        {
          status: 'error',
          message: '로그인이 필요합니다',
          errorCode: 'UNAUTHORIZED',
        },
        401,
      ),
    );

    const request = createMockRequest({
      method: 'POST',
      url: 'http://localhost:3000/api/auth/logout',
    });

    const response = await logoutPOST(request);
    const data = await parseResponse(response);

    expect(response.status).toBe(401);
    expect(data.status).toBe('error');
    expect(fetch).toHaveBeenCalledWith(
      'http://backend.test/api/auth/logout',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('POST /api/auth/send-verification 요청을 backend로 프록시한다', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({
        status: 'success',
        data: {
          email: 'test@example.com',
          expiresIn: 600,
        },
      }),
    );

    const request = createMockRequest({
      method: 'POST',
      url: 'http://localhost:3000/api/auth/send-verification',
      body: {
        email: 'test@example.com',
        password: 'password123',
      },
    });

    const response = await sendVerificationPOST(request);
    const data = await parseResponse(response);

    expect(response.status).toBe(200);
    expect(data.status).toBe('success');
    expect(fetch).toHaveBeenCalledWith(
      'http://backend.test/api/auth/send-verification',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('POST /api/auth/verify-code 요청을 backend로 프록시한다', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({
        status: 'success',
        data: { token: 'verified-token-123' },
      }),
    );

    const request = createMockRequest({
      method: 'POST',
      url: 'http://localhost:3000/api/auth/verify-code',
      body: {
        email: 'test@example.com',
        code: '123456',
      },
    });

    const response = await verifyCodePOST(request);
    const data = await parseResponse(response);

    expect(response.status).toBe(200);
    expect(data.status).toBe('success');
    expect(fetch).toHaveBeenCalledWith(
      'http://backend.test/api/auth/verify-code',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('POST /api/auth/signup 요청 시 backend 201을 그대로 전달한다', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse(
        {
          status: 'success',
          data: {
            user: { id: 'user-123', email: 'test@example.com' },
            session: {
              access_token: 'access-token',
              refresh_token: 'refresh-token',
            },
          },
        },
        201,
      ),
    );

    const request = createMockRequest({
      method: 'POST',
      url: 'http://localhost:3000/api/auth/signup',
      body: {
        email: 'test@example.com',
        verificationToken: 'verified-token-123',
      },
    });

    const response = await signupPOST(request);
    const data = await parseResponse(response);

    expect(response.status).toBe(201);
    expect(data.status).toBe('success');
    expect(fetch).toHaveBeenCalledWith(
      'http://backend.test/api/auth/signup',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('POST /api/auth/reset-password 요청을 backend로 프록시한다', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({
        status: 'success',
        data: {
          message: '비밀번호 재설정 이메일이 발송되었습니다.',
        },
      }),
    );

    const request = createMockRequest({
      method: 'POST',
      url: 'http://localhost:3000/api/auth/reset-password',
      body: {
        email: 'test@example.com',
      },
    });

    const response = await resetPasswordPOST(request);
    const data = await parseResponse(response);

    expect(response.status).toBe(200);
    expect(data.status).toBe('success');
    expect(fetch).toHaveBeenCalledWith(
      'http://backend.test/api/auth/reset-password',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('POST /api/auth/update-password 요청을 backend로 프록시한다', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({
        status: 'success',
        data: {
          email: 'test@example.com',
          message: '비밀번호가 성공적으로 변경되었습니다.',
        },
      }),
    );

    const request = createMockRequest({
      method: 'POST',
      url: 'http://localhost:3000/api/auth/update-password',
      body: {
        token: 'reset-token',
        newPassword: 'newpassword123',
      },
    });

    const response = await updatePasswordPOST(request);
    const data = await parseResponse(response);

    expect(response.status).toBe(200);
    expect(data.status).toBe('success');
    expect(fetch).toHaveBeenCalledWith(
      'http://backend.test/api/auth/update-password',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('GET /api/auth/verify-email 요청에서 redirect 응답을 유지한다', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(null, {
        status: 302,
        headers: {
          location:
            'http://localhost:3000/signup/complete?verified=true&token=verified-token-123',
        },
      }),
    );

    const request = createMockRequest({
      method: 'GET',
      url: 'http://localhost:3000/api/auth/verify-email?token=verified-token-123',
    });

    const response = await verifyEmailGET(request);

    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe(
      'http://localhost:3000/signup/complete?verified=true&token=verified-token-123',
    );
    expect(fetch).toHaveBeenCalledWith(
      'http://backend.test/api/auth/verify-email?token=verified-token-123',
      expect.objectContaining({ method: 'GET', redirect: 'manual' }),
    );
  });
});
