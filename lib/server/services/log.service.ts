/**
 * Log Service
 *
 * 시스템 이벤트 로깅 서비스
 * - 인증 및 보안 이벤트
 * - 주문 및 결제 이벤트
 * - 디지털 상품 다운로드 이벤트
 * - 보안 위협 감지
 *
 * 중요: 로그 기록 실패로 인해 서비스가 중단되면 안 됨
 */

import { createServerClient } from '@/lib/server/utils/supabase';
import { ApiError } from '@/lib/server/utils/errors';
import type { Json } from '@/types/database';

// ===== Types =====

type Severity = 'info' | 'warning' | 'error' | 'critical';

interface LogEventInput {
  eventType: string;
  eventCategory?: string;
  severity?: Severity;
  userId?: string | null;
  adminId?: string | null;
  resourceType?: string | null;
  resourceId?: string | null;
  message: string;
  metadata?: Record<string, Json> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  requestPath?: string | null;
  changes?: Record<string, Json> | null;
}

interface GetLogsOptions {
  page?: number;
  limit?: number;
  sortBy?: 'created_at';
  order?: 'asc' | 'desc';
  eventCategory?: string;
  eventType?: string;
  severity?: Severity;
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

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
  created_at: string;
  user?: {
    email: string;
    name: string | null;
  } | null;
  admin?: {
    email: string;
    name: string | null;
  } | null;
}

// ===== LogService Class =====

export class LogService {
  /**
   * 로그 기록 (핵심 메서드)
   *
   * 이 메서드는 절대 에러를 던지지 않음 (서비스 중단 방지)
   */
  static async log(input: LogEventInput): Promise<void> {
    try {
      const supabase = await createServerClient();

      // 이벤트 카테고리 자동 추출
      const eventCategory = input.eventCategory || input.eventType.split('.')[0];

      const logData = {
        event_type: input.eventType,
        event_category: eventCategory,
        severity: input.severity || 'info',
        user_id: input.userId || null,
        admin_id: input.adminId || null,
        resource_type: input.resourceType || null,
        resource_id: input.resourceId || null,
        message: input.message,
        metadata: input.metadata || null,
        ip_address: input.ipAddress || null,
        user_agent: input.userAgent || null,
        request_path: input.requestPath || null,
        changes: input.changes || null,
      };

      await supabase.from('logs').insert(logData);
    } catch (error) {
      // 로그 기록 실패 시 콘솔 출력만 하고 에러를 던지지 않음
      console.error('[LogService] 로그 기록 실패:', error);
    }
  }

  /**
   * 로그 목록 조회 (관리자)
   */
  static async getLogs(
    options: GetLogsOptions = {}
  ): Promise<{ logs: LogWithRelations[]; total: number }> {
    const supabase = await createServerClient();
    const {
      page = 1,
      limit = 50,
      sortBy = 'created_at',
      order = 'desc',
      eventCategory,
      eventType,
      severity,
      userId,
      dateFrom,
      dateTo,
      search,
    } = options;

    let query = supabase
      .from('logs')
      .select(
        `
        *,
        user:profiles!logs_user_id_fkey (
          email,
          name
        ),
        admin:profiles!logs_admin_id_fkey (
          email,
          name
        )
      `,
        { count: 'exact' }
      );

    // 필터링
    if (eventCategory) {
      query = query.eq('event_category', eventCategory);
    }

    if (eventType) {
      query = query.eq('event_type', eventType);
    }

    if (severity) {
      query = query.eq('severity', severity);
    }

    if (userId) {
      query = query.eq('user_id', userId);
    }

    if (dateFrom) {
      query = query.gte('created_at', dateFrom);
    }

    if (dateTo) {
      query = query.lte('created_at', dateTo);
    }

    if (search) {
      query = query.ilike('message', `%${search}%`);
    }

    // 정렬
    query = query.order(sortBy, { ascending: order === 'asc' });

    // 페이지네이션
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      throw new ApiError('로그 목록 조회 실패', 500, 'LOG_FETCH_FAILED');
    }

