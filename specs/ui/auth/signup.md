# Signup (회원가입) - UI Spec

## 경로

`/signup`

## 페이지 목적

- 신규 사용자 회원가입
- 로그인 페이지로 연결

## 레이아웃 구조

### 1. Signup Form

**구성**:
- 로고 또는 서비스 이름
- 이메일 입력 필드
- 비밀번호 입력 필드
- 비밀번호 확인 입력 필드
- 약관 동의 체크박스
- "회원가입" 버튼
- "로그인" 링크

**레이아웃**:
- 중앙 정렬 폼
- 최대 너비: 400px
- 카드 형태 또는 단순 폼

## Form Fields

### Email
- Type: email
- Required: true
- Validation:
  - 이메일 형식 검증
  - 중복 이메일 체크 (API)
  - 빈 값 체크
- Placeholder: "이메일을 입력하세요"
- Error messages:
  - "올바른 이메일 형식을 입력해주세요"
  - "이미 사용 중인 이메일입니다"

### Password
- Type: password
- Required: true
- Validation:
  - 최소 길이: 6자
  - (선택) 비밀번호 강도 표시
- Placeholder: "비밀번호를 입력하세요 (최소 6자)"
- Show/Hide 토글 버튼 (선택)
- Error message: "비밀번호는 최소 6자 이상이어야 합니다"

### Password Confirm
- Type: password
- Required: true
- Validation:
  - Password 필드와 일치 확인
- Placeholder: "비밀번호를 다시 입력하세요"
- Error message: "비밀번호가 일치하지 않습니다"

### Terms Agreement
- Type: checkbox
- Required: true
- Label: "이용약관 및 개인정보처리방침에 동의합니다"
- 약관 링크: `/terms`, `/privacy` (새 탭 열기)
- Error message: "약관에 동의해주세요"

## 상태 관리

### Form State
- `email`: 이메일 값
- `password`: 비밀번호 값
- `passwordConfirm`: 비밀번호 확인 값
- `agreedToTerms`: 약관 동의 여부
- `errors`: 필드별 에러 메시지
- `isSubmitting`: 제출 중 상태

### UI State
- `showPassword`: 비밀번호 표시 여부
- `showPasswordConfirm`: 비밀번호 확인 표시 여부

## 인터랙션 플로우

### 회원가입 성공
1. 폼 제출
2. API 호출 (`POST /api/auth/signup`)
3. 성공 시:
   - 자동 로그인 또는 로그인 페이지로 이동
   - Toast 메시지: "회원가입이 완료되었습니다"

### 회원가입 실패
1. 폼 제출
2. API 호출 실패
3. 에러 메시지 표시
   - "이미 사용 중인 이메일입니다"
   - "네트워크 오류가 발생했습니다"

### 로그인 링크
- "이미 계정이 있으신가요? 로그인"
- 클릭 시 `/login`으로 이동

## 디자인 가이드

### 폼 스타일
- 깔끔하고 단순한 디자인
- 입력 필드: 명확한 테두리
- 버튼: 메인 컬러, 전체 너비

### 에러 표시
- 필드 하단에 빨간색 텍스트
- 필드 테두리 색상 변경 (빨간색)
- 친절한 톤의 에러 메시지

### 로딩 상태
- 버튼 비활성화
- 로딩 스피너 표시
- "가입 중..." 텍스트

### 약관 체크박스
- 명확한 레이블
- 약관 링크는 밑줄 표시

## 반응형

### 모바일 (< 768px)
- 전체 너비 폼 (패딩 16px)
- 버튼 전체 너비

### 데스크톱 (> 768px)
- 중앙 정렬 카드 (최대 400px)
- 배경: 밝은 색 또는 그라디언트

## 접근성

- 레이블과 입력 필드 연결 (htmlFor)
- 에러 메시지 aria-live
- 키보드 네비게이션 지원
- 포커스 스타일 명확히
- 체크박스 레이블 클릭 가능

## 보안

- 비밀번호 필드 type="password"
- 자동완성 지원 (autocomplete)
- HTTPS 필수
- 비밀번호 클라이언트 검증 후 서버 재검증

## 성능

- 폼 제출 시 중복 제출 방지
- API 호출 최소화
- 이메일 중복 체크는 debounce 적용 (선택)

## 1차 MVP 제외 기능

- 이메일 인증 (사전 인증 방식 제외)
- SNS 회원가입
- 프로필 정보 입력 (이름, 닉네임 등)
- 비밀번호 강도 표시

## API 연동

- API: `POST /api/auth/signup`
- Request:
  ```json
  {
    "email": "user@example.com",
    "password": "password123"
  }
  ```
- Response (성공):
  ```json
  {
    "user": { "id": "...", "email": "..." },
    "session": { "access_token": "..." }
  }
  ```
- Response (실패):
  ```json
  {
    "error": "Email already exists"
  }
  ```

## 참고사항

- Supabase Auth 사용
- 기존 auth 스펙 참조: `specs/api/auth/sign-up.md`
- 공통 Form 컴포넌트 재사용: `specs/ui/common/form.md`
- 약관 페이지: `specs/ui/legal/terms.md`, `specs/ui/legal/privacy.md`
