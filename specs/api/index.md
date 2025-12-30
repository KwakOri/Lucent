# API – Overview & Standards

이 문서는 서비스 전반에서 API 설계, 응답 형식, 인증, 에러 처리, 네이밍 규칙, 확장 기능 등 **공통 정책과 흐름**을 정의한다.
본 문서는 프론트 React Query hook, Service Layer, Next.js API Route, Supabase DB 연동 흐름을 기반으로 작성되었다.

---

## 1. 데이터 흐름

프로젝트 전반의 데이터 흐름은 다음과 같다:

```
Frontend Component
       ↓
React Query Hook (useProducts)
       ↓
Client Services (ProductsAPI.getProducts) - fetch로 API 호출
       ↓
       --- HTTP 경계 ---
       ↓
Next.js API Route (인증, 권한 검증, 요청/응답 처리)
       ↓
Server Service (s) - 비즈니스 로직, DB 접근
       ↓
Supabase DB
```

### 1-1. 레이어별 역할

| 레이어                 | 위치                   | 역할                                   | 문서                                                                         |
| ---------------------- | ---------------------- | -------------------------------------- | ---------------------------------------------------------------------------- |
| **Frontend Component** | `/app`, `/components`  | UI 렌더링, 사용자 인터랙션             | -                                                                            |
| **React Query Hook**   | `/lib/client/hooks`    | 데이터 fetching 상태 관리, 캐싱        | [`/specs/api/client/hooks/index.md`](/specs/api/client/hooks/index.md)       |
| **Client Services**    | `/lib/client/services` | API Route 호출 (fetch), 타입 안전성    | [`/specs/api/client/services/index.md`](/specs/api/client/services/index.md) |
| **API Route**          | `/app/api`             | HTTP 처리, 인증/권한 검증, 에러 핸들링 | [`/specs/api/server/routes/index.md`](/specs/api/server/routes/index.md)     |
| **Server Service**     | `/lib/server/services` | 비즈니스 로직, DB 접근, 트랜잭션       | [`/specs/api/server/services/index.md`](/specs/api/server/services/index.md) |
| **Database**           | Supabase               | 데이터 저장소                          | -                                                                            |

### 1-2. 예시 코드

```tsx
// 1. Component
function ProductList() {
  const { data, isLoading } = useProducts(); // React Query Hook
  // ...
}

// 2. React Query Hook
export function useProducts() {
  return useQuery({
    queryKey: ["products"],
    queryFn: () => ProductsAPI.getProducts(), // Client Services
  });
}

// 3. Client Services
export const ProductsAPI = {
  async getProducts() {
    return apiClient.get("/api/products"); // fetch
  },
};

// 4. API Route
export async function GET(request: Request) {
  const products = await ProductService.getProducts(); // Server Service
  return NextResponse.json({ status: "success", data: products });
}

// 5. Server Service
export class ProductService {
  static async getProducts() {
    const supabase = createServerClient(); // DB 접근
    const { data } = await supabase.from("products").select("*");
    return data;
  }
}
```

---

## 2. 타입 정의 및 스키마 참조

모든 데이터베이스 관련 로직 작성 시 **반드시** `/types/database.ts` 파일을 참조해야 한다.

### 2-1. Database 타입 파일

**위치**: `/types/database.ts`

이 파일은 Supabase CLI를 통해 자동 생성되며, 데이터베이스 스키마의 TypeScript 타입 정의를 포함한다.

### 2-2. 주요 타입

