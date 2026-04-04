# Admin Dashboard v2 사전 기획서 (Pre-Implementation)

- 작성일: 2026-04-04
- 대상 화면: `/admin`
- 문서 목적: 실제 구현 착수 전에 범위, 화면 구조, 지표 우선순위, 리스크를 확정한다.

## 1) 배경 및 문제 정의

현재 `/admin` 대시보드는 최근 주문 5건과 단순 수치 카드 중심이며, 운영 의사결정에 필요한 맥락(매출 추세, 주문 병목, 제작/배송 배치, 재고/승인 리스크)을 한 번에 보여주지 못한다.

현행 코드 기준:
- 화면: `app/admin/page.tsx`
- 기존 집계 소스: `order-queue`, `products`, `artists`
- 제한점: 최근 100건 기준 부분 집계, 운영 큐/리스크 지표 부재

## 2) 목표 / 비목표

### 목표
- 관리자 대시보드를 "요약+우선순위 판단+즉시 이동" 허브로 개편
- 운영팀이 3분 내 오늘의 병목/리스크를 파악 가능하도록 구성
- 기존 v2 운영 API를 최대한 재사용해 1차 릴리즈 리드타임 단축

### 비목표
- BI 전면 재구축
- 복잡한 예측 모델(수요예측/자동 발주)
- 신규 권한 시스템 도입

## 3) 대시보드 역할 정의

대시보드는 "기록 조회"가 아니라 아래 3가지를 수행해야 한다.

1. 지금 당장 확인해야 할 문제를 알려준다.
2. 왜 문제가 생겼는지 컨텍스트(트렌드/큐)를 보여준다.
3. 해결 화면으로 즉시 이동시킨다.

## 4) 정보 구조 (IA)

이미지 레퍼런스와 현재 도메인을 결합한 권장 레이아웃:

### 상단: KPI 카드 (8개)
- 총 주문 수 (기간)
- 총 매출 (order gross)
- 순정산 (captured-refund)
- 환불률
- 입금 대기
- 배송 대기
- 재고 리스크 (불일치+저재고)
- 승인 대기

### 중단 좌측: 매출/정산 추세
- 일별 `captured / refund / net_settlement` 추세
- 기간: 최근 7일(기본), 30일, 커스텀

### 중단 우측: 운영 병목 패널
- 주문 단계 퍼널
- 제작 배치 상태 요약
- 배송 배치 상태 요약
- 컷오버/게이트 BLOCKED 도메인

### 하단 좌측: 즉시 처리 큐
- 오래된 입금대기 주문
- 배송대기 주문 상위
- 실패/제외가 많은 배치

### 하단 우측: 감사/승인 타임라인
- 최근 실패 액션 로그
- 최근 승인 요청(PENDING)

## 5) KPI 카드별 드릴다운 맵

- 입금 대기/주문 단계: `/admin/orders`
- 제작/배송 병목: `/admin/production-shipping`
- 환불률/환불액: `/admin/refunds`
- 매출/정산: `/admin/v2-ops/stats`
- 승인 대기/실패 로그: `/admin/v2-ops`
- 컷오버 리스크: `/admin/v2-catalog/readiness`, `/admin/v2-ops`

## 6) 데이터 소스 전략

### P0 (즉시 구현 가능: 기존 API 조합)
- `GET /api/v2/admin/ops/sales-stats`
- `GET /api/v2/admin/ops/order-queue`
- `GET /api/v2/admin/ops/fulfillment-queue`
- `GET /api/v2/admin/ops/inventory-health`
- `GET /api/v2/admin/audit/approvals`
- `GET /api/v2/admin/audit/action-logs`
- `GET /api/v2/admin/cutover/gates/checklist`
- `GET /api/v2/admin/ops/production/batches`
- `GET /api/v2/admin/ops/shipping/batches`

### P1 (성능/일관성 개선)
- 대시보드 전용 집계 엔드포인트 도입
- 제안: `GET /api/v2/admin/ops/dashboard/overview`
- 효과: 클라이언트 N회 호출 -> 단일 응답, 카드 간 시점 불일치 축소

## 7) 운영 임계치 (초기 제안)

- 환불률: `> 5%` 경고, `> 8%` 위험
- 입금대기 주문: `> 30건` 경고, `> 60건` 위험
- 배송대기 주문: `> 50건` 경고, `> 100건` 위험
- 재고 불일치: `> 0건` 경고, `> 10건` 위험
- 승인대기: `> 10건` 경고, `> 20건` 위험
- 컷오버 BLOCKED 도메인: `>= 1` 즉시 주의

주의: 임계치는 초기 운영 2주 후 실제 분포 기반으로 재조정한다.

## 8) 화면/상호작용 가이드

- 모든 카드에 `집계 기준 시간` 표기 (`generated_at` 또는 fetch 시각)
- 카드 클릭 시 해당 관리 화면으로 이동
- 표/리스트는 "Top N + 전체 보기" 구조 유지
- 빈 상태(empty)와 지연(stale) 상태를 명시
- 모바일은 카드 1열, 중단/하단 패널은 세로 스택

## 9) 리스크 및 대응

- API 다건 호출로 로딩 지연
  - 대응: 병렬 fetch + skeleton + P1에서 aggregator API
- 카드 간 집계 기준 시점 불일치
  - 대응: 응답 메타에 `generated_at` 노출
- stage 기준 해석 혼선
  - 대응: `order-stage.ts`와 동일 로직 사용
- 운영팀 임계치 합의 지연
  - 대응: 초기값 배포 후 2주 관찰, 주간 조정

## 10) 구현 착수 전 체크리스트

- [ ] KPI 정의/수식 합의
- [ ] 카드-드릴다운 맵 확정
- [ ] 임계치(경고/위험) 1차 합의
- [ ] P0/P1 범위 고정
- [ ] 성능 예산(대시보드 최초 로드 목표) 합의
- [ ] QA 시나리오 합의

## 11) 외부 레퍼런스 (설계 기준)

- Shopify Analytics/Order/Inventory/Customer Reports
- GA4 E-commerce purchases report
- Stripe dispute analytics
- APQC Perfect Order Performance
- Tableau dashboard best practices

(세부 링크와 지표 정의는 `admin-dashboard-v2-metrics-spec.md` 참고)
