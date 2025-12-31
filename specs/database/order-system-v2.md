# 주문 시스템 개선 (v2) - 디지털/실물/세트 상품 통합 관리

> **작성일**: 2025-12-31
> **목적**: 디지털 상품, 실물 상품, 세트 상품을 모두 처리할 수 있는 주문 시스템 구조 개선
> **참고 자료**:
> - [Vertabelo - E-commerce Database Design](https://vertabelo.com/blog/er-diagram-for-online-shop/)
> - [WooCommerce - Digital Product Handling](https://woocommerce.com/document/digital-downloadable-product-handling/)
> - [GeeksforGeeks - E-commerce Database Design](https://www.geeksforgeeks.org/dbms/how-to-design-a-relational-database-for-e-commerce-website/)

---

## 1. 문제 정의

### 1.1 현재 구조의 한계

**현재 DB 구조:**
- `products` 테이블: `type ENUM('VOICE_PACK', 'PHYSICAL_GOODS')`
- `orders` 테이블: 배송 정보가 항상 포함됨 (shipping_name, shipping_phone, shipping_address)
- `order_items` 테이블: download_url, download_count 필드 존재

**문제점:**
1. **디지털 상품 전용 주문**: 배송 정보 불필요하지만 필드 존재
2. **세트 상품 미지원**: 디지털 + 실물 번들 상품 처리 불가
3. **배송 추적 부재**: 실물 상품의 배송 상태, 운송장 번호 등 추적 정보 없음
4. **개별 상품 상태 관리 부재**: order 레벨에서만 status 관리, 개별 item 상태 추적 불가
5. **혼합 주문 처리 어려움**: 디지털 상품은 즉시 다운로드 가능하지만 실물 상품은 배송 대기 상태일 때 처리 복잡

### 1.2 요구사항

1. **디지털 상품**: 입금 확인 즉시 다운로드 권한 부여
2. **실물 상품**: 입금 확인 → 제작/포장 → 발송 → 배송 완료 단계 추적
3. **세트 상품**: 디지털 + 실물 조합, 각각 별도 처리
4. **배송 추적**: 운송장 번호, 택배사, 발송일, 배송 완료일 기록
5. **알림톡 준비**: 주문 생성, 입금 확인, 발송 완료 등 고객 알림 (추후 구현)

---

## 2. 개선된 데이터 모델

### 2.1 핵심 변경사항

#### A. product_type 확장

```sql
-- 기존
CREATE TYPE product_type AS ENUM ('VOICE_PACK', 'PHYSICAL_GOODS');

-- 개선
CREATE TYPE product_type AS ENUM (
  'DIGITAL',        -- 디지털 상품 전용 (보이스팩 등)
  'PHYSICAL',       -- 실물 상품 전용 (굿즈)
  'BUNDLE'          -- 세트 상품 (디지털 + 실물)
);
```

#### B. order_item_status 추가

개별 주문 상품의 처리 상태를 추적:

```sql
CREATE TYPE order_item_status AS ENUM (
  'PENDING',        -- 입금 대기 중
  'PROCESSING',     -- 처리 중 (입금 확인됨, 준비 시작)
  'READY',          -- 준비 완료 (디지털: 다운로드 가능, 실물: 발송 대기)
  'SHIPPED',        -- 발송됨 (실물만)
  'DELIVERED',      -- 배송 완료 (실물만)
  'COMPLETED'       -- 완료 (디지털: 다운로드 완료, 실물: 배송 완료)
);
```

#### C. shipments 테이블 신규 추가

실물 상품의 배송 정보를 별도 관리:

```sql
CREATE TABLE shipments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_item_id UUID NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,

  -- 배송 정보
  carrier VARCHAR(100),                    -- 택배사 (CJ대한통운, 우체국택배 등)
  tracking_number VARCHAR(100),            -- 운송장 번호
  shipping_status VARCHAR(50) DEFAULT 'PREPARING', -- 배송 상태

  -- 수령인 정보 (order_items별로 다를 수 있음)
  recipient_name VARCHAR(100) NOT NULL,    -- 수령인 이름
  recipient_phone VARCHAR(20) NOT NULL,    -- 수령인 연락처
  recipient_address TEXT NOT NULL,         -- 배송 주소
  delivery_memo TEXT,                      -- 배송 메모

  -- 배송 일시
  shipped_at TIMESTAMPTZ,                  -- 발송 일시
  delivered_at TIMESTAMPTZ,                -- 배송 완료 일시

  -- 관리자 메모
  admin_memo TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_shipments_order_item_id ON shipments(order_item_id);
CREATE INDEX idx_shipments_tracking_number ON shipments(tracking_number);
CREATE INDEX idx_shipments_shipping_status ON shipments(shipping_status);
```

#### D. order_items 테이블 수정

```sql
-- 추가 컬럼
ALTER TABLE order_items ADD COLUMN item_status order_item_status NOT NULL DEFAULT 'PENDING';

CREATE INDEX idx_order_items_item_status ON order_items(item_status);
```

#### E. orders 테이블 수정 (기존 유지)

배송 정보 필드는 유지하되, "기본 배송지" 역할로만 사용:
- 실물 상품이 포함된 주문: 기본 배송지로 사용
- 디지털 상품만 있는 주문: NULL 허용
- 실제 배송은 `shipments` 테이블에서 관리

**변경 없음** (기존 구조 유지, shipping_* 필드는 nullable로 변경 권장)

---

## 3. 상품 타입별 처리 플로우

### 3.1 디지털 상품 (DIGITAL)

```
주문 생성 (PENDING)
    ↓
입금 확인 (관리자)
    ↓
order_items.item_status → 'READY'
    ↓
다운로드 권한 부여 (download_url 생성)
    ↓
고객 다운로드 → download_count 증가
    ↓
order_items.item_status → 'COMPLETED' (선택)
```

**관련 테이블:**
- `order_items`: item_status, download_url, download_count

**배송 정보**: 불필요 (shipments 레코드 없음)

---

### 3.2 실물 상품 (PHYSICAL)

```
주문 생성 (PENDING)
    ↓
입금 확인 (관리자)
    ↓
order_items.item_status → 'PROCESSING'
    ↓
제작/포장
    ↓
order_items.item_status → 'READY'
shipments 레코드 생성 (배송 정보 입력)
    ↓
발송 (관리자가 운송장 번호 입력)
    ↓
order_items.item_status → 'SHIPPED'
shipments.shipped_at 기록
    ↓
배송 완료 (택배사 API 또는 수동 확인)
    ↓
order_items.item_status → 'DELIVERED'
shipments.delivered_at 기록
    ↓
order_items.item_status → 'COMPLETED'
```

**관련 테이블:**
- `order_items`: item_status
- `shipments`: carrier, tracking_number, recipient_*, shipped_at, delivered_at

**배송 정보**: 필수 (shipments 레코드 생성)

---

### 3.3 세트 상품 (BUNDLE)

세트 상품은 **하나의 product로 등록**되지만, **내부적으로 디지털 + 실물 구성품**을 가짐.

#### 옵션 A: product_bundles 테이블 추가 (권장)

```sql
-- 세트 상품의 구성품 정의
CREATE TABLE product_bundles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bundle_product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  component_product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT product_bundles_unique UNIQUE (bundle_product_id, component_product_id)
);

CREATE INDEX idx_product_bundles_bundle_id ON product_bundles(bundle_product_id);
```

**주문 생성 시 처리:**
1. 세트 상품 (BUNDLE) 주문 생성
2. `product_bundles`에서 구성품 조회
3. 각 구성품마다 별도의 `order_items` 레코드 생성
4. 디지털 구성품 → download_url 관리
5. 실물 구성품 → shipments 레코드 생성

**예시:**
- 상품: "미루루 보이스팩 Vol.1 + 키링 세트" (BUNDLE)
  - 구성품 1: 미루루 보이스팩 Vol.1 (DIGITAL)
  - 구성품 2: 미루루 키링 (PHYSICAL)
- 주문 시:
  - order_items[0]: 보이스팩 (item_status: READY, download_url 있음)
  - order_items[1]: 키링 (item_status: SHIPPED, shipments 레코드 있음)

#### 옵션 B: JSONB 필드로 구성품 관리 (단순)

```sql
-- products 테이블에 추가
ALTER TABLE products ADD COLUMN bundle_components JSONB;

-- 예시:
{
  "components": [
    { "type": "DIGITAL", "digital_file_url": "...", "name": "보이스팩" },
    { "type": "PHYSICAL", "stock_sku": "KEY-001", "name": "키링" }
  ]
}
```

주문 생성 시 JSON 파싱하여 order_items 생성.

**권장**: 옵션 A (정규화, 재사용성, 관리 용이)

---

## 4. 주문 상태 vs 주문 상품 상태

### 4.1 orders.status (주문 전체)

기존 유지:

```sql
CREATE TYPE order_status AS ENUM (
  'PENDING',   -- 입금 대기
  'PAID',      -- 입금 확인
  'MAKING',    -- 제작 중 (실물 굿즈만)
  'SHIPPING',  -- 발송 중 (실물 굿즈만)
  'DONE'       -- 완료
);
```

**의미**: 주문 전체의 대표 상태
**계산 방법**:
- 모든 order_items가 PENDING → orders.status = 'PENDING'
- 하나라도 PROCESSING/READY → orders.status = 'PAID'
- 모두 COMPLETED → orders.status = 'DONE'

### 4.2 order_items.item_status (개별 상품)

```sql
CREATE TYPE order_item_status AS ENUM (
  'PENDING',     -- 입금 대기
  'PROCESSING',  -- 처리 중
  'READY',       -- 준비 완료
  'SHIPPED',     -- 발송됨 (실물만)
  'DELIVERED',   -- 배송 완료 (실물만)
  'COMPLETED'    -- 완료
);
```

**의미**: 각 상품의 현재 처리 상태
**사용처**:
- 마이페이지에서 상품별 상태 표시
- 디지털 상품 다운로드 가능 여부 판단 (item_status >= 'READY')
- 실물 상품 배송 추적 (item_status = 'SHIPPED' → shipments 조회)

---

## 5. 알림톡 연동 준비 (2차 확장)

### 5.1 order_notifications 테이블 (선택사항)

```sql
CREATE TABLE order_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  notification_type VARCHAR(50) NOT NULL, -- 'ORDER_CREATED', 'PAYMENT_CONFIRMED', 'SHIPPED', etc.
  recipient_phone VARCHAR(20) NOT NULL,
  message TEXT NOT NULL,
  sent_at TIMESTAMPTZ,
  status VARCHAR(20) DEFAULT 'PENDING', -- 'PENDING', 'SENT', 'FAILED'
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_order_notifications_order_id ON order_notifications(order_id);
CREATE INDEX idx_order_notifications_status ON order_notifications(status);
```

**알림톡 발송 시점:**
1. **주문 생성**: "주문이 접수되었습니다. 입금 계좌: ..."
2. **입금 확인**: "입금이 확인되었습니다."
3. **발송 완료**: "상품이 발송되었습니다. 운송장 번호: ..."
4. **배송 완료**: "배송이 완료되었습니다."

**문서 기록:**
- `/specs/api/server/services/notifications/index.md` (추후 작성)
- CLAUDE.md에 "추후 알림톡 연동 예정" 명시

---

## 6. 마이그레이션 계획

### 6.1 신규 테이블 생성

1. `product_bundles` (세트 상품 구성품)
2. `shipments` (배송 정보)
3. `order_notifications` (알림톡, 선택사항)

### 6.2 기존 테이블 수정

1. **product_type ENUM 확장**:
   ```sql
   ALTER TYPE product_type ADD VALUE 'BUNDLE';
   ```

2. **order_item_status ENUM 추가**:
   ```sql
   CREATE TYPE order_item_status AS ENUM (...);
   ```

3. **order_items 테이블**:
   ```sql
   ALTER TABLE order_items ADD COLUMN item_status order_item_status NOT NULL DEFAULT 'PENDING';
   CREATE INDEX idx_order_items_item_status ON order_items(item_status);
   ```

4. **orders 테이블 (선택사항)**:
   ```sql
   -- shipping_* 필드를 nullable로 변경 (디지털 상품 전용 주문 대비)
   ALTER TABLE orders ALTER COLUMN shipping_name DROP NOT NULL;
   ALTER TABLE orders ALTER COLUMN shipping_phone DROP NOT NULL;
   ALTER TABLE orders ALTER COLUMN shipping_address DROP NOT NULL;
   ```

### 6.3 데이터 마이그레이션

기존 주문 데이터:
- order_items.item_status 초기화: orders.status 기반으로 설정
  - orders.status = 'PENDING' → item_status = 'PENDING'
  - orders.status = 'PAID' → item_status = 'READY'
  - orders.status = 'DONE' → item_status = 'COMPLETED'

### 6.4 마이그레이션 파일

파일: `/supabase/migrations/20250131000000_order_system_v2.sql`

---

## 7. API 변경사항

### 7.1 주문 생성 (POST /api/orders)

**Request Body 변경 없음**

**Response 추가**:
```json
{
  "items": [
    {
      "id": "uuid",
      "product_name": "미루루 보이스팩 + 키링 세트",
      "product_type": "BUNDLE",
      "item_status": "PENDING",
      "components": [
        {
          "type": "DIGITAL",
          "name": "미루루 보이스팩",
          "item_status": "PENDING"
        },
        {
          "type": "PHYSICAL",
          "name": "미루루 키링",
          "item_status": "PENDING"
        }
      ]
    }
  ]
}
```

### 7.2 주문 상세 (GET /api/orders/:id)

**Response 추가**:
```json
{
  "items": [
    {
      "id": "uuid",
      "item_status": "SHIPPED",
      "shipment": {
        "carrier": "CJ대한통운",
        "tracking_number": "123456789012",
        "shipped_at": "2025-01-20T10:00:00Z"
      }
    }
  ]
}
```

### 7.3 배송 추적 (신규, GET /api/orders/:orderId/items/:itemId/shipment)

```json
{
  "status": "success",
  "data": {
    "carrier": "CJ대한통운",
    "tracking_number": "123456789012",
    "shipping_status": "DELIVERED",
    "recipient_name": "홍길동",
    "recipient_address": "서울시 강남구...",
    "shipped_at": "2025-01-20T10:00:00Z",
    "delivered_at": "2025-01-22T15:30:00Z"
  }
}
```

---

## 8. 구현 우선순위

### Phase 1 (즉시 구현)
- [x] product_type에 'BUNDLE' 추가
- [x] order_item_status ENUM 추가
- [x] order_items.item_status 컬럼 추가
- [x] shipments 테이블 생성
- [ ] 마이그레이션 파일 작성
- [ ] OrderService 로직 수정

### Phase 2 (2차 확장)
- [ ] product_bundles 테이블 추가 (세트 상품 구성품 관리)
- [ ] 세트 상품 주문 생성 로직 구현
- [ ] 배송 추적 API 구현
- [ ] 관리자 페이지에서 배송 정보 입력 UI

### Phase 3 (3차 확장)
- [ ] order_notifications 테이블 추가
- [ ] 알림톡 연동 (카카오 알림톡 API)
- [ ] 자동 배송 추적 (택배사 API 연동)

---

## 9. 참고 자료

### E-commerce 베스트 프랙티스
- [Vertabelo - E-commerce Database Design](https://vertabelo.com/blog/er-diagram-for-online-shop/)
- [GeeksforGeeks - E-commerce Database Design](https://www.geeksforgeeks.org/dbms/how-to-design-a-relational-database-for-e-commerce-website/)
- [WooCommerce - Digital Product Handling](https://woocommerce.com/document/digital-downloadable-product-handling/)

### 핵심 설계 원칙
1. **Orders - OrderItems 분리**: 표준 e-commerce 패턴
2. **product_type 구분**: 디지털/실물/세트 상품 처리 분기
3. **Shipments 테이블 분리**: 배송 정보 별도 관리
4. **item_status 추가**: 개별 상품 상태 추적
5. **Denormalization**: 읽기 최적화 (total_price를 orders에 저장)

---

## 10. 문서 업데이트 필요

- [ ] `/specs/api/server/routes/orders/index.md` 업데이트
- [ ] `/specs/api/server/services/orders/index.md` 업데이트
- [ ] `/CLAUDE.md` 업데이트 (알림톡 계획 추가)
- [ ] `/types/database.ts` 재생성 (마이그레이션 후)
