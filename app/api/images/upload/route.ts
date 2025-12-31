/**
 * POST /api/images/upload
 *
 * 이미지 업로드 (관리자 전용)
 * - R2에 이미지 업로드
 * - images 테이블에 메타데이터 저장
 */

import { NextRequest, NextResponse } from 'next/server';
import { ImageService } from '@/lib/server/services/image.service';
import { getCurrentUser, isAdmin } from '@/lib/server/utils/supabase';
import { handleApiError, successResponse, errorResponse } from '@/lib/server/utils/api-response';

export async function POST(request: NextRequest) {
  try {
    // 1. 인증 확인
    const user = await getCurrentUser();
    if (!user) {
      return errorResponse('로그인이 필요합니다', 401, 'UNAUTHENTICATED');
    }

    // 2. 관리자 권한 확인
    const adminCheck = await isAdmin();
    if (!adminCheck) {
      return errorResponse('관리자 권한이 필요합니다', 403, 'ADMIN_REQUIRED');
    }

    // 3. FormData 파싱
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const imageType = formData.get('image_type') as
      | 'project_cover'
      | 'artist_profile'
      | 'product_main'
      | 'product_gallery';
    const altText = formData.get('alt_text') as string | undefined;

    // 4. 필수 필드 확인
    if (!file) {
      return errorResponse('파일이 제공되지 않았습니다', 400, 'FILE_REQUIRED');
    }

    if (!imageType) {
      return errorResponse('image_type이 제공되지 않았습니다', 400, 'IMAGE_TYPE_REQUIRED');
    }

    const validImageTypes = ['project_cover', 'artist_profile', 'product_main', 'product_gallery'];
    if (!validImageTypes.includes(imageType)) {
      return errorResponse('유효하지 않은 image_type입니다', 400, 'INVALID_IMAGE_TYPE');
    }

    // 5. 이미지 업로드
    const image = await ImageService.uploadImage({
      file,
      imageType,
      altText,
      uploadedBy: user.id,
    });

    return successResponse(
      {
        id: image.id,
        public_url: image.public_url,
        file_name: image.file_name,
        file_size: image.file_size,
        width: image.width,
        height: image.height,
        image_type: image.image_type,
        created_at: image.created_at,
      },
      undefined,
      201
    );
  } catch (error) {
    return handleApiError(error);
  }
}
