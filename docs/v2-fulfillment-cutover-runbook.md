# V2 Fulfillment Cutover Runbook (P3/P4)

이 문서는 05 영역의 운영 흐름(P3)과 제한 전환(P4)을 실제로 수행할 때 사용하는 실행 기준이다.

## 1) 목적

- shipment는 physical 실행 단위로만 운영
- digital은 entitlement 기반 큐로 운영
- v2 fulfillment write를 환경/채널/SKU 단위로 제한 전환
- 전환 전후 상태를 API로 점검 가능하게 유지

## 2) 컷오버 정책 환경변수

backend 기준:

```bash
# 기본 write on/off (production 기본값은 false)
V2_FULFILLMENT_WRITE_ENABLED=true

# physical / digital 개별 전환
V2_FULFILLMENT_ENABLE_SHIPMENT_WRITE=true
V2_FULFILLMENT_ENABLE_DIGITAL_WRITE=true

# 선택: 허용 채널 제한 (대문자 권장, 콤마 구분)
V2_FULFILLMENT_ALLOWED_CHANNELS=WEB,POPUP

# 선택: 허용 variant 제한 (UUID 콤마 구분)
V2_FULFILLMENT_ALLOWED_VARIANT_IDS=<UUID_1>,<UUID_2>
```

## 3) 운영 점검 API

- `GET /api/v2/fulfillment/admin/cutover-policy`
- `POST /api/v2/fulfillment/admin/cutover-policy/check`
- `GET /api/v2/fulfillment/admin/ops/queue-summary?limit=20`
- `GET /api/v2/fulfillment/admin/ops/inventory-health?limit=20`

해석 기준:
- `cutover-policy/check.eligible=true` 이어야 write 전환 가능
- `inventory-health.mismatch_count`는 0에 수렴해야 안전
- `queue-summary.shipment_queue_count / entitlement_queue_count` 추이를 모니터링

## 4) 로컬 리허설

```bash
cd /Users/kwakori/projects/promotion/lucent/frontend
npm run ops:v2-verify-05:local
```

이 스크립트는 아래를 자동 수행한다.
- local supabase start + migration reset/push
- backend 기동(fulfillment write 플래그 활성화)
- fixture(stock/shipping/profile/rule/inventory) 준비
- 주문 생성 → plan/quote/orchestrate → shipment/reservation/entitlement lifecycle 검증
- 종료 후 테스트 데이터와 fixture 정리

## 5) 제한 전환 순서 (권장)

1. `V2_FULFILLMENT_WRITE_ENABLED=true`, 채널/SKU allowlist는 좁게 시작
2. `cutover-policy/check`로 대상 주문 eligibility 확인
3. `ops/queue-summary`, `ops/inventory-health`를 최소 2회 점검
4. 이상 없으면 allowlist 범위 확장
5. 전체 전환 후에도 mismatch/low-stock 모니터링 유지

## 6) 롤백 기준

아래 중 하나면 즉시 제한 강화 또는 write off:
- inventory mismatch 급증
- shipment/entitlement 큐 적체 급증
- 출고/다운로드 CS 급증

즉시 조치:
- `V2_FULFILLMENT_WRITE_ENABLED=false` 또는
- `V2_FULFILLMENT_ALLOWED_CHANNELS`, `V2_FULFILLMENT_ALLOWED_VARIANT_IDS` 범위 축소
