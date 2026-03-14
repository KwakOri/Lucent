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

## 4) 프로덕션 전환 전 최종 의사결정

- 재고 source of truth 통합 시점
- payment 정산 축의 v2 편입 시점
- BI/analytics 이벤트 전환 시점

위 3개는 코드 작업과 별개로 운영 정책 확정이 필요한 항목이다.
