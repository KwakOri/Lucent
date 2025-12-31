# Projects Admin API Routes

이 문서는 **관리자 전용 프로젝트 관리 API** 엔드포인트를 정의한다.

> **범위**: 관리자 전용 프로젝트 CRUD API (ID 기반)
> **권한**: ADMIN_EMAILS에 등록된 관리자만
> **관련 문서**:
> - Public API: `/specs/api/server/routes/projects/index.md` (ID 기반 조회)
> - Projects Service: `/specs/api/server/services/projects/index.md`
> - Admin UI: `/specs/ui/admin/projects.md`

---

## 1. API 구조 개요

### 1.1 Admin API vs Public API

| 구분 | Admin API (본 문서) | Public API |
|------|-------------------|-----------|
| **식별자** | UUID (ID 기반) | Slug (사람이 읽을 수 있는 URL) |
| **용도** | 관리자 페이지에서 CRUD 작업 | 프론트엔드에서 조회 |
| **권한** | 관리자 전용 | 공개 (인증 불필요) |
| **예시** | `POST /api/projects`<br>`PATCH /api/projects/:id` | `GET /api/projects/slug/:slug` |

**중요**:
- Admin 페이지에서는 **ID 기반 API** 사용
- 프론트엔드 페이지에서는 **Slug 기반 API** 사용
- ID는 변경되지 않지만, Slug는 수정 가능

---

## 2. API 엔드포인트

### 2.1 프로젝트 생성

```
POST /api/projects
```

**용도**: 관리자 페이지에서 새 프로젝트 등록

**권한**: 관리자 전용

**Request Body:**
```json
{
  "name": "Project 1",
  "slug": "project-1",
  "cover_image_id": "uuid",
  "description": "첫 번째 프로젝트입니다",
  "release_date": "2025-01-15",
  "external_links": {
    "youtube": "https://youtube.com/watch?v=...",
    "spotify": "https://open.spotify.com/track/...",
    "other": "https://example.com"
  },
  "order_index": 0,
  "is_active": true
}
```

**Validation:**
- `name`: 필수, 1-100자
- `slug`: 필수, 영문 소문자/숫자/하이픈만, 1-50자, 중복 불가
- `cover_image_id`: 필수, UUID
- `description`: 선택, 최대 1000자
- `release_date`: 선택, ISO 8601 날짜 형식
- `external_links`: 선택, 각 URL은 유효한 URL 형식
- `order_index`: 선택, 기본값 0
- `is_active`: 선택, 기본값 true

**Response (201 Created):**
```json
{
  "status": "success",
  "data": {
    "id": "uuid",
    "name": "Project 1",
    "slug": "project-1",
    "cover_image_id": "uuid",
    "description": "첫 번째 프로젝트입니다",
    "release_date": "2025-01-15",
    "external_links": {
      "youtube": "https://youtube.com/watch?v=...",
      "spotify": "https://open.spotify.com/track/...",
      "other": "https://example.com"
    },
    "order_index": 0,
    "is_active": true,
    "created_at": "2025-01-15T10:00:00Z",
    "updated_at": "2025-01-15T10:00:00Z"
  },
  "message": "프로젝트가 등록되었습니다"
}
```

**Error Responses:**

**슬러그 중복 (409 Conflict):**
```json
{
  "status": "error",
  "message": "이미 사용 중인 슬러그입니다",
  "errorCode": "SLUG_ALREADY_EXISTS"
}
```

**이미지를 찾을 수 없음 (404 Not Found):**
```json
{
  "status": "error",
  "message": "이미지를 찾을 수 없습니다",
  "errorCode": "IMAGE_NOT_FOUND"
}
```

---

### 2.2 프로젝트 수정

```
PATCH /api/projects/:id
```

**용도**: 관리자 페이지에서 프로젝트 정보 수정

**권한**: 관리자 전용

**Path Parameters:**
- `id`: 프로젝트 ID (UUID)

**Request Body:**
```json
{
  "name": "Project 1 (수정)",
  "slug": "project-1-updated",
  "cover_image_id": "uuid",
  "description": "수정된 설명",
  "release_date": "2025-02-01",
  "external_links": {
    "youtube": "https://youtube.com/watch?v=new"
  },
  "order_index": 1,
  "is_active": false
}
```

**참고**: 모든 필드 선택사항 (변경할 필드만 전송)

**Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "id": "uuid",
    "name": "Project 1 (수정)",
    "slug": "project-1-updated",
    "cover_image_id": "uuid",
    "description": "수정된 설명",
    "release_date": "2025-02-01",
    "external_links": {
      "youtube": "https://youtube.com/watch?v=new"
    },
    "order_index": 1,
    "is_active": false,
    "created_at": "2025-01-15T10:00:00Z",
    "updated_at": "2025-01-15T12:00:00Z"
  },
  "message": "프로젝트 정보가 수정되었습니다"
}
```

**Error Responses:**

**프로젝트를 찾을 수 없음 (404 Not Found):**
```json
{
  "status": "error",
  "message": "프로젝트를 찾을 수 없습니다",
  "errorCode": "PROJECT_NOT_FOUND"
}
```

---

### 2.3 프로젝트 삭제 (소프트 삭제)

```
DELETE /api/projects/:id
```

**용도**: 관리자 페이지에서 프로젝트 삭제 (비활성화)

**권한**: 관리자 전용

**Path Parameters:**
- `id`: 프로젝트 ID (UUID)

**동작:**
- 실제 삭제가 아닌 `is_active = false` 처리
- 연결된 아티스트는 그대로 유지됨

**Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "message": "프로젝트가 삭제되었습니다"
  }
}
```

