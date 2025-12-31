# Orders API Routes

이 문서는 **주문(Orders) API Route** 엔드포인트를 정의한다.

> **범위**: Next.js API Route 엔드포인트 (HTTP 인터페이스)
> **관련 문서**:
> - Server Service: `/specs/api/server/services/orders/index.md`
> - Client Services: `/specs/api/client/services/orders/index.md`
> - React Query Hooks: `/specs/api/client/hooks/orders/index.md`

---

## 1. 주문 시스템 개요

- **결제 방식**: 계좌이체 단일 (PG 연동 없음)
- **주문 플로우**: 주문 생성 → 계좌 안내 → 수동 입금 확인 → 상태 변경
- **주문자 정보**: `profiles` 테이블에서 조회 (중복 제거)
- **배송 정보**: 주문 시점 스냅샷 (주문 테이블에 저장)

---

## 2. 주문 상태 플로우

```
PENDING (입금대기)
    ↓ 관리자 확인
PAID (입금확인)
    ↓ 제작/포장 시작
MAKING (제작중) - 실물 굿즈만
    ↓ 배송 시작
SHIPPING (발송중) - 실물 굿즈만
    ↓ 배송 완료
DONE (완료)
```

### 2.1 상태별 설명

| 상태 | 설명 | 디지털 상품 | 실물 굿즈 |
|------|------|------------|----------|
| `PENDING` | 입금 대기 중 | ✅ | ✅ |
| `PAID` | 입금 확인됨 | ✅ (다운로드 가능) | ✅ |
| `MAKING` | 제작/포장 중 | ❌ | ✅ |
| `SHIPPING` | 발송 중 | ❌ | ✅ |
| `DONE` | 배송 완료 | ✅ (자동) | ✅ |

---

## 3. API 엔드포인트

### 3.1 주문 생성

```
POST /api/orders
```

**인증**: 필수

**Request Body**:
```json
{
  "items": [
    {
      "product_id": "uuid",
      "quantity": 1
    }
  ],
  "shipping": {
    "name": "홍길동", // 없으면 profiles.name 사용
    "phone": "010-1234-5678", // 없으면 profiles.phone 사용
    "address": "서울시 강남구 테헤란로 123", // 없으면 profiles.address 사용
    "memo": "문 앞에 놓아주세요" // 선택
  }
}
```

**Response**:
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

### 3.2 내 주문 목록

```
GET /api/orders?page=1&limit=10&status=PAID
```

**인증**: 필수

**Query Parameters**:
- `page`: 페이지 번호 (기본: 1)
- `limit`: 페이지당 항목 수 (기본: 10)
- `status`: 주문 상태 필터 (선택)

**Response**:
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

### 3.3 주문 상세

```
GET /api/orders/:id
```

**인증**: 필수 (본인 주문만)

**Path Parameters**:
- `id`: 주문 ID (UUID)

