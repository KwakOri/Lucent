# Checkout Page (주문/결제 페이지)

상품 구매를 위한 주문 정보 입력 및 확인 페이지

> **경로**: `/order/[product_id]`
> **인증**: 로그인 필수
> **관련 API**: `POST /api/orders`

---

## 1. 페이지 구조

```
┌─────────────────────────────────────────┐
│  Header                                  │
├─────────────────────────────────────────┤
│  주문/결제                               │
│                                          │
│  ┌─────────────────┬─────────────────┐  │
│  │                 │                 │  │
│  │  Left Section   │  Right Section  │  │
│  │  (입력 폼)      │  (주문 요약)    │  │
│  │                 │                 │  │
│  └─────────────────┴─────────────────┘  │
│                                          │
└─────────────────────────────────────────┘
```

### 1.1 Mobile Layout

```
┌───────────────────────┐
│ 주문/결제             │
├───────────────────────┤
│ 주문 요약             │
│ [상품 정보]           │
├───────────────────────┤
│ 주문자 정보           │
│ [이름, 연락처]        │
├───────────────────────┤
│ 배송 정보 (실물만)    │
│ [배송지 입력]         │
├───────────────────────┤
│ 주문 금액             │
│ 총 XX,XXX원          │
├───────────────────────┤
│ [주문하기 버튼]       │
└───────────────────────┘
```

---

## 2. Left Section (입력 폼)

### 2.1 주문자 정보

**상태**: 자동 입력 (profiles 테이블에서)

**필드**:
```tsx
<section className="order-customer-info">
  <h2>주문자 정보</h2>

  <div className="info-display">
    <div className="field">
      <label>이름</label>
      <span>{profile.full_name}</span>
    </div>

    <div className="field">
      <label>연락처</label>
      <span>{profile.phone_number}</span>
    </div>

    <div className="field">
      <label>이메일</label>
      <span>{user.email}</span>
    </div>
  </div>

  <Link href="/mypage/profile">
    <Button variant="ghost" size="sm">
      정보 수정
    </Button>
  </Link>
</section>
```

**동작**:
- profiles 테이블에서 자동으로 가져옴
- 정보 수정은 마이페이지로 이동
- 정보가 없으면 입력 폼 표시 (또는 마이페이지로 리다이렉트)

### 2.2 배송 정보 (실물 굿즈만)

**조건**: `product.type === 'PHYSICAL_GOODS'`

**필드**:
```tsx
{isPhysicalGoods && (
  <section className="shipping-info">
    <h2>배송 정보</h2>

    <FormField
      label="수령인"
      name="shippingName"
      required
      placeholder="받으실 분의 이름을 입력하세요"
    />

    <FormField
      label="연락처"
      name="shippingPhone"
      required
      type="tel"
      placeholder="010-0000-0000"
    />

    <FormField
      label="배송 주소"
      name="shippingAddress"
      required
      type="textarea"
      rows={3}
      placeholder="상세 주소를 입력하세요"
    />

    <FormField
      label="배송 메모"
      name="shippingMemo"
      placeholder="배송 시 요청사항을 입력하세요 (선택)"
    />

    <Checkbox
      label="주문자 정보와 동일"
      onChange={handleCopyCustomerInfo}
    />
  </section>
)}
```

**검증 규칙**:
- 수령인: 필수, 2-50자
- 연락처: 필수, 전화번호 형식
- 배송 주소: 필수, 10자 이상
- 배송 메모: 선택, 200자 이하

### 2.3 약관 동의

```tsx
<section className="terms-agreement">
  <Checkbox
    required
    label={
      <>
        <Link href="/terms" target="_blank">이용약관</Link> 및{' '}
        <Link href="/privacy" target="_blank">개인정보처리방침</Link>에 동의합니다
      </>
    }
  />
</section>
```

---

## 3. Right Section (주문 요약)

### 3.1 상품 정보

```tsx
<aside className="order-summary">
  <h2>주문 상품</h2>

  <div className="product-card">
    {product.main_image && (
      <img
        src={product.main_image.public_url}
        alt={product.name}
        className="product-image"
      />
    )}

    <div className="product-info">
      <h3>{product.name}</h3>
      <p className="product-type">
        {product.type === 'VOICE_PACK' ? '디지털 상품' : '실물 굿즈'}
      </p>
      <p className="product-price">
        {product.price.toLocaleString()}원
      </p>
    </div>
  </div>
</aside>
```

### 3.2 결제 금액

```tsx
<div className="payment-summary">
  <h3>결제 금액</h3>

  <dl>
    <dt>상품 금액</dt>
    <dd>{product.price.toLocaleString()}원</dd>

    {isPhysicalGoods && (
      <>
        <dt>배송비</dt>
        <dd>{shippingFee.toLocaleString()}원</dd>
      </>
    )}

    <dt className="total">총 결제 금액</dt>
    <dd className="total">{totalAmount.toLocaleString()}원</dd>
  </dl>
</div>
```

### 3.3 결제 안내

```tsx
<div className="payment-notice">
  <h4>결제 안내</h4>
  <ul>
    <li>본 상점은 계좌이체로만 결제 가능합니다</li>
    <li>주문 후 계좌번호가 안내됩니다</li>
    <li>입금 확인 후 상품이 발송됩니다</li>
    {product.type === 'VOICE_PACK' && (
      <li>디지털 상품은 입금 확인 즉시 다운로드 가능합니다</li>
    )}
  </ul>
</div>
```

