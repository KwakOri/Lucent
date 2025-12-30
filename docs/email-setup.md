# 이메일 설정 가이드

## 개요

Lucent Management는 nodemailer를 사용하여 이메일을 발송합니다.

### 이메일 발송 시나리오
- 회원가입 시 이메일 인증 코드 발송
- 비밀번호 재설정 시 재설정 링크 발송
- (2차 확장) 주문 알림 이메일

---

## 1. SMTP 설정 방법

### Option 1: Gmail 사용 (권장)

#### 1단계: Gmail 2단계 인증 활성화
1. Google 계정 설정으로 이동: https://myaccount.google.com/security
2. "2단계 인증" 활성화

#### 2단계: 앱 비밀번호 생성
1. https://myaccount.google.com/apppasswords 방문
2. "앱 선택" → "기타(맞춤 이름)" 선택
3. "Lucent Management" 입력
4. 생성된 16자리 비밀번호 복사

#### 3단계: .env.local 설정
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=abcd efgh ijkl mnop  # 앱 비밀번호 (공백 포함 가능)
SMTP_FROM="Lucent Management <your-email@gmail.com>"
```

### Option 2: Naver 메일 사용

```bash
SMTP_HOST=smtp.naver.com
SMTP_PORT=587
SMTP_USER=your-id@naver.com
SMTP_PASS=your-password
SMTP_FROM="Lucent Management <your-id@naver.com>"
```

### Option 3: SendGrid 사용 (대량 발송 시 권장)

1. SendGrid 계정 생성: https://sendgrid.com
2. API Key 생성
3. .env.local 설정:

```bash
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
SMTP_FROM="Lucent Management <verified-email@yourdomain.com>"
```

---

## 2. 설정 테스트

### SMTP 연결 테스트만 하기

```bash
npx tsx scripts/test-email.ts
```

### 실제 이메일 발송 테스트

```bash
npx tsx scripts/test-email.ts your-email@example.com
```

성공 시 다음과 같은 메시지가 출력됩니다:
```
✅ SMTP 서버 연결 성공!
✅ 테스트 이메일 발송 성공!
📬 your-email@example.com에서 이메일을 확인해주세요.
```

---

## 3. 문제 해결

### "Invalid login" 에러

**원인**: Gmail 계정 비밀번호를 사용한 경우

**해결**:
1. Gmail "앱 비밀번호"를 사용해야 합니다
2. 2단계 인증이 활성화되어 있어야 합니다
3. https://myaccount.google.com/apppasswords 에서 앱 비밀번호 생성

### "ECONNREFUSED" 에러

**원인**: SMTP 서버에 연결할 수 없음

**해결**:
1. `SMTP_HOST`와 `SMTP_PORT`가 올바른지 확인
2. 방화벽이 SMTP 포트(587, 465)를 차단하지 않는지 확인
3. 인터넷 연결 확인

### "Greeting never received" 에러

**원인**: SMTP 서버 응답 시간 초과

**해결**:
1. SMTP 포트 변경 시도:
   - `587` (TLS) 사용 권장
   - `465` (SSL) 시도
2. VPN 사용 중이면 비활성화 후 재시도

### 이메일이 스팸함으로 가는 경우

**해결**:
1. `SMTP_FROM` 이메일 주소를 실제 SMTP 계정과 일치시키기
2. SendGrid 등 전문 SMTP 서비스 사용 고려
3. SPF, DKIM 레코드 설정 (도메인 보유 시)

---

## 4. 이메일 템플릿 커스터마이징

이메일 템플릿은 `/lib/server/utils/email.ts`에서 수정할 수 있습니다:

```typescript
// 회원가입 인증 이메일
function getVerificationEmailTemplate(token: string): string {
  // HTML 템플릿 수정
}

// 비밀번호 재설정 이메일
function getPasswordResetEmailTemplate(token: string): string {
  // HTML 템플릿 수정
}
```

### 템플릿 수정 시 주의사항
- 인라인 CSS 사용 (대부분의 이메일 클라이언트는 `<style>` 태그 미지원)
- 반응형 디자인 적용 (모바일 환경 고려)
- 이미지는 절대 URL 사용
- 테이블 기반 레이아웃 권장 (Flexbox/Grid 미지원)

---

## 5. 프로덕션 배포 시 체크리스트

- [ ] .env.local이 아닌 환경변수로 SMTP 설정 (Vercel 등)
- [ ] `SMTP_FROM` 이메일 주소가 실제 발송 계정과 일치
- [ ] `NEXT_PUBLIC_APP_URL`이 프로덕션 도메인으로 설정
- [ ] Gmail이 아닌 전문 SMTP 서비스 사용 권장 (SendGrid, AWS SES 등)
- [ ] 이메일 발송 로그 모니터링 설정
- [ ] 이메일 발송 실패 시 재시도 로직 구현 (선택사항)

---

## 6. 관련 파일

- `/lib/server/utils/email.ts` - 이메일 발송 유틸리티
- `/scripts/test-email.ts` - 이메일 설정 테스트 스크립트
- `/.env.local` - 로컬 환경변수 (Git에 포함되지 않음)
- `/.env.example` - 환경변수 템플릿

---

## 7. API 사용 예시

```typescript
import { sendVerificationEmail, sendPasswordResetEmail } from '@/lib/server/utils/email';

// 회원가입 인증 이메일 발송
await sendVerificationEmail('user@example.com', 'ABC123');

// 비밀번호 재설정 이메일 발송
await sendPasswordResetEmail('user@example.com', 'reset-token-xyz');
```

이메일 발송은 비동기로 처리되므로 `await`를 사용하거나, fire-and-forget 방식으로 사용할 수 있습니다.
