# Order / Payment UI Specs

주문 및 결제 페이지의 UI/UX 설계 문서

> **범위**: 주문 생성부터 완료까지의 모든 사용자 인터페이스
> **관련 문서**:
> - API Routes: `/specs/api/server/routes/orders/index.md`
> - Service: `/specs/api/server/services/orders/index.md`

---

## 1. 페이지 개요

### 1.1 주문 플로우

```
상품 상세 → 구매하기 클릭
    ↓
주문/결제 페이지 (/order/[product_id])
    ↓
계좌이체 정보 표시
    ↓
주문 완료 페이지 (/order/complete/[order_id])
    ↓
마이페이지 주문 내역
```

### 1.2 핵심 기능

- **단일 상품 주문**: 장바구니 없이 즉시 구매
- **계좌이체 전용**: PG 연동 없음
- **배송 정보 입력**: 실물 굿즈만 (디지털 상품은 불필요)
- **주문자 정보**: 프로필에서 자동 입력 (수정 가능)

---

## 2. 페이지 구성

### 2.1 주문/결제 페이지

**경로**: `/order/[product_id]`

**목적**: 주문 정보 입력 및 최종 확인

**상세 스펙**: [checkout.md](./checkout.md)

### 2.2 주문 완료 페이지

**경로**: `/order/complete/[order_id]`

**목적**: 주문 완료 안내 및 계좌이체 정보 제공

**상세 스펙**: [confirmation.md](./confirmation.md)

---

## 3. 공통 컴포넌트

### 3.1 OrderSummary

**위치**: `src/components/order/OrderSummary.tsx`

**용도**: 주문 요약 정보 표시

**Props**:
```typescript
interface OrderSummaryProps {
  product: {
    id: string;
    name: string;
    type: 'VOICE_PACK' | 'PHYSICAL_GOODS';
    price: number;
    image?: string;
  };
  quantity: number;
  shippingFee?: number;
}
```

**표시 내용**:
- 상품 이미지
- 상품명
- 수량
- 상품 금액
- 배송비 (실물 굿즈만)
- 총 결제 금액

### 3.2 BankAccountInfo

**위치**: `src/components/order/BankAccountInfo.tsx`

**용도**: 계좌이체 정보 표시

**Props**:
```typescript
interface BankAccountInfoProps {
  orderNumber: string;
  totalAmount: number;
}
```

**표시 내용**:
- 은행명
- 계좌번호
- 예금주
- 입금 금액
- 주문번호 (입금자명에 포함 필수)
- 복사 버튼

### 3.3 ShippingForm

**위치**: `src/components/order/ShippingForm.tsx`

**용도**: 배송 정보 입력 폼

**Props**:
```typescript
interface ShippingFormProps {
  initialValues?: {
    name?: string;
    phone?: string;
    address?: string;
    memo?: string;
  };
  onChange: (values: ShippingInfo) => void;
}
```

**필드**:
- 수령인 이름 (필수)
- 연락처 (필수)
- 배송 주소 (필수)
- 배송 메모 (선택)

---

## 4. 사용자 시나리오

### 4.1 디지털 상품 (보이스팩) 구매

1. 상품 상세 페이지에서 "구매하기" 클릭
2. 로그인 확인 (비로그인 시 로그인 페이지로)
3. 주문/결제 페이지 진입
   - 상품 정보 표시
   - 주문자 정보 자동 입력 (프로필에서)
   - 배송 정보 폼 **숨김**
4. "주문하기" 버튼 클릭
5. 주문 완료 페이지 표시
   - 계좌이체 정보
   - 주문번호
   - 입금 안내
6. 입금 후 관리자 확인 대기
7. 입금 확인 시 마이페이지에서 다운로드 가능

### 4.2 실물 굿즈 구매

1. 상품 상세 페이지에서 "구매하기" 클릭
2. 로그인 확인
3. 주문/결제 페이지 진입
   - 상품 정보 표시
   - 주문자 정보 자동 입력
   - **배송 정보 폼 표시**
4. 배송 정보 입력
5. "주문하기" 버튼 클릭
6. 주문 완료 페이지 표시
7. 입금 후 관리자 확인 및 배송 진행

---

## 5. 에러 처리

### 5.1 주문 불가능한 경우

- **품절**: "죄송합니다. 현재 품절된 상품입니다"
- **비활성 상품**: "판매가 종료된 상품입니다"
- **재고 부족**: "재고가 부족합니다 (남은 재고: X개)"

### 5.2 입력 검증

- **배송 정보 누락**: "배송 정보를 모두 입력해주세요"
- **연락처 형식**: "올바른 연락처를 입력해주세요"
- **주소 누락**: "배송 주소를 입력해주세요"

### 5.3 네트워크 에러

- **주문 생성 실패**: "주문 처리 중 오류가 발생했습니다. 다시 시도해주세요"
- **타임아웃**: "네트워크 연결을 확인해주세요"

---

## 6. UI/UX 가이드라인

### 6.1 디자인 원칙

- **단순함**: 최소한의 입력 필드
- **명확함**: 각 단계가 명확히 구분
- **신뢰감**: 계좌 정보가 눈에 잘 보이도록

### 6.2 반응형

- **Mobile**: 단일 컬럼, 큰 입력 필드
- **Desktop**: 좌측 주문 정보, 우측 요약

### 6.3 접근성

- **키보드 네비게이션**: Tab 순서 최적화
- **스크린 리더**: 모든 폼 필드에 label
- **에러 메시지**: 명확하고 구체적

---

## 7. 다음 단계 (MVP 이후)

- [ ] 장바구니 기능
- [ ] 쿠폰/할인 코드
- [ ] 여러 결제 수단
- [ ] 배송비 자동 계산
- [ ] 우편번호 검색 API 연동
- [ ] SMS/이메일 알림
