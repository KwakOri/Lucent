# API 테스트 가이드 (Postman)

이 문서는 **npm run dev**로 개발 서버를 실행한 후, Postman이나 다른 API 클라이언트로 실제 API를 테스트하기 위한 가이드입니다.

---

## 📋 목차

1. [서버 실행](#1-서버-실행)
2. [기본 설정](#2-기본-설정)
3. [인증 API](#3-인증-api-auth)
4. [상품 API](#4-상품-api-products)
5. [주문 API](#5-주문-api-orders)
6. [프로젝트 API](#6-프로젝트-api-projects)
7. [아티스트 API](#7-아티스트-api-artists)
8. [프로필 API](#8-프로필-api-profiles)
9. [로그 API](#9-로그-api-logs)
10. [공통 에러 응답](#10-공통-에러-응답)

---

## 1. 서버 실행

### 1.1 환경변수 설정

`.env.local` 파일에 필요한 환경변수가 설정되어 있는지 확인하세요:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# SMTP (선택사항 - 이메일 발송 테스트 시)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM="Lucent Management <your-email@gmail.com>"

# Admin
ADMIN_EMAILS=admin@example.com
```

### 1.2 개발 서버 실행

```bash
npm run dev
```

서버가 실행되면 다음 주소에서 API에 접근할 수 있습니다:

```
http://localhost:3000
```

---

## 2. 기본 설정

### 2.1 Base URL

```
http://localhost:3000
```

### 2.2 공통 Headers

모든 요청에 다음 헤더를 포함하세요:

```
Content-Type: application/json
```

### 2.3 인증이 필요한 API

로그인 후 받은 `accessToken`을 다음과 같이 헤더에 포함하세요:

```
Authorization: Bearer {accessToken}
```

또는 Supabase는 자동으로 HTTP-only 쿠키에 세션을 저장하므로, 같은 클라이언트에서 로그인 후 요청하면 자동으로 인증됩니다.

### 2.4 응답 형식

모든 API는 다음 형식으로 응답합니다:

**성공 시:**
```json
{
  "status": "success",
  "data": { ... }
}
```

**에러 시:**
```json
{
  "status": "error",
  "message": "에러 메시지",
  "errorCode": "ERROR_CODE"
}
```

---

## 3. 인증 API (Auth)

### 3.1 회원가입

**Endpoint:** `POST /api/auth/signup`

**인증:** 불필요

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "홍길동"
}
```

**Response (201 Created):**
```json
{
  "status": "success",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "홍길동"
    },
    "session": {
      "accessToken": "eyJhbGc...",
      "expiresAt": 1234567890
    }
  }
}
```

**Postman 설정:**
- Method: `POST`
- URL: `http://localhost:3000/api/auth/signup`
- Headers: `Content-Type: application/json`
- Body (raw JSON):
  ```json
  {
    "email": "test@example.com",
    "password": "test1234",
    "name": "테스트 유저"
  }
  ```

---

### 3.2 로그인

**Endpoint:** `POST /api/auth/login`

**인증:** 불필요

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "홍길동"
    },
    "session": {
      "accessToken": "eyJhbGc...",
      "expiresAt": 1234567890
    }
  }
}
```

**Postman 설정:**
- Method: `POST`
- URL: `http://localhost:3000/api/auth/login`
- Headers: `Content-Type: application/json`
- Body (raw JSON):
  ```json
  {
    "email": "test@example.com",
    "password": "test1234"
  }
  ```

---

### 3.3 로그아웃

**Endpoint:** `POST /api/auth/logout`

**인증:** 필수

**Request Body:** 없음

**Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "message": "로그아웃되었습니다"
  }
}
```

**Postman 설정:**
- Method: `POST`
- URL: `http://localhost:3000/api/auth/logout`
- Headers:
  - `Content-Type: application/json`
  - `Authorization: Bearer {accessToken}` (로그인 시 받은 토큰)

---

### 3.4 세션 확인

**Endpoint:** `GET /api/auth/session`

**인증:** 필수

**Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "홍길동"
    },
    "session": {
      "accessToken": "eyJhbGc...",
      "expiresAt": 1234567890
    }
  }
}
```

**Postman 설정:**
- Method: `GET`
- URL: `http://localhost:3000/api/auth/session`
- Headers: `Authorization: Bearer {accessToken}`

---

### 3.5 이메일 인증 요청

**Endpoint:** `POST /api/auth/send-verification`

**인증:** 불필요

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "message": "인증 이메일이 발송되었습니다",
    "email": "user@example.com"
  }
}
```

**Postman 설정:**
- Method: `POST`
- URL: `http://localhost:3000/api/auth/send-verification`
- Headers: `Content-Type: application/json`
- Body (raw JSON):
  ```json
  {
    "email": "test@example.com"
  }
  ```

