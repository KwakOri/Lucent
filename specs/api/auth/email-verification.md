# Auth – Email Verification Spec

이 문서는 이메일 기반 인증을 공통 모듈로 정의한다.
회원가입, 비밀번호 재설정 등 모든 이메일 인증 플로우에서 재사용된다.

---

## 1. 목적

- 이메일 소유자 검증
- Supabase Auth 이메일 발송 제한 회피
- 인증 로직의 단일화 및 재사용성 확보

---

## 2. 기본 원칙

- 이메일 인증은 **Supabase Auth 이전 단계**에서 수행한다.
- 이메일 발송은 Nodemailer + 외부 SMTP를 사용한다.
- 인증 성공 여부는 서버 기준으로만 판단한다.

---

## 3. 인증 정책

- 인증 방식: 링크 클릭
- 인증 토큰 만료 시간: **10분**
- 토큰은 1회용
- 재발송 가능

  - 서버 기준 쿨타임 적용 (권장: 30~60초)

---

## 4. 인증 플로우

### 4.1 인증 메일 발송

```
POST /api/auth/email/send
```

- 입력: email, purpose (signup | reset-password 등)
- 처리:

  1. 인증 토큰 생성
  2. 만료 시간 설정 (10분)
  3. DB 저장
  4. Nodemailer로 인증 메일 발송

---

### 4.2 인증 확인

```
GET /api/auth/email/verify?token=xxx
```

- 처리:

  - 토큰 유효성 검사
  - 만료 여부 확인
  - 성공 시 인증 완료 처리
  - 기존 토큰 즉시 무효화

---

## 5. 데이터 모델 (예시)

### email_verifications

- email
- token
- purpose
- expires_at
- verified_at
- created_at

---

## 6. 보안 고려사항

- 토큰은 랜덤/추측 불가능해야 함
- 동일 이메일 + purpose 기준 중복 토큰 관리
- 재발송 시 이전 토큰 폐기

---

## 7. 사용처

- 회원가입 (Signup)
- 비밀번호 재설정
- 이메일 변경 인증 (추후)
