# Products API Routes

이 문서는 **상품(Products) API Route** 엔드포인트를 정의한다.

> **범위**: Next.js API Route 엔드포인트 (HTTP 인터페이스)
> **관련 문서**:
> - Server Service: `/specs/api/server/services/products/index.md`
> - Client Services: `/specs/api/client/services/products/index.md`
> - React Query Hooks: `/specs/api/client/hooks/products/index.md`

---

## 1. 상품 시스템 개요

- **목적**: 아티스트별 굿즈(보이스팩, 실물 굿즈) 판매
- **공개 범위**: 모든 상품 정보는 공개 (인증 불필요)
- **구매**: 주문 생성은 인증 필요
- **결제**: 계좌이체 단일 (PG 연동 없음)

---

## 2. 상품 개념

### 2.1 상품 타입

| 타입 | 설명 | 특징 |
|------|------|------|
| `VOICE_PACK` | 보이스팩 (디지털 상품) | 샘플 청취 가능, 구매 후 다운로드 |
| `PHYSICAL_GOODS` | 실물 굿즈 | 재고 관리, 배송 정보 필요 |

### 2.2 상품 구조

- 아티스트별로 굿즈샵 구분
- 각 상품은 하나의 아티스트에 속함
- 메인 이미지 + 갤러리 이미지 지원

---

## 3. API 엔드포인트

### 3.1 상품 목록

```
GET /api/products
```

**Query Parameters**:
- `page`: 페이지 번호 (기본: 1)
- `limit`: 페이지당 항목 수 (기본: 12, 최대: 50)
- `sortBy`: 정렬 기준 (`created_at`, `price`, `name`, 기본: `created_at`)
- `order`: 정렬 순서 (`asc`, `desc`, 기본: `desc`)
- `filter[type]`: 상품 타입 (`VOICE_PACK`, `PHYSICAL_GOODS`)
- `filter[artist]`: 아티스트 slug
- `filter[project]`: 프로젝트 slug
- `filter[is_active]`: 활성화 여부 (기본: `true`)
- `filter[in_stock]`: 재고 있는 상품만 (`true`, `false`)

**Response**:
```json
{
  "status": "success",
  "data": [
    {
      "id": "uuid",
      "name": "미루루 보이스팩 Vol.1",
      "slug": "voicepack-vol1",
      "type": "VOICE_PACK",
      "price": 10000,
      "main_image": {
        "public_url": "https://r2.example.com/...",
        "thumbnail_url": "https://r2.example.com/.../thumb.png"
      },
      "stock": null,
      "is_active": true,
      "artist": {
        "name": "미루루",
        "slug": "miruru"
      }
    }
  ],
  "pagination": {
    "total": 24,
    "page": 1,
    "limit": 12,
    "totalPages": 2
  }
}
```

### 3.2 상품 상세

```
GET /api/products/:id
```

**Path Parameters**:
- `id`: 상품 ID (UUID)

**Response**:
```json
{
  "status": "success",
  "data": {
    "id": "uuid",
    "name": "미루루 보이스팩 Vol.1",
    "slug": "voicepack-vol1",
    "type": "VOICE_PACK",
    "price": 10000,
    "description": "미루루의 다정한 목소리로 채워진 보이스팩...",
    "main_image": {
      "public_url": "https://r2.example.com/...",
      "cdn_url": "https://cdn.example.com/...",
      "alt_text": "미루루 보이스팩 메인 이미지"
    },
    "gallery_images": [
      {
        "public_url": "https://r2.example.com/...",
        "display_order": 0
      }
    ],
    "sample_audio_url": "https://r2.example.com/.../sample.mp3",
    "stock": null,
    "is_active": true,
    "artist": {
      "id": "uuid",
      "name": "미루루",
      "slug": "miruru",
      "profile_image": {
        "public_url": "https://r2.example.com/..."
      }
    },
    "created_at": "2025-01-01T00:00:00Z"
  }
}
```

### 3.3 보이스팩 샘플 스트리밍

```
GET /api/products/:id/sample
```

**Path Parameters**:
- `id`: 상품 ID (UUID)

**Response**:
- `Content-Type: audio/mpeg`
- HTTP Range 요청 지원
- 30초~1분 분량 샘플

**주의사항**:
- `sample_audio_url`을 직접 노출하지 않고 API를 통해 스트리밍
- 다운로드 방지 (브라우저 재생만)
- Rate Limit 적용 (IP 기준)

