/**
 * Products API Routes
 *
 * GET /api/products - 상품 목록 조회
 * POST /api/products - 상품 생성 (관리자)
 */

import { NextRequest } from 'next/server';

// Route Segment Config - 대용량 파일 업로드 지원
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300; // 5분 타임아웃
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
 * - JSON: 모든 상품 타입 (보이스팩, 실물 굿즈, 번들)
 */
export async function POST(request: NextRequest) {
  try {
    const adminCheck = await isAdmin();
    if (!adminCheck) {
      return handleApiError(
        new Error('관리자 권한이 필요합니다')
      );
    }

    // JSON: 상품 생성
    const body = await request.json() as CreateProductRequest;

    console.log('[API/Products] 상품 생성 요청:', body);

    // TODO: 관리자 ID 가져오기
    const adminId = 'admin-id';

    // 빈 문자열을 null로 변환
    const productData = {
      ...body,
      main_image_id: body.main_image_id || null,
      digital_file_url: body.digital_file_url || null,
      sample_audio_url: body.sample_audio_url || '',
    };

    const product = await ProductService.createProduct(productData, adminId);

    console.log('[API/Products] 상품 생성 완료:', product.id);

    return successResponse(product, undefined, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

// 파일 업로드 기능은 제거됨 (Google Drive 링크 사용)
