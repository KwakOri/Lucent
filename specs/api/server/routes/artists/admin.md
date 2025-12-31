# Artists Admin API Routes

이 문서는 **관리자 전용 아티스트 관리 API** 엔드포인트를 정의한다.

> **범위**: 관리자 전용 아티스트 CRUD API (ID 기반)
> **권한**: ADMIN_EMAILS에 등록된 관리자만
> **관련 문서**:
> - Public API: `/specs/api/server/routes/artists/index.md` (Slug 기반 조회)
> - Artists Service: `/specs/api/server/services/artists/index.md`
> - Admin UI: `/specs/ui/admin/artists.md`

---

## 1. API 구조 개요

### 1.1 Admin API vs Public API

| 구분 | Admin API (본 문서) | Public API |
|------|-------------------|-----------|
| **식별자** | UUID (ID 기반) | Slug (사람이 읽을 수 있는 URL) |
| **용도** | 관리자 페이지에서 CRUD 작업 | 프론트엔드에서 조회 |
| **권한** | 관리자 전용 | 공개 (인증 불필요) |
| **예시** | `GET /api/artists/:id`<br>`PATCH /api/artists/:id` | `GET /api/artists/slug/:slug` |

**중요**:
- Admin 페이지에서는 **ID 기반 API** 사용
- 프론트엔드 페이지에서는 **Slug 기반 API** 사용
- ID는 변경되지 않지만, Slug는 수정 가능

---

## 2. API 엔드포인트

### 2.1 아티스트 생성

```
POST /api/artists
```

**용도**: 관리자 페이지에서 새 아티스트 등록

**권한**: 관리자 전용

**Request Body:**
```json
{
  "name": "미루루",
  "slug": "miruru",
  "project_id": "uuid",
  "profile_image_id": "uuid",
  "description": "귀여운 고양이 버츄얼 아티스트",
  "is_active": true
}
```

**Validation:**
- `name`: 필수, 1-100자
- `slug`: 필수, 영문 소문자/숫자/하이픈만, 1-50자, 중복 불가
- `project_id`: 필수, UUID
- `profile_image_id`: 필수, UUID
- `description`: 선택, 최대 500자
- `is_active`: 선택, 기본값 true

**Response (201 Created):**
```json
{
  "status": "success",
  "data": {
    "id": "uuid",
    "name": "미루루",
    "slug": "miruru",
    "project_id": "uuid",
    "profile_image_id": "uuid",
    "description": "귀여운 고양이 버츄얼 아티스트",
    "is_active": true,
    "created_at": "2025-01-15T10:00:00Z",
    "updated_at": "2025-01-15T10:00:00Z"
  },
  "message": "아티스트가 등록되었습니다"
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

**프로젝트를 찾을 수 없음 (404 Not Found):**
```json
{
  "status": "error",
  "message": "프로젝트를 찾을 수 없습니다",
  "errorCode": "PROJECT_NOT_FOUND"
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

### 2.2 아티스트 수정 (ID 기반)

```
PATCH /api/artists/:id
```

**용도**: 관리자 페이지에서 아티스트 정보 수정

**권한**: 관리자 전용

**Path Parameters:**
- `id`: 아티스트 ID (UUID)

**Request Body:**
```json
{
  "name": "미루루 (수정)",
  "slug": "miruru-updated",
  "project_id": "uuid",
  "profile_image_id": "uuid",
  "description": "수정된 설명",
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
    "name": "미루루 (수정)",
    "slug": "miruru-updated",
    "project_id": "uuid",
    "profile_image_id": "uuid",
    "description": "수정된 설명",
    "is_active": false,
    "created_at": "2025-01-15T10:00:00Z",
    "updated_at": "2025-01-15T12:00:00Z"
  },
  "message": "아티스트 정보가 수정되었습니다"
}
```

**Error Responses:**

**아티스트를 찾을 수 없음 (404 Not Found):**
```json
{
  "status": "error",
  "message": "아티스트를 찾을 수 없습니다",
  "errorCode": "ARTIST_NOT_FOUND"
}
```

---

### 2.3 아티스트 삭제 (소프트 삭제, ID 기반)

```
DELETE /api/artists/:id
```

**용도**: 관리자 페이지에서 아티스트 삭제 (비활성화)

**권한**: 관리자 전용

**Path Parameters:**
- `id`: 아티스트 ID (UUID)

**동작:**
- 실제 삭제가 아닌 `is_active = false` 처리 (소프트 삭제)
- 연결된 상품이 있어도 삭제 가능 (상품은 유지)

**Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "message": "아티스트가 삭제되었습니다"
  }
}
```

**Error Responses:**

**아티스트를 찾을 수 없음 (404 Not Found):**
```json
{
  "status": "error",
  "message": "아티스트를 찾을 수 없습니다",
  "errorCode": "ARTIST_NOT_FOUND"
}
```

---

## 3. 구현 예시

### 3.1 아티스트 생성 API

```ts
// app/api/artists/route.ts
import { NextRequest } from 'next/server';
import { ArtistService } from '@/lib/server/services/artist.service';
import { handleApiError, successResponse } from '@/lib/server/utils/api-response';
import { getCurrentUser, isAdmin } from '@/lib/server/utils/supabase';
import type { CreateArtistRequest } from '@/types/api';

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

    const body = await request.json() as CreateArtistRequest;

    const artist = await ArtistService.createArtist(body, user.id);

    return successResponse(artist, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
```

### 3.2 아티스트 수정 API

```ts
// app/api/artists/[id]/route.ts
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

    const body = await request.json() as UpdateArtistRequest;
    const { id } = await params;

    const artist = await ArtistService.updateArtist(id, body, user.id);

    return successResponse(artist);
  } catch (error) {
    return handleApiError(error);
  }
}
```

### 3.3 아티스트 삭제 API

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

    await ArtistService.deleteArtist(id, user.id);

    return successResponse({ message: '아티스트가 삭제되었습니다' });
  } catch (error) {
    return handleApiError(error);
  }
}
```

---

## 4. TypeScript 타입

```ts
// types/api.ts
export interface CreateArtistRequest {
  name: string;
  slug: string;
  project_id: string;
  profile_image_id: string;
  description?: string;
  is_active?: boolean;
}

export interface UpdateArtistRequest {
  name?: string;
  slug?: string;
  project_id?: string;
  profile_image_id?: string;
  description?: string;
  is_active?: boolean;
}
```

---

## 5. 참고 문서

- **Public API**: `/specs/api/server/routes/artists/index.md` (Slug 기반 조회)
- Artists Service: `/specs/api/server/services/artists/index.md`
- Admin UI: `/specs/ui/admin/artists.md`
- API Routes 패턴: `/specs/api/server/routes/index.md`
