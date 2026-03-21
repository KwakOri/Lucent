# 개별 상품 상태 통합 마이그레이션 가이드

> **무중단 마이그레이션**: 프론트엔드 먼저 배포 → DB 마이그레이션 → 정리

## 목표

`order_items.item_status`를 `order_status`와 동일한 ENUM 값 체계로 통합하여:
1. 상태 관리 일관성 확보
2. 중복 상수 제거
3. "입금확인(PAID)" 상태 개별 상품에 추가

---

## 마이그레이션 단계

### ✅ 1단계: 프론트엔드 변경 배포 (완료)

**커밋**: `79a8c90` - Refactor: 개별 상품 상태를 주문 상태와 통합

**변경 사항**:
- `normalizeItemStatus()` 함수로 레거시 값 자동 변환
- `ITEM_STATUS_*` 상수를 `ORDER_STATUS_*`로 통합
- 서비스 로직에서 새 상태값 사용 (타입 캐스팅 포함)

**결과**:
- ✅ 레거시 데이터 호환성 확보
- ✅ 새 주문은 새 상태값 사용
- ✅ 사용자에게 올바른 레이블 표시

---

### 🔄 2단계: DB 마이그레이션 (이 단계)

**실행 시점**: 1단계 프로덕션 배포 후

#### 2-1. 마이그레이션 파일 실행

**파일**: `supabase/migrations/20250112000000_unify_item_status_with_order_status.sql`

**실행 방법**:

```bash
# Supabase Dashboard → SQL Editor에서 실행
# 또는 로컬에서 테스트 후 적용
```

**수행 작업**:
1. `item_status`를 TEXT 타입으로 임시 변환 (ENUM 제약 해제)

2. 레거시 상태값 변환 (TEXT 타입이므로 제약 없음):
   - `PROCESSING` → `MAKING`
   - `READY` → `PAID`
   - `SHIPPED` → `SHIPPING`
   - `DELIVERED` → `SHIPPING`
   - `COMPLETED` → `DONE`

3. `item_status`를 `order_status` 타입으로 변환:
   - DEFAULT 제거
   - 타입 변환
   - DEFAULT 재설정 (`PENDING`::order_status)

4. `order_item_status` ENUM 타입 삭제

5. 검증 및 인덱스 재생성

**예상 소요 시간**: 레코드 수에 따라 다름 (1000건 기준 < 1초)

#### 2-2. 마이그레이션 검증

마이그레이션 후 확인:

```sql
-- 1. item_status 타입 확인
SELECT
  table_name,
  column_name,
  udt_name
FROM information_schema.columns
WHERE table_name = 'order_items'
  AND column_name = 'item_status';

-- 예상 결과: udt_name = 'order_status'

-- 2. 상태값 분포 확인
SELECT
  item_status,
  COUNT(*) as count
FROM order_items
GROUP BY item_status
ORDER BY
  CASE item_status::TEXT
    WHEN 'PENDING' THEN 1
    WHEN 'PAID' THEN 2
    WHEN 'MAKING' THEN 3
    WHEN 'READY_TO_SHIP' THEN 4
    WHEN 'SHIPPING' THEN 5
    WHEN 'DONE' THEN 6
  END;

-- 3. 레거시 값이 남아있는지 확인
SELECT COUNT(*)
FROM order_items
WHERE item_status::TEXT IN ('PROCESSING', 'READY', 'SHIPPED', 'DELIVERED', 'COMPLETED');

-- 예상 결과: 0
```

#### 2-3. 문제 발생 시 롤백

```sql
-- 마이그레이션이 실패한 경우
-- Supabase Dashboard → Database → Backups에서 복원
-- 또는 스냅샷으로 롤백
```

---

### 🔧 3단계: 타입 재생성

```bash
# Supabase 타입 재생성
npx supabase gen types typescript \
  --project-id YOUR_PROJECT_ID \
  > types/database.ts
```

**변경 사항 확인**:
```typescript
// types/database.ts
export type Database = {
  public: {
    Enums: {
      // order_item_status: ... ← 삭제됨
      order_status: "PENDING" | "PAID" | "MAKING" | "READY_TO_SHIP" | "SHIPPING" | "DONE"
    }
  }
}
```

---

### 🧹 4단계: 코드 정리

#### 4-1. 타입 캐스팅 제거

**lib/server/services/order.service.ts**:

```typescript
// 변경 전
item_status: itemStatus as any,

// 변경 후
item_status: itemStatus,
```

**변경할 위치** (4곳):
- `createOrder` 메서드: line 176
- `updateItemStatus` 메서드: line 931
- `updateAllItemsStatus` 메서드: line 976
- `updateItemsStatus` 메서드: line 1003

#### 4-2. 타입 정의 정리

**lib/server/services/order.service.ts**:

```typescript
// 삭제
type OrderItemStatus = Enums<"order_item_status">;

// 모든 OrderItemStatus → OrderStatus로 변경 (이미 완료)
```

#### 4-3. @deprecated 주석 업데이트

**src/constants/order-status.ts**:

