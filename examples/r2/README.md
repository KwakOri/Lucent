# Cloudflare R2 사용 예시

이 폴더는 Cloudflare R2를 효율적으로 사용하는 방법을 보여주는 예시 코드를 포함합니다.

---

## 📚 목차

1. [환경 설정 비교](#1-환경-설정-비교)
2. [기본 사용법](#2-기본-사용법)
3. [상품 이미지 업로드](#3-상품-이미지-업로드)
4. [디지털 상품 다운로드](#4-디지털-상품-다운로드)
5. [최적화 팁](#5-최적화-팁)

---

## 1. 환경 설정 비교

### ❌ 비효율적인 방법 (S3 URL만 사용)

```env
# .env.local
R2_ACCOUNT_ID=abc123
R2_ACCESS_KEY_ID=key123
R2_SECRET_ACCESS_KEY=secret123
R2_BUCKET_NAME=my-bucket
```

```typescript
// 코드에서 매번 URL 조합
const s3Endpoint = `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
const publicUrl = `https://pub-${process.env.R2_ACCOUNT_ID}.r2.dev`;
```

**문제점:**
- Public URL을 코드에서 매번 조합해야 함
- 환경별로 다른 도메인(개발/프로덕션) 관리 어려움
- CDN 도메인 변경 시 코드 수정 필요

---

### ✅ 효율적인 방법 (용도별 분리)

```env
# .env.local (개발)
R2_ACCOUNT_ID=abc123
R2_ACCESS_KEY_ID=dev_key123
R2_SECRET_ACCESS_KEY=dev_secret123
R2_BUCKET_NAME=lucent-dev
R2_PUBLIC_URL=https://dev-cdn.lucentmanagement.com

# .env.production (프로덕션)
R2_ACCOUNT_ID=abc123
R2_ACCESS_KEY_ID=prod_key123
R2_SECRET_ACCESS_KEY=prod_secret123
R2_BUCKET_NAME=lucent-prod
R2_PUBLIC_URL=https://cdn.lucentmanagement.com
```

**장점:**
- ✅ 환경별로 다른 버킷/도메인 사용 가능
- ✅ Public URL이 환경변수로 명확하게 관리됨
- ✅ CDN 도메인 변경 시 코드 수정 불필요
- ✅ 개발/스테이징/프로덕션 환경 분리 용이

---

## 2. 기본 사용법

### 파일 업로드

```typescript
import { uploadFile } from '@/lib/server/utils/r2';

// 이미지 업로드
const imageUrl = await uploadFile({
  key: 'images/products/voicepack-vol1.png',
  body: imageBuffer,
  contentType: 'image/png',
  metadata: {
    productId: 'product-123',
    uploadedBy: 'admin',
  },
});

console.log(imageUrl);
// → https://cdn.lucentmanagement.com/images/products/voicepack-vol1.png
```

### Public URL vs Signed URL

```typescript
import { getPublicUrl, generateSignedUrl } from '@/lib/server/utils/r2';

// 1. Public URL - 누구나 접근 가능 (이미지, 공개 파일)
const publicImageUrl = getPublicUrl('images/products/voicepack-vol1.png');
// → https://cdn.lucentmanagement.com/images/products/voicepack-vol1.png

// 2. Signed URL - 일정 시간만 접근 가능 (디지털 상품)
const downloadUrl = await generateSignedUrl({
  key: 'products/voicepacks/miruru-vol1.zip',
  expiresIn: 600, // 10분
});
// → https://abc123.r2.cloudflarestorage.com/...?X-Amz-Signature=...
```

**핵심 차이:**
- **Public URL**: CDN 도메인 사용, 캐싱 가능, 영구 접근
- **Signed URL**: S3 API 엔드포인트 사용, 임시 접근, 보안

---

## 3. 상품 이미지 업로드

### API Route 예시

```typescript
// app/api/admin/products/images/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { uploadFile, getMimeType } from '@/lib/server/utils/r2';
import { createServerClient } from '@/lib/server/utils/supabase';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const productId = formData.get('productId') as string;

    if (!file) {
      return NextResponse.json(
        { status: 'error', message: '파일이 없습니다' },
        { status: 400 }
      );
    }

    // 파일을 Buffer로 변환
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // R2에 업로드
    const key = `images/products/${productId}/${Date.now()}-${file.name}`;
    const publicUrl = await uploadFile({
      key,
      body: buffer,
      contentType: getMimeType(file.name),
      metadata: {
        productId,
        originalName: file.name,
      },
    });

    // DB에 이미지 정보 저장
    const supabase = await createServerClient();
    const { data: image } = await supabase
      .from('images')
      .insert({
        public_url: publicUrl,
        r2_key: key,
        file_size: buffer.length,
        mime_type: getMimeType(file.name),
      })
      .select()
      .single();

    return NextResponse.json({
      status: 'success',
      data: {
        id: image.id,
        url: publicUrl,
      },
    });
  } catch (error) {
    console.error('이미지 업로드 실패:', error);
    return NextResponse.json(
      { status: 'error', message: '이미지 업로드 실패' },
      { status: 500 }
    );
  }
}
```

---

## 4. 디지털 상품 다운로드

### 보안 다운로드 API

```typescript
// app/api/orders/[orderId]/items/[itemId]/download/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { generateSignedUrl } from '@/lib/server/utils/r2';
import { OrderService } from '@/lib/server/services/order.service';
import { getCurrentUser } from '@/lib/server/utils/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: { orderId: string; itemId: string } }
) {
  try {
    // 1. 사용자 인증 확인
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { status: 'error', message: '로그인이 필요합니다' },
        { status: 401 }
      );
    }

    // 2. 주문 권한 확인
    const order = await OrderService.getOrder(params.orderId);
    if (order.user_id !== user.id) {
      return NextResponse.json(
        { status: 'error', message: '접근 권한이 없습니다' },
        { status: 403 }
      );
    }

    // 3. 입금 확인 여부 체크
    if (order.status === 'PENDING') {
      return NextResponse.json(
        { status: 'error', message: '입금이 확인되지 않았습니다' },
        { status: 403 }
      );
    }

    // 4. 디지털 상품 파일 경로 조회
    const orderItem = order.items.find(item => item.id === params.itemId);
    if (!orderItem || orderItem.product_type !== 'VOICE_PACK') {
      return NextResponse.json(
        { status: 'error', message: '디지털 상품이 아닙니다' },
        { status: 400 }
      );
    }

    const r2Key = orderItem.product.digital_file_r2_key;
    if (!r2Key) {
      return NextResponse.json(
        { status: 'error', message: '파일을 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // 5. Signed URL 생성 (10분간 유효)
    const downloadUrl = await generateSignedUrl({
      key: r2Key,
      expiresIn: 600,
    });

    // 6. 다운로드 로그 기록
    await OrderService.logDownload(params.itemId, user.id);

    // 7. Redirect 또는 JSON으로 반환
    // Option 1: Redirect (브라우저가 자동 다운로드)
    return NextResponse.redirect(downloadUrl);

    // Option 2: JSON으로 URL 반환
    // return NextResponse.json({
    //   status: 'success',
    //   data: {
    //     downloadUrl,
    //     expiresAt: new Date(Date.now() + 600 * 1000).toISOString(),
    //     fileName: orderItem.product.name + '.zip',
    //   },
    // });
  } catch (error) {
    console.error('다운로드 URL 생성 실패:', error);
    return NextResponse.json(
      { status: 'error', message: '다운로드 링크 생성 실패' },
      { status: 500 }
    );
  }
}
```

---

## 5. 최적화 팁

### 5.1 환경별 설정 분리

```bash
# .env.local (로컬 개발)
R2_PUBLIC_URL=http://localhost:3000/api/r2-proxy
# → 개발 시 R2 대신 로컬 파일 시스템 사용 가능

# .env.development (개발 서버)
R2_PUBLIC_URL=https://dev-cdn.lucentmanagement.com
R2_BUCKET_NAME=lucent-dev

# .env.production (프로덕션)
R2_PUBLIC_URL=https://cdn.lucentmanagement.com
R2_BUCKET_NAME=lucent-prod
```

### 5.2 Public URL vs S3 API 사용 기준

```typescript
// ✅ Public URL 사용 (CDN 캐싱)
// - 이미지 표시
// - 공개 파일
// - 자주 접근하는 정적 파일
const imageUrl = getPublicUrl('images/products/cover.png');
<img src={imageUrl} alt="상품 이미지" />

// ✅ S3 API 사용 (직접 접근)
// - 파일 업로드/삭제
// - 메타데이터 수정
// - 비공개 파일 관리
await uploadFile({ key: '...', body: buffer });

// ✅ Signed URL 사용 (임시 접근)
// - 디지털 상품 다운로드
// - 회원 전용 파일
// - 일회성 다운로드 링크
const url = await generateSignedUrl({ key: '...', expiresIn: 600 });
```

### 5.3 이미지 최적화

```typescript
import sharp from 'sharp';
import { uploadFile } from '@/lib/server/utils/r2';

async function uploadOptimizedImage(file: File, productId: string) {
  const buffer = Buffer.from(await file.arrayBuffer());

  // 원본 업로드
  const originalKey = `images/products/${productId}/original.png`;
  const originalUrl = await uploadFile({
    key: originalKey,
    body: buffer,
    contentType: 'image/png',
  });

  // 썸네일 생성 및 업로드 (WebP, 400x400)
  const thumbnail = await sharp(buffer)
    .resize(400, 400, { fit: 'cover' })
    .webp({ quality: 80 })
    .toBuffer();

  const thumbnailKey = `images/products/${productId}/thumbnail.webp`;
  const thumbnailUrl = await uploadFile({
    key: thumbnailKey,
    body: thumbnail,
    contentType: 'image/webp',
  });

  return {
    original: originalUrl,
    thumbnail: thumbnailUrl,
  };
}
```

### 5.4 파일 삭제 시 DB와 동기화

```typescript
import { deleteFile } from '@/lib/server/utils/r2';
import { createServerClient } from '@/lib/server/utils/supabase';

async function deleteProductImage(imageId: string) {
  const supabase = await createServerClient();

  // 1. DB에서 이미지 정보 조회
  const { data: image } = await supabase
    .from('images')
    .select('r2_key')
    .eq('id', imageId)
    .single();

  if (!image) {
    throw new Error('이미지를 찾을 수 없습니다');
  }

  // 2. R2에서 파일 삭제
  await deleteFile(image.r2_key);

  // 3. DB에서 레코드 삭제
  await supabase.from('images').delete().eq('id', imageId);

  console.log(`이미지 삭제 완료: ${image.r2_key}`);
}
```

### 5.5 비용 최적화

```typescript
// ❌ 비효율: 매번 S3 API로 파일 조회
async function getProductImage(productId: string) {
  const files = await listFiles({ prefix: `images/products/${productId}/` });
  return files[0]; // S3 API 호출 = 비용 발생
}

// ✅ 효율: DB에 URL 저장 후 직접 사용
async function getProductImage(productId: string) {
  const { data } = await supabase
    .from('products')
    .select('main_image:images(public_url)')
    .eq('id', productId)
    .single();

  return data.main_image.public_url; // DB 조회만 = 무료
}
```

---

## 📊 성능 비교

| 작업 | S3 API만 사용 | Public URL 사용 | 차이 |
|------|--------------|-----------------|------|
| 이미지 로딩 | ~200ms | ~20ms (CDN) | **10배 빠름** |
| API 요청 횟수 | 매번 S3 호출 | 0회 (직접 접근) | **비용 절감** |
| 캐싱 | 불가능 | CDN 자동 캐싱 | **대역폭 절약** |
| 보안 파일 | Signed URL | 불가능 | **동일** |

---

## 🎯 결론

**가장 효율적인 방법:**

```env
# 환경변수 (5개)
R2_ACCOUNT_ID=abc123          # S3 API 엔드포인트 구성용
R2_ACCESS_KEY_ID=key123       # API 인증
R2_SECRET_ACCESS_KEY=secret   # API 인증
R2_BUCKET_NAME=my-bucket      # 버킷 이름
R2_PUBLIC_URL=https://cdn.example.com  # CDN URL (추가!)
```

**사용 시나리오:**

1. **파일 업로드/삭제**: S3 API 사용
2. **공개 파일 접근**: Public URL 사용 (CDN)
3. **보안 다운로드**: Signed URL 사용

**장점:**
- ✅ 성능 최적화 (CDN 캐싱)
- ✅ 비용 절감 (불필요한 API 호출 제거)
- ✅ 환경별 분리 용이
- ✅ 코드 가독성 향상
- ✅ 유지보수 편의성

---

**관련 문서:**
- [R2 설정 가이드](/docs/r2-setup.md)
- [R2 유틸리티 코드](/lib/server/utils/r2.ts)
