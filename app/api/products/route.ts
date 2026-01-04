/**
 * Products API Routes
 *
 * GET /api/products - 상품 목록 조회
 * POST /api/products - 상품 생성 (관리자)
 */

import { NextRequest } from 'next/server';
import { ProductService } from '@/lib/server/services/product.service';
import { handleApiError, paginatedResponse, successResponse } from '@/lib/server/utils/api-response';
import { isAdmin } from '@/lib/server/utils/supabase';
import type { CreateProductRequest, GetProductsQuery } from '@/types/api';
import type { Enums } from '@/types/database';

/**
 * 상품 목록 조회
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const projectId = searchParams.get('projectId') || undefined;
    const type = searchParams.get('type') as Enums<'product_type'> | undefined;
    const isActive = searchParams.get('isActive') === 'false' ? false : true;
    const sortBy = (searchParams.get('sortBy') || 'created_at') as 'created_at' | 'price' | 'name';
    const order = (searchParams.get('order') || 'desc') as 'asc' | 'desc';

    const result = await ProductService.getProducts({
      page,
      limit,
      projectId,
      type,
      isActive,
      sortBy,
      order,
    });

    return paginatedResponse(result.products, {
      total: result.total,
      page,
      limit,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * 상품 생성 (관리자)
 *
 * - JSON: 일반 상품
 * - multipart/form-data: 보이스팩 (파일 업로드)
 */
