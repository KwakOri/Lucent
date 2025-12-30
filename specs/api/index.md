# API – Overview & Standards

이 문서는 서비스 전반에서 API 설계, 응답 형식, 인증, 에러 처리, 네이밍 규칙, 확장 기능 등 **공통 정책과 흐름**을 정의한다.
본 문서는 프론트 React Query hook, Service Layer, Next.js API Route, Supabase DB 연동 흐름을 기반으로 작성되었다.

---

## 1. 데이터 흐름

프로젝트 전반의 데이터 흐름은 다음과 같다:

```
Client (React Query hook)
       ↓
Service Layer (재가공, 호출)
       ↓
Next.js API Route
       ↓
Supabase DB (Server-side 로직)
```

- **클라이언트**: React Query hook에서 데이터를 요청/전송
- **Service Layer**: API 호출 추상화, 필요 시 데이터 가공
- **API Route**: Supabase DB 로직 실행, 서버 전용 처리
- **DB**: 모든 DB 관련 로직은 서버 측에서만 실행

---

## 2. API 응답 형식

- **통일된 기본 구조 (옵션 C)**

```json
{
  "status": "success" | "error",
  "data": { ... },
  "message": "사용자 친화적 안내 메시지",
  "errorCode": "코드명 (optional)"
}
```

- **클라이언트 사용**

  - 기본적으로 `data.data` 접근
  - 용도별 별칭 사용 가능:

    ```ts
    const { data: userData } = useQuery("user", fetchUser);
    ```

- **장점**

  - 서버 구조 통일 → 유지보수 용이
  - 확장성 높음
  - 데이터 alias를 통해 명확히 사용 가능

- **주의 사항**

  - 항상 `data.data` 구조 기억
  - 여러 hook에서 동일 API 호출 시 alias 권장

---

## 3. 인증 방식

- **기본 인증**: Supabase Auth JWT

  - JWT를 HTTP-only cookie에 저장 → XSS 안전
  - 서버 API Route에서 JWT 확인 후 DB 접근 권한 제어

- **예외 – 이메일 인증**

  - Nodemailer 자체 처리 (Supabase 이메일 제한 문제 회피)
  - 회원가입/비밀번호 초기화 등 이메일 발송 시 사용
  - 이메일 인증 완료 후에만 Supabase 계정 활성화

- **주의 사항**

  - Nodemailer 토큰 만료 시간 관리 (예: 10분)
  - 재발송 버튼 구현 필요
  - 회원가입/비밀번호 초기화 로직과 연계

---

## 4. 네이밍 규칙

| 레이어           | 권장 네이밍 예시                |
| ---------------- | ------------------------------- |
| API Route        | `/api/users`, `/api/users/:id`  |
| Service Layer    | `UserService.getUsers()`        |
| React Query Hook | `useUsers()`, `useCreateUser()` |

- API Route: REST 스타일, 소문자, 복수형 기본
- Service: CamelCase, 동사 중심
- React Query Hook: `use` + 리소스명 + 동사, queryKey는 서비스/리소스명 기반 통일

---

## 5. 에러 핸들링 전략

### 5-1. 에러 구분

| 구분            | 정의                                       | 처리 방법                                            |
| --------------- | ------------------------------------------ | ---------------------------------------------------- |
| 클라이언트 에러 | 사용자의 잘못된 입력, 검증 실패            | Form Field 단위 표시 (Inline Error), Toast 최소 사용 |
| 서버 에러       | Supabase, Cloudflare 등 서버/네트워크 문제 | Toast, 페이지 상단 Form Error, 친절한 메시지         |

### 5-2. 서버 에러 예시

```ts
const ERROR_MESSAGES = {
  SERVER_DOWN: "서버 접속이 원활하지 않습니다. 잠시 후 다시 시도해주세요.",
  TIMEOUT: "서버 응답이 지연되고 있습니다. 잠시 후 재시도해주세요.",
};
```

- React Query 적용

  - 클라이언트 에러: hook 내부 validation 처리
  - 서버 에러: `useQuery` / `useMutation`에서 `isError` + `error` 처리

### 5-3. 장점

- 사용자 경험 개선 → 서버 문제인지 입력 오류인지 명확히 전달
- UI 일관성 유지 → 서버 에러는 Toast, 클라이언트 에러는 필드 단위
- 유지보수 용이 → errorCode 기준 메시지 중앙 관리

---

## 6. API 확장 기능

### 6-1. Pagination (페이지네이션)

- 서버 API에서 기본 제공
- **쿼리 파라미터**

  - `page` (현재 페이지)
  - `limit` (페이지당 항목 수)

- **응답 구조**

```json
{
  "status": "success",
  "data": [...],
  "pagination": {
    "total": 120,
    "page": 2,
    "limit": 20,
    "totalPages": 6
  }
}
```

- React Query 사용 시

  - `page`와 `limit`을 queryKey에 포함
  - `keepPreviousData: true`로 페이지 전환 시 UI 유지

### 6-2. Sorting (정렬)

- **쿼리 파라미터**

  - `sortBy`: 필드명
  - `order`: `asc` / `desc`

- **서버 처리**

  - Supabase `order` 옵션 사용

- **클라이언트 사용**

  - table header 클릭 시 queryKey 변경
  - React Query 자동 refetch

### 6-3. Filtering (필터링)

- **쿼리 파라미터**

  - `filter[field]`: 조건별 값
    예: `filter[status]=active&filter[category]=book`

- **서버 처리**

  - Supabase `eq`, `like`, `in` 등 필터 조건 적용

- **클라이언트 사용**

  - filter 객체를 queryKey 또는 service 인자로 전달
  - React Query의 `select` 옵션으로 데이터 변환 가능

### 6-4. 설계 권장 원칙

- Pagination / Sort / Filter 옵션은 **query string** 기반
- 모든 목록 API는 가능한 한 **옵션 일관성** 유지

  - 예: `/api/users?page=2&limit=20&sortBy=created_at&order=desc&filter[status]=active`

- UI에서 필요한 데이터 변환은 **Service Layer**에서 처리
- React Query hook은 최대한 **옵션을 param으로 받고 바로 호출** 가능하도록 설계
