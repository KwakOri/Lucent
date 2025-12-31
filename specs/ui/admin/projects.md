# Admin Projects UI 스펙

이 문서는 **프로젝트 관리** UI 스펙을 정의한다.

> **경로**: `/admin/projects`
> **권한**: 관리자 전용
> **관련 API**: `/api/projects` (생성/수정/삭제 API 추가 필요)

---

## 1. 페이지 개요

레이블의 프로젝트를 관리하는 페이지.

### 1.1 주요 기능
- 프로젝트 목록 조회 (전체, 활성/비활성)
- 프로젝트 등록
- 프로젝트 정보 수정
- 프로젝트 삭제 (소프트 삭제)
- 프로젝트 순서 변경

---

## 2. 레이아웃 구조

```tsx
<AdminProjectsPage>
  <PageHeader
    title="프로젝트 관리"
    action={<Button href="/admin/projects/new">+ 프로젝트 등록</Button>}
  />

  {/* 필터 */}
  <FilterBar>
    <Select options={['전체', '활성', '비활성']} />
    <SearchInput placeholder="이름, 슬러그 검색" />
  </FilterBar>

  {/* 프로젝트 목록 */}
  <ProjectsTable />
</AdminProjectsPage>
```

---

## 3. 컴포넌트 상세

### 3.1 프로젝트 테이블 (ProjectsTable)

**컬럼:**
```
┌────────────────────────────────────────────────────────────────┐
│ 순서 │ 커버 │ 이름      │ 슬러그   │ 아티스트 │ 상태   │ 작업  │
├────────────────────────────────────────────────────────────────┤
│ ↕️ 1 │ [IMG] │ Project 1 │ project1 │ 미루루   │ 활성   │ [수정][삭제] │
│ ↕️ 2 │ [IMG] │ Project 2 │ project2 │ Drips    │ 활성   │ [수정][삭제] │
└────────────────────────────────────────────────────────────────┘
```

**기능:**
- **정렬**: 순서 (order_index), 이름, 생성일
- **순서 변경**: 드래그 앤 드롭 또는 화살표 버튼
- **필터**: 활성/비활성 상태
- **검색**: 이름, 슬러그
- **페이지네이션**: 20개씩

**액션:**
- **수정**: `/admin/projects/[id]/edit` 이동
- **삭제**: 확인 다이얼로그 후 `is_active = false` 처리

### 3.2 프로젝트 등록/수정 폼 (ProjectForm)

**경로:**
- 등록: `/admin/projects/new`
- 수정: `/admin/projects/[id]/edit`

**UI:**
```
┌─────────────────────────────────────┐
│ 프로젝트 등록                        │
├─────────────────────────────────────┤
│                                      │
│ 커버 이미지 *                        │
│ [이미지 업로드 영역]                 │
│ 권장: 1200x630px                    │
│                                      │
│ 프로젝트 이름 *                      │
│ [입력]                               │
│                                      │
│ 슬러그 (URL) *                       │
│ [입력] 예: project-name              │
│ → /projects/project-name             │
│                                      │
│ 설명                                 │
│ [Textarea]                           │
│                                      │
│ 출시일 (선택)                        │
│ [Date Picker]                        │
│                                      │
│ 외부 링크 (선택)                     │
│ YouTube: [입력]                      │
│ Spotify:  [입력]                     │
│ 기타:     [입력]                     │
│                                      │
│ 표시 순서 *                          │
│ [Number Input] (숫자가 작을수록 먼저) │
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
| `cover_image_id` | UUID | ✅ | 커버 이미지 (images 테이블 참조) |
| `name` | string | ✅ | 프로젝트 이름 (최대 100자) |
| `slug` | string | ✅ | URL 슬러그 (영문, 숫자, 하이픈만) |
| `description` | string | ⭕ | 프로젝트 설명 (최대 1000자) |
| `release_date` | date | ⭕ | 출시일 |
| `external_links` | JSON | ⭕ | 외부 링크 (YouTube, Spotify 등) |
| `order_index` | number | ✅ | 표시 순서 (기본: 0) |
| `is_active` | boolean | ✅ | 활성 상태 (기본: true) |

**유효성 검사 (Zod):**
```ts
const projectSchema = z.object({
  name: z.string().min(1, '프로젝트 이름을 입력하세요').max(100),
  slug: z.string()
    .min(1, '슬러그를 입력하세요')
    .regex(/^[a-z0-9-]+$/, '영문 소문자, 숫자, 하이픈만 사용 가능')
    .max(50),
  cover_image_id: z.string().uuid('커버 이미지를 업로드하세요'),
  description: z.string().max(1000).optional(),
  release_date: z.string().optional(), // ISO 8601 format
  external_links: z.object({
    youtube: z.string().url().optional(),
    spotify: z.string().url().optional(),
    other: z.string().url().optional(),
  }).optional(),
  order_index: z.number().int().min(0).default(0),
  is_active: z.boolean().default(true),
});
```

**API 호출:**
- **등록**: `POST /api/projects`
- **수정**: `PATCH /api/projects/[id]`

---

## 4. 상태 관리

### 4.1 React Query Hooks

```ts
// 프로젝트 목록
const { data: projects } = useQuery({
  queryKey: ['admin', 'projects', filters],
  queryFn: () => fetchAdminProjects(filters),
});