```ts
import {
  Database,
  Tables,
  TablesInsert,
  TablesUpdate,
  Enums,
} from "@/types/database";

// 테이블 Row 타입 (조회 시)
type Product = Tables<"products">;
type Order = Tables<"orders">;
type Artist = Tables<"artists">;

// Insert 타입 (생성 시)
type ProductInsert = TablesInsert<"products">;
type OrderInsert = TablesInsert<"orders">;

// Update 타입 (수정 시)
type ProductUpdate = TablesUpdate<"products">;
type OrderUpdate = TablesUpdate<"orders">;

// Enum 타입
type OrderStatus = Enums<"order_status">; // 'PENDING' | 'PAID' | 'MAKING' | 'SHIPPING' | 'DONE'
type ProductType = Enums<"product_type">; // 'VOICE_PACK' | 'PHYSICAL_GOODS'
type VerificationPurpose = Enums<"verification_purpose">; // 'signup' | 'reset_password' | 'change_email'
```

### 2-3. 사용 규칙

**필수 사항**:

1. **API Route 작성 시**: `Tables<'테이블명'>` 타입 사용
2. **Service Layer 작성 시**: database.ts에서 타입 import
3. **데이터 삽입/수정 시**: `TablesInsert`, `TablesUpdate` 타입 사용
4. **Enum 값 사용 시**: `Enums<'enum명'>` 타입 또는 `Constants.public.Enums` 사용

**예시 - API Route**:

```ts
// app/api/products/route.ts
import { Tables, TablesInsert } from "@/types/database";

type Product = Tables<"products">;
type ProductInsert = TablesInsert<"products">;

export async function POST(request: Request) {
  const body: ProductInsert = await request.json();
  // ...
}
```

**예시 - Service Layer**:

```ts
// lib/services/product.service.ts
import { Tables, TablesInsert, Enums } from "@/types/database";

type Product = Tables<"products">;
type ProductType = Enums<"product_type">;

export class ProductService {
  static async getProducts(type?: ProductType): Promise<Product[]> {
    // ...
  }
}
```

### 2-4. 스키마 업데이트 프로세스

1. **Migration 작성**: `/supabase/migrations/` 폴더에 새 마이그레이션 추가
2. **타입 재생성**: `npm run db:types` 명령어로 database.ts 재생성
3. **코드 수정**: 타입 변경에 따른 코드 수정 (TypeScript가 에러 표시)
4. **스펙 문서 업데이트**: 관련 스펙 문서에 변경사항 반영

### 2-5. 주의사항

- **절대 수동으로 database.ts 파일 수정 금지**
- **항상 마이그레이션 파일 기반으로 타입 재생성**
- **RLS 정책 없음**: 모든 권한 검증은 API Route에서 수행
- **서버 전용**: 클라이언트에서 Supabase 직접 접근 금지

📄 데이터베이스 스키마: `/supabase/migrations/20250101000000_initial_schema.sql`

---

## 3. API 응답 형식

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

## 4. 인증 방식

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

## 5. 네이밍 규칙

| 레이어           | 권장 네이밍 예시                |
| ---------------- | ------------------------------- |
| API Route        | `/api/users`, `/api/users/:id`  |
| Service Layer    | `UserService.getUsers()`        |
| React Query Hook | `useUsers()`, `useCreateUser()` |

- API Route: REST 스타일, 소문자, 복수형 기본
- Service: CamelCase, 동사 중심
- React Query Hook: `use` + 리소스명 + 동사, queryKey는 서비스/리소스명 기반 통일

---

## 6. 에러 핸들링 전략

### 6-1. 에러 구분

| 구분            | 정의                                       | 처리 방법                                            |
| --------------- | ------------------------------------------ | ---------------------------------------------------- |
| 클라이언트 에러 | 사용자의 잘못된 입력, 검증 실패            | Form Field 단위 표시 (Inline Error), Toast 최소 사용 |
| 서버 에러       | Supabase, Cloudflare 등 서버/네트워크 문제 | Toast, 페이지 상단 Form Error, 친절한 메시지         |

### 6-2. 서버 에러 예시

```ts
const ERROR_MESSAGES = {
  SERVER_DOWN: "서버 접속이 원활하지 않습니다. 잠시 후 다시 시도해주세요.",
  TIMEOUT: "서버 응답이 지연되고 있습니다. 잠시 후 재시도해주세요.",
};
```