---

### 3.6 이메일 인증 확인

**Endpoint:** `GET /api/auth/verify-email?token={token}`

**인증:** 불필요

**Query Parameters:**
- `token`: 이메일로 받은 인증 토큰

**Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "message": "이메일 인증이 완료되었습니다",
    "email": "user@example.com"
  }
}
```

**Postman 설정:**
- Method: `GET`
- URL: `http://localhost:3000/api/auth/verify-email?token=ABC123`

---

### 3.7 비밀번호 재설정 요청

**Endpoint:** `POST /api/auth/reset-password`

**인증:** 불필요

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "message": "비밀번호 재설정 이메일이 발송되었습니다",
    "email": "user@example.com"
  }
}
```

**Postman 설정:**
- Method: `POST`
- URL: `http://localhost:3000/api/auth/reset-password`
- Headers: `Content-Type: application/json`
- Body (raw JSON):
  ```json
  {
    "email": "test@example.com"
  }
  ```

---

### 3.8 비밀번호 변경 확인

**Endpoint:** `POST /api/auth/update-password`

**인증:** 불필요

**Request Body:**
```json
{
  "token": "reset-token-from-email",
  "newPassword": "newpassword123"
}
```

**Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "message": "비밀번호가 변경되었습니다"
  }
}
```

**Postman 설정:**
- Method: `POST`
- URL: `http://localhost:3000/api/auth/update-password`
- Headers: `Content-Type: application/json`
- Body (raw JSON):
  ```json
  {
    "token": "reset-token-xyz",
    "newPassword": "newpass1234"
  }
  ```

---

## 4. 상품 API (Products)

### 4.1 상품 목록 조회

**Endpoint:** `GET /api/products`

**인증:** 불필요

**Query Parameters:**
- `page`: 페이지 번호 (기본: 1)
- `limit`: 페이지당 항목 수 (기본: 12, 최대: 50)
- `sortBy`: 정렬 기준 (`created_at`, `price`, `name`, 기본: `created_at`)
- `order`: 정렬 순서 (`asc`, `desc`, 기본: `desc`)
- `filter[type]`: 상품 타입 (`VOICE_PACK`, `PHYSICAL_GOODS`)
- `filter[artist]`: 아티스트 slug (예: `miruru`)
- `filter[is_active]`: 활성화 여부 (기본: `true`)

**Response (200 OK):**
```json
{
  "status": "success",
  "data": [
    {
      "id": "uuid",
      "name": "미루루 보이스팩 Vol.1",
      "slug": "voicepack-vol1",
      "type": "VOICE_PACK",
      "price": 10000,
      "main_image": {
        "public_url": "https://r2.example.com/...",
        "thumbnail_url": "https://r2.example.com/.../thumb.png"
      },
      "stock": null,
      "is_active": true,
      "artist": {
        "name": "미루루",
        "slug": "miruru"
      }
    }
  ],
  "pagination": {
    "total": 24,
    "page": 1,
    "limit": 12,
    "totalPages": 2
  }
}
```

**Postman 설정:**
- Method: `GET`
- URL: `http://localhost:3000/api/products?page=1&limit=12&filter[type]=VOICE_PACK`

---

### 4.2 상품 상세 조회 (ID)

**Endpoint:** `GET /api/products/:id`

**인증:** 불필요

**Path Parameters:**
- `id`: 상품 ID (UUID)

**Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "id": "uuid",
    "name": "미루루 보이스팩 Vol.1",
    "slug": "voicepack-vol1",
    "type": "VOICE_PACK",
    "price": 10000,
    "description": "미루루의 다정한 목소리로 채워진 보이스팩...",
    "main_image": {
      "public_url": "https://r2.example.com/...",
      "alt_text": "미루루 보이스팩 메인 이미지"
    },
    "gallery_images": [
      {
        "public_url": "https://r2.example.com/...",
        "display_order": 0
      }
    ],
    "sample_audio_url": "https://r2.example.com/.../sample.mp3",
    "stock": null,
    "is_active": true,
    "artist": {
      "id": "uuid",
      "name": "미루루",
      "slug": "miruru"
    },
    "created_at": "2025-01-01T00:00:00Z"
  }
}
```

**Postman 설정:**
- Method: `GET`
- URL: `http://localhost:3000/api/products/{product-id}`

---

### 4.3 상품 상세 조회 (Slug)

**Endpoint:** `GET /api/products/slug/:slug`

**인증:** 불필요

**Path Parameters:**
- `slug`: 상품 slug (예: `voicepack-vol1`)

**Response:** 상품 상세 조회 (ID)와 동일

**Postman 설정:**
- Method: `GET`
- URL: `http://localhost:3000/api/products/slug/voicepack-vol1`

---

## 5. 주문 API (Orders)

### 5.1 주문 생성

**Endpoint:** `POST /api/orders`

**인증:** 필수

**Request Body:**
```json
{
  "items": [
    {
      "product_id": "uuid",
      "quantity": 1
    }
  ],
  "shipping": {
    "name": "홍길동",
    "phone": "010-1234-5678",
    "address": "서울시 강남구 테헤란로 123",
    "memo": "문 앞에 놓아주세요"
  }
}
```

**Response (201 Created):**
```json
{
  "status": "success",
  "data": {
    "id": "uuid",
    "order_number": "ORD-20250115-0001",
    "status": "PENDING",
    "total_price": 10000,
    "shipping_name": "홍길동",
    "shipping_phone": "010-1234-5678",
    "shipping_address": "서울시 강남구 테헤란로 123",
    "items": [
      {
        "product_name": "미루루 보이스팩 Vol.1",
        "product_type": "VOICE_PACK",
        "price_snapshot": 10000,
        "quantity": 1
      }
    ],
    "created_at": "2025-01-15T10:00:00Z",
    "payment_info": {
      "bank": "국민은행",
      "account_number": "123-456-789012",
      "account_holder": "Lucent Management",
      "amount": 10000,
      "deadline": "2025-01-17T23:59:59Z"
    }
  },
  "message": "주문이 생성되었습니다. 계좌로 입금해주세요."
}
```

**Postman 설정:**
- Method: `POST`
- URL: `http://localhost:3000/api/orders`
- Headers:
  - `Content-Type: application/json`
  - `Authorization: Bearer {accessToken}`
- Body (raw JSON):
  ```json
  {
    "items": [
      {
        "product_id": "product-uuid-here",
        "quantity": 1
      }
    ],
    "shipping": {
      "name": "테스트 유저",
      "phone": "010-1234-5678",
      "address": "서울시 강남구 테헤란로 123",
      "memo": "배송 전 연락주세요"
    }
  }
  ```

---

### 5.2 내 주문 목록

**Endpoint:** `GET /api/orders`

**인증:** 필수

**Query Parameters:**
- `page`: 페이지 번호 (기본: 1)
- `limit`: 페이지당 항목 수 (기본: 10)
- `status`: 주문 상태 필터 (선택) - `PENDING`, `PAID`, `MAKING`, `SHIPPING`, `DONE`

**Response (200 OK):**
```json
{
  "status": "success",
  "data": [
    {
      "id": "uuid",
      "order_number": "ORD-20250115-0001",
      "status": "PAID",
      "total_price": 10000,
      "items": [
        {
          "product_name": "미루루 보이스팩 Vol.1",
          "product_type": "VOICE_PACK",
          "price_snapshot": 10000,
          "quantity": 1,
          "product": {
            "name": "미루루 보이스팩 Vol.1",
            "main_image": {
              "thumbnail_url": "https://..."
            }
          }
        }
      ],
      "created_at": "2025-01-15T10:00:00Z"
    }
  ],
  "pagination": {
    "total": 5,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
}
```

