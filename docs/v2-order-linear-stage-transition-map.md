# V2 Order 선형 단계 전환 맵 (현재 구현 기준)

작성일: 2026-03-23  
기준 코드: `backend/src/v2-admin/v2-admin-order-transition.service.ts`, `backend/src/v2-checkout/v2-checkout.service.ts`, `backend/src/v2-fulfillment/v2-fulfillment.service.ts`

## 1) 목적

이 문서는 Admin 주문 화면의 선형 단계 전환(`입금 대기 -> 입금 확인 -> 제작중 -> 배송 대기 -> 배송 중 -> 배송 완료`)이
실제 DB에 어떤 파생값을 남기는지 정리한다.

특히 아래를 판단하기 위한 운영 기준으로 사용한다.

- 한 단계씩 진행할 때의 실제 write 경로
- 단계 롤백(뒤로 이동) 시 허용/차단 조건
- 두 단계 이상 스킵 시 생성되는 액션 묶음
- 데이터상 불가능한 전환(또는 위험한 전환) 판단 기준

## 2) 범위와 비범위

범위:

- v2 주문 선형 전환 API
  - `POST /api/v2/admin/ops/orders/transition-preview`
  - `POST /api/v2/admin/ops/orders/transition-execute`
- 전환 실행 시 파생 write가 발생하는 핵심 테이블

비범위:

- 레거시(v1) 주문 상태 체계
- 일반 사용자의 마이페이지 표시 정책(단, 불일치 리스크 항목으로는 언급)

## 3) 용어 정리

### 3.1 상태 3축 (주문 헤더)

- `order_status`: `PENDING | CONFIRMED | CANCELED | COMPLETED`
- `payment_status`: `PENDING | AUTHORIZED | CAPTURED | FAILED | CANCELED | PARTIALLY_REFUNDED | REFUNDED`
- `fulfillment_status`: `UNFULFILLED | PARTIAL | FULFILLED | CANCELED`

### 3.2 선형 단계 (Admin 전환 타깃)

- `PAYMENT_PENDING` (입금 대기)
- `PAYMENT_CONFIRMED` (입금 확인)
- `PRODUCTION` (제작중)
- `READY_TO_SHIP` (배송 대기)
- `IN_TRANSIT` (배송 중)
- `DELIVERED` (배송 완료)

중요:

- `CANCELED`는 선형 단계의 타깃이 아니다.  
- 취소 상태는 3축 중 하나에 `CANCEL`이 포함되는지로 별도 판단한다.

## 4) 현재 단계(current_stage) 계산 로직

`transition-preview/execute`는 전환 전 `current_stage`를 서버에서 계산한다.

기준 함수: `V2AdminOrderTransitionService.resolveCurrentStage`

결정 순서:

1. `payment_status == AUTHORIZED`면 `PAYMENT_CONFIRMED`
2. `payment_status`가 `CAPTURED/PARTIALLY_REFUNDED/REFUNDED`가 아니면 `PAYMENT_PENDING`
3. 결제가 캡처 계열이면 이행 데이터로 분기
4. 실물(`has_physical`) 주문:
   - shipment 전부 `DELIVERED`면 `DELIVERED` 후보
   - 단, 디지털 entitlement 중 미지급이 있으면 `IN_TRANSIT`
   - `SHIPPED/IN_TRANSIT`가 하나라도 있으면 `IN_TRANSIT`
   - `READY_TO_PACK/PACKING`이 있으면 `READY_TO_SHIP`
   - 그 외 `PRODUCTION`
5. 디지털-only(`has_digital`) 주문:
   - entitlement 전부 `GRANTED`면 `DELIVERED`
   - 아니면 `PRODUCTION`

주의:

- 이 계산은 `order_status/fulfillment_status`보다 `payment_status + shipment/entitlement 실데이터`를 우선한다.

## 5) 전환 엔진 실행 모델

기준 함수: `V2AdminOrderTransitionService.runTransition`

흐름:

