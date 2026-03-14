# V2 Migration / Cutover Gate Runbook

이 문서는 07 영역의 P1~P2(전환 제어 기반 + 게이트 검증 체계) 운영 기준을 정의한다.

## 1) 목표
- 도메인별 cutover 상태와 다음 액션을 한 화면에서 관리한다.
- gate 결과를 `PASS/FAIL/WARN/SKIP`로 누적 저장하고, 도메인별 READY/BLOCKED/REVIEW 결정을 자동 계산한다.
- batch/routing flag를 운영자 관점에서 추적 가능하게 유지한다.

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
  - Checklist Decision 확인(READY/REVIEW/BLOCKED)

## 5) 자동 검증

```bash
npm run ops:v2-verify-07 -- \
  --admin-token <ADMIN_TOKEN> \
  --domain-key CATALOG
```

로컬 admin bypass가 켜져 있으면 `--admin-token` 없이도 실행 가능하다.

## 6) 롤백 기준
- `BLOCKED` 도메인이 증가하거나 `FAIL` gate가 연속 발생
- routing flag 오설정으로 트래픽 분기 이상 징후 발생
- batch가 `FAILED` 상태로 누적되어 재처리 큐가 적체

롤백 시:
1. routing target을 `LEGACY`로 회귀
2. 신규 gate 입력을 중지하고 실패 원인 복구
3. `BLOCKED` 사유가 해소될 때까지 제한 전환 중단