**Error Responses:**

**프로젝트를 찾을 수 없음 (404 Not Found):**
```json
{
  "status": "error",
  "message": "프로젝트를 찾을 수 없습니다",
  "errorCode": "PROJECT_NOT_FOUND"
}
```

---

### 2.4 프로젝트 순서 변경

```
PATCH /api/projects/reorder
```

**용도**: 관리자 페이지에서 프로젝트 표시 순서 변경

**권한**: 관리자 전용

**Request Body:**
```json
{
  "orders": [
    { "id": "uuid-1", "order_index": 0 },
    { "id": "uuid-2", "order_index": 1 },
    { "id": "uuid-3", "order_index": 2 }
  ]
}
```

**Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "message": "프로젝트 순서가 변경되었습니다",
    "updated_count": 3
  }
}
```

**Error Responses:**

**프로젝트를 찾을 수 없음 (404 Not Found):**
```json
{
  "status": "error",
  "message": "일부 프로젝트를 찾을 수 없습니다",
  "errorCode": "PROJECT_NOT_FOUND",
  "details": {
    "missing_ids": ["uuid-4"]
  }
}
```

---

## 3. 구현 예시

### 3.1 프로젝트 생성 API

```ts
// app/api/projects/route.ts
import { NextRequest } from 'next/server';
import { ProjectService } from '@/lib/server/services/project.service';
import { handleApiError, successResponse } from '@/lib/server/utils/api-response';
import { getCurrentUser, isAdmin } from '@/lib/server/utils/supabase';
import type { CreateProjectRequest } from '@/types/api';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return handleApiError(new Error('로그인이 필요합니다'));
    }

    const adminCheck = await isAdmin();
    if (!adminCheck) {
      return handleApiError(new Error('관리자 권한이 필요합니다'));
    }

    const body = await request.json() as CreateProjectRequest;

    const project = await ProjectService.createProject(body, user.id);

    return successResponse(project, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
```

### 3.2 프로젝트 수정 API

```ts
// app/api/projects/[id]/route.ts
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return handleApiError(new Error('로그인이 필요합니다'));
    }

    const adminCheck = await isAdmin();
    if (!adminCheck) {
      return handleApiError(new Error('관리자 권한이 필요합니다'));
    }

    const body = await request.json() as UpdateProjectRequest;
    const { id } = await params;

    const project = await ProjectService.updateProject(id, body, user.id);

    return successResponse(project);
  } catch (error) {
    return handleApiError(error);
  }
}
```

### 3.3 프로젝트 삭제 API

```ts
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return handleApiError(new Error('로그인이 필요합니다'));
    }

    const adminCheck = await isAdmin();
    if (!adminCheck) {
      return handleApiError(new Error('관리자 권한이 필요합니다'));
    }

    const { id } = await params;

    await ProjectService.deleteProject(id, user.id);

    return successResponse({ message: '프로젝트가 삭제되었습니다' });
  } catch (error) {
    return handleApiError(error);
  }
}
```

### 3.4 프로젝트 순서 변경 API

```ts
// app/api/projects/reorder/route.ts
export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return handleApiError(new Error('로그인이 필요합니다'));
    }

    const adminCheck = await isAdmin();
    if (!adminCheck) {
      return handleApiError(new Error('관리자 권한이 필요합니다'));
    }

    const body = await request.json() as ReorderProjectsRequest;

    const result = await ProjectService.reorderProjects(body.orders, user.id);

    return successResponse({
      message: '프로젝트 순서가 변경되었습니다',
      updated_count: result.count,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
```

---

## 4. TypeScript 타입

```ts
// types/api.ts
export interface CreateProjectRequest {
  name: string;
  slug: string;
  cover_image_id: string;
  description?: string;
  release_date?: string; // ISO 8601
  external_links?: {
    youtube?: string;
    spotify?: string;
    other?: string;
  };
  order_index?: number;
  is_active?: boolean;
}

export interface UpdateProjectRequest {
  name?: string;
  slug?: string;
  cover_image_id?: string;
  description?: string;
  release_date?: string;
  external_links?: {
    youtube?: string;
    spotify?: string;
    other?: string;
  };
  order_index?: number;
  is_active?: boolean;
}

export interface ReorderProjectsRequest {
  orders: Array<{
    id: string;
    order_index: number;
  }>;
}
```

---

## 5. 참고 문서

- Projects 조회 API: `/specs/api/server/routes/projects/index.md`
- Projects Service: `/specs/api/server/services/projects/index.md`
- Admin UI: `/specs/ui/admin/projects.md`
- API Routes 패턴: `/specs/api/server/routes/index.md`