1. `preview`: 액션 목록만 계산 (DB write 없음)
2. `execute`: 계산된 액션을 순차 실행
3. 각 액션은 `V2AdminActionExecutorService.execute`를 경유
4. 액션마다 감사 로그 생성:
   - `v2_admin_action_logs` (항상)
   - `v2_admin_state_transition_logs` (transition 정의가 있을 때)
5. `target_stage == DELIVERED`이고 액션 실패/승인대기가 없으면 `syncOrderDeliveredState` 추가 실행

## 6) 타깃 단계별 액션 생성 규칙

기준 함수: `V2AdminOrderTransitionService.buildTransitionRow`

참고(UI 분기):

- Admin 화면(`frontend/app/admin/orders/page.tsx`)에서는 운영 편의를 위해
  `PAYMENT_CONFIRMED` 실행 요청 시 선택 주문을 분할한다.
  - 디지털-only 주문(`has_digital=true && has_physical=false`): `DELIVERED`로 실행
  - 그 외 주문: `PAYMENT_CONFIRMED`로 실행
- 즉, 서버 전환 엔진 규칙은 동일하지만, 실제 운영 버튼 동작은 클라이언트에서
  주문 구성에 따라 목표 단계를 재매핑한다.

### 6.1 정방향(앞으로 가는 전환)

`PAYMENT_CONFIRMED`:

- 디지털-only:
  - 결제 미캡처면 `ORDER_PAYMENT_MARK_AUTHORIZED` + `ORDER_PAYMENT_MARK_CAPTURED`까지 자동 추가 가능
  - entitlement가 `PENDING/EXPIRED`면 `FULFILLMENT_ENTITLEMENT_REISSUE`로 `GRANTED` 처리
  - entitlement가 `FAILED/REVOKED`면 차단
- 실물 포함:
  - `payment_status in {PENDING, FAILED}`이면 `ORDER_PAYMENT_MARK_AUTHORIZED`
  - 그 외 AUTHORIZED가 아니면 차단

`PRODUCTION`:

- 결제 미캡처면 캡처까지 필요한 결제 액션 자동 추가

`READY_TO_SHIP`:

- 실물 주문만 허용
- shipment 존재 필수
- 결제 미캡처면 결제 액션 추가
- shipment가 `PENDING`이면 차단

`IN_TRANSIT`:

- 실물 주문만 허용
- shipment 존재 필수
- 결제 미캡처면 결제 액션 추가
- shipment가 `READY_TO_PACK/PACKING`이면 `FULFILLMENT_SHIPMENT_DISPATCH` 추가
- shipment가 `PENDING`이면 차단

`DELIVERED`:

- 결제 미캡처면 결제 액션 추가
- 실물 shipment:
  - `READY_TO_PACK/PACKING`이면 `DISPATCH` + `DELIVER` 2개 액션 추가
  - `SHIPPED/IN_TRANSIT`이면 `DELIVER` 추가
  - `PENDING`이면 차단
- 디지털 entitlement:
  - `PENDING/EXPIRED`면 `REISSUE`로 `GRANTED`
  - `FAILED/REVOKED`면 차단
- 액션 성공 후 `syncOrderDeliveredState`가 order header 완료 상태를 동기화

### 6.2 역방향(뒤로 가는 전환)

`target_stage`가 현재 단계보다 이전이면 강제 롤백 모드로 동작한다.

- `PAYMENT_PENDING` 롤백:
  - `ORDER_PAYMENT_MARK_PENDING` -> `forceSetOrderPaymentPending`
  - 주문 헤더를 강제로 `payment_status=PENDING`, `order_status=PENDING`, `fulfillment_status=UNFULFILLED`로 되돌림
- `PAYMENT_CONFIRMED` 롤백:
  - 필요 시 `ORDER_PAYMENT_MARK_AUTHORIZED`
- 물류/디지털 강제 롤백:
  - shipment: `FULFILLMENT_SHIPMENT_FORCE_STATUS`
  - entitlement: `FULFILLMENT_ENTITLEMENT_FORCE_STATUS`