- React Query 적용

  - 클라이언트 에러: hook 내부 validation 처리
  - 서버 에러: `useQuery` / `useMutation`에서 `isError` + `error` 처리

### 6-3. 장점

- 사용자 경험 개선 → 서버 문제인지 입력 오류인지 명확히 전달
- UI 일관성 유지 → 서버 에러는 Toast, 클라이언트 에러는 필드 단위
- 유지보수 용이 → errorCode 기준 메시지 중앙 관리

---

## 7. 이미지 관리

Lucent Management는 **Cloudflare R2 - images 테이블 - 다른 테이블** 3계층 구조로 이미지를 관리한다.

### 7-1. 구조 개요

```
Cloudflare R2 (실제 파일 저장)
       ↓
images 테이블 (메타데이터 + URL 관리)
       ↓
다른 테이블 (projects, artists, products 등)
```

### 7-2. 주요 특징

- **중앙 집중식 관리**: 모든 이미지는 `images` 테이블에서 관리
- **재사용 가능**: 하나의 이미지를 여러 곳에서 참조 가능
- **확장성**: CDN, 썸네일, 리사이징 지원 (2차 확장)
- **추적성**: 업로드 사용자, 용도, 생성일 기록
- **안전성**: 이미지 삭제 시 연관 테이블은 SET NULL 처리

### 7-3. 이미지 참조 방식

| 테이블           | 이미지 컬럼        | 관계 | 설명                             |
| ---------------- | ------------------ | ---- | -------------------------------- |
| `projects`       | `cover_image_id`   | N:1  | 프로젝트 커버 이미지             |
| `artists`        | `profile_image_id` | N:1  | 아티스트 프로필 이미지           |
| `products`       | `main_image_id`    | N:1  | 상품 메인 이미지                 |
| `product_images` | `image_id`         | N:M  | 상품 갤러리 이미지 (중간 테이블) |

### 7-4. 이미지 업로드 플로우

```
[관리자] 이미지 선택
    ↓
[API] POST /api/images/upload
    ↓
[R2] 파일 저장
    ↓
[DB] images 테이블에 메타데이터 저장
    ↓
[응답] { imageId, publicUrl }
    ↓
[관리자] 상품/프로젝트 생성 시 imageId 사용
```

### 7-5. 파일 검증 규칙 (1차 MVP)

- 형식: `image/jpeg`, `image/png`, `image/webp`
- 크기: 최대 5MB
- 해상도: 최대 4000x4000px (권장: 1920x1080px)
- 업로드 권한: 관리자만

📄 상세: `specs/api/images.md`

---

## 8. API 모듈별 개요

### 8-1. 인증 (Auth)

사용자 인증 및 세션 관리

- 이메일/비밀번호 회원가입
- 이메일 인증 (Nodemailer)
- 로그인/로그아웃
- 세션 관리 (JWT)
- 비밀번호 재설정

📄 상세: `specs/api/auth/`

### 8-2. 프로필 (Profiles)

사용자 프로필 정보 관리

- 프로필 조회/수정
- 이름, 연락처, 주소 관리
- 주문 시 배송 정보 기본값 제공

📄 상세: `specs/api/profiles/`

### 8-3. 이미지 (Images)

Cloudflare R2 기반 이미지 중앙 관리

- 이미지 업로드 (관리자)
- 이미지 메타데이터 관리
- CDN 연동 (2차 확장)

📄 상세: `specs/api/images.md`

### 8-4. 프로젝트 (Projects)

레이블 프로젝트 정보 제공

- 프로젝트 목록/상세 조회
- 커버 이미지 관리
- 관련 아티스트 목록

📄 상세: `specs/api/projects/`

### 8-5. 아티스트 (Artists)

버츄얼 아티스트 정보 제공

