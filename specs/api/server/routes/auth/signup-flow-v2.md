# 회원가입 플로우 v2 (개선)

이 문서는 **개선된 회원가입 플로우**를 정의한다.

> **변경 이유**: 사용자 경험 개선 및 이메일 인증 옵션 추가
> **작성일**: 2025-01-01
> **관련 문서**:
> - 기존 회원가입: `/specs/api/server/routes/auth/sign-up.md`
> - 이메일 인증: `/specs/api/server/routes/auth/email-verification.md`
> - OAuth 플로우: `/specs/api/server/routes/auth/oauth-google.md`

---

## 1. 플로우 개요

### 1.1 이메일 회원가입 플로우

```
1. 이메일 + 비밀번호 입력
   ↓
2. 이메일 인증 코드 발송
   ↓
3. 이메일 인증 (코드 입력 OR 링크 클릭)
   ↓
4. 회원가입 완료 (auth.users + profiles 생성)
   ↓
5. (선택) 부가정보 입력 (전화번호, 주소)
```

### 1.2 OAuth 회원가입 플로우

```
1. Google 로그인
   ↓
2. 프로필 자동 생성
   ↓
3. (선택) 부가정보 입력 (전화번호, 주소)
```

---

## 2. 이메일 회원가입 상세 플로우

### 2.1 Step 1: 이메일 + 비밀번호 입력

**페이지**: `/signup`

**입력 필드**:
- 이메일 (필수)
- 비밀번호 (필수, 최소 6자)
- 비밀번호 확인 (필수)
- 약관 동의 (체크박스, 필수)

**검증**:
- 이메일 형식 검증
- 비밀번호 길이 검증 (최소 6자)
- 비밀번호 일치 확인
- 약관 동의 확인

**API**: `POST /api/auth/send-verification`

**Request**:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response** (200 OK):
```json
{
  "status": "success",
  "message": "인증 코드가 이메일로 발송되었습니다",
  "data": {
    "email": "user@example.com",
    "expiresIn": 600
  }
}
```

**처리**:
1. 이메일 중복 확인 (auth.users, profiles)
2. 인증 코드 생성 (6자리 숫자)
3. `email_verifications` 테이블에 저장
   - email
   - code (6자리 숫자)
   - token (링크용, UUID)
   - hashed_password (임시 저장)
   - purpose: 'signup'
   - expires_at: 10분 후
4. 이메일 발송 (코드 + 링크 둘 다 포함)

**이메일 템플릿**:
```
제목: [Lucent Management] 이메일 인증

안녕하세요!

아래 인증 코드를 입력하여 회원가입을 완료해주세요.

인증 코드: 123456

또는 아래 링크를 클릭하세요:
https://yoursite.com/auth/verify-email?token=xxx

인증 코드는 10분 후 만료됩니다.

---
Lucent Management
```

---

### 2.2 Step 2: 이메일 인증 코드 발송 완료

**페이지**: `/signup/verify-email`

**UI**:
- "이메일로 인증 코드를 발송했습니다"
- 입력 필드: 6자리 코드 입력
- "인증 코드 재발송" 버튼
- "이메일 링크로 인증하기" 안내

**상태 관리**:
- 입력된 이메일 표시
- 재발송 쿨타임 (60초)
- 만료 시간 표시 (10분 카운트다운)

---

### 2.3 Step 3-A: 코드 입력 인증

**API**: `POST /api/auth/verify-code`

**Request**:
```json
{
  "email": "user@example.com",
  "code": "123456"
}
```

**Response** (200 OK):
```json
{
  "status": "success",
  "message": "이메일 인증이 완료되었습니다",
  "data": {
    "token": "verification-token-xxx"
  }
}
```

**처리**:
1. email + code 확인
2. 만료 여부 확인 (10분)
3. 검증 성공 시:
   - `verified_at` 업데이트
   - 임시 토큰 발급 (회원가입 API에서 사용)
4. 코드 무효화

**에러**:
- 400: 잘못된 코드
- 400: 만료된 코드
- 429: 너무 많은 시도 (5회 제한)

---

### 2.3 Step 3-B: 링크 클릭 인증

**API**: `GET /api/auth/verify-email?token=xxx`

**Response**: 리디렉션
- 성공: `/signup/complete?verified=true&token=xxx`
- 실패: `/signup?error=invalid_token`

**처리**:
1. token 확인
2. 만료 여부 확인
3. 검증 성공 시:
   - `verified_at` 업데이트
   - 회원가입 페이지로 리디렉션

---

### 2.4 Step 4: 회원가입 완료

**API**: `POST /api/auth/signup`

**Request**:
```json
{
  "email": "user@example.com",
  "verificationToken": "token-from-step-3"
}
```

**Response** (200 OK):
```json
{
  "status": "success",
  "message": "회원가입이 완료되었습니다",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com"
    },
    "session": {
      "access_token": "xxx",
      "refresh_token": "yyy"
    }
  }
}
```

**처리**:
1. verificationToken 검증
2. email_verifications에서 hashed_password 조회
3. Supabase Admin API로 사용자 생성:
   ```typescript
   await supabase.auth.admin.createUser({
     email,
     password: hashed_password,
     email_confirm: true // 이메일 인증 완료 상태로 생성
   });
   ```
4. profiles 테이블에 레코드 생성:
   ```typescript
   {
     id: user.id,
     email: email,
     name: null,
     phone: null,
     address: null
   }
   ```
5. 세션 생성 및 반환
6. email_verifications 레코드 삭제

**자동 로그인**:
- 회원가입 완료 후 자동으로 로그인 상태
- 세션 쿠키 설정

---