### 3.4 아티스트별 상품 목록

```
GET /api/artists/slug/:slug/products
```

**Path Parameters**:
- `slug`: 아티스트 slug (예: `miruru`)

**Query Parameters**:
- 상품 목록 API와 동일 (페이지네이션, 정렬, 필터링)

**Response**:
- 상품 목록 API와 동일

---

## 4. 에러 응답

### 4.1 상품을 찾을 수 없음

```json
{
  "status": "error",
  "message": "상품을 찾을 수 없습니다",
  "errorCode": "PRODUCT_NOT_FOUND"
}
```

**Status Code**: `404 Not Found`

### 4.2 샘플 파일 없음

```json
{
  "status": "error",
  "message": "샘플 오디오가 없습니다",
  "errorCode": "SAMPLE_NOT_FOUND"
}
```

**Status Code**: `404 Not Found`

### 4.3 잘못된 상품 타입

```json
{
  "status": "error",
  "message": "보이스팩만 샘플 청취가 가능합니다",
  "errorCode": "INVALID_PRODUCT_TYPE"
}
```

**Status Code**: `400 Bad Request`

---

## 5. 구현 예시

### 5.1 상품 목록 조회

```ts
// app/api/products/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { ProductService } from '@/lib/server/services/product.service';
import { handleApiError } from '@/lib/server/utils/api-response';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '12');
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const order = searchParams.get('order') || 'desc';
    const type = searchParams.get('filter[type]');
    const artistSlug = searchParams.get('filter[artist]');

    const result = await ProductService.getProducts({
      page,
      limit,
      sortBy,
      order,
      type,
      artistSlug,
    });

    return NextResponse.json({
      status: 'success',
      data: result.products,
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

### 5.2 상품 상세 조회

```ts
// app/api/products/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { ProductService } from '@/lib/server/services/product.service';
import { handleApiError } from '@/lib/server/utils/api-response';
import { ApiError } from '@/lib/server/utils/errors';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const product = await ProductService.getProductById(id);

    if (!product) {
      throw new ApiError('상품을 찾을 수 없습니다', 404, 'PRODUCT_NOT_FOUND');
    }

    return NextResponse.json({
      status: 'success',
      data: product,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
```

### 5.3 샘플 스트리밍

```ts
// app/api/products/[id]/sample/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { ProductService } from '@/lib/server/services/product.service';
import { ApiError } from '@/lib/server/utils/errors';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const product = await ProductService.getProductById(id);

    if (!product) {
      throw new ApiError('상품을 찾을 수 없습니다', 404, 'PRODUCT_NOT_FOUND');
    }

    if (product.type !== 'VOICE_PACK') {
      throw new ApiError(
        '보이스팩만 샘플 청취가 가능합니다',
        400,
        'INVALID_PRODUCT_TYPE'
      );
    }

    if (!product.sample_audio_url) {
      throw new ApiError('샘플 오디오가 없습니다', 404, 'SAMPLE_NOT_FOUND');
    }

    // R2에서 샘플 파일 스트리밍
    const audioResponse = await fetch(product.sample_audio_url);

    if (!audioResponse.ok) {
      throw new ApiError('샘플 파일을 불러올 수 없습니다', 500);
    }

    return new NextResponse(audioResponse.body, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Accept-Ranges': 'bytes',
      },
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { status: 'error', message: error.message, errorCode: error.errorCode },
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      { status: 'error', message: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
```

---

## 6. 1차 MVP 범위

### 포함

- ✅ 상품 목록 조회 (페이지네이션, 정렬, 필터링)
- ✅ 상품 상세 조회
- ✅ 아티스트별 상품 목록
- ✅ 보이스팩 샘플 청취
- ✅ 이미지 갤러리 (메인 + 추가 이미지)
- ✅ 재고 관리 (실물 굿즈)

### 제외 (2차 확장)

- ⏸️ 상품 검색 (전문 검색)
- ⏸️ 상품 좋아요/찜하기
- ⏸️ 상품 리뷰/평점
- ⏸️ 추천 상품 알고리즘
- ⏸️ 할인/쿠폰 시스템
- ⏸️ 옵션 선택 (색상, 사이즈 등)

---

## 7. 참고 문서

- Server Service: `/specs/api/server/services/products/index.md`
- Client Services: `/specs/api/client/services/products/index.md`
- React Query Hooks: `/specs/api/client/hooks/products/index.md`
- API Routes 패턴: `/specs/api/server/routes/index.md`