---

## 4. 하단 액션

```tsx
<div className="checkout-actions">
  <Button
    variant="outline"
    size="lg"
    onClick={() => router.back()}
  >
    취소
  </Button>

  <Button
    variant="primary"
    size="lg"
    onClick={handleSubmitOrder}
    disabled={!isValid || isLoading}
  >
    {isLoading ? '주문 중...' : `${totalAmount.toLocaleString()}원 주문하기`}
  </Button>
</div>
```

---

## 5. 상태 관리

### 5.1 Form State

```typescript
interface CheckoutFormState {
  // 배송 정보 (실물 굿즈만)
  shippingName?: string;
  shippingPhone?: string;
  shippingAddress?: string;
  shippingMemo?: string;

  // 약관 동의
  agreedToTerms: boolean;
}

const initialState: CheckoutFormState = {
  shippingName: '',
  shippingPhone: '',
  shippingAddress: '',
  shippingMemo: '',
  agreedToTerms: false,
};
```

### 5.2 Validation State

```typescript
interface ValidationState {
  shippingName: string | null;
  shippingPhone: string | null;
  shippingAddress: string | null;
  agreedToTerms: string | null;
}
```

---

## 6. API 통합

### 6.1 주문 생성

**엔드포인트**: `POST /api/orders`

**Request**:
```typescript
interface CreateOrderRequest {
  items: [{
    productId: string;
    quantity: number;
  }];
  shippingName?: string;
  shippingPhone?: string;
  shippingAddress?: string;
  shippingMemo?: string;
}
```

**Response**:
```typescript
interface CreateOrderResponse {
  status: 'success';
  data: {
    id: string;
    order_number: string;
    total_price: number;
    status: 'PENDING';
    created_at: string;
  };
}
```

### 6.2 에러 처리

```typescript
try {
  const response = await fetch('/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(orderData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }

  const { data } = await response.json();
  router.push(`/order/complete/${data.id}`);

} catch (error) {
  toast.error(error.message || '주문 처리 중 오류가 발생했습니다');
}
```

---

## 7. 사용자 플로우

### 7.1 정상 플로우

```
1. 페이지 로드
   ↓
2. 상품 정보 fetch
   ↓
3. 프로필 정보 자동 입력
   ↓
4. 실물 굿즈인 경우 배송 정보 입력
   ↓
5. 약관 동의 체크
   ↓
6. "주문하기" 버튼 클릭
   ↓
7. 주문 생성 API 호출
   ↓
8. 주문 완료 페이지로 이동
```

### 7.2 에러 플로우

**비로그인 상태**:
```typescript
if (!user) {
  router.push(`/login?redirect=/order/${productId}`);
  return;
}
```

**상품 없음/품절**:
```typescript
if (!product) {
  return <EmptyState title="상품을 찾을 수 없습니다" />;
}

if (product.stock === 0) {
  return <EmptyState title="죄송합니다. 현재 품절된 상품입니다" />;
}
```

**프로필 정보 없음**:
```typescript
if (!profile?.full_name || !profile?.phone_number) {
  toast.error('프로필 정보를 먼저 등록해주세요');
  router.push('/mypage/profile');
  return;
}
```

---

## 8. 스타일링

### 8.1 Layout

```css
.checkout-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.checkout-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 2rem;
}

@media (max-width: 768px) {
  .checkout-grid {
    grid-template-columns: 1fr;
  }
}
```

### 8.2 Components

```css
.order-section {
  background: white;
  border-radius: 12px;
  padding: 24px;
  border: 1px solid #e5e7eb;
}

.order-summary {
  position: sticky;
  top: 2rem;
}

.payment-summary .total {
  font-size: 1.25rem;
  font-weight: bold;
  color: #1f2937;
  padding-top: 1rem;
  border-top: 2px solid #e5e7eb;
}
```

---

## 9. 접근성

### 9.1 ARIA 속성

```tsx
<form
  aria-label="주문 정보 입력"
  onSubmit={handleSubmit}
>
  <fieldset aria-label="배송 정보">
    {/* 배송 정보 필드 */}
  </fieldset>

  <button
    type="submit"
    aria-busy={isLoading}
    aria-label={`${totalAmount.toLocaleString()}원 주문하기`}
  >
    주문하기
  </button>
</form>
```

### 9.2 키보드 네비게이션

- Tab: 다음 필드로 이동
- Shift + Tab: 이전 필드로 이동
- Enter: 폼 제출

---

## 10. 테스트 시나리오

### 10.1 기능 테스트

- [ ] 디지털 상품 주문 (배송 정보 폼 숨김)
- [ ] 실물 굿즈 주문 (배송 정보 폼 표시)
- [ ] 프로필 정보 자동 입력
- [ ] "주문자 정보와 동일" 체크박스
- [ ] 약관 미동의 시 주문 불가
- [ ] 필수 필드 미입력 시 검증

### 10.2 에러 테스트

- [ ] 비로그인 상태 접근
- [ ] 품절 상품 접근
- [ ] 잘못된 product_id
- [ ] API 에러 응답
- [ ] 네트워크 타임아웃
