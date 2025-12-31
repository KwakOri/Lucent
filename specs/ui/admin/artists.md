# Admin Artists UI 스펙

이 문서는 **아티스트 관리** UI 스펙을 정의한다.

> **경로**: `/admin/artists`
> **권한**: 관리자 전용
> **관련 API**: `/api/artists` (생성/수정/삭제 API 추가 필요)

---

## 1. 페이지 개요

레이블 소속 아티스트의 정보를 관리하는 페이지.

### 1.1 주요 기능
- 아티스트 목록 조회 (전체, 활성/비활성)
- 아티스트 등록
- 아티스트 정보 수정
- 아티스트 삭제 (소프트 삭제)

---

## 2. 레이아웃 구조

```tsx
<AdminArtistsPage>
  <PageHeader
    title="아티스트 관리"
    action={<Button href="/admin/artists/new">+ 아티스트 등록</Button>}
  />

  {/* 필터 */}
  <FilterBar>
    <Select options={['전체', '활성', '비활성']} />
    <SearchInput placeholder="이름, 슬러그 검색" />
  </FilterBar>

  {/* 아티스트 목록 */}
  <ArtistsTable />
</AdminArtistsPage>
```

---

## 3. 컴포넌트 상세

### 3.1 아티스트 테이블 (ArtistsTable)

**컬럼:**
```
┌────────────────────────────────────────────────────────────┐
│ 프로필 │ 이름   │ 슬러그  │ 프로젝트 │ 상태   │ 작업  │
├────────────────────────────────────────────────────────────┤
│ [IMG]  │ 미루루 │ miruru  │ Project1 │ 활성   │ [수정][삭제] │
│ [IMG]  │ Drips  │ drips   │ Project1 │ 비활성 │ [수정][삭제] │
└────────────────────────────────────────────────────────────┘
```

**기능:**
- **정렬**: 이름, 생성일
- **필터**: 활성/비활성 상태
- **검색**: 이름, 슬러그
- **페이지네이션**: 20개씩

**액션:**
- **수정**: `/admin/artists/[id]/edit` 이동
- **삭제**: 확인 다이얼로그 후 `is_active = false` 처리

### 3.2 아티스트 등록/수정 폼 (ArtistForm)

**경로:**
- 등록: `/admin/artists/new`
- 수정: `/admin/artists/[id]/edit`

**UI:**
```
┌─────────────────────────────────────┐
│ 아티스트 등록                        │
├─────────────────────────────────────┤
│                                      │
│ 프로필 이미지 *                      │
│ [이미지 업로드 영역]                 │
│                                      │
│ 이름 *                               │
│ [입력]                               │
│                                      │
│ 슬러그 (URL) *                       │
│ [입력] 예: miruru                    │
│ → /goods/miruru                      │
│                                      │
│ 소속 프로젝트 *                      │
│ [Select: Project 1, Project 2...]   │
│                                      │
│ 설명 (선택)                          │
│ [Textarea]                           │
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
| `profile_image_id` | UUID | ✅ | 프로필 이미지 (images 테이블 참조) |
| `name` | string | ✅ | 아티스트 이름 (최대 100자) |
| `slug` | string | ✅ | URL 슬러그 (영문, 숫자, 하이픈만) |
| `project_id` | UUID | ✅ | 소속 프로젝트 |
| `description` | string | ⭕ | 아티스트 소개 (최대 500자) |
| `is_active` | boolean | ✅ | 활성 상태 (기본: true) |

**유효성 검사 (Zod):**
```ts
const artistSchema = z.object({
  name: z.string().min(1, '이름을 입력하세요').max(100),
  slug: z.string()
    .min(1, '슬러그를 입력하세요')
    .regex(/^[a-z0-9-]+$/, '영문 소문자, 숫자, 하이픈만 사용 가능')
    .max(50),
  project_id: z.string().uuid('프로젝트를 선택하세요'),
  profile_image_id: z.string().uuid('프로필 이미지를 업로드하세요'),
  description: z.string().max(500).optional(),
  is_active: z.boolean().default(true),
});
```

**API 호출:**
- **등록**: `POST /api/artists`
- **수정**: `PATCH /api/artists/[id]`

---

## 4. 상태 관리

### 4.1 React Query Hooks

```ts
// 아티스트 목록
const { data: artists } = useQuery({
  queryKey: ['admin', 'artists', filters],
  queryFn: () => fetchAdminArtists(filters),
});

// 아티스트 생성
const createArtist = useMutation({
  mutationFn: (data) => createArtistApi(data),
  onSuccess: () => {
    queryClient.invalidateQueries(['admin', 'artists']);
    router.push('/admin/artists');
    toast.success('아티스트가 등록되었습니다');
  },
});

// 아티스트 수정
const updateArtist = useMutation({
  mutationFn: ({ id, data }) => updateArtistApi(id, data),
  onSuccess: () => {
    queryClient.invalidateQueries(['admin', 'artists']);
    toast.success('아티스트 정보가 수정되었습니다');
  },
});

// 아티스트 삭제
const deleteArtist = useMutation({
  mutationFn: (id) => deleteArtistApi(id),
  onSuccess: () => {
    queryClient.invalidateQueries(['admin', 'artists']);
    toast.success('아티스트가 삭제되었습니다');
  },
});
```

---

## 5. 이미지 업로드

### 5.1 ImageUploader 컴포넌트
- **허용 형식**: JPG, PNG, WebP
- **최대 크기**: 5MB
- **권장 크기**: 500x500px (정사각형)
- **업로드 API**: `POST /api/images/upload`

### 5.2 업로드 플로우
```
1. 사용자가 이미지 선택
   ↓
2. 클라이언트에서 유효성 검사 (형식, 크기)
   ↓
3. POST /api/images/upload (FormData)
   ↓
4. 서버에서 R2에 업로드
   ↓
5. images 테이블에 저장
   ↓
6. image_id 반환
   ↓
7. 폼에 image_id 설정
```

---

## 6. 삭제 확인 다이얼로그

```tsx
<ConfirmDialog
  title="아티스트 삭제"
  message="정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다."
  confirmText="삭제"
  cancelText="취소"
  variant="danger"
  onConfirm={() => deleteArtist.mutate(artistId)}
/>
```

**주의사항:**
- 삭제는 실제로 `is_active = false` (소프트 삭제)
- 아티스트에 연결된 상품이 있으면 삭제 불가 (에러 메시지 표시)

---

## 7. 1차 MVP 범위

### 포함 ✅
- ✅ 아티스트 목록 조회 (테이블)
- ✅ 아티스트 등록 폼
- ✅ 아티스트 수정 폼
- ✅ 아티스트 삭제 (소프트)
- ✅ 이미지 업로드
- ✅ 슬러그 중복 검사

### 제외 ⏸️
- ⏸️ 드래그 앤 드롭 이미지 업로드
- ⏸️ 이미지 크롭/리사이즈
- ⏸️ 아티스트 복제
- ⏸️ 벌크 수정

---

## 8. 참고 문서

- Admin 메인: `/specs/ui/admin/index.md`
- Artists API: `/specs/api/server/routes/artists/index.md` (추가 필요)
- Images API: `/specs/api/server/routes/images/index.md`
- 공통 컴포넌트: `/specs/ui/common/`
