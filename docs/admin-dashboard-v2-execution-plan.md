# Admin Dashboard v2 실행 계획 (구현 착수 전)

- 작성일: 2026-04-04
- 범위: `/admin` 대시보드 개편 준비
- 기준 문서:
  - `docs/admin-dashboard-v2-preimplementation-plan.md`
  - `docs/admin-dashboard-v2-metrics-spec.md`

## 1) 작업 원칙

- 작은 diff 단위로 단계적 적용
- 기존 v2 API 재사용(P0) -> 집계 API 도입(P1)
- 화면은 요약/우선순위/드릴다운 허브 역할에 집중

## 2) 단계별 계획

## Phase 0. 합의 고정 (문서 단계)

### 목표
- 지표/임계치/레이아웃/드릴다운 경로를 확정

### 산출물
- 사전 기획서
- 지표 명세서
- 실행 계획서(본 문서)

### 완료 조건
- [ ] P0 지표 목록 확정
- [ ] 카드 클릭 시 이동 경로 확정
- [ ] 경고/위험 임계치 1차 합의

## Phase 1. 데이터 계약 준비 (BE/BFF)

### 목표
- 대시보드 집계에 필요한 API 호출 경로와 타입 계약 정비

### 작업 항목
- [ ] (선택) `GET /api/v2/admin/ops/dashboard/overview` 설계안 확정
- [ ] 기존 API 조합 방식의 view model 타입 정의
- [ ] 응답 메타(`generated_at`, `range`) 표준화

### 대상 파일(예정)
- `backend/src/v2-admin/v2-admin.controller.ts`
- `backend/src/v2-admin/v2-admin.service.ts`
- `frontend/lib/client/api/v2-admin-ops.api.ts`
- `frontend/lib/client/hooks/query-keys.ts`

### 완료 조건
- [ ] 타입 레벨에서 카드/차트/큐 데이터가 누락 없이 표현됨
- [ ] API 실패/빈데이터 처리 기준 문서화

## Phase 2. 프론트 데이터 계층 준비

### 목표
- `Page -> Hook -> Service -> API Route` 흐름으로 대시보드 전용 hook 구성

### 작업 항목
- [ ] `queryKeys.v2AdminOps.dashboard.*` 추가
- [ ] `useV2AdminDashboardOverview`(또는 조합 hook) 구현
- [ ] 카드별 stale/로딩/에러 상태 규약 반영

### 대상 파일(예정)
- `frontend/lib/client/hooks/query-keys.ts`
- `frontend/lib/client/hooks/useV2AdminOps.ts`
- `frontend/lib/client/api/v2-admin-ops.api.ts`

### 완료 조건
- [ ] 페이지 컴포넌트에서 직접 fetch 금지
- [ ] React Query 캐시/재조회 정책 명시

## Phase 3. 화면 구현

### 목표
- 레퍼런스 레이아웃 기반의 운영 관제형 UI 구성

### 작업 항목
- [ ] 상단 KPI 카드 8개
- [ ] 매출/정산 추세 차트
- [ ] 운영 병목 패널(주문 단계/배치 상태)
- [ ] 즉시 처리 큐 + 감사/승인 타임라인
- [ ] 카드별 드릴다운 링크 연결

### 대상 파일(예정)
- `frontend/app/admin/page.tsx`
- `frontend/src/components/admin/*` (필요 시 분리)

### 완료 조건
- [ ] 데스크톱/모바일 모두 레이아웃 정상
- [ ] 빈 상태/오류 상태/지연 상태 처리

## Phase 4. 검증/릴리즈 준비

### 목표
- 수치 정합성 및 운영 가독성 검증

### 자동 검증
- [ ] `npm run lint`
- [ ] `npm run test:run` (대상 테스트 보강 시)
- [ ] `npm run build`

### 수동 검증 시나리오
- [ ] 카드 수치와 드릴다운 화면 수치 대조
- [ ] 기간 필터 변경 시 카드/차트 동시 반영
- [ ] 승인/실패 로그 증가 시 경고 배지 노출 확인
- [ ] 모바일(좁은 뷰포트)에서 패널 순서/가독성 확인

## 3) 수치 정합성 점검 항목

- [ ] `총 주문 수` = `sales-stats.summary.orders_count`
- [ ] `순정산` = `captured - refund`
- [ ] `환불률` = `refund / captured`
- [ ] `재고 리스크` = `mismatch + low_stock`
- [ ] 주문 단계 분포 합계 = order queue total

## 4) 리스크와 완화

- 다중 API 병렬 호출 성능 저하
  - 완화: 초기 병렬 호출 + P1 aggregator API로 단일화
- 카드 간 시점 불일치
  - 완화: `generated_at` 표기, 수치 기준 시각 노출
- 운영팀이 과도한 지표로 피로감
  - 완화: P0 핵심 8개만 노출, 상세는 드릴다운

## 5) 작업 분해 (실무 착수용)

1. `Task A` 대시보드 데이터 타입/훅 추가
2. `Task B` `/admin` 레이아웃/카드/차트 UI 적용
3. `Task C` 드릴다운 링크/우선순위 큐 연결
4. `Task D` 임계치 배지/상태 표시 로직 적용
5. `Task E` QA 체크리스트 수행 및 수치 검증 문서화

## 6) 착수 게이트 (Go / No-Go)

아래를 모두 만족하면 구현 착수(Go):
- [ ] Phase 0 문서 승인
- [ ] P0 지표/임계치 합의
- [ ] P1(집계 API) 즉시 포함 여부 결정
- [ ] QA 책임자와 수동 시나리오 합의

