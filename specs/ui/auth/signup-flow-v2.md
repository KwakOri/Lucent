# 회원가입 UI 플로우 v2

이 문서는 **개선된 회원가입 UI**를 정의한다.

> **관련 문서**:
> - API 플로우: `/specs/api/server/routes/auth/signup-flow-v2.md`

---

## 1. 페이지 구조

### 1.1 /signup (회원가입 페이지)

**목적**: 이메일 + 비밀번호 입력

**폼 필드**:
1. **이메일** (필수)
   - Type: email
   - Placeholder: "이메일을 입력하세요"
   - 검증: 이메일 형식
   - 에러: "올바른 이메일을 입력해주세요"

2. **비밀번호** (필수)
   - Type: password
   - Placeholder: "비밀번호 (최소 6자)"
   - 검증: 최소 6자
   - 에러: "비밀번호는 최소 6자 이상이어야 합니다"

3. **비밀번호 확인** (필수)
   - Type: password
   - Placeholder: "비밀번호를 다시 입력하세요"
   - 검증: password와 일치
   - 에러: "비밀번호가 일치하지 않습니다"

4. **약관 동의** (필수)
   - Type: checkbox
   - Label: "이용약관 및 개인정보처리방침에 동의합니다"
   - 링크: 약관 페이지 새 탭 열기

**버튼**:
- "인증 코드 발송" (Primary, 전체 너비)

**링크**:
- "이미 계정이 있으신가요? 로그인"

**OAuth**:
- "또는" 구분선
- Google 로그인 버튼

---

### 1.2 /signup/verify-email (이메일 인증 페이지)

**목적**: 인증 코드 입력 또는 링크 클릭 안내

**헤더**:
- 제목: "이메일을 확인해주세요"
- 설명: "***@example.com으로 인증 코드를 발송했습니다"

**코드 입력 섹션**:
1. **6자리 코드 입력 필드**
   - Type: text (숫자만)
   - Pattern: 6자리
   - 자동 포커스
   - 큰 글씨 (모노스페이스 폰트)
   - 각 자릿수별 Input (선택사항)

2. **인증하기 버튼** (Primary)
   - 6자리 입력 완료 시 활성화

**추가 옵션**:
3. **코드 재발송 버튼** (Secondary)
   - 쿨타임 표시 (60초)
   - "코드를 받지 못하셨나요? 재발송 (59초 후)"
   - 활성화 후: "코드 재발송"

4. **링크 인증 안내**
   - "이메일에서 링크를 클릭해도 인증됩니다"
   - 작은 글씨, 회색

**만료 타이머**:
- "10:00" → "09:59" ... "00:01" → "만료됨"
- 만료 시 "코드가 만료되었습니다. 재발송해주세요"

---

### 1.3 /welcome (부가정보 입력 페이지)

**목적**: 추가 프로필 정보 입력 (선택)

**헤더**:
- 제목: "환영합니다!"
- 설명: "프로필 정보를 입력하면 더 편리하게 이용할 수 있어요"
- 부제: "(나중에 마이페이지에서도 입력 가능합니다)"

**폼 필드** (모두 선택):
1. **이름**
   - Placeholder: "이름"
   - 선택 입력

2. **전화번호**
   - Placeholder: "010-1234-5678"
   - 자동 하이픈 추가
   - 선택 입력

3. **주소**
   - Placeholder: "주소"
   - 선택 입력
   - (향후) 주소 검색 버튼

**버튼**:
- "건너뛰기" (Secondary, Text 버튼)
- "저장하고 시작하기" (Primary)

---

## 2. 인터랙션 플로우

### 2.1 회원가입 페이지

```
1. 사용자가 폼 입력
   ↓
2. 클라이언트 검증 (실시간)
   ↓
3. "인증 코드 발송" 클릭
   ↓
4. API 호출 (POST /api/auth/send-verification)
   ↓
5. 성공 시: /signup/verify-email?email=xxx 이동
   실패 시: 에러 메시지 표시
```

### 2.2 이메일 인증 페이지

**코드 입력 방식**:
```
1. 사용자가 6자리 코드 입력
   ↓
2. 자동 검증 또는 "인증하기" 버튼 클릭
   ↓
3. API 호출 (POST /api/auth/verify-code)
   ↓
4. 성공 시:
   - 회원가입 API 호출 (POST /api/auth/signup)
   - 자동 로그인
   - /welcome 또는 / 이동
   실패 시:
   - 에러 메시지 표시
   - 시도 횟수 표시 (5회 제한)
```

