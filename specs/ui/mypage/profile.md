# Profile Edit Page (프로필 수정) - UI Spec

## 경로

`/mypage/profile`

## 페이지 목적

- 사용자 프로필 정보 조회
- 프로필 정보 수정 (이름, 전화번호, 주소)

## 레이아웃 구조

### 1. Page Header

**구성**:
- 페이지 제목: "프로필 설정"
- 뒤로 가기 버튼 (→ /mypage)

**레이아웃**:
- 상단 배치
- 모바일: 헤더 고정

### 2. Profile Form Section

**목적**: 프로필 정보 표시 및 수정

**구성**:

#### 2.1 이메일 (읽기 전용)
- Label: "이메일"
- 값: 사용자 이메일 주소
- 상태: 읽기 전용 (수정 불가)
- 스타일: 비활성화된 Input 또는 텍스트로 표시
- 힌트: "이메일은 변경할 수 없습니다"

#### 2.2 이름 (수정 가능)
- Label: "이름"
- Input type: text
- Placeholder: "이름을 입력하세요"
- 검증:
  - 필수 입력
  - 최소 2자 이상
  - 최대 50자
- 에러 메시지:
  - "이름을 입력해주세요"
  - "이름은 2자 이상이어야 합니다"

#### 2.3 전화번호 (수정 가능)
- Label: "전화번호"
- Input type: tel
- Placeholder: "010-1234-5678"
- Format: 자동 하이픈 추가 (010-0000-0000)
- 검증:
  - 선택 입력
  - 형식: 000-0000-0000 또는 00-0000-0000
- 에러 메시지:
  - "올바른 전화번호 형식을 입력해주세요 (예: 010-1234-5678)"

#### 2.4 주소 (수정 가능)
- Label: "주소"
- Input type: text
- Placeholder: "주소를 입력하세요"
- 검증:
  - 선택 입력
  - 최대 200자
- 향후 확장:
  - 주소 검색 버튼 (카카오 주소 API 연동)
  - 우편번호 + 상세주소 분리

### 3. Action Buttons

**구성**:
- **저장** 버튼 (Primary)
  - 변경사항이 있을 때만 활성화
  - 로딩 상태 표시
  - 클릭 시 프로필 업데이트 API 호출
- **취소** 버튼 (Secondary)
  - 변경사항 되돌리기
  - 또는 이전 페이지로 이동

**레이아웃**:
- 모바일: 하단 고정, 세로 배치
- 데스크톱: 폼 하단, 가로 배치 (오른쪽 정렬)

## 상태 관리

### 데이터 상태
- `profile`: 프로필 정보
- `isLoading`: 로딩 상태
- `isSaving`: 저장 중 상태
- `error`: 에러 상태

### 폼 상태
- `formData`: 폼 입력 값
  - `name`: string
  - `phone`: string | null
  - `address`: string | null
- `isDirty`: 변경사항 존재 여부
- `validationErrors`: 검증 에러 객체

## 데이터 구조

```typescript
interface Profile {
  id: string
  email: string
  name: string | null
  phone: string | null
  address: string | null
  created_at: string
  updated_at: string
}

interface ProfileUpdateInput {
  name: string
  phone?: string | null
  address?: string | null
}

interface FormErrors {
  name?: string
  phone?: string
  address?: string
  general?: string
}
```

## 인터랙션 플로우

### 페이지 로드
1. 페이지 진입
2. API 호출 (`GET /api/profiles/me`)
3. 프로필 정보 폼에 표시
4. 로딩/에러 상태 처리

### 프로필 수정
1. 사용자가 입력 필드 수정
2. 실시간 검증 (onChange)
3. 변경사항 감지 (`isDirty = true`)
4. 저장 버튼 활성화

### 저장
1. "저장" 버튼 클릭
2. 클라이언트 사이드 검증
3. API 호출 (`PATCH /api/profiles/me`)
   ```typescript
   const updateData = {
     name: formData.name,
     phone: formData.phone || null,
     address: formData.address || null,
   };
   ```
4. 성공 시:
   - Toast 메시지: "프로필이 업데이트되었습니다"
   - `isDirty = false`
   - 저장 버튼 비활성화
   - (선택) 이전 페이지로 이동
5. 실패 시:
   - 에러 메시지 표시
   - 저장 버튼 다시 활성화

### 취소
1. "취소" 버튼 클릭
2. 변경사항이 있으면 확인 모달 (선택)
3. 폼 초기화 또는 이전 페이지로 이동

### 페이지 이탈 방지
- 변경사항이 있을 때 (`isDirty = true`)
- 페이지 이탈 시 경고 메시지
- "저장하지 않은 변경사항이 있습니다. 페이지를 나가시겠습니까?"

## 디자인 가이드

### 폼 레이아웃
- 명확한 Label
- Input 필드 간격 충분히
- 에러 메시지 빨간색, Input 아래 표시
- 힌트 텍스트 회색, 작은 글씨

