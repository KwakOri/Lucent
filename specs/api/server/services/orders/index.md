# Order Service

이 문서는 **주문(Order) Server Service** 구현을 정의한다.

> **범위**: 주문 관련 비즈니스 로직 및 DB 접근
> **관련 문서**:
> - Server Service 패턴: `/specs/api/server/services/index.md`
> - API Routes: `/specs/api/server/routes/orders/index.md`
> - Database Types: `/types/database.ts`

---

## 1. 개요

**OrderService**는 주문 관련 모든 비즈니스 로직과 데이터베이스 접근을 담당한다.

**위치**: `/lib/server/services/order.service.ts`
**사용 대상**: API Route에서만 호출
**역할**: 주문 CRUD, 재고 관리, 다운로드 URL 생성

---

## 2. 데이터 모델

### 2.1 Order 타입

```ts
import { Tables, TablesInsert, TablesUpdate, Enums } from '@/types/database';

type Order = Tables<'orders'>;
type OrderInsert = TablesInsert<'orders'>;
type OrderUpdate = TablesUpdate<'orders'>;
type OrderStatus = Enums<'order_status'>;

type OrderItem = Tables<'order_items'>;
type OrderItemInsert = TablesInsert<'order_items'>;
```

### 2.2 확장 타입 (JOIN 포함)

```ts
interface OrderWithRelations extends Order {
  orderer?: {
    name: string;
    email: string;
    phone: string;
  };
  items?: OrderItemWithProduct[];
}

interface OrderItemWithProduct extends OrderItem {
  product?: {
    id: string;
    name: string;
    slug: string;
    type: 'VOICE_PACK' | 'PHYSICAL_GOODS';
    main_image: {
      public_url: string;
      thumbnail_url?: string;
    } | null;
  };
}
```

### 2.3 입력 타입

```ts
interface CreateOrderInput {
  items: {
    product_id: string;
    quantity: number;
  }[];
  shipping?: {
    name?: string;
    phone?: string;
    address?: string;
    memo?: string;
  };
}
```

---

## 3. OrderService 클래스

### 3.1 기본 구조

```ts
// lib/server/services/order.service.ts
import { createServerClient } from '@/lib/server/utils/supabase';
import { Tables, TablesInsert, Enums } from '@/types/database';
import { ApiError } from '@/lib/server/utils/errors';
import { ProductService } from './product.service';

type Order = Tables<'orders'>;
type OrderStatus = Enums<'order_status'>;

interface GetMyOrdersOptions {
  page?: number;
  limit?: number;
  status?: OrderStatus;
}

export class OrderService {
  // 메서드 구현...
}
```

---

## 4. 주요 메서드

### 4.1 주문 생성

```ts
/**
 * 주문 생성
 */
static async createOrder(
  userId: string,
  orderData: CreateOrderInput
): Promise<OrderWithRelations> {
  const supabase = createServerClient();

  // 1. 프로필 조회 (배송 정보 기본값)
  const { data: profile } = await supabase
    .from('profiles')
    .select('name, phone, address')
    .eq('id', userId)
    .single();

  if (!profile) {
    throw new ApiError('프로필을 찾을 수 없습니다', 404, 'PROFILE_NOT_FOUND');
  }

  // 2. 상품 조회 및 검증
  const items = await Promise.all(
    orderData.items.map(async (item) => {
      const product = await ProductService.getProductById(item.product_id);

      if (!product) {
        throw new ApiError(
          '상품을 찾을 수 없습니다',
          404,
          'PRODUCT_NOT_FOUND'
        );
      }

      // 재고 확인 (실물 굿즈)
      if (product.stock !== null && product.stock < item.quantity) {
        throw new ApiError(
          '재고가 부족합니다',
          400,
          'OUT_OF_STOCK',
          {
            product_id: product.id,
            product_name: product.name,
            requested: item.quantity,
            available: product.stock,
          }
        );
      }

      return {
        product_id: product.id,
        product_name: product.name,
        product_type: product.type,
        price_snapshot: product.price,
        quantity: item.quantity,
        digital_file_url: product.digital_file_url,
      };
    })
  );

  // 3. 총 가격 계산
  const total_price = items.reduce(
    (sum, item) => sum + item.price_snapshot * item.quantity,
    0
  );

  // 4. 주문 번호 생성
  const order_number = await this.generateOrderNumber();

  // 5. 트랜잭션: 주문 생성 + 주문 항목 생성 + 재고 차감
  try {
    // 주문 생성
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: userId,
        order_number,
        status: 'PENDING',
        total_price,
        shipping_name: orderData.shipping?.name || profile.name,
        shipping_phone: orderData.shipping?.phone || profile.phone,
        shipping_address: orderData.shipping?.address || profile.address,
        shipping_memo: orderData.shipping?.memo || null,
      })
      .select()
      .single();

    if (orderError) {
      throw new ApiError('주문 생성 실패', 500, 'ORDER_CREATE_FAILED');
    }

    // 주문 항목 생성
    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(
        items.map((item) => ({
          order_id: order.id,
          product_id: item.product_id,
          product_name: item.product_name,
          product_type: item.product_type,
          price_snapshot: item.price_snapshot,
          quantity: item.quantity,
          digital_file_url: item.digital_file_url,
        }))
      );

    if (itemsError) {
      // 주문 삭제 롤백
      await supabase.from('orders').delete().eq('id', order.id);
      throw new ApiError('주문 항목 생성 실패', 500, 'ORDER_ITEMS_CREATE_FAILED');
    }

    // 재고 차감 (실물 굿즈만)
    for (const item of items) {
      await ProductService.decreaseStock(item.product_id, item.quantity);
    }

    // 주문 상세 조회 (items 포함)
    const fullOrder = await this.getOrderById(order.id);

    return fullOrder;
  } catch (error) {
    throw error;
  }
}
```

