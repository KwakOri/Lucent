/**
 * Auth API Tests
 *
 * 인증 API 엔드포인트 테스트
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST as signupPOST } from '@/app/api/auth/signup/route';
import { POST as loginPOST } from '@/app/api/auth/login/route';
import { POST as logoutPOST } from '@/app/api/auth/logout/route';
import { POST as sendVerificationPOST } from '@/app/api/auth/send-verification/route';
import { POST as resetPasswordPOST } from '@/app/api/auth/reset-password/route';
import { AuthService } from '@/lib/server/services/auth.service';
import { EmailVerificationService } from '@/lib/server/services/email-verification.service';
import { LogService } from '@/lib/server/services/log.service';
import {
  createAdminClient,
  createServerClient,
  getCurrentUser,
} from '@/lib/server/utils/supabase';
import { createMockRequest, parseResponse } from '../utils';
import { mockSession, mockUser } from '../utils/fixtures';

vi.mock('@/lib/server/services/auth.service', () => ({
  AuthService: {
    login: vi.fn(),
    logout: vi.fn(),
    requestPasswordReset: vi.fn(),
  },
}));

vi.mock('@/lib/server/services/email-verification.service', () => ({
  EmailVerificationService: {
    getVerifiedRecord: vi.fn(),
    deleteVerification: vi.fn(),
    checkResendCooldown: vi.fn(),
    createVerification: vi.fn(),
  },
}));

vi.mock('@/lib/server/services/log.service', () => ({
  LogService: {
    log: vi.fn(),
  },
}));

vi.mock('@/lib/server/utils/supabase', () => ({
  createAdminClient: vi.fn(),
  createServerClient: vi.fn(),
  getCurrentUser: vi.fn(),
}));

describe('Auth API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(LogService.log).mockResolvedValue(undefined as never);
  });

  describe('POST /api/auth/signup', () => {
    it('회원가입 성공', async () => {
      vi.mocked(EmailVerificationService.getVerifiedRecord).mockResolvedValue({
        email: mockUser.email,
        hashed_password: 'password123',
      } as never);
      vi.mocked(EmailVerificationService.deleteVerification).mockResolvedValue(undefined as never);

      const createUser = vi.fn().mockResolvedValue({
        data: {
          user: {
            id: mockUser.id,
            email: mockUser.email,
          },
        },
        error: null,
      });

      vi.mocked(createAdminClient).mockResolvedValue({
        auth: {
          admin: {
            createUser,
            deleteUser: vi.fn().mockResolvedValue({ data: null, error: null }),
          },
        },
      } as never);

      const insertProfile = vi.fn().mockResolvedValue({ error: null });
      const signInWithPassword = vi.fn().mockResolvedValue({
        data: {
          user: mockUser,
          session: mockSession,
        },
        error: null,
      });

      vi.mocked(createServerClient).mockResolvedValue({
        from: vi.fn(() => ({
          insert: insertProfile,
        })),
        auth: {
          signInWithPassword,
        },
      } as never);

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/auth/signup',
        body: {
          email: mockUser.email,
          verificationToken: 'verified-token-123',
        },
      });

      const response = await signupPOST(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(201);
      expect(data.status).toBe('success');
      expect(data.data.user.id).toBe(mockUser.id);
      expect(data.data.session).toHaveProperty('access_token');
      expect(EmailVerificationService.deleteVerification).toHaveBeenCalledWith('verified-token-123');
      expect(createUser).toHaveBeenCalled();
      expect(insertProfile).toHaveBeenCalled();
      expect(signInWithPassword).toHaveBeenCalled();
    });

    it('인증 토큰 누락 시 400 에러', async () => {
      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/auth/signup',
        body: {
          email: 'test@example.com',
        },
      });

      const response = await signupPOST(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(400);
      expect(data.status).toBe('error');
      expect(data.message).toContain('인증 토큰');
    });

    it('유효하지 않은 인증 토큰일 때 400 에러', async () => {
      vi.mocked(EmailVerificationService.getVerifiedRecord).mockResolvedValue(null);

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/auth/signup',
        body: {
          email: 'test@example.com',
          verificationToken: 'invalid-token',
        },
      });

      const response = await signupPOST(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(400);
      expect(data.status).toBe('error');
      expect(data.message).toContain('유효하지 않은 인증 토큰');
    });

    it('요청 이메일이 인증 레코드와 다르면 400 에러', async () => {
      vi.mocked(EmailVerificationService.getVerifiedRecord).mockResolvedValue({
        email: 'verified@example.com',
        hashed_password: 'password123',
      } as never);

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/auth/signup',
        body: {
          email: 'different@example.com',
          verificationToken: 'verified-token-123',
        },
      });

      const response = await signupPOST(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(400);
      expect(data.status).toBe('error');
      expect(data.message).toContain('이메일');
    });
  });

  describe('POST /api/auth/login', () => {
    it('로그인 성공', async () => {
      vi.mocked(AuthService.login).mockResolvedValue({
        user: mockUser,
        session: mockSession,
      } as never);

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
      expect(data.data.user.email).toBe('test@example.com');
      expect(AuthService.login).toHaveBeenCalledWith(
        {
          email: 'test@example.com',
          password: 'password123',
        },
        undefined,
        undefined,
      );
    });

    it('이메일 누락 시 에러', async () => {
      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/auth/login',
        body: {
          password: 'password123',
        },
      });

      const response = await loginPOST(request);
      const data = await parseResponse(response);

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(data.status).toBe('error');
      expect(data.message).toContain('이메일');
    });

    it('잘못된 비밀번호로 로그인 시 에러', async () => {
      vi.mocked(AuthService.login).mockRejectedValue(
        new Error('이메일 또는 비밀번호가 일치하지 않습니다'),
      );

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/auth/login',
        body: {
          email: 'test@example.com',
          password: 'wrongpassword',
        },
      });

      const response = await loginPOST(request);
      const data = await parseResponse(response);

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(data.status).toBe('error');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('로그아웃 성공', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue(mockUser as never);
      vi.mocked(AuthService.logout).mockResolvedValue(undefined as never);

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/auth/logout',
      });

      const response = await logoutPOST(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.status).toBe('success');
      expect(AuthService.logout).toHaveBeenCalledWith(mockUser.id);
    });

    it('로그인하지 않은 사용자 요청 시 에러', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue(null);

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/auth/logout',
      });

      const response = await logoutPOST(request);
      const data = await parseResponse(response);

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(data.status).toBe('error');
      expect(data.message).toContain('로그인');
    });
  });

  describe('POST /api/auth/send-verification', () => {
    it('인증 이메일 발송 성공', async () => {
      vi.mocked(EmailVerificationService.checkResendCooldown).mockResolvedValue(true);
      vi.mocked(EmailVerificationService.createVerification).mockResolvedValue(undefined as never);

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
      expect(EmailVerificationService.createVerification).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'test@example.com',
          password: 'password123',
          purpose: 'signup',
        }),
      );
    });

    it('비밀번호 누락 시 400 에러', async () => {
      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/auth/send-verification',
        body: {
          email: 'test@example.com',
        },
      });

      const response = await sendVerificationPOST(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(400);
      expect(data.status).toBe('error');
      expect(data.message).toContain('이메일과 비밀번호');
    });

    it('재발송 쿨타임 중이면 429 에러', async () => {
      vi.mocked(EmailVerificationService.checkResendCooldown).mockResolvedValue(false);

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

      expect(response.status).toBe(429);
      expect(data.status).toBe('error');
    });
  });

  describe('POST /api/auth/reset-password', () => {
    it('비밀번호 재설정 이메일 발송 성공', async () => {
      vi.mocked(AuthService.requestPasswordReset).mockResolvedValue(undefined as never);

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
      expect(AuthService.requestPasswordReset).toHaveBeenCalledWith('test@example.com');
    });

    it('이메일 누락 시 에러', async () => {
      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/auth/reset-password',
        body: {},
      });

      const response = await resetPasswordPOST(request);
      const data = await parseResponse(response);

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(data.status).toBe('error');
      expect(data.message).toContain('이메일');
    });
  });
});
