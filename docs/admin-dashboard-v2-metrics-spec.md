# Admin Dashboard v2 지표 명세서

- 작성일: 2026-04-04
- 연동 대상: `v2-admin`, `v2-fulfillment`, `v2-catalog` 운영 API
- 목적: 대시보드 카드/차트/큐 지표의 정의와 계산 공식을 고정한다.

## 1) 공통 원칙

- 기본 기간 프리셋: `LAST_7_DAYS`
- 금액 단위: KRW (`currency_code`가 다를 경우 카드에 통화 코드 노출)
- 서버 상태 기준: React Query 캐시 + 카드별 stale 표시
- 취소 주문 제외 기준: `order_status = CANCELED`는 매출/판매량 집계에서 제외

## 2) KPI 정의 (P0)

| metric_key | 카드명 | 정의/공식 | 데이터 소스 |
| --- | --- | --- | --- |
| `orders_count` | 총 주문 수 | `sales-stats.summary.orders_count` | `GET /api/v2/admin/ops/sales-stats` |
| `order_gross_amount` | 총 매출 | `sales-stats.summary.order_gross_amount` | `GET /api/v2/admin/ops/sales-stats` |
| `net_settlement_amount` | 순정산 | `captured_amount - refund_amount` | `GET /api/v2/admin/ops/sales-stats` |
| `refund_rate` | 환불률 | `refund_amount / captured_amount` (0 나눗셈 방지) | `GET /api/v2/admin/ops/sales-stats` |
| `payment_pending_count` | 입금 대기 | 주문 큐에서 linear stage=`PAYMENT_PENDING` 건수 | `GET /api/v2/admin/ops/order-queue` |
| `ready_to_ship_count` | 배송 대기 | linear stage=`READY_TO_SHIP` 건수 | `GET /api/v2/admin/ops/order-queue` |
| `inventory_risk_count` | 재고 리스크 | `mismatch_count + low_stock_count` | `GET /api/v2/admin/ops/inventory-health` |
| `approval_pending_count` | 승인 대기 | `status=PENDING` 승인 요청 건수 | `GET /api/v2/admin/audit/approvals?status=PENDING` |

## 3) 보조 지표 (P0)

| group | metric_key | 정의 |
| --- | --- | --- |
| 주문 퍼널 | `stage_counts` | `PAYMENT_PENDING`, `PAYMENT_CONFIRMED`, `PRODUCTION`, `READY_TO_SHIP`, `IN_TRANSIT`, `DELIVERED`, `CANCELED` 분포 |
| 제작 배치 | `production_batch_status_counts` | `DRAFT/ACTIVE/COMPLETED/CANCELED` 배치 건수 + 실패/제외 건수 합 |
| 배송 배치 | `shipping_batch_status_counts` | `DRAFT/ACTIVE/DISPATCHED/COMPLETED/CANCELED` 배치 건수 + 실패/제외 건수 합 |
| 감사/승인 | `failed_action_count` | 최근 액션 로그에서 `status=FAILED` 건수 |
| 전환 리스크 | `cutover_blocked_domains` | gate checklist summary의 `blocked_count` |

## 4) 차트 지표 (P0)

### 4.1 매출/정산 추세 차트
- X축: `sales-stats.daily[].date`
- series:
  - `order_gross_amount`
  - `captured_amount`
  - `refund_amount`
  - `net_settlement_amount`

### 4.2 주문 단계 퍼널
- 입력: `order-queue.items[]`
- 변환: `resolveLinearStageFromRow` 동일 규칙 사용
- 출력: 단계별 건수/비율

## 5) 임계치 정책 (초기안)

| metric_key | warning | critical | 비고 |
| --- | --- | --- | --- |
| `refund_rate` | `> 5%` | `> 8%` | 최근 7일 기준 |
| `payment_pending_count` | `> 30` | `> 60` | 운영팀 처리역량 기준 초기값 |
| `ready_to_ship_count` | `> 50` | `> 100` | 배송 지연 위험 |
| `inventory_risk_count` | `> 0` | `> 10` | mismatch/저재고 합산 |
| `approval_pending_count` | `> 10` | `> 20` | 승인 병목 |
| `cutover_blocked_domains` | `>= 1` | `>= 3` | 컷오버 운영 경보 |

## 6) API 계약 전략

## 6.1 P0 (기존 API 조합)
- 프론트에서 병렬 호출 후 대시보드 view model 조립
- 장점: 빠른 착수
- 단점: 호출 수 증가, 카드 간 집계 시점 차이

## 6.2 P1 (집계 전용 API)
- 제안 엔드포인트: `GET /api/v2/admin/ops/dashboard/overview`
- 권장 응답 스키마:

```json
{
  "generated_at": "2026-04-04T10:30:00.000Z",
  "range": {
    "preset": "LAST_7_DAYS",
    "from": "2026-03-29",
    "to": "2026-04-04"
  },
  "kpis": {
    "orders_count": 0,
    "order_gross_amount": 0,
    "captured_amount": 0,
    "refund_amount": 0,
    "net_settlement_amount": 0,
    "refund_rate": 0,
    "payment_pending_count": 0,
    "ready_to_ship_count": 0,
    "inventory_risk_count": 0,
    "approval_pending_count": 0
  },
  "trends": {
    "daily": []
  },
  "pipeline": {
    "order_stage_counts": {},
    "production_batch_status_counts": {},
    "shipping_batch_status_counts": {}
  },
  "risk": {
    "inventory": {
      "mismatch_count": 0,
      "low_stock_count": 0
    },
    "cutover": {
      "blocked_domains": 0
    },
    "audit": {
      "failed_actions_24h": 0
    }
  },
  "queues": {
    "urgent_orders": [],
    "pending_approvals": [],
    "failed_actions": []
  }
}
```

## 7) 지표 검증 규칙

- 매출 카드와 `v2-ops/stats` 요약 수치가 동일해야 한다.
- 주문 단계 합계는 `order-queue` 총 건수와 일치해야 한다.
- `inventory_risk_count`는 `mismatch_count + low_stock_count`와 일치해야 한다.
- 카드 표시 값과 드릴다운 화면 리스트 건수가 크게 다르면(기준 시간 차이 제외) 경고 배지 노출.

## 8) 외부 기준 및 출처

- Shopify Overview Dashboard: https://help.shopify.com/en/manual/reports-and-analytics/shopify-reports/overview-dashboard
- Shopify Order Analytics: https://help.shopify.com/en/manual/fulfillment/managing-orders/analytics/order-analytics
- Shopify Behavior Reports: https://help.shopify.com/en/manual/reports-and-analytics/shopify-reports/report-types/default-reports/behaviour-reports
- Shopify Inventory Reports: https://help.shopify.com/en/manual/reports-and-analytics/shopify-reports/report-types/default-reports/inventory-reports
- Shopify Product Analytics: https://help.shopify.com/en/manual/products/analytics
- Shopify Customer Reports: https://help.shopify.com/en/manual/reports-and-analytics/shopify-reports/report-types/default-reports/customers-reports
- GA4 Ecommerce purchases report: https://support.google.com/analytics/answer/12924131?hl=en
- Stripe dispute analytics: https://docs.stripe.com/payments/analytics/disputes
- Stripe dispute measurement: https://docs.stripe.com/disputes/measuring
- APQC perfect order performance: https://www.apqc.org/resources/benchmarking/open-standards-benchmarking/measures/perfect-order-performance
- Tableau dashboard best practices: https://help.tableau.com/current/pro/desktop/en-us/dashboards_best_practices.htm
