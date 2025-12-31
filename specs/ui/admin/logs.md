# Admin Logs UI 스펙

이 문서는 **로그 조회** UI 스펙을 정의한다.

> **경로**: `/admin/logs`
> **권한**: 관리자 전용
> **관련 API**: `/api/logs` (이미 구현됨 ✅)

---

## 1. 페이지 개요

시스템 이벤트 로그를 조회하고 분석하는 페이지.

### 1.1 주요 기능
- 로그 목록 조회 (이벤트 타입별, 기간별)
- 로그 상세 조회
- 보안 로그 필터링
- 로그 통계 대시보드

---

## 2. 레이아웃 구조

```tsx
<AdminLogsPage>
  <PageHeader title="로그 조회" />

  {/* 통계 요약 */}
  <LogsStats />

  {/* 필터 */}
  <FilterBar>
    <Select label="카테고리" options={['전체', '인증', '주문', '다운로드', '보안']} />
    <Select label="레벨" options={['전체', 'INFO', 'WARNING', 'ERROR']} />
    <DateRangePicker label="기간" />
    <SearchInput placeholder="사용자 이메일, IP 검색" />
  </FilterBar>

  {/* 로그 목록 */}
  <LogsTable />
</AdminLogsPage>
```

---

## 3. 컴포넌트 상세

### 3.1 로그 통계 (LogsStats)

**UI:**
```
┌─────────────────────────────────────────────────────┐
│ 📊 로그 통계 (최근 24시간)                           │
├─────────────────────────────────────────────────────┤
│ 총 이벤트: 1,234건                                   │
│ 인증: 450건 | 주문: 89건 | 다운로드: 230건 | 보안: 2건 │
├─────────────────────────────────────────────────────┤
│ ⚠️ 보안 경고: 2건                                    │
│ - 로그인 실패 5회 이상: 1건                          │
│ - 권한 없는 접근 시도: 1건                           │
└─────────────────────────────────────────────────────┘
```

**데이터 소스:**
- `GET /api/logs/stats`

### 3.2 로그 테이블 (LogsTable)

**컬럼:**
```
┌─────────────────────────────────────────────────────────────────────────┐
│ 시간              │ 카테고리 │ 이벤트           │ 사용자       │ IP      │ 레벨 │
├─────────────────────────────────────────────────────────────────────────┤
│ 2025-01-15 10:00 │ 인증     │ 로그인 성공      │ user@...     │ 1.2.3.4 │ INFO │
│ 2025-01-15 10:05 │ 주문     │ 주문 생성        │ user@...     │ 1.2.3.4 │ INFO │
│ 2025-01-15 10:10 │ 보안     │ 로그인 실패 5회  │ hacker@...   │ 5.6.7.8 │ WARN │
│ 2025-01-15 10:15 │ 다운로드 │ 다운로드 성공    │ user@...     │ 1.2.3.4 │ INFO │
└─────────────────────────────────────────────────────────────────────────┘
```

**기능:**
- **정렬**: 시간 (최신순)
- **필터**: 카테고리, 레벨, 기간
- **검색**: 사용자 이메일, IP 주소
- **페이지네이션**: 50개씩

**레벨별 색상:**
- `INFO`: `blue`
- `WARNING`: `yellow`
- `ERROR`: `red`

**클릭 액션:**
- 로그 상세 모달 열기

### 3.3 로그 상세 모달 (LogDetailModal)

**UI:**
```
┌─────────────────────────────────────────────────────┐
│ 로그 상세                                      [×]  │
├─────────────────────────────────────────────────────┤
│                                                      │
│ 이벤트 타입: login_success                          │
│ 카테고리: 인증                                      │
│ 레벨: INFO                                          │
│ 시간: 2025-01-15 10:00:00                           │
│                                                      │
│ --- 사용자 정보 ---                                 │
│ ID: uuid-1234                                       │
│ 이메일: user@example.com                            │
│                                                      │
│ --- 메타데이터 ---                                  │
│ IP 주소: 1.2.3.4                                    │
│ User Agent: Mozilla/5.0...                          │
│                                                      │
│ --- 상세 정보 ---                                   │
│ {                                                    │
│   "login_method": "email",                          │
│   "session_id": "sess_abc123"                       │
│ }                                                    │
│                                                      │
│ [닫기]                                               │
└─────────────────────────────────────────────────────┘
```

---

## 4. 로그 카테고리 및 이벤트 타입

