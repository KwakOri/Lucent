# 📚 Lucent Management 문서

이 폴더는 Lucent Management 프로젝트의 개발 문서를 포함합니다.

---

## 📄 문서 목록

### 1. [API 테스트 가이드](./api-testing-guide.md)
**Postman을 사용한 API 테스트 완벽 가이드**

- 모든 API 엔드포인트 목록
- Request/Response 예시
- Postman Collection 임포트용 JSON
- 테스트 시나리오 및 문제 해결

**사용 시기:**
- `npm run dev`로 서버를 실행한 후 API를 테스트할 때
- 프론트엔드 개발 전 API 동작을 확인할 때
- API 스펙을 이해하고 싶을 때

---

### 2. [이메일 설정 가이드](./email-setup.md)
**Nodemailer SMTP 설정 완벽 가이드**

- Gmail, Naver, SendGrid SMTP 설정 방법
- 이메일 템플릿 커스터마이징
- 설정 테스트 방법
- 문제 해결

**사용 시기:**
- 회원가입 이메일 인증 기능을 테스트할 때
- 비밀번호 재설정 이메일을 테스트할 때
- 프로덕션 배포 전 SMTP 설정을 확인할 때

---

### 3. [Cloudflare R2 설정 가이드](./r2-setup.md)
**R2 객체 스토리지 설정 완벽 가이드**

- R2 환경변수 찾는 방법 (Account ID, API Token, Bucket Name 등)
- 버킷 생성 및 공개 URL 설정
- 커스텀 도메인 연결 방법
- 연결 테스트 스크립트
- 비용 안내 및 보안 권장사항

**사용 시기:**
- 이미지 업로드 기능을 구현할 때
- 디지털 상품(보이스팩) 파일을 저장할 때
- 프로덕션 배포 전 스토리지 설정을 확인할 때

---

### 4. [Supabase 인증 및 세션 관리 가이드](./supabase-auth-guide.md)
**쿠키 기반 세션 관리 완벽 가이드**

- 클라이언트/서버 컴포넌트에서 세션 사용법
- Proxy를 통한 자동 세션 갱신 (Next.js 15+)
- 로그인 플로우 구현 예시
- React Query와 함께 사용하는 방법
- FAQ 및 문제 해결

**사용 시기:**
- 로그인/로그아웃 기능을 구현할 때
- 세션이 유지되지 않는 문제가 있을 때
- 보호된 페이지(마이페이지 등)를 만들 때
- 서버/클라이언트 컴포넌트에서 사용자 정보를 가져올 때

---

### 5. [V2 Read Switch 승인 절차 Runbook](./v2-read-switch-approval-runbook.md)
**v2 카탈로그 읽기 전환 전 최종 승인/판정 가이드**

- compare/checklist/remediation API 확인 절차
- BLOCKING/ADVISORY 판정 기준
- 1인 작업자 승인 운영 규칙
- 롤백 기준 및 승인 기록 템플릿

**사용 시기:**
- 프로덕션 read switch 직전 최종 승인 시
- 전환 보류/진행 결정을 기록할 때
- 전환 장애 대비 롤백 기준을 점검할 때

---

### 6. [V2 Fulfillment Cutover Runbook](./v2-fulfillment-cutover-runbook.md)
**v2 fulfillment 운영 정착(P3) + 제한 전환(P4) 실행 가이드**

- fulfillment write 컷오버 환경변수 기준
- cutover policy / ops 모니터링 API 확인 절차
- 로컬 자동 리허설(`ops:v2-verify-05:local`) 실행 방법
- 제한 전환 순서 및 롤백 기준

**사용 시기:**
- v2 fulfillment write를 제한적으로 시작할 때
- 채널/SKU allowlist 기반 점진 전환을 수행할 때
- 운영 큐/재고 불일치 모니터링을 점검할 때

---

### 7. [V2 Admin/Ops Cutover Runbook](./v2-admin-ops-cutover-runbook.md)
**v2 admin action executor 단계적 강제(P4) 실행 가이드**

- rollout stage(`STAGE_1~3`) 운영 기준
- approval enforced 플래그/액션 allowlist 적용 순서
- cutover policy / audit / approval API 점검 절차
- `ops:v2-verify-06` 자동 검증 명령

**사용 시기:**
- 환불/디지털 회수 같은 민감 액션을 승인 강제로 전환할 때
- legacy write를 제한하고 v2 액션 경로로 고정할 때
- 운영 전환 전 리허설/롤백 기준을 점검할 때

---

### 8. [V2 Migration/Cutover Gate Runbook](./v2-migration-cutover-runbook.md)
**v2 migration 상태판 + gate/stage/reopen(P1~P4) 운영 가이드**

- cutover domain/gate/batch/routing API 점검 절차
- READY/REVIEW/BLOCKED 판정 기준
- `/admin/v2-ops` 상태판 운영 포인트
- `ops:v2-verify-07` 자동 검증 명령

**사용 시기:**
- 도메인별 컷오버 상태를 운영하면서 게이트 판정을 수행할 때
- 단계 전환 승인 전에 BLOCKED 사유를 점검할 때
- 라우팅/배치 상태를 함께 추적해야 할 때

---

### 9. [V2 Integration Rehearsal Runbook](./v2-integration-rehearsal-runbook.md)
**01~07 통합 리허설 자동 실행 및 최종 의사결정 정리 가이드**

- 통합 리허설 스크립트(`ops:v2-verify-all:local`) 실행 절차
- 01/02 로컬 fixture 자동 보정 + 06/07 로컬 admin token 자동 발급 포함
- 단계별 로그/리포트 산출 위치
- 운영 전환 전 의사결정 확정안(재고 SoT/정산 축/BI 전환) 정리