**Postman 설정:**
- Method: `GET`
- URL: `http://localhost:3000/api/orders?page=1&limit=10&status=PAID`
- Headers: `Authorization: Bearer {accessToken}`

---

### 5.3 주문 상세

**Endpoint:** `GET /api/orders/:id`

**인증:** 필수 (본인 주문만)

**Path Parameters:**
- `id`: 주문 ID (UUID)

**Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "id": "uuid",
    "order_number": "ORD-20250115-0001",
    "status": "PAID",
    "total_price": 10000,
    "shipping_name": "홍길동",
    "shipping_phone": "010-1234-5678",
    "shipping_address": "서울시 강남구 테헤란로 123",
    "shipping_memo": "문 앞에 놓아주세요",
    "orderer": {
      "name": "홍길동",
      "email": "user@example.com",
      "phone": "010-1234-5678"
    },
    "items": [
      {
        "id": "uuid",
        "product_name": "미루루 보이스팩 Vol.1",
        "product_type": "VOICE_PACK",
        "price_snapshot": 10000,
        "quantity": 1,
        "download_available": true,
        "download_count": 3,
        "product": {
          "id": "uuid",
          "name": "미루루 보이스팩 Vol.1",
          "slug": "voicepack-vol1"
        }
      }
    ],
    "created_at": "2025-01-15T10:00:00Z",
    "updated_at": "2025-01-15T12:00:00Z"
  }
}
```

**Postman 설정:**
- Method: `GET`
- URL: `http://localhost:3000/api/orders/{order-id}`
- Headers: `Authorization: Bearer {accessToken}`

---

## 6. 프로젝트 API (Projects)

### 6.1 프로젝트 목록

**Endpoint:** `GET /api/projects`

**인증:** 불필요

**Query Parameters:**
- `page`: 페이지 번호 (기본: 1)
- `limit`: 페이지당 항목 수 (기본: 12)
- `sortBy`: 정렬 기준 (`order_index`, `created_at`, `name`, 기본: `order_index`)
- `order`: 정렬 순서 (`asc`, `desc`, 기본: `asc`)
- `filter[is_active]`: 활성화 여부 (기본: `true`)
- `filter[artist]`: 아티스트 slug

**Response (200 OK):**
```json
{
  "status": "success",
  "data": [
    {
      "id": "uuid",
      "name": "0th Project",
      "slug": "0th",
      "description": "Lucent의 첫 번째 프로젝트",
      "cover_image": {
        "public_url": "https://...",
        "alt_text": "0th 프로젝트 커버"
      },
      "order_index": 0,
      "is_active": true,
      "created_at": "2025-01-01T00:00:00Z",
      "artists": [
        {
          "id": "uuid",
          "name": "미루루",
          "slug": "miruru",
          "profile_image": {
            "public_url": "https://..."
          }
        }
      ]
    }
  ],
  "pagination": {
    "total": 3,
    "page": 1,
    "limit": 12,
    "totalPages": 1
  }
}
```

**Postman 설정:**
- Method: `GET`
- URL: `http://localhost:3000/api/projects?page=1&limit=12`

---

### 6.2 프로젝트 상세

**Endpoint:** `GET /api/projects/:id`

**인증:** 불필요

**Path Parameters:**
- `id`: 프로젝트 ID (UUID) 또는 slug (예: `0th`)

**Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "id": "uuid",
    "name": "0th Project",
    "slug": "0th",
    "description": "Lucent의 첫 번째 프로젝트...",
    "cover_image": {
      "public_url": "https://...",
      "cdn_url": "https://...",
      "alt_text": "0th 프로젝트 커버",
      "width": 1920,
      "height": 1080
    },
    "order_index": 0,
    "is_active": true,
    "created_at": "2025-01-01T00:00:00Z",
    "artists": [
      {
        "id": "uuid",
        "name": "미루루",
        "slug": "miruru",
        "description": "다정한 목소리의 버츄얼 아티스트",
        "profile_image": {
          "public_url": "https://..."
        }
      }
    ]
  }
}
```

**Postman 설정:**
- Method: `GET`
- URL: `http://localhost:3000/api/projects/0th` 또는 `http://localhost:3000/api/projects/{project-id}`