```typescript
/**
 * @deprecated DB 마이그레이션 완료됨. ORDER_STATUS_* 직접 사용
 * normalizeItemStatus()는 더 이상 필요 없지만 호환성을 위해 유지
 */
export const ITEM_STATUS_CONFIG = ORDER_STATUS_CONFIG;
```

---

### ✅ 5단계: 프로덕션 재배포

1. 코드 정리 커밋
2. 빌드 테스트:
   ```bash
   npm run build
   ```
3. 프로덕션 배포
4. 동작 확인:
   - 관리자 페이지에서 주문 상태 변경
   - 개별 상품 상태 올바르게 표시되는지 확인
   - 마이페이지에서 주문 내역 확인

---

## 롤백 시나리오

### 시나리오 1: 프론트엔드 배포 후 문제 발견 (2단계 전)

**영향**: 낮음 (DB는 아직 변경 안 됨)

**롤백 방법**:
```bash
# 이전 커밋으로 롤백
git revert 79a8c90
git push
```

### 시나리오 2: DB 마이그레이션 실패

**영향**: 중간

**롤백 방법**:
1. Supabase Dashboard → Database → Backups
2. 마이그레이션 직전 스냅샷으로 복원
3. 프론트엔드는 레거시 호환 모드로 계속 작동

### 시나리오 3: DB 마이그레이션 후 문제 발견

**영향**: 높음 (데이터 변경됨)

**복구 방법**:
1. 백업에서 복원 (데이터 손실 가능)
2. 또는 역방향 마이그레이션 작성:

```sql
-- 역방향 마이그레이션 (긴급 시)
-- 주의: 이미 생성된 새 상태값(PAID, READY_TO_SHIP)은 변환 불가

-- 1. order_item_status ENUM 재생성
CREATE TYPE order_item_status AS ENUM (
  'PENDING', 'PROCESSING', 'READY', 'SHIPPED', 'DELIVERED', 'COMPLETED'
);

-- 2. item_status 타입 변경
ALTER TABLE order_items
  ALTER COLUMN item_status TYPE order_item_status
  USING item_status::text::order_item_status;
```

---

## 체크리스트

### 마이그레이션 전

- [ ] 1단계 프로덕션 배포 완료
- [ ] 프로덕션에서 1단계 정상 동작 확인 (최소 1일)
- [ ] 데이터베이스 백업 생성
- [ ] 마이그레이션 SQL 검토

### 마이그레이션 중

- [ ] 마이그레이션 SQL 실행
- [ ] 마이그레이션 로그 확인 (NOTICE 메시지)
- [ ] 검증 쿼리 실행
- [ ] 레거시 값 0개 확인

### 마이그레이션 후

- [ ] Supabase 타입 재생성
- [ ] 타입 캐스팅 제거
- [ ] 빌드 테스트
- [ ] 프로덕션 재배포
- [ ] 관리자 페이지 동작 확인
- [ ] 마이페이지 동작 확인
- [ ] 새 주문 생성 테스트

---

## 예상 문제 및 해결

### 문제 1: "ENUM 타입 변환 실패" (해결됨)

**이전 증상**:
```
ERROR: invalid input value for enum order_item_status: "MAKING"
```

**해결 방법**: TEXT 타입을 중간에 거쳐서 변환 (현재 스크립트에 적용됨)
- `order_item_status` → `TEXT` → 값 변환 → `order_status`
- TEXT 타입에서는 ENUM 제약이 없어서 자유롭게 값 변환 가능

### 문제 2: "DEFAULT 값 캐스팅 실패" (해결됨)

**이전 증상**:
```
ERROR: default for column "item_status" cannot be cast automatically to type order_status
```

**해결 방법**: DEFAULT 제거 → 타입 변환 → DEFAULT 재설정 (현재 스크립트에 적용됨)
```sql
ALTER TABLE order_items ALTER COLUMN item_status DROP DEFAULT;
ALTER TABLE order_items ALTER COLUMN item_status TYPE order_status ...;
ALTER TABLE order_items ALTER COLUMN item_status SET DEFAULT 'PENDING'::order_status;
```

### 문제 3: "다른 테이블이 order_item_status 사용 중"

**증상**:
```
ERROR: cannot drop type order_item_status because other objects depend on it
```

**원인**: 예상치 못한 컬럼이 해당 타입 사용

**해결**:
```sql
-- 의존성 확인
SELECT
  table_name,
  column_name
FROM information_schema.columns
WHERE udt_name = 'order_item_status';

-- 해당 컬럼도 함께 마이그레이션 필요
```

### 문제 4: "프론트엔드에서 타입 에러"

**증상**: TypeScript 컴파일 에러

**원인**: types/database.ts 재생성 안 됨

**해결**:
```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > types/database.ts
```

---

## 참고 자료

- **1단계 커밋**: `79a8c90`
- **2단계 SQL**: `supabase/migrations/20250112000000_unify_item_status_with_order_status.sql`
- **관련 이슈**: 주문 상태와 개별 상품 상태 불일치 문제

---

## 문의

마이그레이션 중 문제가 발생하면:
1. 즉시 작업 중단
2. 데이터베이스 백업 확인
3. 로그 수집
4. 개발팀에 문의
