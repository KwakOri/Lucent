# Auth – Password Reset Spec

이 문서는 **비밀번호 재설정(Password Reset)** 기능과 이메일 인증 로직 재사용에 대한 스펙을 정의한다.

---

## 1. 기본 원칙

- 비밀번호 재설정은 **이메일 인증 기반**으로 진행한다.
- 이메일 발송은 **Nodemailer + 외부 SMTP**를 사용한다.
- 인증 토큰 생성 및 검증 로직은 `email-verification` 스펙을 재사용한다.

---

## 2. 비밀번호 재설정 요청

```
POST /api/auth/password-reset/request
```

### 입력값

- email

### 처리 흐름

1. 이메일 존재 여부와 관계없이 동일 응답 반환
2. 인증 토큰 생성 (용도: PASSWORD_RESET)
3. 만료 시간 설정 (권장: 10분)
4. DB 저장
5. 비밀번호 재설정 링크 이메일 발송

---

## 3. 비밀번호 재설정 인증

```
GET /api/auth/password-reset/verify?token=xxx
```

### 처리

- 토큰 유효성 검사
- 만료 여부 확인
- 용도(PASSWORD_RESET) 일치 여부 확인
- 성공 시 토큰 사용 가능 상태 표시

---

## 4. 비밀번호 변경

```
POST /api/auth/password-reset/confirm
```

### 입력값

- token
- newPassword

### 처리 흐름

1. 토큰 재검증
2. Supabase Admin API로 비밀번호 변경
3. 토큰 1회 사용 후 즉시 폐기

---

## 5. 보안 정책

- 토큰은 랜덤하고 추측 불가능해야 함
- 토큰은 1회용
- 재요청 시 기존 토큰 폐기
- 응답 메시지로 이메일 존재 여부 노출 금지

---

## 6. Rate Limit 정책

- IP 기준 요청 제한

  - 1분당 3~5회

- 이메일 기준 요청 제한

---

## 7. 이메일 인증 로직 재사용 정책

- 인증 테이블은 공용 사용
- 토큰에 목적 구분 필드 포함

예시:

```
SIGNUP_EMAIL_VERIFY
PASSWORD_RESET
```

---

## 8. 확장 고려

- 관리자 비밀번호 강제 초기화
- 보안 사고 대응용 세션 전체 무효화
