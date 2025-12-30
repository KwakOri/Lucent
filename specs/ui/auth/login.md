# Login (로그인) - UI Spec

## 경로

`/login`

## 페이지 목적

- 사용자 로그인
- 회원가입 페이지로 연결
- 비밀번호 재설정 (2차 확장)

## 레이아웃 구조

### 1. Login Form

**구성**:
- 로고 또는 서비스 이름
- 이메일 입력 필드
- 비밀번호 입력 필드
- "로그인" 버튼
- "회원가입" 링크
- (선택) "비밀번호 찾기" 링크

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
  - 빈 값 체크
- Placeholder: "이메일을 입력하세요"
- Error message: "올바른 이메일 형식을 입력해주세요"

### Password
- Type: password
- Required: true
- Validation:
  - 빈 값 체크
  - 최소 길이: 6자 (Supabase 기본)
- Placeholder: "비밀번호를 입력하세요"
- Show/Hide 토글 버튼 (선택)
- Error message: "비밀번호를 입력해주세요"

## 상태 관리

### Form State
- `email`: 이메일 값
- `password`: 비밀번호 값
- `errors`: 필드별 에러 메시지
- `isSubmitting`: 제출 중 상태

### UI State
- `showPassword`: 비밀번호 표시 여부

## 인터랙션 플로우

### 로그인 성공
1. 폼 제출
2. API 호출 (`POST /api/auth/login`)
3. 성공 시:
   - 세션 저장
   - 이전 페이지 또는 메인 페이지로 리다이렉트
   - Toast 메시지: "로그인되었습니다"

### 로그인 실패
1. 폼 제출
2. API 호출 실패
3. 에러 메시지 표시
   - "이메일 또는 비밀번호가 올바르지 않습니다"
   - "계정을 찾을 수 없습니다"
   - "네트워크 오류가 발생했습니다"

### 회원가입 링크
- "아직 계정이 없으신가요? 회원가입"
- 클릭 시 `/signup`으로 이동

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
- "로그인 중..." 텍스트

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

## 보안

- 비밀번호 필드 type="password"
- 자동완성 지원 (autocomplete)
- HTTPS 필수

## 성능

- 폼 제출 시 중복 제출 방지
- API 호출 최소화

## 1차 MVP 제외 기능

- SNS 로그인 (구글, 트위터 등)
- 2FA (이중 인증)
- "자동 로그인" 체크박스

## API 연동

- API: `POST /api/auth/login`
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
    "error": "Invalid credentials"
  }
  ```

## 참고사항

- Supabase Auth 사용
- 기존 auth 스펙 참조: `specs/api/auth/login.md`
- 공통 Form 컴포넌트 재사용: `specs/ui/common/form.md`