### 4.2 내 주문 목록

```ts
/**
 * 내 주문 목록 조회
 */
static async getMyOrders(
  userId: string,
  options: GetMyOrdersOptions = {}
): Promise<{ orders: OrderWithRelations[]; total: number }> {
  const supabase = createServerClient();
  const { page = 1, limit = 10, status } = options;

  let query = supabase
    .from('orders')
    .select(
      `
      *,
      items:order_items (
        *,
        product:products (
          id,
          name,
          slug,
          type,
          main_image:images (
            public_url,
            thumbnail_url
          )
        )
      )
    `,
      { count: 'exact' }
    )
    .eq('user_id', userId);

  // 상태 필터
  if (status) {
    query = query.eq('status', status);
  }

  // 정렬: 최신순
  query = query.order('created_at', { ascending: false });

  // 페이지네이션
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    throw new ApiError('주문 목록 조회 실패', 500, 'ORDERS_FETCH_FAILED');
  }

  return {
    orders: data as OrderWithRelations[],
    total: count || 0,
  };
}
```

### 4.3 주문 상세 조회

```ts
/**
 * 주문 상세 조회 (ID)
 */
static async getOrderById(orderId: string): Promise<OrderWithRelations | null> {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from('orders')
    .select(
      `
      *,
      orderer:profiles!orders_user_id_fkey (
        name,
        email,
        phone
      ),
      items:order_items (
        *,
        product:products (
          id,
          name,
          slug,
          type,
          main_image:images (
            public_url,
            cdn_url,
            thumbnail_url
          )
        )
      )
    `
    )
    .eq('id', orderId)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new ApiError('주문 조회 실패', 500, 'ORDER_FETCH_FAILED');
  }

  return data as OrderWithRelations | null;
}
```

### 4.4 주문 권한 확인

```ts
/**
 * 본인 주문인지 확인
 */
static async verifyOrderOwnership(
  orderId: string,
  userId: string
): Promise<boolean> {
  const supabase = createServerClient();

  const { data } = await supabase
    .from('orders')
    .select('user_id')
    .eq('id', orderId)
    .single();

  return data?.user_id === userId;
}
```

### 4.5 디지털 상품 다운로드 URL 생성

