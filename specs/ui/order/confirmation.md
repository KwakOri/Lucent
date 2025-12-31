# Order Confirmation Page (주문 완료 페이지)

주문 완료 안내 및 계좌이체 정보 제공 페이지

> **경로**: `/order/complete/[order_id]`
> **인증**: 로그인 필수 (본인 주문만)
> **관련 API**: `GET /api/orders/:id`

---

## 1. 페이지 구조

```
┌─────────────────────────────────────┐
│  ✅ 주문이 완료되었습니다           │
├─────────────────────────────────────┤
│                                     │
│  주문번호: ORD-2025-XXXXX           │
│  주문일시: 2025-01-01 14:30         │
│                                     │
├─────────────────────────────────────┤
│  💳 계좌이체 정보                   │
│  ┌───────────────────────────────┐ │
│  │ 은행: 국민은행                │ │
│  │ 계좌번호: 123-456-789        │ │
│  │ 예금주: Lucent Management    │ │
│  │ 입금액: 15,000원             │ │
│  │ 입금자명: ORD-2025-XXXXX    │ │
│  │ [복사하기]                   │ │
│  └───────────────────────────────┘ │
├─────────────────────────────────────┤
│  📦 주문 상품                       │
│  ┌───────────────────────────────┐ │
│  │ [이미지] 상품명               │ │
│  │          15,000원             │ │
│  └───────────────────────────────┘ │
├─────────────────────────────────────┤
│  📝 입금 안내                       │
│  - 입금 시 입금자명에 주문번호 포함  │
│  - 입금 확인까지 영업일 기준 1-2일  │
│                                     │
├─────────────────────────────────────┤
│  [주문 상세 보기] [쇼핑 계속하기]   │
└─────────────────────────────────────┘
```

---

## 2. 섹션 구성

### 2.1 Header (성공 메시지)

```tsx
<section className="confirmation-header">
  <div className="success-icon">
    <CheckCircle size={64} className="text-green-500" />
  </div>

  <h1 className="title">주문이 완료되었습니다</h1>

  <p className="subtitle">
    입금 확인 후 {isDigital ? '다운로드 가능' : '상품이 발송'}됩니다
  </p>

  <div className="order-info">
    <dl>
      <dt>주문번호</dt>
      <dd className="order-number">{order.order_number}</dd>

      <dt>주문일시</dt>
      <dd>{formatDateTime(order.created_at)}</dd>
    </dl>
  </div>
</section>
```

### 2.2 계좌이체 정보

```tsx
<section className="bank-account-section">
  <h2>💳 계좌이체 정보</h2>

  <div className="bank-info-card">
    <dl className="bank-details">
      <div className="bank-row">
        <dt>은행</dt>
        <dd>국민은행</dd>
      </div>

      <div className="bank-row">
        <dt>계좌번호</dt>
        <dd className="account-number">
          123-456-789012
          <button
            onClick={() => copyToClipboard('123-456-789012')}
            className="copy-btn"
            aria-label="계좌번호 복사"
          >
            <Copy size={16} />
          </button>
        </dd>
      </div>

      <div className="bank-row">
        <dt>예금주</dt>
        <dd>Lucent Management</dd>
      </div>

      <div className="bank-row highlight">
        <dt>입금 금액</dt>
        <dd className="amount">
          {order.total_price.toLocaleString()}원
        </dd>
      </div>

      <div className="bank-row highlight">
        <dt>입금자명</dt>
        <dd className="depositor-name">
          {order.order_number}
          <button
            onClick={() => copyToClipboard(order.order_number)}
            className="copy-btn"
          >
            <Copy size={16} />
          </button>
        </dd>
      </div>
    </dl>

    <Button
      variant="primary"
      fullWidth
      onClick={handleCopyAllInfo}
      leftIcon={<Copy size={18} />}
    >
      입금 정보 전체 복사
    </Button>
  </div>
</section>
```

**복사 기능**:
```typescript
const handleCopyAllInfo = () => {
  const bankInfo = `
은행: 국민은행
계좌번호: 123-456-789012
예금주: Lucent Management
입금액: ${order.total_price.toLocaleString()}원
입금자명: ${order.order_number}
  `.trim();

  navigator.clipboard.writeText(bankInfo);
  toast.success('입금 정보가 복사되었습니다');
};
```

### 2.3 주문 상품

