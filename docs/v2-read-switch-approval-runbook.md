# V2 Read Switch 승인 절차 Runbook

이 문서는 `01 Catalog Core`의 read switch를 프로덕션에서 실행하기 전,
최종 승인 여부를 판단하기 위한 실행 절차를 정의한다.

## 1) 적용 시점

- 적용 환경: Production
- 적용 타이밍:
  - v2 catalog 관련 배포가 완료된 뒤
  - 백필/보정 SQL 적용이 끝난 뒤
  - 실제 read switch 변경 직전

## 2) 승인 기준 (Gate)

승인은 아래 Gate를 순서대로 통과해야 한다.

### Gate A. 데이터 보정 완료

- `remediation-tasks` 결과에서 `blocking_failed=0` 이어야 한다.
- `advisory_failed`는 운영 판단으로 전환 가능하나, 이유를 기록한다.

### Gate B. 체크리스트 상태 확인

- `read-switch-checklist`의 BLOCKING 실패가 없어야 한다.
- `compare-report` 기준 샘플이 예상 범위인지 확인한다.

### Gate C. 기능 스모크 검증

- 대표 상품 상세/목록 조회 정상
- 장바구니 담기 정상
- 체크아웃 진입 정상
- 디지털/피지컬 주요 경로 오류 없음

### Gate D. 롤백 준비 확인

- read switch 원복 방법이 준비되어 있어야 한다.
- 원복 후 재확인할 엔드포인트/화면 목록을 미리 기록한다.

## 3) 실행 절차

### Step 1. 리포트 수집

관리자 API 토큰을 준비한 뒤 아래를 실행한다.

```bash
curl -s -H "Authorization: Bearer <ADMIN_TOKEN>" \
  "https://<host>/api/v2/catalog/admin/migration/compare-report?sampleLimit=20"

curl -s -H "Authorization: Bearer <ADMIN_TOKEN>" \
  "https://<host>/api/v2/catalog/admin/migration/read-switch-checklist?sampleLimit=20"

curl -s -H "Authorization: Bearer <ADMIN_TOKEN>" \
  "https://<host>/api/v2/catalog/admin/migration/remediation-tasks?sampleLimit=20"
```

### Step 2. Blocking 항목 판정

- `remediation-tasks.summary.blocking_failed`가 `0`인지 확인
- 0이 아니면 전환 금지, 보정 작업 후 Step 1부터 재실행

### Step 3. Advisory 항목 처리 여부 기록

- `advisory_failed` 잔여 시:
  - 즉시 처리할지
  - 전환 후 후속 처리할지
- 선택한 이유를 작업 로그에 남긴다.

### Step 4. 스모크 검증

- 관리자 `V2 읽기 전환 준비` 페이지에서 최신 리포트 확인
- 사용자 핵심 시나리오를 최소 1회 수행
- 오류 발생 시 전환 중단

### Step 5. 최종 승인 기록

- Notion 작업 로그에 아래 항목을 남긴다.
  - 실행 시각
  - compare/checklist/remediation 요약 수치
  - Gate A~D 통과 여부
  - 최종 결정(`진행`/`보류`)과 사유

## 4) 1인 작업자 운영 규칙

현재 작업자가 1명이므로 아래 원칙으로 운영한다.

- 승인/실행을 한 번에 처리하되, 기록은 반드시 남긴다.
- 최소 10분 간격으로 2회 확인한다.
  - 1차: 보정 직후
  - 2차: 실제 switch 직전
- 두 번의 수치가 모두 기준을 만족할 때만 전환한다.

## 5) 롤백 기준

아래 중 하나라도 발생하면 즉시 원복한다.

- 핵심 사용자 경로(목록/상세/장바구니/체크아웃) 장애
- 결제/주문 생성 오류 급증
- 예상하지 못한 카탈로그 미노출 대량 발생

## 6) 승인 기록 템플릿

```md
## V2 Read Switch 승인 기록

- 일시:
- 실행자:
- compare-report 요약:
- checklist 요약:
- remediation 요약:
  - blocking_failed:
  - advisory_failed:
- Gate A: PASS/FAIL
- Gate B: PASS/FAIL
- Gate C: PASS/FAIL
- Gate D: PASS/FAIL
- 최종 결정: 진행/보류
- 비고:
```