- 아티스트 목록/상세 조회
- 프로필 이미지 관리
- 굿즈샵 테마 설정
- 프로젝트 소속
- 아티스트별 상품 조회

📄 상세: `specs/api/artists/`

### 8-6. 상품 (Products)

굿즈 판매 및 관리

- 상품 목록/상세 조회
- 보이스팩 샘플 청취
- 이미지 갤러리 (메인 + 추가 이미지)
- 재고 관리

📄 상세: `specs/api/products/`

### 8-7. 주문 (Orders)

주문 생성 및 관리

- 주문 생성 (계좌이체)
- 내 주문 목록/상세 조회
- 디지털 상품 다운로드
- 주문 상태 관리

📄 상세: `specs/api/orders/`

---

## 9. API 확장 기능

### 9-1. Pagination (페이지네이션)

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

### 9-2. Sorting (정렬)

- **쿼리 파라미터**

  - `sortBy`: 필드명
  - `order`: `asc` / `desc`

- **서버 처리**

  - Supabase `order` 옵션 사용

- **클라이언트 사용**

  - table header 클릭 시 queryKey 변경
  - React Query 자동 refetch

### 9-3. Filtering (필터링)

- **쿼리 파라미터**

  - `filter[field]`: 조건별 값
    예: `filter[status]=active&filter[category]=book`

- **서버 처리**

  - Supabase `eq`, `like`, `in` 등 필터 조건 적용

- **클라이언트 사용**

  - filter 객체를 queryKey 또는 service 인자로 전달
  - React Query의 `select` 옵션으로 데이터 변환 가능

### 9-4. 설계 권장 원칙

- Pagination / Sort / Filter 옵션은 **query string** 기반
- 모든 목록 API는 가능한 한 **옵션 일관성** 유지

  - 예: `/api/users?page=2&limit=20&sortBy=created_at&order=desc&filter[status]=active`

- UI에서 필요한 데이터 변환은 **Service Layer**에서 처리
- React Query hook은 최대한 **옵션을 param으로 받고 바로 호출** 가능하도록 설계

---

## 10. 로깅 및 모니터링 (필수)

**모든 API 구현 시 중요 이벤트는 반드시 로그로 기록해야 한다.**

### 10-1. 로깅 원칙

- **목적**: 보안, 거래 추적, 고객 지원, 디버깅
- **대상**: 인증, 주문, 결제, 다운로드, 보안 위협
- **방법**: `LogService` 사용
- **위치**: API Route 또는 Service Layer

### 10-2. 로깅 대상 이벤트

#### 필수 로깅 (1차 MVP)

| 카테고리     | 이벤트 타입                             | 로깅 시점               |
| ------------ | --------------------------------------- | ----------------------- |
| **인증**     | `user.signup.success`                   | 회원가입 성공           |
|              | `user.signup.failed`                    | 회원가입 실패           |
|              | `user.login.success`                    | 로그인 성공             |
|              | `user.login.failed`                     | 로그인 실패             |
|              | `user.logout`                           | 로그아웃                |
|              | `user.email_verification.sent`          | 이메일 인증 발송        |
|              | `user.email_verification.success`       | 이메일 인증 완료        |
|              | `user.password_reset.requested`         | 비밀번호 재설정 요청    |
| **주문**     | `order.created`                         | 주문 생성               |
|              | `order.status.changed`                  | 주문 상태 변경          |
|              | `order.cancelled`                       | 주문 취소               |
|              | `order.refund.requested`                | 환불 요청               |
| **다운로드** | `digital_product.download`              | 디지털 상품 다운로드    |
|              | `digital_product.download.unauthorized` | 권한 없는 다운로드 시도 |
| **보안**     | `security.unauthorized.access`          | 권한 없는 API 접근      |
|              | `security.rate_limit.exceeded`          | API 호출 제한 초과      |
|              | `security.suspicious.activity`          | 의심스러운 활동 감지    |