```tsx
<section className="order-items-section">
  <h2>📦 주문 상품</h2>

  {order.items.map((item) => (
    <div key={item.id} className="order-item-card">
      {item.product?.main_image && (
        <img
          src={item.product.main_image.public_url}
          alt={item.product_name}
          className="product-image"
        />
      )}

      <div className="item-info">
        <h3>{item.product_name}</h3>
        <p className="product-type">
          {item.product_type === 'VOICE_PACK' ? '디지털 상품' : '실물 굿즈'}
        </p>
        <p className="price">
          {item.price_snapshot.toLocaleString()}원
        </p>
      </div>
    </div>
  ))}

  <div className="order-total">
    <span>총 결제 금액</span>
    <span className="total-amount">
      {order.total_price.toLocaleString()}원
    </span>
  </div>
</section>
```

### 2.4 배송 정보 (실물 굿즈만)

```tsx
{hasPhysicalGoods && (
  <section className="shipping-info-section">
    <h2>🚚 배송 정보</h2>

    <dl className="shipping-details">
      <div>
        <dt>수령인</dt>
        <dd>{order.shipping_name}</dd>
      </div>

      <div>
        <dt>연락처</dt>
        <dd>{order.shipping_phone}</dd>
      </div>

      <div>
        <dt>배송 주소</dt>
        <dd>{order.shipping_address}</dd>
      </div>

      {order.shipping_memo && (
        <div>
          <dt>배송 메모</dt>
          <dd>{order.shipping_memo}</dd>
        </div>
      )}
    </dl>
  </section>
)}
```

### 2.5 입금 안내

```tsx
<section className="payment-guide">
  <h2>📝 입금 안내</h2>

  <div className="guide-card">
    <ul className="guide-list">
      <li>
        <strong>입금자명</strong>에 반드시 주문번호(
        <code>{order.order_number}</code>)를 포함해주세요
      </li>
      <li>입금 확인까지 영업일 기준 1-2일 소요됩니다</li>
      {isDigital && (
        <li>
          디지털 상품은 입금 확인 즉시 마이페이지에서 다운로드 가능합니다
        </li>
      )}
      {hasPhysicalGoods && (
        <li>실물 굿즈는 입금 확인 후 3-5일 이내 배송됩니다</li>
      )}
      <li>주문 내역은 마이페이지에서 확인하실 수 있습니다</li>
    </ul>

    <div className="contact-info">
      <p>문의사항이 있으시면 이메일로 연락주세요</p>
      <a href="mailto:support@lucentlabel.com">
        support@lucentlabel.com
      </a>
    </div>
  </div>
</section>
```

### 2.6 다음 단계

```tsx
<section className="next-steps">
  <h2>다음 단계</h2>

  <div className="timeline">
    <div className="step current">
      <div className="step-icon">1</div>
      <div className="step-content">
        <h3>주문 완료</h3>
        <p>주문이 정상적으로 접수되었습니다</p>
      </div>
    </div>

    <div className="step">
      <div className="step-icon">2</div>
      <div className="step-content">
        <h3>입금 대기</h3>
        <p>계좌이체로 입금해주세요</p>
      </div>
    </div>

    <div className="step">
      <div className="step-icon">3</div>
      <div className="step-content">
        <h3>입금 확인</h3>
        <p>영업일 기준 1-2일 소요</p>
      </div>
    </div>

    <div className="step">
      <div className="step-icon">4</div>
      <div className="step-content">
        <h3>
          {isDigital ? '다운로드 가능' : '배송 시작'}
        </h3>
        <p>
          {isDigital
            ? '마이페이지에서 다운로드'
            : '3-5일 이내 배송 완료'}
        </p>
      </div>
    </div>
  </div>
</section>
```

---

## 3. 하단 액션

```tsx
<div className="confirmation-actions">
  <Button
    variant="outline"
    size="lg"
    onClick={() => router.push(`/mypage/orders/${order.id}`)}
    leftIcon={<FileText size={18} />}
  >
    주문 상세 보기
  </Button>

  <Button
    variant="primary"
    size="lg"
    onClick={() => router.push('/shop')}
    leftIcon={<ShoppingBag size={18} />}
  >
    쇼핑 계속하기
  </Button>
</div>
```

---

## 4. 페이지 로직

### 4.1 Data Fetching

```typescript
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function OrderConfirmationPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.order_id as string;

  const [order, setOrder] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const response = await fetch(`/api/orders/${orderId}`);

        if (!response.ok) {
          throw new Error('주문 정보를 불러올 수 없습니다');
        }

        const { data } = await response.json();
        setOrder(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrder();
  }, [orderId]);

  if (isLoading) {
    return <Loading />;
  }

  if (error || !order) {
    return (
      <EmptyState
        title="주문을 찾을 수 없습니다"
        description={error}
      />
    );
  }

  // 렌더링...
}
```

### 4.2 권한 확인