```ts
/**
 * 디지털 상품 다운로드 URL 생성
 */
static async generateDownloadUrl(
  orderId: string,
  itemId: string,
  userId: string
): Promise<{ download_url: string; file_name: string; file_size: number }> {
  const supabase = createServerClient();

  // 1. 주문 권한 확인
  const isOwner = await this.verifyOrderOwnership(orderId, userId);
  if (!isOwner) {
    throw new ApiError('접근 권한이 없습니다', 403, 'UNAUTHORIZED_ORDER');
  }

  // 2. 주문 및 주문 항목 조회
  const { data: order } = await supabase
    .from('orders')
    .select(
      `
      status,
      items:order_items!inner (
        id,
        product_type,
        digital_file_url,
        download_count
      )
    `
    )
    .eq('id', orderId)
    .eq('items.id', itemId)
    .single();

  if (!order) {
    throw new ApiError('주문을 찾을 수 없습니다', 404, 'ORDER_NOT_FOUND');
  }

  // 3. 입금 확인 여부
  if (order.status === 'PENDING') {
    throw new ApiError(
      '입금이 확인되지 않아 다운로드할 수 없습니다',
      403,
      'DOWNLOAD_NOT_AVAILABLE'
    );
  }

  const item = order.items[0];

  // 4. 디지털 상품 확인
  if (item.product_type !== 'VOICE_PACK' || !item.digital_file_url) {
    throw new ApiError(
      '디지털 상품이 아닙니다',
      400,
      'NOT_DIGITAL_PRODUCT'
    );
  }

  // 5. Presigned URL 생성 (Cloudflare R2)
  const presignedUrl = await this.generatePresignedUrl(
    item.digital_file_url,
    600 // 10분
  );

  // 6. 다운로드 카운트 증가
  await supabase
    .from('order_items')
    .update({ download_count: item.download_count + 1 })
    .eq('id', itemId);

  // 7. 파일명 추출
  const fileName = item.digital_file_url.split('/').pop() || 'download.zip';

  return {
    download_url: presignedUrl,
    file_name: fileName,
    file_size: 0, // TODO: R2에서 파일 크기 조회
  };
}
```

---

## 5. 헬퍼 메서드

### 5.1 주문 번호 생성

```ts
/**
 * 주문 번호 생성 (ORD-20250115-0001)
 */
private static async generateOrderNumber(): Promise<string> {
  const supabase = createServerClient();
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');

  // 오늘 주문 수 조회
  const { count } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', new Date().toISOString().slice(0, 10))
    .lt('created_at', new Date(Date.now() + 86400000).toISOString().slice(0, 10));

  const sequence = String((count || 0) + 1).padStart(4, '0');

  return `ORD-${dateStr}-${sequence}`;
}
```

### 5.2 Presigned URL 생성

```ts
/**
 * Cloudflare R2 Presigned URL 생성
 */
private static async generatePresignedUrl(
  fileUrl: string,
  expiresIn: number
): Promise<string> {
  // TODO: Cloudflare R2 SDK로 Presigned URL 생성
  // 현재는 임시로 원본 URL 반환
  return fileUrl;

  // 실제 구현 예시:
  // const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
  // const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
  //
  // const s3Client = new S3Client({
  //   endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
  //   credentials: {
  //     accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
  //     secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
  //   },
  // });
  //
  // const command = new GetObjectCommand({
  //   Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
  //   Key: fileUrl,
  // });
  //
  // return await getSignedUrl(s3Client, command, { expiresIn });
}
```

---

## 6. 주문 상태 관리

### 6.1 주문 상태 업데이트 (관리자)

```ts
/**
 * 주문 상태 업데이트 (관리자 전용)
 */
static async updateOrderStatus(
  orderId: string,
  status: OrderStatus,
  adminMemo?: string
): Promise<Order> {
  const supabase = createServerClient();

  const updateData: Partial<Order> = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (adminMemo !== undefined) {
    updateData.admin_memo = adminMemo;
  }

  const { data, error } = await supabase
    .from('orders')
    .update(updateData)
    .eq('id', orderId)
    .select()
    .single();

  if (error) {
    throw new ApiError('주문 상태 업데이트 실패', 500, 'ORDER_UPDATE_FAILED');
  }

  return data;
}
```

---

## 7. 계좌 정보

### 7.1 계좌 정보 상수

```ts
// lib/server/constants/payment.ts
export const PAYMENT_ACCOUNT = {
  bank: '국민은행',
  account_number: '123-456-789012',
  account_holder: 'Lucent Management',
};

export const PAYMENT_DEADLINE_DAYS = 2;
```

### 7.2 계좌 정보 포함

주문 생성 시 응답에 계좌 정보 포함:

```ts
return {
  ...order,
  payment_info: {
    ...PAYMENT_ACCOUNT,
    amount: order.total_price,
    deadline: new Date(Date.now() + PAYMENT_DEADLINE_DAYS * 86400000).toISOString(),
  },
};
```

---

## 8. 에러 처리

### 8.1 에러 코드