**링크 클릭 방식**:
```
1. 사용자가 이메일에서 링크 클릭
   ↓
2. GET /api/auth/verify-email?token=xxx
   ↓
3. 서버에서 검증 후 회원가입 완료
   ↓
4. 자동 로그인
   ↓
5. /welcome 또는 / 이동
```

**코드 재발송**:
```
1. "코드 재발송" 버튼 클릭
   ↓
2. API 호출 (POST /api/auth/send-verification)
   ↓
3. 성공 시:
   - "새 코드가 발송되었습니다" Toast 메시지
   - 쿨타임 60초 재시작
   - 타이머 10분 재시작
```

### 2.3 부가정보 입력 페이지

```
1. (선택) 사용자가 정보 입력
   ↓
2. "저장하고 시작하기" 또는 "건너뛰기"
   ↓
3. 저장 시: PATCH /api/profiles/me
   ↓
4. 메인 페이지(/) 이동
```

---

## 3. 상태 관리

### 3.1 회원가입 페이지

```typescript
interface SignupState {
  email: string
  password: string
  passwordConfirm: string
  agreedToTerms: boolean
  isSubmitting: boolean
  errors: {
    email?: string
    password?: string
    passwordConfirm?: string
    agreedToTerms?: string
    general?: string
  }
}
```

### 3.2 이메일 인증 페이지

```typescript
interface VerifyEmailState {
  email: string // URL에서 가져옴
  code: string // 6자리
  isVerifying: boolean
  isResending: boolean
  resendCooldown: number // 초
  expiresIn: number // 초 (600 = 10분)
  attempts: number // 시도 횟수
  maxAttempts: number // 5
  error: string | null
}
```

### 3.3 부가정보 입력 페이지

```typescript
interface WelcomeState {
  name: string
  phone: string
  address: string
  isSaving: boolean
  error: string | null
}
```

---

## 4. 디자인 가이드

### 4.1 회원가입 페이지

- 깔끔한 폼 레이아웃
- 에러 메시지: Input 아래, 빨간색
- 약관 체크박스: 눈에 띄게
- Google 버튼: 구분선 아래

### 4.2 이메일 인증 페이지

**코드 입력 필드**:
- 큰 폰트 (24-32px)
- 모노스페이스 폰트
- 중앙 정렬
- 6칸 또는 하나의 Input
- 자동 포커스

**타이머**:
- 눈에 띄는 위치
- 빨간색 (만료 임박 시)
- "9:59" 형식

**재발송 버튼**:
- 쿨타임 중: 비활성화 + 남은 시간 표시
- 활성화: Primary 색상

### 4.3 부가정보 입력 페이지

- 부드러운 느낌
- "선택 사항" 강조
- "건너뛰기" 버튼 눈에 띄게
- 아이콘 추가 (선택)

---

## 5. 반응형

### 모바일 (< 768px)
- 폼 전체 너비
- 버튼 고정 하단
- 코드 입력: 화면 중앙

### 데스크톱 (> 768px)
- 폼 최대 400px, 중앙 정렬
- 버튼 폼 하단
- 여백 충분히

---

## 6. 접근성

- Label과 Input 연결
- 에러 메시지 aria-describedby
- 키보드 네비게이션
- 포커스 스타일 명확
- 코드 입력: 자동 포커스

---

## 7. 에러 메시지

### 회원가입 페이지
- "이메일을 입력해주세요"
- "올바른 이메일 형식을 입력해주세요"
- "비밀번호는 최소 6자 이상이어야 합니다"
- "비밀번호가 일치하지 않습니다"
- "약관에 동의해주세요"
- "이미 가입된 이메일입니다"

### 이메일 인증 페이지
- "인증 코드를 입력해주세요"
- "올바른 인증 코드를 입력해주세요"
- "잘못된 인증 코드입니다"
- "인증 코드가 만료되었습니다"
- "인증 시도 횟수를 초과했습니다. 코드를 재발송해주세요"

---

## 8. 성공 메시지 (Toast)

- "인증 코드가 발송되었습니다"
- "새 코드가 발송되었습니다"
- "이메일 인증이 완료되었습니다"
- "회원가입이 완료되었습니다!"
- "프로필이 업데이트되었습니다"

---

## 9. 로딩 상태

### 버튼 로딩
- "인증 코드 발송" → "발송 중..." + 스피너
- "인증하기" → "인증 중..." + 스피너
- "코드 재발송" → "발송 중..." + 스피너

### 페이지 로딩
- 이메일 인증 페이지 진입 시 로딩 표시

---

## 10. 참고 문서

- API 플로우: `/specs/api/server/routes/auth/signup-flow-v2.md`
- 기존 회원가입 UI: `/specs/ui/auth/index.md`
- Form Components: `/specs/ui/common/form.md`