역방향 시 경고:

- 이미 `DELIVERED`였던 shipment 개수
- 다운로드 이력이 있는 entitlement 개수

즉, 역방향은 "가능"하지만 도메인적으로 되돌리기 위험한 데이터가 존재할 수 있다.

## 7) 액션 키별 DB 파생 write 맵

## 7.1 `ORDER_PAYMENT_MARK_AUTHORIZED` / `ORDER_PAYMENT_MARK_CAPTURED`

실행 함수:

- `V2CheckoutService.applyPaymentCallback(status=AUTHORIZED|CAPTURED)`

주요 write:

- `v2_payments` upsert (order_id + external_reference 기준)
  - `status`, `authorized_at`, `captured_at`, `failed_at`, `refunded_total`, `metadata.callback_at`
- `v2_orders` update
  - `payment_status`
  - `order_status` (결제 상태 기반 계산)
  - `confirmed_at` (AUTHORIZED/CAPTURED 최초 시점)
  - `metadata.last_payment_callback`

부가:

- `CAPTURED` 최초 전환 시 결제완료 알림 비동기 발송

## 7.2 `ORDER_PAYMENT_MARK_PENDING`

실행 함수:

- `V2AdminOrderTransitionService.forceSetOrderPaymentPending`

주요 write:

- `v2_orders` update
  - `payment_status=PENDING`
  - `order_status=PENDING`
  - `fulfillment_status=UNFULFILLED`
  - `confirmed_at/canceled_at/completed_at = null`
  - `metadata.last_manual_stage_rollback`

## 7.3 `FULFILLMENT_SHIPMENT_DISPATCH`

실행 함수:

- `V2FulfillmentService.dispatchShipment`

주요 write:

- `v2_shipments` update
  - `status=SHIPPED`
  - `packed_at`, `shipped_at`
  - `metadata`
- `v2_fulfillments` update (`markFulfillmentInProgress`)
  - `status=IN_PROGRESS`
  - `started_at`

## 7.4 `FULFILLMENT_SHIPMENT_DELIVER`

실행 함수:

- `V2FulfillmentService.deliverShipment`

주요 write:

- `v2_shipments` update
  - `status=DELIVERED`
  - `delivered_at`
  - `metadata`
- `v2_fulfillments` update (`markFulfillmentCompleted`)
  - `status=COMPLETED`
  - `completed_at`

## 7.5 `FULFILLMENT_ENTITLEMENT_REISSUE`

실행 함수:

- `V2FulfillmentService.reissueEntitlement`

주요 write:

- `v2_digital_entitlements` update
  - `status=GRANTED`
  - `granted_at`, `token_hash`, `token_reference`, `expires_at`, `max_downloads`
  - `revoked_at/revoke_reason/failed_at` 초기화
  - `metadata`
- `v2_digital_entitlement_events` insert
  - `event_type=REISSUED`

## 7.6 `FULFILLMENT_SHIPMENT_FORCE_STATUS`

실행 함수:

- `V2AdminOrderTransitionService.forceSetShipmentStatus`

주요 write:

- `v2_shipments` update
  - `status`를 `READY_TO_PACK | IN_TRANSIT | DELIVERED | CANCELED` 중 하나로 강제
  - 상태별 시각 컬럼(`packed_at`, `shipped_at`, `in_transit_at`, `delivered_at`, `canceled_at`) 재세팅
  - `metadata.last_manual_stage_rollback`

## 7.7 `FULFILLMENT_ENTITLEMENT_FORCE_STATUS`

실행 함수:

- `V2AdminOrderTransitionService.forceSetEntitlementStatus`

주요 write:

- `v2_digital_entitlements` update
  - `status=PENDING|GRANTED` 강제
  - `granted_at`, `revoked_at`, `revoke_reason`, `failed_at` 재세팅
  - `metadata.last_manual_stage_rollback`