---

## 7. 아티스트 API (Artists)

### 7.1 아티스트 목록

**Endpoint:** `GET /api/artists`

**인증:** 불필요

**Query Parameters:**
- `page`: 페이지 번호 (기본: 1)
- `limit`: 페이지당 항목 수 (기본: 12)
- `sortBy`: 정렬 기준 (`created_at`, `name`, 기본: `created_at`)
- `order`: 정렬 순서 (`asc`, `desc`, 기본: `desc`)
- `filter[is_active]`: 활성화 여부 (기본: `true`)

**Response (200 OK):**
```json
{
  "status": "success",
  "data": [
    {
      "id": "uuid",
      "name": "미루루",
      "slug": "miruru",
      "description": "다정한 목소리의 버츄얼 아티스트",
      "profile_image": {
        "public_url": "https://...",
        "thumbnail_url": "https://..."
      },
      "is_active": true,
      "created_at": "2025-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "total": 2,
    "page": 1,
    "limit": 12,
    "totalPages": 1
  }
}
```

**Postman 설정:**
- Method: `GET`
- URL: `http://localhost:3000/api/artists?page=1&limit=12`

---

### 7.2 아티스트 상세

**Endpoint:** `GET /api/artists/:slug`

**인증:** 불필요

**Path Parameters:**
- `slug`: 아티스트 slug (예: `miruru`)

**Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "id": "uuid",
    "name": "미루루",
    "slug": "miruru",
    "description": "다정한 목소리의 버츄얼 아티스트...",
    "profile_image": {
      "public_url": "https://...",
      "cdn_url": "https://...",
      "alt_text": "미루루 프로필"
    },
    "banner_image": {
      "public_url": "https://...",
      "alt_text": "미루루 배너"
    },
    "is_active": true,
    "created_at": "2025-01-01T00:00:00Z",
    "projects": [
      {
        "id": "uuid",
        "name": "0th Project",
        "slug": "0th"
      }
    ]
  }
}
```

**Postman 설정:**
- Method: `GET`
- URL: `http://localhost:3000/api/artists/miruru`

---

## 8. 프로필 API (Profiles)

### 8.1 내 프로필 조회

**Endpoint:** `GET /api/profiles`

**인증:** 필수

**Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "id": "uuid",
    "user_id": "uuid",
    "email": "user@example.com",
    "name": "홍길동",
    "phone": "010-1234-5678",
    "address": "서울시 강남구 테헤란로 123",
    "created_at": "2025-01-01T00:00:00Z",
    "updated_at": "2025-01-15T00:00:00Z"
  }
}
```

**Postman 설정:**
- Method: `GET`
- URL: `http://localhost:3000/api/profiles`
- Headers: `Authorization: Bearer {accessToken}`

---

### 8.2 프로필 수정

**Endpoint:** `PATCH /api/profiles/:id`

**인증:** 필수 (본인만)

**Path Parameters:**
- `id`: 프로필 ID (UUID)

**Request Body:**
```json
{
  "name": "홍길동",
  "phone": "010-9876-5432",
  "address": "서울시 서초구 강남대로 123"
}
```

**Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "id": "uuid",
    "user_id": "uuid",
    "email": "user@example.com",
    "name": "홍길동",
    "phone": "010-9876-5432",
    "address": "서울시 서초구 강남대로 123",
    "updated_at": "2025-01-15T10:30:00Z"
  }
}
```

**Postman 설정:**
- Method: `PATCH`
- URL: `http://localhost:3000/api/profiles/{profile-id}`
- Headers:
  - `Content-Type: application/json`
  - `Authorization: Bearer {accessToken}`
- Body (raw JSON):
  ```json
  {
    "name": "새로운 이름",
    "phone": "010-9999-8888"
  }
  ```

---

