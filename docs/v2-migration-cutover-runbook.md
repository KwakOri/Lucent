# V2 Migration / Cutover Runbook

이 문서는 07 영역의 P1~P4(전환 제어 기반 + 게이트 검증 체계 + 단계 실행 로그 + 롤백/재오픈 운영) 기준을 정의한다.

## 1) 목표
- 도메인별 cutover 상태와 다음 액션을 한 화면에서 관리한다.
- gate 결과를 `PASS/FAIL/WARN/SKIP`로 누적 저장하고, 도메인별 READY/BLOCKED/REVIEW 결정을 자동 계산한다.
- batch/routing flag를 운영자 관점에서 추적 가능하게 유지한다.
- 단계 0~8 실행 기록과 이슈/복구 기록을 동일 기준으로 관리한다.
- 롤백 이후 재오픈 승인 기준을 정량 지표로 일관되게 판정한다.

## 2) 주요 API
- 도메인 상태판
  - `GET /api/v2/admin/cutover/domains`
  - `PATCH /api/v2/admin/cutover/domains/:domainKey`
- gate 리포트
  - `GET /api/v2/admin/cutover/gates`
  - `POST /api/v2/admin/cutover/gates`
  - `GET /api/v2/admin/cutover/gates/checklist`
- migration batch
  - `GET /api/v2/admin/cutover/batches`
  - `POST /api/v2/admin/cutover/batches`
- routing flags
  - `GET /api/v2/admin/cutover/routing-flags`
  - `POST /api/v2/admin/cutover/routing-flags`
- stage runs
  - `GET /api/v2/admin/cutover/stage-runs`
  - `POST /api/v2/admin/cutover/stage-runs`
- stage issues
  - `GET /api/v2/admin/cutover/stage-issues`
  - `POST /api/v2/admin/cutover/stage-issues`
- reopen readiness
  - `GET /api/v2/admin/cutover/reopen-readiness`

## 3) 게이트 판정 규칙
- required gate type: `DATA_CONSISTENCY`, `BEHAVIORAL`, `OPERATIONS`, `ROLLBACK_READY`
- 도메인별 판정:
  - `BLOCKED`: `FAIL` 존재 또는 gate 미측정(`missing/SKIP`)
  - `REVIEW`: `FAIL/missing`은 없고 `WARN` 존재
  - `READY`: 모든 required gate가 `PASS`

## 4) 운영 화면
- `/admin/v2-ops`에서 다음을 수행:
  - Domain Board 조회/업데이트
  - Gate/Batch/Routing 등록
  - Stage Run/Issue 등록 및 최근 기록 확인
  - Rollback/Reopen readiness(READY/BLOCKED/NOT_REQUIRED) 확인
  - Checklist Decision 확인(READY/REVIEW/BLOCKED)

## 5) 자동 검증

```bash
npm run ops:v2-verify-07 -- \
  --admin-token <ADMIN_TOKEN> \
  --domain-key CATALOG
```

로컬 admin bypass가 켜져 있으면 `--admin-token` 없이도 실행 가능하다.

검증 스크립트는 P1~P3 범위로 아래를 확인한다.
- cutover domains/gates/batches/routing-flags 조회 가능
- stage-runs/stage-issues 조회 가능
- checklist required gate type 무결성
- reopen-readiness 조회 가능

## 6) 롤백 기준
- `BLOCKED` 도메인이 증가하거나 `FAIL` gate가 연속 발생
- routing flag 오설정으로 트래픽 분기 이상 징후 발생
- batch가 `FAILED` 상태로 누적되어 재처리 큐가 적체

롤백 시:
1. routing target을 `LEGACY`로 회귀
2. 신규 gate 입력을 중지하고 실패 원인 복구
3. `BLOCKED` 사유가 해소될 때까지 제한 전환 중단
4. 필요 시 stage issue를 `OPEN -> MITIGATING -> RESOLVED`로 갱신하며 복구 로그를 남김

재오픈 승인 기준:
1. checklist decision이 `READY`
2. 미해결 stage issue(`OPEN`/`MITIGATING`)가 0건
3. 최신 stage run 상태가 `COMPLETED`