    return {
      logs: data as LogWithRelations[],
      total: count || 0,
    };
  }

  /**
   * 로그 단일 조회
   */
  static async getLogById(id: string): Promise<LogWithRelations | null> {
    const supabase = await createServerClient();

    const { data, error } = await supabase
      .from('logs')
      .select(
        `
        *,
        user:profiles!logs_user_id_fkey (
          email,
          name
        ),
        admin:profiles!logs_admin_id_fkey (
          email,
          name
        )
      `
      )
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new ApiError('로그 조회 실패', 500, 'LOG_FETCH_FAILED');
    }

    return data as LogWithRelations | null;
  }

  /**
   * 로그 통계 조회
   */
  static async getStats(options: {
    dateFrom?: string;
    dateTo?: string;
  }): Promise<{
    total: number;
    byCategory: Record<string, number>;
    bySeverity: Record<string, number>;
  }> {
    const supabase = await createServerClient();
    const { dateFrom, dateTo } = options;

    // 전체 카운트
    let totalQuery = supabase
      .from('logs')
      .select('*', { count: 'exact', head: true });

    if (dateFrom) totalQuery = totalQuery.gte('created_at', dateFrom);
    if (dateTo) totalQuery = totalQuery.lte('created_at', dateTo);

    const { count: total } = await totalQuery;

    // 카테고리별 통계
    let categoryQuery = supabase.from('logs').select('event_category');
    if (dateFrom) categoryQuery = categoryQuery.gte('created_at', dateFrom);
    if (dateTo) categoryQuery = categoryQuery.lte('created_at', dateTo);

    const { data: categoryData } = await categoryQuery;

    const byCategory: Record<string, number> = {};
    categoryData?.forEach((log: { event_category: string }) => {
      byCategory[log.event_category] = (byCategory[log.event_category] || 0) + 1;
    });

    // 심각도별 통계
    let severityQuery = supabase.from('logs').select('severity');
    if (dateFrom) severityQuery = severityQuery.gte('created_at', dateFrom);
    if (dateTo) severityQuery = severityQuery.lte('created_at', dateTo);

    const { data: severityData } = await severityQuery;

    const bySeverity: Record<string, number> = {};
    severityData?.forEach((log: { severity: string }) => {
      bySeverity[log.severity] = (bySeverity[log.severity] || 0) + 1;
    });

    return {
      total: total || 0,
      byCategory,
      bySeverity,
    };
  }

  // ===== 편의 메서드 =====

  // ----- 인증 로그 -----

  /**
   * 회원가입 성공 로그
   */
  static async logSignupSuccess(
    userId: string,
    email: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.log({
      eventType: 'user.signup.success',
      severity: 'info',
      userId,
      message: '신규 회원 가입',
      metadata: { email: email as Json },
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
    });
  }

  /**
   * 회원가입 실패 로그
   */
  static async logSignupFailed(
    email: string,
    reason: string,
    ipAddress?: string
  ): Promise<void> {
    await this.log({
      eventType: 'user.signup.failed',
      severity: 'warning',
      message: `회원가입 실패: ${reason}`,
      metadata: { email: email as Json, reason: reason as Json },
      ipAddress: ipAddress || null,
    });
  }

  /**
   * 이메일 인증 발송 로그
   */
  static async logEmailVerificationSent(
    email: string,
    userId?: string
  ): Promise<void> {
    await this.log({
      eventType: 'user.email_verification.sent',
      severity: 'info',
      userId: userId || null,
      message: '이메일 인증 발송',
      metadata: { email: email as Json },
    });
  }

  /**
   * 이메일 인증 성공 로그
   */
  static async logEmailVerificationSuccess(
    userId: string,
    email: string
  ): Promise<void> {
    await this.log({
      eventType: 'user.email_verification.success',
      severity: 'info',
      userId,
      message: '이메일 인증 완료',
      metadata: { email: email as Json },
    });
  }

  /**
   * 이메일 인증 실패 로그
   */
  static async logEmailVerificationFailed(
    email: string,
    reason: string
  ): Promise<void> {
    await this.log({
      eventType: 'user.email_verification.failed',
      severity: 'warning',
      message: `이메일 인증 실패: ${reason}`,
      metadata: { email: email as Json, reason: reason as Json },
    });
  }

  /**
   * 로그인 성공 로그
   */
  static async logLoginSuccess(
    userId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.log({
      eventType: 'user.login.success',
      severity: 'info',
      userId,
      message: '사용자 로그인 성공',
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
    });
  }

  /**
   * 로그인 실패 로그
   */
  static async logLoginFailed(
    email: string,
    reason: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.log({
      eventType: 'user.login.failed',
      severity: 'warning',
      message: `로그인 실패: ${reason}`,
      metadata: { email: email as Json, reason: reason as Json },
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
    });
  }

  /**
   * 로그아웃 로그
   */
  static async logLogout(userId: string): Promise<void> {
    await this.log({
      eventType: 'user.logout',
      severity: 'info',
      userId,
      message: '사용자 로그아웃',
    });
  }

  /**
   * 비밀번호 재설정 요청 로그
   */
  static async logPasswordResetRequested(email: string): Promise<void> {
    await this.log({
      eventType: 'user.password_reset.requested',
      severity: 'info',
      message: '비밀번호 재설정 요청',
      metadata: { email: email as Json },
    });
  }

  /**
   * 비밀번호 재설정 성공 로그
   */
  static async logPasswordResetSuccess(
    userId: string,
    email: string
  ): Promise<void> {
    await this.log({
      eventType: 'user.password_reset.success',
      severity: 'info',
      userId,
      message: '비밀번호 재설정 완료',
      metadata: { email: email as Json },
    });
  }

  /**
   * 비밀번호 재설정 실패 로그
   */
  static async logPasswordResetFailed(email: string, reason: string): Promise<void> {
    await this.log({
      eventType: 'user.password_reset.failed',
      severity: 'warning',
      message: `비밀번호 재설정 실패: ${reason}`,
      metadata: { email: email as Json, reason: reason as Json },
    });
  }

  // ----- 주문 로그 -----

  /**
   * 주문 생성 로그
   */
  static async logOrderCreated(
    orderId: string,
    userId: string,
    totalAmount: number,
    metadata?: Record<string, Json>
  ): Promise<void> {
    await this.log({
      eventType: 'order.created',
      severity: 'info',
      userId,
      resourceType: 'order',
      resourceId: orderId,
      message: '새로운 주문이 생성되었습니다',
      metadata: { totalAmount: totalAmount as Json, ...metadata },
    });
  }

  /**
   * 주문 상태 변경 로그
   */
  static async logOrderStatusChanged(
    orderId: string,
    userId: string,
    adminId: string | null,
    statusBefore: string,
    statusAfter: string
  ): Promise<void> {
    await this.log({
      eventType: `order.status.${statusAfter.toLowerCase()}`,
      severity: 'info',
      userId,
      adminId,
      resourceType: 'order',
      resourceId: orderId,
      message: `주문 상태가 '${statusBefore}'에서 '${statusAfter}'로 변경되었습니다`,
      changes: {
        statusBefore: statusBefore as Json,
        statusAfter: statusAfter as Json
      },
    });
  }

  /**
   * 주문 취소 로그
   */
  static async logOrderCancelled(
    orderId: string,
    userId: string,
    reason?: string
  ): Promise<void> {
    await this.log({
      eventType: 'order.cancelled',
      severity: 'warning',
      userId,
      resourceType: 'order',
      resourceId: orderId,
      message: '주문이 취소되었습니다',
      metadata: reason ? { reason } : null,
    });
  }

  /**
   * 환불 요청 로그
   */
  static async logRefundRequested(
    orderId: string,
    userId: string,
    reason: string
  ): Promise<void> {
    await this.log({
      eventType: 'order.refund.requested',
      severity: 'warning',
      userId,
      resourceType: 'order',
      resourceId: orderId,
      message: '환불이 요청되었습니다',
      metadata: { reason: reason as Json },
    });
  }

  /**
   * 환불 승인 로그
   */
  static async logRefundApproved(
    orderId: string,
    userId: string,
    adminId: string
  ): Promise<void> {
    await this.log({
      eventType: 'order.refund.approved',
      severity: 'info',
      userId,
      adminId,
      resourceType: 'order',
      resourceId: orderId,
      message: '환불이 승인되었습니다',
    });
  }

  /**
   * 환불 완료 로그
   */
  static async logRefundCompleted(
    orderId: string,
    userId: string,
    adminId: string,
    amount: number
  ): Promise<void> {
    await this.log({
      eventType: 'order.refund.completed',
      severity: 'info',
      userId,
      adminId,
      resourceType: 'order',
      resourceId: orderId,
      message: '환불이 완료되었습니다',
      metadata: { amount: amount as Json },
    });
  }

  // ----- 디지털 상품 다운로드 로그 -----

  /**
   * 디지털 상품 다운로드 로그
   */
  static async logDigitalProductDownload(
    productId: string,
    orderId: string,
    userId: string,
    ipAddress?: string,
    metadata?: Record<string, Json>
  ): Promise<void> {
    await this.log({
      eventType: 'digital_product.download',
      severity: 'info',
      userId,
      resourceType: 'product',
      resourceId: productId,
      message: '디지털 상품 다운로드',
      metadata: { orderId: orderId as Json, ...metadata },
      ipAddress: ipAddress || null,
    });
  }

  /**
   * 다운로드 링크 생성 로그
   */
  static async logDownloadLinkGenerated(
    productId: string,
    orderId: string,
    userId: string
  ): Promise<void> {
    await this.log({
      eventType: 'digital_product.download_link_generated',
      severity: 'info',
      userId,
      resourceType: 'product',
      resourceId: productId,
      message: '다운로드 링크가 생성되었습니다',
      metadata: { orderId: orderId as Json },
    });
  }

  /**
   * 권한 없는 다운로드 시도 로그
   */
  static async logUnauthorizedDownload(
    productId: string,
    userId: string | null,
    ipAddress?: string
  ): Promise<void> {
    await this.log({
      eventType: 'digital_product.download.unauthorized',
      severity: 'warning',
      userId,
      resourceType: 'product',
      resourceId: productId,
      message: '권한 없는 디지털 상품 다운로드 시도',
      ipAddress: ipAddress || null,
    });
  }

  /**
   * 만료된 링크 접근 로그
   */
  static async logExpiredLinkAccess(
    productId: string,
    userId: string | null,
    ipAddress?: string
  ): Promise<void> {
    await this.log({
      eventType: 'digital_product.download.expired',
      severity: 'warning',
      userId,
      resourceType: 'product',
      resourceId: productId,
      message: '만료된 다운로드 링크 접근 시도',
      ipAddress: ipAddress || null,
    });
  }

  // ----- 보안 로그 -----

  /**
   * 권한 없는 접근 로그
   */
  static async logUnauthorizedAccess(
    userId: string | null,
    path: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.log({
      eventType: 'security.unauthorized.access',
      severity: 'warning',
      userId,
      message: `권한 없는 접근 시도: ${path}`,
      requestPath: path,
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
    });
  }

  /**
   * API 호출 제한 초과 로그
   */
  static async logRateLimitExceeded(
    userId: string | null,
    path: string,
    ipAddress?: string
  ): Promise<void> {
    await this.log({
      eventType: 'security.rate_limit.exceeded',
      severity: 'warning',
      userId,
      message: `API 호출 제한 초과: ${path}`,
      requestPath: path,
      ipAddress: ipAddress || null,
    });
  }

  /**
   * 의심스러운 활동 로그
   */
  static async logSuspiciousActivity(
    userId: string | null,
    description: string,
    ipAddress?: string,
    metadata?: Record<string, Json>
  ): Promise<void> {
    await this.log({
      eventType: 'security.suspicious.activity',
      severity: 'critical',
      userId,
      message: `의심스러운 활동 감지: ${description}`,
      ipAddress: ipAddress || null,
      metadata: metadata || null,
    });
  }
}