## 9. 로그 API (Logs)

### 9.1 로그 목록 (관리자 전용)

**Endpoint:** `GET /api/logs`

**인증:** 필수 (관리자)

**Query Parameters:**
- `page`: 페이지 번호 (기본: 1)
- `limit`: 페이지당 항목 수 (기본: 50, 최대: 100)
- `filter[category]`: 카테고리 필터 (`AUTH`, `ORDER`, `PRODUCT`, `ADMIN`)
- `filter[level]`: 로그 레벨 (`INFO`, `WARNING`, `ERROR`)
- `filter[user_id]`: 사용자 ID
- `filter[start_date]`: 시작 날짜 (ISO 8601)
- `filter[end_date]`: 종료 날짜 (ISO 8601)

**Response (200 OK):**
```json
{
  "status": "success",
  "data": [
    {
      "id": "uuid",
      "event_category": "AUTH",
      "event_name": "USER_LOGIN",
      "level": "INFO",
      "message": "사용자 로그인",
      "user_id": "uuid",
      "ip_address": "127.0.0.1",
      "user_agent": "Mozilla/5.0...",
      "metadata": {
        "email": "user@example.com"
      },
      "created_at": "2025-01-15T10:00:00Z"
    }
  ],
  "pagination": {
    "total": 150,
    "page": 1,
    "limit": 50,
    "totalPages": 3
  }
}
```

**Postman 설정:**
- Method: `GET`
- URL: `http://localhost:3000/api/logs?page=1&limit=50&filter[category]=AUTH`
- Headers: `Authorization: Bearer {accessToken}`

---

### 9.2 로그 상세 (관리자 전용)

**Endpoint:** `GET /api/logs/:id`

**인증:** 필수 (관리자)

**Path Parameters:**
- `id`: 로그 ID (UUID)

**Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "id": "uuid",
    "event_category": "AUTH",
    "event_name": "USER_LOGIN",
    "level": "INFO",
    "message": "사용자 로그인",
    "user_id": "uuid",
    "ip_address": "127.0.0.1",
    "user_agent": "Mozilla/5.0...",
    "metadata": {
      "email": "user@example.com",
      "login_method": "email"
    },
    "created_at": "2025-01-15T10:00:00Z"
  }
}
```

**Postman 설정:**
- Method: `GET`
- URL: `http://localhost:3000/api/logs/{log-id}`
- Headers: `Authorization: Bearer {accessToken}`

---

### 9.3 로그 통계 (관리자 전용)

**Endpoint:** `GET /api/logs/stats`

**인증:** 필수 (관리자)

**Query Parameters:**
- `filter[start_date]`: 시작 날짜 (ISO 8601)
- `filter[end_date]`: 종료 날짜 (ISO 8601)
- `filter[category]`: 카테고리 필터 (선택)

**Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "total_logs": 1500,
    "by_category": {
      "AUTH": 800,
      "ORDER": 400,
      "PRODUCT": 200,
      "ADMIN": 100
    },
    "by_level": {
      "INFO": 1200,
      "WARNING": 250,
      "ERROR": 50
    },
    "recent_errors": [
      {
        "id": "uuid",
        "event_name": "LOGIN_FAILED",
        "message": "로그인 실패: 잘못된 비밀번호",
        "created_at": "2025-01-15T09:45:00Z"
      }
    ]
  }
}
```

**Postman 설정:**
- Method: `GET`
- URL: `http://localhost:3000/api/logs/stats?filter[start_date]=2025-01-01&filter[end_date]=2025-01-31`
- Headers: `Authorization: Bearer {accessToken}`

---

## 10. 공통 에러 응답

### 10.1 인증 에러 (401 Unauthorized)

```json
{
  "status": "error",
  "message": "로그인이 필요합니다",
  "errorCode": "UNAUTHORIZED"
}
```

### 10.2 권한 에러 (403 Forbidden)

```json
{
  "status": "error",
  "message": "접근 권한이 없습니다",
  "errorCode": "FORBIDDEN"
}
```

### 10.3 리소스 없음 (404 Not Found)