## 7.8 `DELIVERED` 후처리: `ORDER_DELIVERED_SYNC`

실행 함수:

- `V2AdminOrderTransitionService.syncOrderDeliveredState`

선행조건:

- 실물 shipment 전부 `DELIVERED`
- 디지털 entitlement 전부 `GRANTED`

주요 write:

- `v2_orders` update
  - `order_status=COMPLETED`
  - `fulfillment_status=FULFILLED`
  - `confirmed_at` 보정
  - `completed_at` 보정
  - `metadata.last_manual_stage_transition`
- `v2_order_items` update
  - `line_status`를 `PENDING/CONFIRMED -> FULFILLED`로 동기화

## 8) 단계 스킵 시 동작 (두 단계 이상 점프)

이 전환 엔진은 "목표 단계를 바로 지정"할 수 있고, 필요한 중간 액션을 자동으로 누적 생성한다.

예시:

- `PAYMENT_PENDING -> IN_TRANSIT`
  - 결제 AUTHORIZED/CAPTURED 액션 + shipment dispatch 액션 조합
- `PAYMENT_PENDING -> DELIVERED`
  - 결제 액션 + dispatch + deliver + (디지털이면 reissue) + delivered sync
- `IN_TRANSIT -> PAYMENT_PENDING` (역방향)
  - 결제/주문 헤더 강제 롤백 + shipment/entitlement 강제 상태 조정

즉, 스킵 자체는 허용되지만 각 중간 조건이 충족되지 않으면 `blocked_reasons`로 실행이 막힌다.

## 9) 데이터상 불가능/차단 판단 기준

다음 케이스는 `preview`에서 차단되는 대표 조건이다.

- 결제 상태가 `CANCELED`인데 `PAYMENT_PENDING` 이외 단계로 전환하려는 경우
- 실물 주문인데 shipment가 없는 상태에서 `READY_TO_SHIP/IN_TRANSIT/DELIVERED` 전환
- shipment 상태가 `PENDING`인 상태에서 자동 출고/배송완료가 필요한 단계 전환
- 디지털 전환이 필요한데 entitlement가 없음
- entitlement 상태가 `FAILED/REVOKED`인데 자동 지급(reissue)이 필요한 전환

## 10) 감사/추적 데이터

선형 전환 `execute` 호출 시, 주문 데이터 외에 다음 감사 테이블이 누적된다.

- `v2_admin_action_logs`
  - 액션별 실행 성공/실패, payload, permission 평가
- `v2_admin_state_transition_logs`
  - 액션별 from/to 상태 전이 기록
- `v2_admin_approval_requests`
  - 현재 선형 전환 경로에서는 기본적으로 사용하지 않음 (approval input 미전달)

## 11) 운영 실행 원칙 (권장)

1. 항상 `transition-preview`를 먼저 호출해 `blocked_reasons`, `warning_reasons`, `actions`를 확인한다.
2. 역방향 전환 시 `warning_reasons`를 승인 체크리스트로 취급한다.
3. `DELIVERED` 전환은 `ORDER_DELIVERED_SYNC` 성공까지 확인해야 완료로 본다.
4. 마이페이지/관리자 화면의 표시 상태와 전환 엔진 계산이 다를 수 있으므로, 운영 의사결정은 `preview.rows[].current_stage`를 우선한다.

## 12) 코드 포인터

- 선형 단계 계산/액션 생성/실행:
  - `backend/src/v2-admin/v2-admin-order-transition.service.ts`
- 액션 감사 로그/전이 로그 기록:
  - `backend/src/v2-admin/v2-admin-action-executor.service.ts`
- 결제 콜백 기반 상태 반영:
  - `backend/src/v2-checkout/v2-checkout.service.ts`
- shipment/entitlement 상태 전이:
  - `backend/src/v2-fulfillment/v2-fulfillment.service.ts`
- 관리자 주문 큐(단계 계산용 보조 카운트):
  - `frontend/supabase/migrations/20260316113000_v2_admin_order_queue_composition_flags.sql`
