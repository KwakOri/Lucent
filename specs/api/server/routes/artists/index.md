# Artists API Routes (Public)

이 문서는 **공개 아티스트 API** 엔드포인트를 정의한다.

> **범위**: 공개 API (인증 불필요)
> **용도**: 프론트엔드에서 아티스트 정보 조회
> **관련 문서**:
> - Admin API: `/specs/api/server/routes/artists/admin.md` (관리자 전용)
> - Server Service: `/specs/api/server/services/artists/index.md`
> - Client Services: `/specs/api/client/services/artists/index.md`
> - React Query Hooks: `/specs/api/client/hooks/artists/index.md`

---

## 1. API 구조 개요

### 1.1 ID vs Slug 기반 API

| 구분 | 엔드포인트 | 용도 | 권한 |
|------|-----------|------|------|
| **Slug 기반** | `GET /api/artists/slug/:slug` | 프론트엔드 페이지 (사람이 읽을 수 있는 URL) | 공개 |
| **ID 기반** | `GET /api/artists/:id` | 관리자 페이지 (UUID 기반 조회) | 관리자 |

**중요**:
- 프론트엔드에서는 **Slug 기반 API** 사용 (예: `/goods/miruru`)
- 관리자 페이지에서는 **ID 기반 API** 사용
- 생성/수정/삭제는 Admin API 참조

---

## 2. 아티스트 시스템 개요

- **목적**: 버츄얼 아티스트 정보 제공
- **공개 범위**: 모든 아티스트 정보는 공개 (인증 불필요)
- **구조**: 프로젝트에 속하는 아티스트
- **굿즈샵**: 각 아티스트별로 독립적인 굿즈샵 운영

---

## 3. 아티스트 개념

### 3.1 아티스트란?

- Lucent 레이블 소속 버츄얼 아티스트
- 예시:
  - 미루루 (0th 프로젝트)
  - Drips (1st 프로젝트)

### 3.2 아티스트 vs 프로젝트

- **프로젝트**: 레이블의 활동 기록 (예: 0th, 1st)
- **아티스트**: 프로젝트에서 활동하는 버츄얼 캐릭터
- 하나의 프로젝트에 여러 아티스트가 속할 수 있음

---

## 4. API 엔드포인트

### 4.1 아티스트 목록

```
GET /api/artists
```

**용도**: 아티스트 목록 페이지, 검색, 필터링

**인증**: 불필요 (공개)

**Query Parameters**:
- `page`: 페이지 번호 (기본: 1)
- `limit`: 페이지당 항목 수 (기본: 12, 최대: 50)
- `sortBy`: 정렬 기준 (`created_at`, `name`, 기본: `created_at`)
- `order`: 정렬 순서 (`asc`, `desc`, 기본: `asc`)
- `filter[project]`: 프로젝트 slug
- `filter[is_active]`: 활성화 여부 (기본: `true`)

**Response**:
```json
{
  "status": "success",
  "data": [
    {
      "id": "uuid",
      "name": "미루루",
      "slug": "miruru",
      "description": "포근하고 다정한 목소리의 버츄얼 아티스트",
      "profile_image": {
        "public_url": "https://r2.example.com/...",
        "cdn_url": "https://cdn.example.com/...",
        "thumbnail_url": "https://cdn.example.com/.../thumb.png"
      },
      "shop_theme": {
        "primary_color": "#A8D5E2",
        "concept": "포근하고 다정한 동물의 숲"
      },
      "is_active": true,
      "products_count": 5
    }
  ],
  "pagination": {
    "total": 2,
    "page": 1,
    "limit": 12,
    "totalPages": 1
  }
}
```

### 4.2 아티스트 상세 (Slug 기반)

```
GET /api/artists/slug/:slug
```

**용도**: 프론트엔드 아티스트 상세 페이지 (예: `/goods/miruru`)

**인증**: 불필요 (공개)

**Path Parameters**:
- `slug`: 아티스트 slug (예: `miruru`)