**Response**:
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
          "slug": "voicepack-vol1",
          "main_image": {
            "public_url": "https://..."
          }
        }
      }
    ],
    "created_at": "2025-01-15T10:00:00Z",
    "updated_at": "2025-01-15T12:00:00Z"
  }
}
```

### 3.4 디지털 상품 다운로드

```
GET /api/orders/:orderId/items/:itemId/download
```

**인증**: 필수

**Path Parameters**:
- `orderId`: 주문 ID (UUID)
- `itemId`: 주문 항목 ID (UUID)

**Response (JSON)**:
```json
{
  "status": "success",
  "data": {
    "download_url": "https://r2.example.com/voicepacks/...?signature=...&expires=...",
    "expires_at": "2025-01-15T10:10:00Z",
    "file_name": "미루루_보이스팩_Vol1.zip",
    "file_size": 52428800
  }
}
```

또는 **Response (Redirect)**:
```
302 Found
Location: https://r2.example.com/voicepacks/...?signature=...&expires=...
```

---

## 4. 계좌 정보

### 4.1 입금 계좌

주문 생성 시 `payment_info` 필드에 포함:

```json
{
  "payment_info": {
    "bank": "국민은행",
    "account_number": "123-456-789012",
    "account_holder": "Lucent Management",
    "amount": 10000,
    "deadline": "2025-01-17T23:59:59Z"
  }
}
```

**입금 기한**: 주문 생성 후 2일

---

## 5. 에러 응답

### 5.1 상품을 찾을 수 없음

```json
{
  "status": "error",
  "message": "상품을 찾을 수 없습니다",
  "errorCode": "PRODUCT_NOT_FOUND"
}
```

**Status Code**: `404 Not Found`

### 5.2 재고 부족

```json
{
  "status": "error",
  "message": "재고가 부족합니다",
  "errorCode": "OUT_OF_STOCK",
  "details": {
    "product_id": "uuid",
    "product_name": "미루루 키링",
    "requested": 5,
    "available": 2
  }
}
```

**Status Code**: `400 Bad Request`

### 5.3 주문을 찾을 수 없음

```json
{
  "status": "error",
  "message": "주문을 찾을 수 없습니다",
  "errorCode": "ORDER_NOT_FOUND"
}
```

**Status Code**: `404 Not Found`

### 5.4 본인 주문이 아님

```json
{
  "status": "error",
  "message": "접근 권한이 없습니다",
  "errorCode": "UNAUTHORIZED_ORDER"
}
```

**Status Code**: `403 Forbidden`

### 5.5 다운로드 불가

```json
{
  "status": "error",
  "message": "입금이 확인되지 않아 다운로드할 수 없습니다",
  "errorCode": "DOWNLOAD_NOT_AVAILABLE"
}
```

**Status Code**: `403 Forbidden`

---

## 6. 구현 예시

### 6.1 주문 생성

```ts
// app/api/orders/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { OrderService } from '@/lib/server/services/order.service';
import { getSession } from '@/lib/server/utils/auth';
import { handleApiError } from '@/lib/server/utils/api-response';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession(request);
    if (!session) {
      return NextResponse.json(
        { status: 'error', message: '로그인이 필요합니다' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const order = await OrderService.createOrder(session.user.id, body);

    return NextResponse.json(
      {
        status: 'success',
        data: order,
        message: '주문이 생성되었습니다. 계좌로 입금해주세요.',
      },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
```

### 6.2 주문 목록 조회

```ts
export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request);
    if (!session) {
      return NextResponse.json(
        { status: 'error', message: '로그인이 필요합니다' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');

    const result = await OrderService.getMyOrders(session.user.id, {
      page,
      limit,
      status,
    });

    return NextResponse.json({
      status: 'success',
      data: result.orders,
      pagination: {
        total: result.total,
        page,
        limit,
        totalPages: Math.ceil(result.total / limit),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
```

---

## 7. Order System V2: 배송 추적 API

### 7.1 배송 정보 조회

```
GET /api/orders/:orderId/items/:itemId/shipment
```

**인증**: 필수 (본인 주문만)

**Path Parameters**:
- `orderId`: 주문 ID (UUID)
- `itemId`: 주문 항목 ID (UUID)

**Response (200 OK)**:
```json
{
  "status": "success",
  "data": {
    "carrier": "CJ대한통운",
    "trackingNumber": "123456789012",
    "shippingStatus": "SHIPPED",
    "shippedAt": "2025-01-20T10:00:00Z",
    "deliveredAt": null
  }
}
```

**Response (404 Not Found)** - 배송 정보 없음:
```json
{
  "status": "success",
  "data": null,
  "message": "배송 정보가 없습니다"
}
```

**Error (403 Forbidden)**:
```json
{
  "status": "error",
  "message": "배송 정보 조회 권한이 없습니다",
  "errorCode": "UNAUTHORIZED"
}
```

### 7.2 구현 예시

```ts
// app/api/orders/[orderId]/items/[itemId]/shipment/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { OrderService } from '@/lib/server/services/order.service';
import { getSession } from '@/lib/server/utils/auth';
import { handleApiError } from '@/lib/server/utils/api-response';

export async function GET(
  request: NextRequest,
  { params }: { params: { orderId: string; itemId: string } }
) {
  try {
    const session = await getSession(request);
    if (!session) {
      return NextResponse.json(
        { status: 'error', message: '로그인이 필요합니다' },
        { status: 401 }
      );
    }

    const tracking = await OrderService.getShipmentTracking(
      params.itemId,
      session.user.id
    );

    if (!tracking) {
      return NextResponse.json({
        status: 'success',
        data: null,
        message: '배송 정보가 없습니다',
      });
    }

    return NextResponse.json({
      status: 'success',
      data: tracking,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
```

---

## 8. 1차 MVP 범위

### 포함

- ✅ 주문 생성 (계좌이체 안내)
- ✅ 내 주문 목록/상세 조회
- ✅ 디지털 상품 다운로드
- ✅ 재고 관리 (실물 굿즈)
- ✅ 주문 상태 관리 (PENDING → DONE)
- ✅ 주문자 정보 profiles 참조
- ✅ 배송 정보 스냅샷
- ✅ **배송 추적 조회** (v2) ⭐ NEW

### 제외 (2차 확장)

- ⏸️ 주문 취소/환불
- ⏸️ 관리자 배송 정보 생성/업데이트 API (서비스는 구현됨)
- ⏸️ 다운로드 기한 제한
- ⏸️ 다운로드 횟수 제한
- ⏸️ 자동 입금 확인
- ⏸️ 결제 PG 연동

---

## 9. 참고 문서

- **Order System V2 설계**: `/specs/database/order-system-v2.md` ⭐ NEW
- Server Service: `/specs/api/server/services/orders/index.md`
- Client Services: `/specs/api/client/services/orders/index.md`
- React Query Hooks: `/specs/api/client/hooks/orders/index.md`
- API Routes 패턴: `/specs/api/server/routes/index.md`