### 10-3. 구현 방법

**기본 사용**:

```typescript
import { LogService } from "@/lib/server/services/log.service";

// API Route에서 사용
export async function POST(request: NextRequest) {
  try {
    const user = await AuthService.login(email, password);

    // ✅ 성공 시 로그 기록
    await LogService.logLoginSuccess(
      user.id,
      request.ip,
      request.headers.get("user-agent") || undefined
    );

    return successResponse(user);
  } catch (error) {
    // ✅ 실패 시 로그 기록
    await LogService.logLoginFailed(email, error.message, request.ip);

    return handleApiError(error);
  }
}
```

**편의 메서드**:

```typescript
// 인증
LogService.logLoginSuccess(userId, ip, userAgent);
LogService.logLoginFailed(email, reason, ip);
LogService.logSignupSuccess(userId, email, ip);

// 주문
LogService.logOrderCreated(orderId, userId, amount, metadata);
LogService.logOrderStatusChanged(orderId, userId, adminId, before, after);

// 다운로드
LogService.logDigitalProductDownload(productId, orderId, userId, ip);
LogService.logUnauthorizedDownload(productId, userId, ip);

// 보안
LogService.logUnauthorizedAccess(userId, path, ip);
LogService.logSuspiciousActivity(userId, description, ip, metadata);
```

### 10-4. 중요 사항

**절대 원칙**:

1. ❌ **로그 기록 실패로 서비스가 중단되어서는 안 됨**

   - `LogService.log()`는 내부적으로 에러를 처리함
   - 로그 실패 시 콘솔 출력만 하고 계속 진행

2. ❌ **민감 정보를 로그에 포함하지 말 것**

   - 비밀번호, 토큰 등 절대 기록 금지
   - 이메일, IP 주소는 기록 가능

3. ✅ **성공과 실패 모두 기록**
   - 성공: `severity: 'info'`
   - 실패/경고: `severity: 'warning'` 또는 `'error'`

**성능 최적화**:

```typescript
// Fire and Forget (await 생략 가능)
LogService.logLoginSuccess(userId, request.ip);
return NextResponse.json({ status: "success" });
```

### 10-5. 예시 코드 참조

상세한 구현 예시는 다음 문서 참조:

- 📄 인증 API 로깅: `/examples/logging/auth-api-example.ts`
- 📄 주문 API 로깅: `/examples/logging/order-api-example.ts`
- 📄 다운로드 API 로깅: `/examples/logging/download-api-example.ts`
- 📄 보안 로깅: `/examples/logging/security-example.ts`
- 📄 통합 가이드: `/examples/logging/README.md`

### 10-6. 로그 조회 (관리자)

로그 조회 API는 이미 구현되어 있음:

- `GET /api/logs` - 로그 목록 조회 (필터링, 페이지네이션)
- `GET /api/logs/:id` - 로그 단일 조회
- `GET /api/logs/stats` - 로그 통계

📄 상세: `/specs/api/server/routes/logs/index.md`

---

## 11. 요약 체크리스트

새로운 API 구현 시 다음을 확인하십시오:

- [ ] **스펙 문서** 작성 또는 확인 (`/specs/api/server/routes/`, `/specs/api/server/services/`)
- [ ] **3-Layer 아키텍처** 준수 (API Route → Service Layer → DB)
- [ ] **타입 정의** 사용 (`/types/database.ts` 참조)
- [ ] **통일된 응답 형식** 적용 (`{ status, data, message, errorCode }`)
- [ ] **에러 핸들링** 구현 (`handleApiError` 사용)
- [ ] **인증/권한 검증** (필요시)
- [ ] **로깅 적용** (`LogService` 사용, 성공/실패 모두 기록) ⭐ **필수**
- [ ] **예시 코드** 참조 (`/examples/logging/`)

**기억하십시오: 로깅은 선택이 아닌 필수입니다!**
