/**
 * Auth API Tests
 *
 * 인증 API 엔드포인트 테스트
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST as signupPOST } from '@/app/api/auth/signup/route';
import { POST as loginPOST } from '@/app/api/auth/login/route';
import { POST as logoutPOST } from '@/app/api/auth/logout/route';
import { POST as sendVerificationPOST } from '@/app/api/auth/send-verification/route';
import { POST as resetPasswordPOST } from '@/app/api/auth/reset-password/route';
import { AuthService } from '@/lib/server/services/auth.service';
import { createMockRequest, parseResponse } from '../utils';
import { mockUser, mockSession } from '../utils/fixtures';

// Mock AuthService
vi.mock('@/lib/server/services/auth.service', () => ({
  AuthService: {
    signUp: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    sendVerificationEmail: vi.fn(),
    verifyEmail: vi.fn(),
    resetPassword: vi.fn(),
    updatePassword: vi.fn(),
    getCurrentSession: vi.fn(),
  },
}));

describe('Auth API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/auth/signup', () => {
    it('회원가입 성공', async () => {
      // Mock AuthService.signUp
      vi.mocked(AuthService.signUp).mockResolvedValue({
        user: mockUser,
        session: mockSession,
      });

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/auth/signup',
        body: {
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User',
        },
      });

      const response = await signupPOST(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(201);
      expect(data.status).toBe('success');
      expect(data.data.user).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        name: undefined,
      });
      expect(data.data.session).toHaveProperty('accessToken');
    });

    it('이메일 누락 시 400 에러', async () => {
      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/auth/signup',
        body: {
          password: 'password123',
        },
      });

      const response = await signupPOST(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(400);
      expect(data.status).toBe('error');
      expect(data.message).toContain('이메일');
    });

    it('비밀번호 누락 시 400 에러', async () => {
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
      expect(data.message).toContain('비밀번호');
    });

    it('이미 존재하는 이메일로 가입 시 에러', async () => {
      vi.mocked(AuthService.signUp).mockRejectedValue(
        new Error('이미 사용 중인 이메일입니다')
      );

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/auth/signup',
        body: {
          email: 'existing@example.com',
          password: 'password123',
        },
      });

      const response = await signupPOST(request);
      const data = await parseResponse(response);

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(data.status).toBe('error');
    });
  });

  describe('POST /api/auth/login', () => {
    it('로그인 성공', async () => {
      vi.mocked(AuthService.login).mockResolvedValue({
        user: mockUser,
        session: mockSession,
      });

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
    });

    it('이메일 누락 시 400 에러', async () => {
      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/auth/login',
        body: {
          password: 'password123',
        },
      });

      const response = await loginPOST(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(400);
      expect(data.status).toBe('error');
    });

    it('잘못된 비밀번호로 로그인 시 에러', async () => {
      vi.mocked(AuthService.login).mockRejectedValue(
        new Error('이메일 또는 비밀번호가 일치하지 않습니다')
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
      vi.mocked(AuthService.logout).mockResolvedValue(undefined);

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/auth/logout',
      });

      const response = await logoutPOST(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.status).toBe('success');
    });
  });

  describe('POST /api/auth/send-verification', () => {
    it('인증 이메일 발송 성공', async () => {
      vi.mocked(AuthService.sendVerificationEmail).mockResolvedValue({
        success: true,
        message: '인증 이메일이 발송되었습니다',
      });

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/auth/send-verification',
        body: {
          email: 'test@example.com',
        },
      });

      const response = await sendVerificationPOST(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.status).toBe('success');
    });

    it('이메일 누락 시 400 에러', async () => {
      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/auth/send-verification',
        body: {},
      });

      const response = await sendVerificationPOST(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(400);
      expect(data.status).toBe('error');
    });
  });

  describe('POST /api/auth/reset-password', () => {
    it('비밀번호 재설정 이메일 발송 성공', async () => {
      vi.mocked(AuthService.resetPassword).mockResolvedValue({
        success: true,
        message: '비밀번호 재설정 이메일이 발송되었습니다',
      });

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
    });

    it('이메일 누락 시 400 에러', async () => {
      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/auth/reset-password',
        body: {},
      });

      const response = await resetPasswordPOST(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(400);
      expect(data.status).toBe('error');
    });
  });
});