### 이메일 필드 (읽기 전용)
- 배경색: 연한 회색 (#F5F5F5)
- 테두리: 점선 또는 연한 색
- 아이콘: 잠금 아이콘 (선택)
- 힌트: "이메일은 변경할 수 없습니다"

### 버튼
- 저장: Primary 색상 (파란색)
- 취소: Secondary 색상 (회색)
- 비활성화: 투명도 50%

### 성공 메시지
- Toast 형태 (화면 상단 또는 하단)
- 초록색 배경
- 자동 사라짐 (3초)

### 에러 메시지
- Input 아래 빨간색 텍스트
- 작은 글씨 (12-14px)
- 아이콘 (느낌표) 선택 사항

## 반응형

### 모바일 (< 768px)
- 1열 세로 배치
- Input 필드 전체 너비
- 버튼 하단 고정, 전체 너비
- 버튼 세로 배치 (저장 위, 취소 아래)

### 태블릿 (768px ~ 1024px)
- 1열, 최대 600px 너비 (중앙 정렬)
- 버튼 하단, 가로 배치 (오른쪽 정렬)

### 데스크톱 (> 1024px)
- 1열, 최대 600px 너비 (중앙 정렬)
- 버튼 하단, 가로 배치 (오른쪽 정렬)
- 적절한 여백

## 검증 규칙

### 클라이언트 사이드 검증

**이름**:
- 필수: true
- 최소 길이: 2자
- 최대 길이: 50자
- 정규식: `/^[가-힣a-zA-Z\s]{2,50}$/`

**전화번호**:
- 필수: false
- 형식: 000-0000-0000 또는 00-0000-0000
- 정규식: `/^01[0-9]-\d{3,4}-\d{4}$/`

**주소**:
- 필수: false
- 최대 길이: 200자

### 서버 사이드 검증

- API에서 재검증
- 동일한 규칙 적용
- 검증 실패 시 400 에러 반환

## 접근성

- Label과 Input 연결 (`htmlFor`, `id`)
- 에러 메시지 `aria-describedby` 연결
- 키보드 네비게이션 지원 (Tab, Enter)
- 포커스 스타일 명확히
- 에러 발생 시 첫 번째 에러 필드로 포커스 이동

## 보안

- 본인만 수정 가능 (서버 검증)
- CSRF 토큰 (Next.js 자동 처리)
- XSS 방지 (입력값 sanitize)
- SQL Injection 방지 (Supabase 자동 처리)

## 성능

- 초기 로딩 최적화
- debounce 검증 (실시간 검증 시)
- API 요청 최소화

## API 연동

- 프로필 조회: `GET /api/profiles/me`
- 프로필 수정: `PATCH /api/profiles/me`

**Request 예시**:
```json
{
  "name": "홍길동",
  "phone": "010-1234-5678",
  "address": "서울시 강남구 테헤란로 123"
}
```

**Response 예시** (성공):
```json
{
  "status": "success",
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "홍길동",
    "phone": "010-1234-5678",
    "address": "서울시 강남구 테헤란로 123",
    "updated_at": "2025-01-01T12:00:00Z"
  },
  "message": "프로필이 업데이트되었습니다."
}
```

**Response 예시** (검증 에러):
```json
{
  "status": "error",
  "message": "입력값이 올바르지 않습니다.",
  "errorCode": "VALIDATION_ERROR",
  "errors": {
    "name": "이름은 2자 이상이어야 합니다.",
    "phone": "올바른 전화번호 형식을 입력해주세요."
  }
}
```

## 1차 MVP 범위

### 포함
- ✅ 프로필 조회
- ✅ 기본 정보 수정 (name, phone, address)
- ✅ 클라이언트 검증
- ✅ 성공/에러 메시지

### 제외 (2차 확장)
- ⏸️ 프로필 이미지 업로드
- ⏸️ 카카오 주소 API 연동
- ⏸️ 비밀번호 변경
- ⏸️ 이메일 변경
- ⏸️ 회원 탈퇴
- ⏸️ 배송지 여러 개 관리

## 참고 문서

- Profiles API: `/specs/api/server/routes/profiles/index.md`
- 마이페이지 메인: `/specs/ui/mypage/index.md`
- Form Components: `/specs/ui/common/form.md`
- UI Theme: `/specs/ui/theme.md`

## 추가 고려사항

### OAuth 사용자
- Google OAuth로 가입한 사용자도 동일한 플로우
- 이름이 null일 수 있음 (Google에서 제공하지 않은 경우)
- 프로필 수정으로 추가 정보 입력 유도

### 마이그레이션
- 기존 사용자 프로필 데이터 확인
- null 값 처리 (Placeholder 또는 빈 값)

### 향후 확장
- 프로필 완성도 표시 (예: "50% 완료")
- 필수 정보 입력 유도
- 주문 생성 전 프로필 정보 확인 플로우