**Response**:
```json
{
  "status": "success",
  "data": {
    "id": "uuid",
    "name": "미루루",
    "slug": "miruru",
    "description": "포근하고 다정한 목소리의 버츄얼 아티스트입니다.",
    "profile_image": {
      "public_url": "https://r2.example.com/...",
      "cdn_url": "https://cdn.example.com/...",
      "alt_text": "미루루 프로필 이미지",
      "width": 800,
      "height": 800
    },
    "shop_theme": {
      "primary_color": "#A8D5E2",
      "secondary_color": "#E8F4F8",
      "concept": "포근하고 다정한 동물의 숲"
    },
    "is_active": true,
    "created_at": "2025-01-01T00:00:00Z",
    "project": {
      "id": "uuid",
      "name": "0th Project",
      "slug": "0th"
    },
    "products_count": 5
  }
}
```

### 4.3 아티스트별 상품 목록

```
GET /api/artists/slug/:slug/products
```

**용도**: 아티스트 굿즈샵 페이지 (해당 아티스트의 상품만 조회)

**인증**: 불필요 (공개)

**Path Parameters**:
- `slug`: 아티스트 slug (예: `miruru`)

**Query Parameters**:
- Products API와 동일 (페이지네이션, 정렬, 필터링)

**Response**:
- Products API 목록 응답과 동일

**참고**: 이 API는 `/api/products?artistId={id}` 의 편의 엔드포인트입니다.

---

## 5. 에러 응답

### 5.1 아티스트를 찾을 수 없음

```json
{
  "status": "error",
  "message": "아티스트를 찾을 수 없습니다",
  "errorCode": "ARTIST_NOT_FOUND"
}
```

**Status Code**: `404 Not Found`

---

## 6. 구현 예시

### 6.1 아티스트 목록 조회

```ts
// app/api/artists/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { ArtistService } from '@/lib/server/services/artist.service';
import { handleApiError } from '@/lib/server/utils/api-response';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '12');
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const order = searchParams.get('order') || 'asc';
    const projectSlug = searchParams.get('filter[project]');

    const result = await ArtistService.getArtists({
      page,
      limit,
      sortBy,
      order,
      projectSlug,
    });

    return NextResponse.json({
      status: 'success',
      data: result.artists,
      pagination: {
        total: result.total,
        page,
        limit,
        totalPages: Math.ceil(result.total / limit),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
```

### 6.2 아티스트 상세 조회 (Slug 기반)

```ts
// app/api/artists/slug/[slug]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { ArtistService } from '@/lib/server/services/artist.service';
import { handleApiError } from '@/lib/server/utils/api-response';
import { ApiError } from '@/lib/server/utils/errors';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const artist = await ArtistService.getArtistBySlug(slug);

    if (!artist) {
      throw new ApiError('아티스트를 찾을 수 없습니다', 404, 'ARTIST_NOT_FOUND');
    }

    return NextResponse.json({
      status: 'success',
      data: artist,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
```

---

## 7. 1차 MVP 범위

### 포함

- ✅ 아티스트 목록 조회
- ✅ 아티스트 상세 조회
- ✅ 프로필 이미지 관리
- ✅ 굿즈샵 테마 설정 (색상, 컨셉)
- ✅ 프로젝트 정보 포함

### 제외 (2차 확장)

- ⏸️ 아티스트 팔로우/구독
- ⏸️ SNS 링크 관리
- ⏸️ 아티스트 활동 타임라인
- ⏸️ 배너 이미지
- ⏸️ 커스텀 CSS

---

## 8. 참고 문서

- **Admin API**: `/specs/api/server/routes/artists/admin.md` (생성/수정/삭제)
- Server Service: `/specs/api/server/services/artists/index.md`
- Client Services: `/specs/api/client/services/artists/index.md`
- React Query Hooks: `/specs/api/client/hooks/artists/index.md`
- API Routes 패턴: `/specs/api/server/routes/index.md`