### 4.1 인증 (Auth)
- `signup_success`: 회원가입 성공
- `signup_failed`: 회원가입 실패
- `login_success`: 로그인 성공
- `login_failed`: 로그인 실패
- `logout`: 로그아웃
- `email_verification_sent`: 이메일 인증 발송
- `email_verified`: 이메일 인증 완료
- `password_reset_requested`: 비밀번호 재설정 요청
- `password_reset_completed`: 비밀번호 재설정 완료

### 4.2 주문 (Order)
- `order_created`: 주문 생성
- `order_status_changed`: 주문 상태 변경
- `order_failed`: 주문 생성 실패

### 4.3 다운로드 (Download)
- `download_success`: 다운로드 성공
- `download_failed`: 다운로드 실패
- `download_unauthorized`: 권한 없는 다운로드 시도

### 4.4 보안 (Security)
- `unauthorized_access`: 권한 없는 접근
- `suspicious_activity`: 의심스러운 활동
- `rate_limit_exceeded`: API Rate Limit 초과
- `login_failed_multiple`: 로그인 5회 이상 실패

---

## 5. 상태 관리

### 5.1 React Query Hooks

```ts
// 로그 통계
const { data: stats } = useQuery({
  queryKey: ['admin', 'logs', 'stats', dateRange],
  queryFn: () => fetchLogStats(dateRange),
  refetchInterval: 60000, // 1분마다 자동 새로고침
});

// 로그 목록
const { data: logs } = useQuery({
  queryKey: ['admin', 'logs', filters],
  queryFn: () => fetchLogs(filters),
});

// 로그 상세
const { data: logDetail } = useQuery({
  queryKey: ['admin', 'logs', logId],
  queryFn: () => fetchLogDetail(logId),
  enabled: !!logId,
});
```

---

## 6. 필터 및 검색

### 6.1 FilterBar

**필터 옵션:**
- **카테고리**: 전체, 인증, 주문, 다운로드, 보안
- **레벨**: 전체, INFO, WARNING, ERROR
- **기간**: 최근 1시간, 최근 24시간, 최근 7일, 직접 선택
- **검색**: 사용자 이메일, IP 주소

**URL 쿼리 파라미터:**
```
/admin/logs?category=auth&level=ERROR&dateFrom=2025-01-01&search=1.2.3.4
```

---

## 7. 보안 경고 알림

### 7.1 SecurityAlerts

**UI:**
```
┌─────────────────────────────────────────────────────┐
│ ⚠️ 보안 경고                                        │
├─────────────────────────────────────────────────────┤
│ 1. IP 5.6.7.8 - 로그인 실패 5회 이상 (10:10)        │
│    사용자: hacker@example.com                        │
│    [상세 보기]                                       │
│                                                      │
│ 2. IP 9.10.11.12 - 권한 없는 접근 시도 (09:45)      │
│    경로: /admin/orders                               │
│    [상세 보기]                                       │
└─────────────────────────────────────────────────────┘
```

**조건:**
- 로그인 실패 5회 이상 (1시간 이내)
- 권한 없는 접근 시도
- Rate Limit 초과
- 의심스러운 활동

---

## 8. 1차 MVP 범위

### 포함 ✅
- ✅ 로그 목록 조회 (테이블)
- ✅ 로그 상세 조회 (모달)
- ✅ 로그 통계 요약
- ✅ 필터 및 검색
- ✅ 보안 경고 알림
- ✅ 실시간 업데이트 (1분마다)

### 제외 ⏸️
- ⏸️ 로그 엑셀 다운로드
- ⏸️ 로그 분석 차트
- ⏸️ 이메일 알림 설정
- ⏸️ IP 차단 기능
- ⏸️ 로그 보관 정책 설정

---

## 9. 예시 코드

```tsx
// app/admin/logs/page.tsx
import { LogsStats } from '@/components/admin/LogsStats';
import { LogsTable } from '@/components/admin/LogsTable';
import { SecurityAlerts } from '@/components/admin/SecurityAlerts';

export default async function AdminLogsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">로그 조회</h1>

      <SecurityAlerts />
      <LogsStats />
      <LogsTable />
    </div>
  );
}
```

---

## 10. 참고 문서

- Admin 메인: `/specs/ui/admin/index.md`
- Logs API: `/specs/api/server/routes/logs/index.md` ✅
- Log Service: `/lib/server/services/log.service.ts` ✅
- 로깅 시스템 가이드: `/examples/logging/README.md`
