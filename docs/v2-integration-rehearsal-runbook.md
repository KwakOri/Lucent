# V2 Integration Rehearsal Runbook (01~07)

이 문서는 01~07 구현 범위를 로컬에서 한 번에 점검하는 통합 리허설 절차와 운영 전환 직전 확인 항목을 정의한다.

## 1) 현재 상태 요약 (dev 기준)

- 01 Catalog Core: 구현 완료 (스키마/백필/readiness 비교 API)
- 02 Bundle: 구현 완료 (definition/resolve/ops/canary)
- 03 Campaign/Pricing/Promotion: 구현 완료
- 04 Cart/Checkout/Order: 구현 완료 + 로컬 리허설 스크립트 제공
- 05 Fulfillment/Inventory/Shipping/Digital: 구현 완료 + 로컬 리허설 스크립트 제공
- 06 Admin/Ops: 구현 완료 (cutover policy + action/audit/approval)
- 07 Migration/Cutover: 구현 완료 (gate/checklist + stage run/issue + reopen readiness)

주의: 위 상태는 `dev` 브랜치 기준 구현 상태이며, 프로덕션 반영 여부와는 별개다.

## 2) 통합 리허설 명령

```bash
cd /Users/kwakori/projects/promotion/lucent/frontend
npm run ops:v2-verify-all:local
```

기본 동작:
- `supabase start`
- `supabase db reset`
- `supabase db lint`
- `ops:v2-verify-04:local -- --skip-migration`
- `ops:v2-verify-05:local -- --skip-migration`
- `01/02` 로컬 fixture 자동 보정(누락 primary media, digital asset, bundle definition/component)
- `06/07` 검증용 로컬 admin token 자동 발급(`verify-all-local@example.com`)
- 로컬 백엔드(`LOCAL_ADMIN_BYPASS=true`) 기동 후:
- `ops:v2-verify-0102`, `ops:v2-verify-06`, `ops:v2-verify-07`

리포트 출력:
- `frontend/reports/v2-rehearsal/<timestamp>/summary.md`
- 같은 폴더에 단계별 로그와 `verify-0102.md`, `verify-06.md`, `verify-07.md` 저장

## 3) 실행 옵션

```bash
npm run ops:v2-verify-all:local -- --skip-reset
npm run ops:v2-verify-all:local -- --report-dir /tmp/v2-rehearsal
npm run ops:v2-verify-all:local -- --base-url http://127.0.0.1:3001
```

## 3-1) v2 UI 수동 테스트 (Local Supabase 강제 연결)

원격 DB 오염을 피하려면 아래 명령으로 실행한다.
이 스크립트는 `supabase status -o env` 값을 읽어 프론트/백엔드를 로컬 Supabase에 강제 연결한다.

```bash
cd /Users/kwakori/projects/promotion/lucent/frontend
npm run dev:v2-local
```

옵션:

```bash
# 로컬 DB를 reset하고 시작
npm run dev:v2-local:reset

# backend 3002, frontend 3010 포트로 실행
bash scripts/dev-v2-local.sh --backend-port 3002 --frontend-port 3010

# admin bypass를 끄고 실행
bash scripts/dev-v2-local.sh --no-admin-bypass
```

## 4) 운영 의사결정 상태 (프로덕션 전환 전)

### 4-1) 재고 Source of Truth (확정)

- 재고 기준 데이터는 `v2`만 사용한다.
- 컷오버 이후 legacy 재고 데이터는 운영 판단 기준에서 제외한다.
- 전환 조건:
  - 최종 backfill/delta 반영 완료
  - legacy 재고 write 경로 차단
  - 재고 조회/예약/소진/해제 로직이 v2 경로로 고정

### 4-2) 결제 정산 축 (확정)

- 정산 SoT는 `v2_orders`, `v2_payments`를 사용한다.
- 주문 기준 금액은 `v2_orders.grand_total`로 본다.
- 매출 인식 금액은 `v2_payments.status='CAPTURED'` 합계로 본다.
- 환불 금액은 refund 이벤트 row 합계로 본다.
  - 현재 구현 기준: `v2_payments.method='MANUAL_REFUND'` 합계
- 순정산 공식:
  - `순매출 = CAPTURED 합계 - 환불 합계`
- 집계 시간 기준:
  - KST 일마감(00:00~23:59)으로 통일
- 대사 기준:
  - PG 대사 키는 `external_reference`를 기준으로 사용

### 4-3) BI/Analytics 이벤트 전환 시점 (확정: 기본안 적용)

- 이벤트 계약(Event Contract)
  - 주문/결제/환불/배송/디지털 지급 이벤트는 v2 이벤트를 기준으로 고정한다.
  - 공통 식별키는 `order_id`, `order_no`, `external_reference`를 사용한다.
  - 핵심 KPI 집계 이벤트는 아래 기준으로 고정한다.
    - 주문수: 주문 생성 이벤트
    - 결제건수/결제금액: 결제 `CAPTURED`
    - 환불건수/환불금액: 결제 `PARTIALLY_REFUNDED`/`REFUNDED` (현재 구현의 `MANUAL_REFUND` 포함)
    - 순매출: 결제금액 - 환불금액
- 전환 방식
  - dual-run(legacy+v2 동시 수집) 기간은 14일로 고정한다.
  - dual-run 시작 후 7일 시점부터 대시보드 기본 source를 v2로 전환한다.
  - dual-run 14일 완료 후 legacy 이벤트 발행을 중단한다.
- 수용 기준(Acceptance Gate)
  - 최근 7일 기준 KPI 편차 허용치:
    - 주문수/결제건수/환불건수: `1% 이내` 또는 `절대값 5건 이내`
    - 순매출: `1% 이내`
  - 이벤트 품질 허용치:
    - 누락율 `0.1% 이하`
    - 중복율 `0.1% 이하`
- 운영 절차
  - 컷오버 당일 2시간 집중 모니터링을 수행한다.
  - 불일치 초과 시 즉시 원인 로그를 기록하고 dual-run 상태로 유지한다.
  - 롤백 조건:
    - KPI 편차 `3% 초과` 또는 누락율/중복율 `0.5% 초과`