**사용 시기:**
- 01~07 구현 이후 전체 회귀 점검이 필요할 때
- 프로덕션 전환 직전 마지막 리허설을 수행할 때

---

## 🚀 빠른 시작

### 1. 환경 설정

```bash
# .env.local 파일 생성 (템플릿 복사)
cp .env.example .env.local

# Supabase 설정 (필수)
NEXT_PUBLIC_SUPABASE_URL=your-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key

# SMTP 설정 (선택사항)
SMTP_HOST=smtp.gmail.com
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### 2. 개발 서버 실행

```bash
npm install
npm run dev
```

서버 실행 후: http://localhost:3000

### 3. API 테스트

1. [API 테스트 가이드](./api-testing-guide.md) 문서 참조
2. Postman 또는 cURL로 API 호출
3. 예시:
   ```bash
   # 상품 목록 조회
   curl http://localhost:3000/api/products

   # 회원가입
   curl -X POST http://localhost:3000/api/auth/signup \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"test1234","name":"테스터"}'
   ```

### 4. 이메일 설정 테스트

```bash
# SMTP 연결 테스트
npx tsx scripts/test-email.ts

# 실제 이메일 발송 테스트
npx tsx scripts/test-email.ts your-email@example.com
```

---

## 📂 관련 문서 위치

### 프로젝트 스펙

모든 기능 스펙은 `/specs` 폴더에 있습니다:

```
/specs
├── index.md                    # 프로젝트 전체 스펙 인덱스
├── /api                        # API 스펙
│   ├── /server/routes          # API 엔드포인트 스펙
│   ├── /server/services        # 서버 서비스 로직 스펙
│   └── /client                 # 클라이언트 API 스펙
├── /ui                         # UI/UX 스펙
└── /components                 # 컴포넌트 스펙
```

### 테스트 문서

자동화 테스트 관련 문서는 `/tests` 폴더에 있습니다:

```
/tests
└── README.md                   # 자동화 테스트 가이드 (Vitest)
```

### 스크립트

유틸리티 스크립트는 `/scripts` 폴더에 있습니다:

```
/scripts
└── test-email.ts               # 이메일 설정 테스트 스크립트
└── v2-read-switch-rehearsal.ts # V2 전환 리허설 점검 스크립트
└── ops-v2-verify-all-local.sh  # 01~07 통합 리허설 자동 실행 스크립트
```

---

## 🔗 빠른 링크

| 작업 | 문서 |
|------|------|
| API를 테스트하고 싶어요 | [API 테스트 가이드](./api-testing-guide.md) |
| 이메일이 안 보내져요 | [이메일 설정 가이드](./email-setup.md) |
| 로그인 세션이 유지되지 않아요 | [Supabase 인증 가이드](./supabase-auth-guide.md) |
| 로그인/로그아웃을 구현하고 싶어요 | [Supabase 인증 가이드](./supabase-auth-guide.md) |
| R2 환경변수를 찾고 싶어요 | [R2 설정 가이드](./r2-setup.md) |
| 이미지/파일 스토리지를 설정하고 싶어요 | [R2 설정 가이드](./r2-setup.md) |
| V2 read switch 전환을 승인하고 싶어요 | [V2 Read Switch 승인 Runbook](./v2-read-switch-approval-runbook.md) |
| V2 fulfillment write를 전환하고 싶어요 | [V2 Fulfillment Cutover Runbook](./v2-fulfillment-cutover-runbook.md) |
| V2 admin 액션 승인 강제를 전환하고 싶어요 | [V2 Admin/Ops Cutover Runbook](./v2-admin-ops-cutover-runbook.md) |
| V2 migration gate 판정을 운영하고 싶어요 | [V2 Migration/Cutover Gate Runbook](./v2-migration-cutover-runbook.md) |
| 01~07 전체 통합 리허설을 실행하고 싶어요 | [V2 Integration Rehearsal Runbook](./v2-integration-rehearsal-runbook.md) |
| API 스펙을 확인하고 싶어요 | `/specs/api/` 폴더 |
| UI 스펙을 확인하고 싶어요 | `/specs/ui/` 폴더 |
| 자동화 테스트를 실행하고 싶어요 | `/tests/README.md` |
| 프로젝트 전체 구조를 알고 싶어요 | `/CLAUDE.md` 또는 `/specs/index.md` |

---

## 💡 팁

### Postman Environment 설정

Postman에서 환경 변수를 설정하면 편리합니다:

```json
{
  "baseUrl": "http://localhost:3000",
  "accessToken": "",
  "productId": "",
  "orderId": ""
}
```

로그인 후 받은 `accessToken`을 환경 변수에 저장하면, 모든 요청에서 자동으로 사용할 수 있습니다.

### cURL 사용 시

인증이 필요한 API는 다음과 같이 토큰을 포함하세요:

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/orders
```

### 데이터베이스 초기화

테스트 데이터를 초기화하려면:

```bash
# Supabase 대시보드에서 SQL Editor 사용
# 또는 Supabase CLI 사용
supabase db reset
```

---

## 🐛 문제 해결

### 서버가 실행되지 않아요

1. 포트 3000이 이미 사용 중인지 확인:
   ```bash
   lsof -i :3000
   kill -9 [PID]
   ```

2. 종속성 재설치:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

### API 호출 시 에러가 나요

1. `.env.local` 파일 확인
2. Supabase 대시보드에서 서비스가 정상인지 확인
3. 브라우저 콘솔 또는 터미널 로그 확인

### 이메일이 발송되지 않아요

[이메일 설정 가이드](./email-setup.md)의 "문제 해결" 섹션을 참조하세요.

---

**문서 최종 업데이트:** 2025-12-31