| 에러 코드 | 상태 코드 | 설명 |
|-----------|-----------|------|
| `PROFILE_NOT_FOUND` | 404 | 프로필을 찾을 수 없음 |
| `PRODUCT_NOT_FOUND` | 404 | 상품을 찾을 수 없음 |
| `OUT_OF_STOCK` | 400 | 재고 부족 |
| `ORDER_CREATE_FAILED` | 500 | 주문 생성 실패 |
| `ORDER_NOT_FOUND` | 404 | 주문을 찾을 수 없음 |
| `UNAUTHORIZED_ORDER` | 403 | 본인 주문이 아님 |
| `DOWNLOAD_NOT_AVAILABLE` | 403 | 다운로드 불가 (입금 미확인) |
| `NOT_DIGITAL_PRODUCT` | 400 | 디지털 상품이 아님 |

### 8.2 사용 예시

```ts
if (!product) {
  throw new ApiError('상품을 찾을 수 없습니다', 404, 'PRODUCT_NOT_FOUND');
}

if (product.stock < quantity) {
  throw new ApiError('재고 부족', 400, 'OUT_OF_STOCK', {
    product_id: product.id,
    requested: quantity,
    available: product.stock,
  });
}
```

---

## 9. 트랜잭션 처리

주문 생성은 다음 작업을 포함하는 트랜잭션입니다:

1. **주문 생성**: `orders` 테이블에 INSERT
2. **주문 항목 생성**: `order_items` 테이블에 INSERT (여러 건)
3. **재고 차감**: `products` 테이블 UPDATE (실물 굿즈만)

**실패 시 롤백**:
- 주문 항목 생성 실패 → 주문 삭제
- 재고 차감 실패 → 주문 및 항목 삭제

---

## 10. Order System V2: 개별 주문 상품 상태 관리

### 10.1 개별 주문 상품 상태 업데이트

```ts
/**
 * 개별 주문 상품 상태 업데이트
 */
static async updateItemStatus(
  itemId: string,
  newStatus: OrderItemStatus,
  adminId?: string
): Promise<OrderItem>
```

**사용 예시:**
```ts
// 디지털 상품: 입금 확인 시 다운로드 가능 상태로
await OrderService.updateItemStatus(itemId, 'READY', adminId);

// 실물 상품: 발송 완료 시
await OrderService.updateItemStatus(itemId, 'SHIPPED', adminId);
```

### 10.2 주문 내 모든 상품 상태 일괄 업데이트

```ts
/**
 * 주문 상태 변경 시 모든 order_items의 상태도 함께 업데이트
 */
static async updateAllItemsStatus(
  orderId: string,
  newStatus: OrderItemStatus
): Promise<void>
```

**주문 상태 매핑:**
- `PAID` → `READY` (입금 확인 시 다운로드/발송 준비)
- `MAKING` → `PROCESSING` (제작 중)
- `SHIPPING` → `SHIPPED` (발송됨)
- `DONE` → `COMPLETED` (완료)

---

## 11. Order System V2: 배송 정보 관리

### 11.1 배송 정보 생성

```ts
/**
 * 배송 정보 생성 (실물 상품)
 */
static async createShipment(
  input: {
    orderItemId: string;
    recipientName: string;
    recipientPhone: string;
    recipientAddress: string;
    deliveryMemo?: string;
    carrier?: string;
    trackingNumber?: string;
  },
  adminId?: string
): Promise<Shipment>
```

**사용 예시:**
```ts
const shipment = await OrderService.createShipment({
  orderItemId: 'uuid',
  recipientName: '홍길동',
  recipientPhone: '010-1234-5678',
  recipientAddress: '서울시 강남구...',
  deliveryMemo: '문 앞에 놓아주세요',
  carrier: 'CJ대한통운',
  trackingNumber: '123456789012'
}, adminId);
```

**검증:**
- order_item 존재 여부 확인
- 디지털 상품(VOICE_PACK, DIGITAL)은 배송 정보 생성 불가
- 실물 상품(PHYSICAL_GOODS, PHYSICAL, BUNDLE)만 가능

### 11.2 배송 정보 조회

```ts
/**
 * 배송 정보 조회
 */
static async getShipmentInfo(
  orderItemId: string,
  userId?: string
): Promise<Shipment | null>
```

**사용 예시:**
```ts
// 관리자 조회
const shipment = await OrderService.getShipmentInfo(orderItemId);

// 고객 조회 (권한 확인)
const shipment = await OrderService.getShipmentInfo(orderItemId, userId);
```

