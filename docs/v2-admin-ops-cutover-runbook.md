# V2 Admin / Ops Cutover Runbook

이 문서는 06 영역의 P4(점진 도입) 실행 시 운영자가 확인할 정책, 순서, 검증 명령을 정의한다.

## 1) 목표
- 민감 액션(환불/디지털 회수 등)을 승인 정책으로 제어한다.
- Action Executor 경유 로그 누락을 0으로 유지한다.
- legacy write는 단계적으로 제한하고 v2 액션 경로를 표준으로 전환한다.

## 2) 정책 플래그

### 필수
- `V2_ADMIN_ROLLOUT_STAGE`
  - `STAGE_1`: 로그/권한 관찰 중심 (approval observe-only)
  - `STAGE_2`: 승인 대상 액션 점진 강제
  - `STAGE_3`: legacy write 제한(Read-Only 권장)

- `V2_ADMIN_APPROVAL_ENFORCED`
  - `false`: 승인 필요 액션도 즉시 실행 가능 (로그에 approval_required만 남김)
  - `true`: 승인 필요 액션은 `PENDING`으로 등록 후 실행 차단

- `V2_ADMIN_APPROVAL_ENFORCED_ACTIONS`
  - 비우면 승인 필요 액션 전체 강제
  - 값 지정 시 해당 `action_key`만 강제 (CSV)
  - 예시: `ORDER_REFUND_EXECUTE,FULFILLMENT_ENTITLEMENT_REVOKE`

### 선택
- `V2_ADMIN_LEGACY_WRITE_MODE`
  - 명시하지 않으면 stage 기준 기본값 사용
  - `STAGE_3`에서 기본값은 `READ_ONLY`

## 3) 단계별 전환 순서

### Step 1: 관찰 모드
1. `V2_ADMIN_ROLLOUT_STAGE=STAGE_1`
2. `V2_ADMIN_APPROVAL_ENFORCED=false`
3. 운영 화면(`/admin/v2-ops`)에서 Action Log/Approval Queue 모니터링

### Step 2: 액션 단위 승인 강제
1. `V2_ADMIN_ROLLOUT_STAGE=STAGE_2`
2. `V2_ADMIN_APPROVAL_ENFORCED=true`
3. `V2_ADMIN_APPROVAL_ENFORCED_ACTIONS`에 1~2개 액션부터 시작
4. 장애 없으면 강제 액션 범위를 확대

### Step 3: legacy 제한
1. `V2_ADMIN_ROLLOUT_STAGE=STAGE_3`
2. `V2_ADMIN_LEGACY_WRITE_MODE=READ_ONLY`
3. 민감 액션은 승인/로그 경유 경로만 허용

## 4) 점검 API
- 정책 조회: `GET /api/v2/admin/cutover-policy`
- 액션별 정책 판정: `POST /api/v2/admin/cutover-policy/check`
- 액션 매핑: `GET /api/v2/admin/actions/catalog`
- 감사 로그: `GET /api/v2/admin/audit/action-logs`
- 승인 큐: `GET /api/v2/admin/audit/approvals`

## 5) 자동 검증

```bash
npm run ops:v2-verify-06 -- \
  --admin-token <ADMIN_TOKEN> \
  --action-key ORDER_REFUND_EXECUTE \
  --requires-approval true \
  --expect-decision APPROVAL_REQUIRED
```

선택적으로 실제 환불 스모크를 하려면 `--order-id <ORDER_UUID>`를 추가한다.

## 6) 롤백 기준
- `action_logs`에서 `FAILED` 급증
- 승인 큐 적체 증가로 CS SLA 위협
- 승인 강제 액션에서 업무 차질 발생

롤백 시:
1. `V2_ADMIN_APPROVAL_ENFORCED=false`
2. `V2_ADMIN_APPROVAL_ENFORCED_ACTIONS` 축소/비움
3. `V2_ADMIN_ROLLOUT_STAGE`를 직전 단계로 복귀