export async function POST(request: NextRequest) {
  try {
    const adminCheck = await isAdmin();
    if (!adminCheck) {
      return handleApiError(
        new Error('관리자 권한이 필요합니다')
      );
    }

    const contentType = request.headers.get('content-type') || '';

    // multipart/form-data: 보이스팩 생성 (파일 업로드)
    if (contentType.includes('multipart/form-data')) {
      return await createVoicePackProduct(request);
    }

    // JSON: 일반 상품 생성
    const body = await request.json() as CreateProductRequest;

    // TODO: 관리자 ID 가져오기
    const adminId = 'admin-id';

    // 빈 문자열을 null로 변환
    const productData = {
      ...body,
      main_image_id: body.main_image_id || null,
    };

    const product = await ProductService.createProduct(productData, adminId);

    return successResponse(product, undefined, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * 보이스팩 상품 생성 (파일 업로드)
 */
async function createVoicePackProduct(request: NextRequest) {
  const { SampleGenerationService } = await import('@/lib/server/services/sample-generation.service');
  const { uploadFile } = await import('@/lib/server/utils/r2');
  const { v4: uuidv4 } = await import('uuid');
  const { ApiError } = await import('@/lib/server/utils/errors');
  const { LogService } = await import('@/lib/server/services/log.service');

  let formData: FormData | undefined;

  try {
    formData = await request.formData();
    console.log('[API/Products] FormData 수신');

    // Form fields
    const name = formData.get('name') as string;
    const price = parseInt(formData.get('price') as string);
    const description = formData.get('description') as string | null;
    const projectId = formData.get('projectId') as string | null;
    const mainImageId = formData.get('mainImageId') as string | null;

    // Files
    const mainFile = formData.get('mainFile') as File | null;
    const sampleFile = formData.get('sampleFile') as File | null;

    console.log('[API/Products] FormData 파싱 완료:', {
      name,
      price,
      projectId,
      mainFile: mainFile ? {
        name: mainFile.name,
        type: mainFile.type,
        size: mainFile.size,
      } : null,
      sampleFile: sampleFile ? {
        name: sampleFile.name,
        type: sampleFile.type,
        size: sampleFile.size,
      } : null,
    });

    // 0. 필수 필드 검증
    if (!mainFile) {
      console.error('[API/Products] 메인 파일이 없습니다');
      throw new ApiError('보이스팩 파일은 필수입니다', 400);
    }

    if (!name || !price || !projectId) {
      console.error('[API/Products] 필수 필드 누락:', { name, price, projectId });
      throw new ApiError('상품명, 가격, 프로젝트는 필수입니다', 400);
    }

    const productId = uuidv4();
    console.log('[API/Products] 상품 ID 생성:', productId);

    // 1. 메인 파일 업로드
    console.log('[API/Products] 메인 파일 업로드 시작:', {
      fileName: mainFile.name,
      fileType: mainFile.type,
      fileSize: mainFile.size,
      fileExtension: getFileExtension(mainFile.name),
    });

    const mainFileBuffer = Buffer.from(await mainFile.arrayBuffer());
    console.log('[API/Products] 메인 파일 Buffer 생성 완료:', mainFileBuffer.length, 'bytes');

    const mainFileKey = `voicepacks/${productId}/main${getFileExtension(mainFile.name)}`;
    console.log('[API/Products] R2 업로드 키:', mainFileKey);

    const mainFileUrl = await uploadFile({
      key: mainFileKey,
      body: mainFileBuffer,
      contentType: mainFile.type || 'application/octet-stream',
    });
    console.log('[API/Products] 메인 파일 업로드 완료:', mainFileUrl);

    // 2. 샘플 파일 처리
    let sampleFileUrl: string;
    let hasCustomSample: boolean;

    if (sampleFile) {
      // 케이스 2: 커스텀 샘플 제공
      console.log('[API/Products] 커스텀 샘플 파일 업로드:', {
        fileName: sampleFile.name,
        fileType: sampleFile.type,
        fileSize: sampleFile.size,
      });

      const sampleBuffer = Buffer.from(await sampleFile.arrayBuffer());
      console.log('[API/Products] 샘플 파일 Buffer 생성 완료:', sampleBuffer.length, 'bytes');

      sampleFileUrl = await uploadFile({
        key: `voicepacks/${productId}/sample.mp3`,
        body: sampleBuffer,
        contentType: 'audio/mpeg',
      });

      hasCustomSample = true;
      console.log('[API/Products] 커스텀 샘플 업로드 완료:', sampleFileUrl);
    } else {
      // 케이스 3: 자동 샘플 생성
      console.log('[API/Products] 샘플 파일 자동 생성 시작...');

      const startTime = Date.now();

      const sampleBuffer = await SampleGenerationService.generateSample(
        mainFileBuffer,
        mainFile.name
      );

      const processingTime = Date.now() - startTime;
      console.log('[API/Products] 샘플 생성 완료:', {
        processingTimeMs: processingTime,
        sampleSize: sampleBuffer.length,
      });

      sampleFileUrl = await uploadFile({
        key: `voicepacks/${productId}/sample.mp3`,
        body: sampleBuffer,
        contentType: 'audio/mpeg',
      });

      hasCustomSample = false;
      console.log('[Product] 샘플 파일 자동 생성 완료');

      // 샘플 생성 로그 기록
      await LogService.log({
        eventType: 'SAMPLE_GENERATED',
        message: '보이스팩 샘플 자동 생성 완료',
        userId: 'admin-id', // TODO: 실제 관리자 ID
        metadata: {
          productId,
          productName: name,
          mainFileName: mainFile.name,
          mainFileSize: mainFileBuffer.length,
          sampleSize: sampleBuffer.length,
          processingTimeMs: processingTime,
          hasCustomSample: false,
        },
      });
    }

    // 3. DB에 상품 저장
    const slug = `${name.toLowerCase().replace(/\s+/g, '-')}-${productId.substring(0, 8)}`;
    const productData = {
      id: productId,
      name,
      slug,
      type: 'VOICE_PACK' as const,
      price,
      description: description || null,
      project_id: projectId,
      main_image_id: mainImageId || null,
      digital_file_url: mainFileUrl,
      sample_audio_url: sampleFileUrl,
      is_active: true,
    };

    const product = await ProductService.createProduct(productData, 'admin-id');

    console.log('[Product] 상품 생성 완료:', product.id);

    // 상품 생성 성공 로그
    await LogService.log({
      eventType: 'PRODUCT_CREATED',
      message: '보이스팩 상품 생성 완료',
      userId: 'admin-id', // TODO: 실제 관리자 ID
      metadata: {
        productId: product.id,
        productName: product.name,
        productType: 'VOICE_PACK',
        price: product.price,
        hasCustomSample,
      },
    });

    return successResponse(product, undefined, 201);
  } catch (error) {
    console.error('[API/Products] 보이스팩 생성 실패:', error);
    console.error('[API/Products] 에러 스택:', error instanceof Error ? error.stack : 'No stack trace');

    // 실패 로그 기록
    await LogService.log({
      eventType: 'PRODUCT_CREATION_FAILED',
      message: '보이스팩 상품 생성 실패',
      userId: 'admin-id', // TODO: 실제 관리자 ID
      metadata: {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        formData: {
          name: formData?.get('name')?.toString() || null,
          projectId: formData?.get('projectId')?.toString() || null,
          mainFileName: (formData?.get('mainFile') as File | null)?.name || null,
          sampleFileName: (formData?.get('sampleFile') as File | null)?.name || null,
        },
      },
    });

    throw error;
  }
}

/**
 * 파일 확장자 추출 (점 포함)
 */
function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  return lastDot !== -1 ? filename.substring(lastDot) : '';
}