```json
{
  "status": "error",
  "message": "상품을 찾을 수 없습니다",
  "errorCode": "PRODUCT_NOT_FOUND"
}
```

### 10.4 잘못된 요청 (400 Bad Request)

```json
{
  "status": "error",
  "message": "이메일과 비밀번호를 입력해주세요",
  "errorCode": "INVALID_INPUT"
}
```

### 10.5 서버 오류 (500 Internal Server Error)

```json
{
  "status": "error",
  "message": "서버 오류가 발생했습니다",
  "errorCode": "INTERNAL_ERROR"
}
```

---

## 11. Insomnia에서 사용하기

Insomnia 사용자는 다음 파일을 Import하세요:

👉 **[insomnia-collection.json](./insomnia-collection.json)**

### Import 방법

1. Insomnia 실행
2. 좌측 상단 **Create** 버튼 클릭
3. **Import From** → **File** 선택
4. `/docs/insomnia-collection.json` 파일 선택
5. 완료! 모든 API가 자동으로 추가됩니다

### Environment 설정

Import 후 환경 변수를 설정하세요:

1. 좌측 상단 **No Environment** 클릭
2. **Base Environment** 선택
3. 환경 변수 수정:
   ```json
   {
     "baseUrl": "http://localhost:3000",
     "accessToken": "",
     "productId": "",
     "orderId": "",
     "userId": ""
   }
   ```

4. 로그인 후 받은 `accessToken`을 환경 변수에 저장하면 자동으로 모든 요청에 적용됩니다

---

## 12. Postman Collection 임포트

아래 JSON을 복사하여 Postman에서 `Import` → `Raw text`로 붙여넣으면 모든 API를 한 번에 추가할 수 있습니다.

> **참고:** 실제 UUID와 토큰은 테스트 시 직접 입력해야 합니다.

```json
{
  "info": {
    "name": "Lucent Management API",
    "description": "Lucent Management 프로젝트 API 테스트 컬렉션",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Auth",
      "item": [
        {
          "name": "회원가입",
          "request": {
            "method": "POST",
            "header": [{"key": "Content-Type", "value": "application/json"}],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"email\": \"test@example.com\",\n  \"password\": \"test1234\",\n  \"name\": \"테스트 유저\"\n}"
            },
            "url": "http://localhost:3000/api/auth/signup"
          }
        },
        {
          "name": "로그인",
          "request": {
            "method": "POST",
            "header": [{"key": "Content-Type", "value": "application/json"}],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"email\": \"test@example.com\",\n  \"password\": \"test1234\"\n}"
            },
            "url": "http://localhost:3000/api/auth/login"
          }
        },
        {
          "name": "로그아웃",
          "request": {
            "method": "POST",
            "header": [{"key": "Authorization", "value": "Bearer {{accessToken}}"}],
            "url": "http://localhost:3000/api/auth/logout"
          }
        },
        {
          "name": "세션 확인",
          "request": {
            "method": "GET",
            "header": [{"key": "Authorization", "value": "Bearer {{accessToken}}"}],
            "url": "http://localhost:3000/api/auth/session"
          }
        }
      ]
    },
    {
      "name": "Products",
      "item": [
        {
          "name": "상품 목록",
          "request": {
            "method": "GET",
            "url": "http://localhost:3000/api/products?page=1&limit=12"
          }
        },
        {
          "name": "상품 상세 (ID)",
          "request": {
            "method": "GET",
            "url": "http://localhost:3000/api/products/{{productId}}"
          }
        }
      ]
    },
    {
      "name": "Orders",
      "item": [
        {
          "name": "주문 생성",
          "request": {
            "method": "POST",
            "header": [
              {"key": "Content-Type", "value": "application/json"},
              {"key": "Authorization", "value": "Bearer {{accessToken}}"}
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"items\": [\n    {\n      \"product_id\": \"{{productId}}\",\n      \"quantity\": 1\n    }\n  ],\n  \"shipping\": {\n    \"name\": \"테스트 유저\",\n    \"phone\": \"010-1234-5678\",\n    \"address\": \"서울시 강남구 테헤란로 123\"\n  }\n}"
            },
            "url": "http://localhost:3000/api/orders"
          }
        },
        {
          "name": "주문 목록",
          "request": {
            "method": "GET",
            "header": [{"key": "Authorization", "value": "Bearer {{accessToken}}"}],
            "url": "http://localhost:3000/api/orders?page=1&limit=10"
          }
        }
      ]
    },
    {
      "name": "Projects",
      "item": [
        {
          "name": "프로젝트 목록",
          "request": {
            "method": "GET",
            "url": "http://localhost:3000/api/projects?page=1&limit=12"
          }
        },
        {
          "name": "프로젝트 상세",
          "request": {
            "method": "GET",
            "url": "http://localhost:3000/api/projects/0th"
          }
        }
      ]
    },
    {
      "name": "Artists",
      "item": [
        {
          "name": "아티스트 목록",
          "request": {
            "method": "GET",
            "url": "http://localhost:3000/api/artists?page=1&limit=12"
          }
        },
        {
          "name": "아티스트 상세",
          "request": {
            "method": "GET",
            "url": "http://localhost:3000/api/artists/miruru"
          }
        }
      ]
    }
  ]
}
```