```typescript
// 서버 컴포넌트에서 처리 (대안)
export default async function OrderConfirmationPage({ params }) {
  const { order_id } = await params;

  try {
    const order = await OrderService.getOrderById(order_id);

    // 본인 확인은 Service Layer에서 처리

    return <OrderConfirmationClient order={order} />;
  } catch (error) {
    notFound();
  }
}
```

---

## 5. 유틸리티 함수

### 5.1 복사 기능

```typescript
const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    toast.success('복사되었습니다');
  } catch (err) {
    toast.error('복사에 실패했습니다');
  }
};
```

### 5.2 날짜 포맷

```typescript
const formatDateTime = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};
```

### 5.3 상품 타입 확인

```typescript
const isDigital = order.items.some(
  (item) => item.product_type === 'VOICE_PACK'
);

const hasPhysicalGoods = order.items.some(
  (item) => item.product_type === 'PHYSICAL_GOODS'
);
```

---

## 6. 스타일링

### 6.1 Success Theme

```css
.confirmation-header {
  text-align: center;
  padding: 3rem 1rem;
  background: linear-gradient(to bottom, #f0fdf4, #ffffff);
}

.success-icon {
  animation: scaleIn 0.3s ease-out;
}

@keyframes scaleIn {
  from {
    transform: scale(0);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}
```

### 6.2 Bank Info Card

```css
.bank-info-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 10px 40px rgba(102, 126, 234, 0.3);
}

.bank-row.highlight {
  background: rgba(255, 255, 255, 0.1);
  padding: 12px;
  border-radius: 8px;
  margin-top: 8px;
}

.account-number,
.depositor-name {
  font-family: 'Monaco', 'Courier New', monospace;
  font-size: 1.125rem;
  font-weight: 600;
}
```

### 6.3 Timeline

```css
.timeline {
  position: relative;
  padding-left: 2rem;
}

.timeline::before {
  content: '';
  position: absolute;
  left: 1rem;
  top: 0;
  bottom: 0;
  width: 2px;
  background: #e5e7eb;
}

.step {
  position: relative;
  padding: 1rem 0;
}

.step-icon {
  position: absolute;
  left: -2rem;
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  background: #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
}

.step.current .step-icon {
  background: #10b981;
  color: white;
}
```

---

## 7. 접근성

### 7.1 화면 낭독기

```tsx
<div role="status" aria-live="polite">
  <h1>주문이 완료되었습니다</h1>
  <p>주문번호: {order.order_number}</p>
</div>

<section aria-labelledby="bank-info-heading">
  <h2 id="bank-info-heading">계좌이체 정보</h2>
  {/* ... */}
</section>
```

### 7.2 키보드 네비게이션

```tsx
<button
  onClick={copyToClipboard}
  aria-label="계좌번호 복사하기"
  tabIndex={0}
>
  <Copy />
</button>
```

---

## 8. 에러 처리

### 8.1 주문 없음

```tsx
if (!order) {
  return (
    <div className="error-state">
      <h1>주문을 찾을 수 없습니다</h1>
      <p>주문 번호를 확인해주세요</p>
      <Button onClick={() => router.push('/mypage/orders')}>
        내 주문 목록 보기
      </Button>
    </div>
  );
}
```

### 8.2 권한 없음

```tsx
if (order.user_id !== currentUser.id) {
  return (
    <div className="error-state">
      <h1>접근 권한이 없습니다</h1>
      <p>본인의 주문만 조회할 수 있습니다</p>
    </div>
  );
}
```

---

## 9. 이메일 알림 (향후)

주문 완료 시 자동 발송되는 이메일 내용:

**제목**: `[Lucent] 주문이 완료되었습니다 (${order.order_number})`

**내용**:
- 주문 번호
- 주문 일시
- 주문 상품 목록
- 계좌이체 정보
- 입금 안내
- 주문 상세 링크

---

## 10. 테스트 시나리오

### 10.1 정상 케이스

- [ ] 주문 완료 직후 페이지 진입
- [ ] 주문 정보 정상 표시
- [ ] 계좌번호 복사 기능
- [ ] 주문번호 복사 기능
- [ ] 전체 입금 정보 복사
- [ ] 디지털 상품 안내 표시
- [ ] 실물 굿즈 배송 정보 표시

### 10.2 에러 케이스

- [ ] 잘못된 order_id로 접근
- [ ] 다른 사람의 주문 접근
- [ ] 비로그인 상태 접근
- [ ] API 에러 처리

### 10.3 UX 테스트

- [ ] 모바일 반응형
- [ ] 복사 성공 토스트
- [ ] 버튼 클릭 피드백
- [ ] 로딩 상태 표시