// 프로젝트 생성
const createProject = useMutation({
  mutationFn: (data) => createProjectApi(data),
  onSuccess: () => {
    queryClient.invalidateQueries(['admin', 'projects']);
    router.push('/admin/projects');
    toast.success('프로젝트가 등록되었습니다');
  },
});

// 프로젝트 수정
const updateProject = useMutation({
  mutationFn: ({ id, data }) => updateProjectApi(id, data),
  onSuccess: () => {
    queryClient.invalidateQueries(['admin', 'projects']);
    toast.success('프로젝트 정보가 수정되었습니다');
  },
});

// 프로젝트 삭제
const deleteProject = useMutation({
  mutationFn: (id) => deleteProjectApi(id),
  onSuccess: () => {
    queryClient.invalidateQueries(['admin', 'projects']);
    toast.success('프로젝트가 삭제되었습니다');
  },
});

// 순서 변경
const reorderProjects = useMutation({
  mutationFn: (orders) => updateProjectOrdersApi(orders),
  onSuccess: () => {
    queryClient.invalidateQueries(['admin', 'projects']);
    toast.success('순서가 변경되었습니다');
  },
});
```

---

## 5. 순서 변경 기능

### 5.1 UI
```
┌─────────────────────────┐
│ ↕️ Project 1            │  ← 드래그 핸들
│ ↕️ Project 2            │
│ ↕️ Project 3            │
└─────────────────────────┘
```

### 5.2 구현
- **라이브러리**: `@dnd-kit/core` (드래그 앤 드롭)
- **대체 방법**: ↑↓ 버튼으로 순서 변경

**API 호출:**
```ts
// PATCH /api/projects/reorder
{
  "orders": [
    { "id": "uuid1", "order_index": 0 },
    { "id": "uuid2", "order_index": 1 },
    { "id": "uuid3", "order_index": 2 }
  ]
}
```

---

## 6. 이미지 업로드

### 6.1 ImageUploader 컴포넌트
- **허용 형식**: JPG, PNG, WebP
- **최대 크기**: 10MB
- **권장 크기**: 1200x630px (16:9 비율)
- **업로드 API**: `POST /api/images/upload`

---

## 7. 외부 링크 관리

### 7.1 ExternalLinks 컴포넌트
```tsx
<ExternalLinksInput>
  <Input
    label="YouTube 링크"
    placeholder="https://youtube.com/..."
    icon={<YouTubeIcon />}
  />
  <Input
    label="Spotify 링크"
    placeholder="https://open.spotify.com/..."
    icon={<SpotifyIcon />}
  />
  <Input
    label="기타 링크"
    placeholder="https://..."
    icon={<LinkIcon />}
  />
</ExternalLinksInput>
```

**저장 형식 (JSONB):**
```json
{
  "youtube": "https://youtube.com/watch?v=...",
  "spotify": "https://open.spotify.com/track/...",
  "other": "https://example.com"
}
```

---

## 8. 삭제 확인 다이얼로그

```tsx
<ConfirmDialog
  title="프로젝트 삭제"
  message="정말 삭제하시겠습니까? 연결된 아티스트는 그대로 유지됩니다."
  confirmText="삭제"
  cancelText="취소"
  variant="danger"
  onConfirm={() => deleteProject.mutate(projectId)}
/>
```

**주의사항:**
- 삭제는 실제로 `is_active = false` (소프트 삭제)
- 프로젝트에 연결된 아티스트는 그대로 유지됨

---

## 9. 1차 MVP 범위

### 포함 ✅
- ✅ 프로젝트 목록 조회 (테이블)
- ✅ 프로젝트 등록 폼
- ✅ 프로젝트 수정 폼
- ✅ 프로젝트 삭제 (소프트)
- ✅ 이미지 업로드
- ✅ 순서 변경 (화살표 버튼)
- ✅ 외부 링크 관리

### 제외 ⏸️
- ⏸️ 드래그 앤 드롭 순서 변경
- ⏸️ 이미지 크롭/리사이즈
- ⏸️ 프로젝트 복제
- ⏸️ 벌크 수정

---

## 10. 참고 문서

- Admin 메인: `/specs/ui/admin/index.md`
- Projects API: `/specs/api/server/routes/projects/index.md` (추가 필요)
- Images API: `/specs/api/server/routes/images/index.md`
- 공통 컴포넌트: `/specs/ui/common/`