---

## 12. 테스트 시나리오

### 12.1 회원가입 → 로그인 → 주문 플로우

1. **회원가입** (`POST /api/auth/signup`)
   - 이메일, 비밀번호, 이름 입력
   - `accessToken` 저장

2. **상품 목록 조회** (`GET /api/products`)
   - 구매할 상품 ID 확인

3. **주문 생성** (`POST /api/orders`)
   - 상품 ID와 배송 정보 입력
   - `accessToken` 헤더에 포함

4. **주문 목록 확인** (`GET /api/orders`)
   - 생성된 주문 확인

### 12.2 이메일 인증 플로우

1. **이메일 인증 요청** (`POST /api/auth/send-verification`)
   - 이메일 입력
   - 이메일로 토큰 수신 (실제 SMTP 설정 필요)

2. **이메일 인증 확인** (`GET /api/auth/verify-email?token=...`)
   - 이메일에서 받은 토큰 사용

3. **회원가입** (`POST /api/auth/signup`)
   - 인증된 이메일로 가입

---

## 13. 주의사항

### 13.1 인증 토큰 관리

- 로그인 시 받은 `accessToken`을 Postman Environment Variable로 저장하면 편리합니다
- Environment에서 `accessToken` 변수를 만들고, 로그인 응답 후 자동으로 저장하도록 설정할 수 있습니다

### 13.2 UUID 관리

- 실제 테스트 시 UUID는 데이터베이스에 존재하는 값을 사용해야 합니다
- 먼저 목록 API를 호출하여 실제 ID를 확인한 후 사용하세요

### 13.3 CORS

- 로컬 개발 환경에서는 CORS 설정이 필요 없습니다
- 프론트엔드와 함께 테스트 시 Next.js가 자동으로 CORS를 처리합니다

---

## 14. 문제 해결

### 14.1 "Cannot connect to server" 에러

**원인:** 개발 서버가 실행되지 않음

**해결:**
```bash
npm run dev
```

### 14.2 "UNAUTHORIZED" 에러

**원인:** 인증 토큰이 없거나 만료됨

**해결:**
1. 로그인 API 호출
2. 응답에서 `accessToken` 복사
3. `Authorization: Bearer {accessToken}` 헤더에 추가

### 14.3 "PRODUCT_NOT_FOUND" 에러

**원인:** 존재하지 않는 상품 ID 사용

**해결:**
1. `GET /api/products` API로 상품 목록 조회
2. 실제 존재하는 상품 ID 사용

### 14.4 데이터베이스 연결 에러

**원인:** Supabase 환경변수 미설정

**해결:**
1. `.env.local` 파일 확인
2. Supabase URL과 키가 올바른지 확인
3. 서버 재시작

---

**문서 작성일:** 2025-01-15
**버전:** 1.0.0
**관련 문서:**
- `/specs/api/index.md` - API 전체 스펙
- `/docs/email-setup.md` - 이메일 설정 가이드
- `/tests/README.md` - 자동화 테스트 가이드