**반환값:**
- 배송 정보가 없으면 `null` 반환 (에러 아님)
- userId 제공 시 권한 확인 (본인 주문만)

### 11.3 배송 정보 업데이트

```ts
/**
 * 배송 정보 업데이트 (관리자)
 */
static async updateShipment(
  shipmentId: string,
  updates: {
    carrier?: string;
    trackingNumber?: string;
    shippingStatus?: string;
    recipientName?: string;
    recipientPhone?: string;
    recipientAddress?: string;
    deliveryMemo?: string;
    adminMemo?: string;
  },
  adminId?: string
): Promise<Shipment>
```

**사용 예시:**
```ts
// 운송장 번호 입력 및 발송 처리
await OrderService.updateShipment(shipmentId, {
  carrier: 'CJ대한통운',
  trackingNumber: '123456789012',
  shippingStatus: 'SHIPPED'
}, adminId);

// 배송 완료 처리
await OrderService.updateShipment(shipmentId, {
  shippingStatus: 'DELIVERED'
}, adminId);
```

**자동 처리:**
- `shippingStatus: 'SHIPPED'` 변경 시 → `shipped_at` 자동 기록
- `shippingStatus: 'DELIVERED'` 변경 시 → `delivered_at` 자동 기록

### 11.4 배송 추적 정보 조회 (고객용)

```ts
/**
 * 배송 추적 정보 조회 (고객용)
 */
static async getShipmentTracking(
  orderItemId: string,
  userId: string
): Promise<{
  carrier: string | null;
  trackingNumber: string | null;
  shippingStatus: string;
  shippedAt: string | null;
  deliveredAt: string | null;
} | null>
```

**사용 예시:**
```ts
const tracking = await OrderService.getShipmentTracking(orderItemId, userId);

if (tracking) {
  console.log(`택배사: ${tracking.carrier}`);
  console.log(`운송장 번호: ${tracking.trackingNumber}`);
  console.log(`배송 상태: ${tracking.shippingStatus}`);
}
```

---

## 12. Order System V2: 에러 코드

### 12.1 추가 에러 코드

| 에러 코드 | 상태 코드 | 설명 |
|-----------|-----------|------|
| `ORDER_ITEM_NOT_FOUND` | 404 | 주문 상품을 찾을 수 없음 |
| `ITEM_STATUS_UPDATE_FAILED` | 500 | 주문 상품 상태 변경 실패 |
| `ITEMS_STATUS_UPDATE_FAILED` | 500 | 주문 상품 상태 일괄 변경 실패 |
| `NOT_PHYSICAL_PRODUCT` | 400 | 실물 상품이 아님 (배송 정보 생성 불가) |
| `SHIPMENT_CREATE_FAILED` | 500 | 배송 정보 생성 실패 |
| `SHIPMENT_NOT_FOUND` | 404 | 배송 정보를 찾을 수 없음 |
| `SHIPMENT_FETCH_FAILED` | 500 | 배송 정보 조회 실패 |
| `SHIPMENT_UPDATE_FAILED` | 500 | 배송 정보 업데이트 실패 |

---

## 13. Order System V2: 타입 정의

### 13.1 추가 타입

```ts
type OrderItemStatus = Enums<'order_item_status'>;
type Shipment = Tables<'shipments'>;
type ShipmentInsert = TablesInsert<'shipments'>;
```

### 13.2 OrderItemStatus ENUM

```ts
type OrderItemStatus =
  | 'PENDING'      // 입금 대기 중
  | 'PROCESSING'   // 처리 중 (입금 확인됨, 준비 시작)
  | 'READY'        // 준비 완료 (디지털: 다운로드 가능, 실물: 발송 대기)
  | 'SHIPPED'      // 발송됨 (실물만)
  | 'DELIVERED'    // 배송 완료 (실물만)
  | 'COMPLETED';   // 완료 (디지털/실물 모두 완료)
```

---

## 14. 참고 문서

- **Order System V2 설계**: `/specs/database/order-system-v2.md` ⭐ NEW
- Server Service 패턴: `/specs/api/server/services/index.md`
- API Routes: `/specs/api/server/routes/orders/index.md`
- Client Services: `/specs/api/client/services/orders/index.md`
- Database Types: `/types/database.ts`
- Product Service: `/specs/api/server/services/products/index.md`
