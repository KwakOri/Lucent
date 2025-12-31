# Admin Products UI 스펙

이 문서는 **상품 관리** UI 스펙을 정의한다.

> **경로**: `/admin/products`
> **권한**: 관리자 전용
> **관련 API**: `/api/products` (이미 구현됨 ✅)

---

## 1. 페이지 개요

레이블의 상품(보이스팩, 실물 굿즈)을 관리하는 페이지.

### 1.1 주요 기능
- 상품 목록 조회 (타입별, 아티스트별)
- 상품 등록
- 상품 정보 수정
- 상품 삭제 (소프트 삭제)
- 재고 관리 (실물 굿즈)

---

## 2. 레이아웃 구조

```tsx
<AdminProductsPage>
  <PageHeader
    title="상품 관리"
    action={<Button href="/admin/products/new">+ 상품 등록</Button>}
  />

  {/* 필터 */}
  <FilterBar>
    <Select label="타입" options={['전체', '보이스팩', '실물 굿즈']} />
    <Select label="아티스트" options={['전체', '미루루', 'Drips']} />
    <Select label="상태" options={['전체', '활성', '비활성']} />
    <SearchInput placeholder="상품명, 슬러그 검색" />
  </FilterBar>

  {/* 상품 목록 */}
  <ProductsTable />
</AdminProductsPage>
```

---

## 3. 컴포넌트 상세

### 3.1 상품 테이블 (ProductsTable)

**컬럼:**
```
┌──────────────────────────────────────────────────────────────────────┐
│ 이미지 │ 상품명           │ 타입   │ 아티스트 │ 가격   │ 재고 │ 상태 │ 작업  │
├──────────────────────────────────────────────────────────────────────┤
│ [IMG]  │ 미루루 보이스팩   │ 디지털 │ 미루루   │ 10,000 │ -    │ 활성 │ [수정][삭제] │
│ [IMG]  │ 미루루 키링      │ 실물   │ 미루루   │ 5,000  │ 50   │ 활성 │ [수정][삭제] │
└──────────────────────────────────────────────────────────────────────┘
```

**기능:**
- **정렬**: 이름, 가격, 생성일
- **필터**: 타입, 아티스트, 상태
- **검색**: 상품명, 슬러그
- **페이지네이션**: 20개씩

**액션:**
- **수정**: `/admin/products/[id]/edit` 이동
- **삭제**: 확인 다이얼로그 후 `is_active = false` 처리

### 3.2 상품 등록/수정 폼 (ProductForm)

**경로:**
- 등록: `/admin/products/new`
- 수정: `/admin/products/[id]/edit`

**UI:**
```
┌─────────────────────────────────────┐
│ 상품 등록                            │
├─────────────────────────────────────┤
│                                      │
│ 상품 타입 * (변경 불가)              │
│ ( ) 보이스팩  ( ) 실물 굿즈          │
│                                      │
│ 소속 아티스트 *                      │
│ [Select: 미루루, Drips...]          │
│                                      │
│ 상품명 *                             │
│ [입력]                               │
│                                      │
│ 슬러그 (URL) *                       │
│ [입력] 예: voicepack-vol1            │
│ → /goods/miruru/voicepack-vol1       │
│                                      │
│ 메인 이미지 *                        │
│ [이미지 업로드]                      │
│                                      │
│ 추가 이미지 (선택)                   │
│ [이미지 업로드 (최대 5개)]           │
│                                      │
│ 가격 *                               │
│ [입력] 원                            │
│                                      │
│ 설명                                 │
│ [Textarea]                           │
│                                      │
│ --- 보이스팩 전용 ---                │
│ 샘플 파일 URL                        │
│ [입력] Cloudflare R2 URL             │
│                                      │
│ 디지털 상품 파일 URL *               │
│ [입력] Cloudflare R2 URL             │
│                                      │
│ --- 실물 굿즈 전용 ---               │
│ 재고 수량 *                          │
│ [입력] 개                            │
│                                      │
│ 무게 (g)                             │
│ [입력] 배송비 계산용                 │
│                                      │
│ 활성 상태                            │
│ [x] 활성화                           │
│                                      │
│ [취소] [저장]                        │
└─────────────────────────────────────┘
```

**필드 상세:**

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `artist_id` | UUID | ✅ | 소속 아티스트 |
| `type` | ENUM | ✅ | `VOICE_PACK` or `PHYSICAL_GOODS` |
| `name` | string | ✅ | 상품명 (최대 100자) |
| `slug` | string | ✅ | URL 슬러그 (영문, 숫자, 하이픈만) |
| `main_image_id` | UUID | ✅ | 메인 이미지 |
| `images` | UUID[] | ⭕ | 추가 이미지 (최대 5개) |
| `price` | number | ✅ | 가격 (원) |
| `description` | string | ⭕ | 상품 설명 (최대 2000자) |
| `sample_file_url` | string | ⭕ | 샘플 파일 (보이스팩만) |
| `digital_file_url` | string | ✅ | 디지털 상품 파일 (보이스팩만) |
| `stock_quantity` | number | ✅ | 재고 (실물 굿즈만, 기본: 0) |
| `weight_grams` | number | ⭕ | 무게 (실물 굿즈만) |
| `is_active` | boolean | ✅ | 활성 상태 (기본: true) |