### 2.5 Step 5: (선택) 부가정보 입력

**페이지**: `/welcome` 또는 `/mypage/profile`

**입력 필드** (모두 선택):
- 이름
- 전화번호
- 주소

**UI**:
- "프로필 정보를 입력하세요 (나중에 입력 가능)"
- "건너뛰기" 버튼
- "저장하고 시작하기" 버튼

**API**: `PATCH /api/profiles/me`

**처리**:
- 프로필 정보 업데이트
- 완료 후 메인 페이지로 이동

---

## 3. 데이터베이스 스키마

### 3.1 email_verifications 테이블 (수정)

```sql
CREATE TABLE email_verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) NOT NULL,
  code VARCHAR(6), -- 6자리 숫자 코드 (NEW)
  token VARCHAR(255) NOT NULL UNIQUE, -- 링크용 토큰
  hashed_password TEXT, -- 임시 비밀번호 저장 (NEW)
  purpose VARCHAR(50) NOT NULL, -- 'signup', 'reset-password'
  expires_at TIMESTAMPTZ NOT NULL,
  verified_at TIMESTAMPTZ,
  attempts INT DEFAULT 0, -- 코드 입력 시도 횟수 (NEW)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_email_verifications_email ON email_verifications(email);
CREATE INDEX idx_email_verifications_code ON email_verifications(code);
CREATE INDEX idx_email_verifications_token ON email_verifications(token);
```

**변경사항**:
- `code` 필드 추가 (6자리 숫자)
- `hashed_password` 필드 추가 (임시 비밀번호 저장)
- `attempts` 필드 추가 (코드 입력 시도 횟수 제한)

---

## 4. 보안 고려사항

### 4.1 코드 생성
- 6자리 랜덤 숫자
- 추측 불가능한 난수 생성기 사용
- 동일 코드 중복 방지

### 4.2 코드 입력 시도 제한
- 최대 5회 시도
- 5회 초과 시 새 코드 발급 필요
- 브루트 포스 공격 방지

### 4.3 비밀번호 임시 저장
- bcrypt로 해시하여 저장
- 회원가입 완료 후 즉시 삭제
- 만료 시간 후 자동 삭제

### 4.4 토큰 보안
- UUID v4 사용
- 1회용 (사용 후 무효화)
- 10분 만료

---

## 5. API 엔드포인트 요약

| 메서드 | 경로 | 목적 |
|--------|------|------|
| POST | `/api/auth/send-verification` | 인증 코드 발송 |
| POST | `/api/auth/verify-code` | 코드 입력 인증 |
| GET | `/api/auth/verify-email` | 링크 클릭 인증 |
| POST | `/api/auth/signup` | 회원가입 완료 |
| POST | `/api/auth/send-verification` (재발송) | 코드 재발송 |

---

## 6. UI 플로우

### 6.1 /signup (회원가입 페이지)

**폼 필드**:
- 이메일
- 비밀번호
- 비밀번호 확인
- 약관 동의 체크박스

**버튼**:
- "인증 코드 발송" (Primary)

**이동**:
- 성공 시: `/signup/verify-email?email=xxx`

### 6.2 /signup/verify-email (인증 코드 입력 페이지)

**UI**:
- "이메일로 인증 코드를 발송했습니다"
- 이메일 주소 표시
- 6자리 코드 입력 필드
- "인증하기" 버튼
- "코드 재발송" 버튼 (60초 쿨타임)
- "이메일에서 링크 클릭으로도 인증 가능합니다" 안내

**이동**:
- 성공 시: 자동 로그인 후 `/welcome` 또는 `/`

### 6.3 /welcome (부가정보 입력 페이지, 선택)

**폼 필드** (모두 선택):
- 이름
- 전화번호
- 주소

**버튼**:
- "건너뛰기" (Secondary)
- "저장하고 시작하기" (Primary)

**이동**:
- `/` (메인 페이지)

---

## 7. OAuth 플로우 통합

### 7.1 OAuth 회원가입 후 프로필 완성도 확인

OAuth로 가입한 사용자도 부가정보 입력 페이지로 유도:

```typescript
// OAuth 콜백 후
if (result.isNewUser) {
  // 프로필 정보 확인
  if (!profile.name || !profile.phone) {
    // 부가정보 입력 페이지로 리디렉션
    router.push('/welcome');
  } else {
    router.push('/');
  }
}
```

---

## 8. 에러 처리

### 8.1 인증 코드 발송 실패
- 네트워크 오류
- SMTP 오류
- 이메일 중복

### 8.2 코드 입력 오류
- 잘못된 코드
- 만료된 코드
- 시도 횟수 초과

### 8.3 회원가입 실패
- 잘못된 토큰
- 이미 가입된 이메일
- Supabase 오류

---

## 9. 1차 MVP 범위

### 포함
- ✅ 이메일 인증 코드 방식
- ✅ 이메일 링크 클릭 방식
- ✅ 코드 재발송
- ✅ 부가정보 입력 (선택)
- ✅ OAuth 플로우 통합

### 제외 (2차 확장)
- ⏸️ SMS 인증
- ⏸️ 소셜 로그인 (카카오, 네이버)
- ⏸️ 2단계 인증 (2FA)
- ⏸️ 비밀번호 강도 체크
- ⏸️ 이메일 변경

---

## 10. 참고 문서

- 기존 회원가입: `/specs/api/server/routes/auth/sign-up.md`
- 이메일 인증: `/specs/api/server/routes/auth/email-verification.md`
- OAuth 플로우: `/specs/api/server/routes/auth/oauth-google.md`
- 프로필 API: `/specs/api/server/routes/profiles/index.md`
