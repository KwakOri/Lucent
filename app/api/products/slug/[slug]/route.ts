/**
 * GET /api/products/slug/:slug
 *
 * Slug로 상품 조회
 */

import { NextRequest } from 'next/server';
import { ProductService } from '@/lib/server/services/product.service';
import { handleApiError, successResponse } from '@/lib/server/utils/api-response';

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const product = await ProductService.getProductBySlug(params.slug);

    return successResponse(product);
  } catch (error) {
    return handleApiError(error);
  }
}