**유효성 검사 (Zod):**
```ts
const productSchema = z.object({
  artist_id: z.string().uuid('아티스트를 선택하세요'),
  type: z.enum(['VOICE_PACK', 'PHYSICAL_GOODS']),
  name: z.string().min(1, '상품명을 입력하세요').max(100),
  slug: z.string()
    .min(1, '슬러그를 입력하세요')
    .regex(/^[a-z0-9-]+$/, '영문 소문자, 숫자, 하이픈만 사용 가능')
    .max(50),
  main_image_id: z.string().uuid('메인 이미지를 업로드하세요'),
  images: z.array(z.string().uuid()).max(5, '최대 5개까지 업로드 가능').optional(),
  price: z.number().int().min(0, '가격을 입력하세요'),
  description: z.string().max(2000).optional(),
  sample_file_url: z.string().url().optional(),
  digital_file_url: z.string().url().optional(),
  stock_quantity: z.number().int().min(0).optional(),
  weight_grams: z.number().int().min(0).optional(),
  is_active: z.boolean().default(true),
}).refine(
  (data) => {
    if (data.type === 'VOICE_PACK') {
      return !!data.digital_file_url;
    }
    return true;
  },
  { message: '디지털 상품 파일 URL을 입력하세요', path: ['digital_file_url'] }
);
```

**API 호출:**
- **등록**: `POST /api/products`
- **수정**: `PATCH /api/products/[id]`

---

## 4. 상태 관리

### 4.1 React Query Hooks

```ts
// 상품 목록
const { data: products } = useQuery({
  queryKey: ['admin', 'products', filters],
  queryFn: () => fetchAdminProducts(filters),
});

// 상품 생성
const createProduct = useMutation({
  mutationFn: (data) => createProductApi(data),
  onSuccess: () => {
    queryClient.invalidateQueries(['admin', 'products']);
    router.push('/admin/products');
    toast.success('상품이 등록되었습니다');
  },
});

// 상품 수정
const updateProduct = useMutation({
  mutationFn: ({ id, data }) => updateProductApi(id, data),
  onSuccess: () => {
    queryClient.invalidateQueries(['admin', 'products']);
    toast.success('상품 정보가 수정되었습니다');
  },
});

// 상품 삭제
const deleteProduct = useMutation({
  mutationFn: (id) => deleteProductApi(id),
  onSuccess: () => {
    queryClient.invalidateQueries(['admin', 'products']);
    toast.success('상품이 삭제되었습니다');
  },
});
```

---

## 5. 이미지 업로드

### 5.1 MultiImageUploader 컴포넌트
- **메인 이미지**: 1개 필수
- **추가 이미지**: 최대 5개 (선택)
- **허용 형식**: JPG, PNG, WebP
- **최대 크기**: 10MB/개
- **권장 크기**: 800x800px (정사각형)
- **업로드 API**: `POST /api/images/upload`

### 5.2 UI
```
메인 이미지 *
┌─────────┐
│ [이미지] │
│  [삭제]  │
└─────────┘

추가 이미지 (최대 5개)
┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐
│[IMG]│ │[IMG]│ │[+]  │ │     │
└─────┘ └─────┘ └─────┘ └─────┘
```

---

## 6. 파일 업로드 (디지털 상품)

### 6.1 파일 업로드 플로우
```
1. 관리자가 R2에 직접 파일 업로드 (별도 도구)
   ↓
2. R2 Public URL 복사
   ↓
3. 상품 등록 폼에 URL 입력
   ↓
4. 저장
```

**주의:**
- 1차 MVP에서는 Admin UI에서 직접 파일 업로드 기능 없음
- Cloudflare R2 대시보드에서 수동 업로드
- 2차 확장에서 Admin UI 업로드 기능 추가 예정

---

## 7. 삭제 확인 다이얼로그

```tsx
<ConfirmDialog
  title="상품 삭제"
  message="정말 삭제하시겠습니까? 주문 이력은 그대로 유지됩니다."
  confirmText="삭제"
  cancelText="취소"
  variant="danger"
  onConfirm={() => deleteProduct.mutate(productId)}
/>
```

**주의사항:**
- 삭제는 실제로 `is_active = false` (소프트 삭제)
- 이미 주문된 상품도 삭제 가능 (주문 이력은 유지)

---

## 8. 1차 MVP 범위

### 포함 ✅
- ✅ 상품 목록 조회 (테이블)
- ✅ 상품 등록 폼 (보이스팩, 실물 굿즈)
- ✅ 상품 수정 폼
- ✅ 상품 삭제 (소프트)
- ✅ 이미지 업로드 (메인 + 추가)
- ✅ 재고 관리

### 제외 ⏸️
- ⏸️ Admin UI에서 디지털 파일 업로드
- ⏸️ 이미지 크롭/리사이즈
- ⏸️ 상품 복제
- ⏸️ 벌크 수정
- ⏸️ 가격 히스토리

---

## 9. 참고 문서

- Admin 메인: `/specs/ui/admin/index.md`
- Products API: `/specs/api/server/routes/products/index.md` ✅
- Images API: `/specs/api/server/routes/images/index.md`
- 공통 컴포넌트: `/specs/ui/common/`
