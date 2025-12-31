# TODO - 주문 시스템 v2 추가 기능

> **현재 상태**: 디지털 음원(보이스팩) 판매 중심
> **작성일**: 2025-12-31

---

## Phase 2: 실물 상품 지원 (추후 구현)

실물 굿즈 판매가 시작될 때 구현할 기능들:

### 2.1 관리자 배송 관리 API

- [ ] `POST /api/admin/orders/:orderId/items/:itemId/shipment`
  - 배송 정보 생성 (실물 상품 발송 준비)
  - OrderService.createShipment() 사용
  - 수령인 정보, 택배사, 운송장 번호 입력

- [ ] `PATCH /api/admin/shipments/:shipmentId`
  - 배송 정보 업데이트
  - OrderService.updateShipment() 사용
  - 운송장 번호 입력, 발송 상태 변경
  - shipped_at, delivered_at 자동 기록

- [ ] `POST /api/admin/orders/:orderId/items/:itemId/status`
  - 개별 주문 상품 상태 변경
  - OrderService.updateItemStatus() 사용
  - PENDING → PROCESSING → READY → SHIPPED → DELIVERED → COMPLETED

**참고 문서**:
- `/specs/api/server/services/orders/index.md` (섹션 10, 11)
- `/specs/database/order-system-v2.md` (Phase 2)

---

## Phase 3: 세트 상품 (번들) 지원 (추후 구현)

디지털 + 실물 조합 상품 판매 시 구현:

### 3.1 데이터베이스

- [x] `product_bundles` 테이블 생성 완료 (마이그레이션)
- [x] `product_type` ENUM에 'BUNDLE' 추가 완료
- [ ] 세트 상품 샘플 데이터 작성

### 3.2 백엔드 로직

- [ ] 세트 상품 주문 생성 로직
  - `product_bundles`에서 구성품 조회
  - 각 구성품마다 별도의 `order_items` 생성
  - 디지털 구성품 → download_url 관리
  - 실물 구성품 → shipments 레코드 생성

- [ ] 세트 상품 조회 로직
  - ProductService에 getBundleComponents() 추가
  - 세트 상품 상세 페이지에 구성품 표시

**구현 예시**:
```typescript
// 세트 상품: "미루루 보이스팩 Vol.1 + 키링 세트" (BUNDLE)
// 구성품 1: 미루루 보이스팩 Vol.1 (DIGITAL)
// 구성품 2: 미루루 키링 (PHYSICAL)

// 주문 시:
// order_items[0]: 보이스팩 (item_status: READY, download_url 있음)
// order_items[1]: 키링 (item_status: SHIPPED, shipments 레코드 있음)
```

### 3.3 프론트엔드

- [ ] 세트 상품 타입 정의 업데이트 (BUNDLE 포함)
- [ ] 세트 상품 상세 페이지 UI
  - 구성품 목록 표시
  - 개별 구성품 상태 표시 (디지털: 다운로드 가능, 실물: 배송 중)
- [ ] 마이페이지 주문 내역
  - 세트 상품의 구성품별 상태 표시
  - 디지털 다운로드 + 배송 추적 혼합 UI

**참고 문서**:
- `/specs/database/order-system-v2.md` (섹션 3.3, Phase 2)

---

## Phase 4: 알림톡 연동 (추후 구현)

고객 알림 자동화:

### 4.1 데이터베이스

- [x] `order_notifications` 테이블 스키마 준비 완료 (주석 처리)
- [ ] 마이그레이션 활성화

### 4.2 카카오 알림톡 API 연동

- [ ] 카카오 비즈니스 계정 설정
- [ ] 알림톡 템플릿 등록
  - 주문 접수 (입금 계좌 안내)
  - 입금 확인
  - 발송 완료 (운송장 번호)
  - 배송 완료
- [ ] NotificationService 구현
  - sendOrderCreatedNotification()
  - sendPaymentConfirmedNotification()
  - sendShippedNotification()
  - sendDeliveredNotification()

### 4.3 자동 발송 로직

- [ ] OrderService.createOrder() → 주문 접수 알림
- [ ] OrderService.updateOrderStatus('PAID') → 입금 확인 알림
- [ ] OrderService.updateShipment('SHIPPED') → 발송 완료 알림
- [ ] OrderService.updateShipment('DELIVERED') → 배송 완료 알림

**참고 문서**:
- `/specs/database/order-system-v2.md` (섹션 5)
- CLAUDE.md (알림톡 연동 계획)

---

## 현재 구현 완료 기능 (v1 - 디지털 음원 중심)

### ✅ 주문 시스템 v2 (디지털 상품)

- [x] DB 스키마 개선 (orders, order_items, shipments)
- [x] OrderService v2 메서드
  - [x] updateItemStatus (개별 상품 상태 관리)
  - [x] updateAllItemsStatus (일괄 상태 업데이트)
  - [x] createShipment (배송 정보 생성, 실물용)
  - [x] getShipmentInfo (배송 정보 조회)
  - [x] updateShipment (배송 정보 업데이트)
  - [x] getShipmentTracking (고객용 배송 추적)
- [x] 배송 추적 API (GET /api/orders/:orderId/items/:itemId/shipment)
- [x] 스펙 문서 업데이트
- [x] 타입 체크 및 에러 수정

### ✅ 디지털 음원 판매

- [x] 주문 생성 (계좌이체)
- [x] 입금 확인 (관리자)
- [x] 다운로드 권한 부여 (item_status: READY)
- [x] 다운로드 링크 생성 (R2 Presigned URL)
- [x] 다운로드 횟수 추적

---

## 우선순위

1. **현재 (v1)**: 디지털 음원 판매에 집중 ✅
2. **Phase 2**: 실물 상품 판매 시작 시 구현 (관리자 배송 관리)
3. **Phase 3**: 세트 상품 출시 시 구현
4. **Phase 4**: 고객 경험 개선 (알림톡)

---

## 참고 문서

- **Order System V2 설계**: `/specs/database/order-system-v2.md`
- **OrderService 스펙**: `/specs/api/server/services/orders/index.md`
- **Orders API Routes 스펙**: `/specs/api/server/routes/orders/index.md`
- **프로젝트 가이드**: `/CLAUDE.md`
