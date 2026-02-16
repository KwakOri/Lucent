import { NextRequest } from 'next/server';
import { proxyBackendRequest } from '@/lib/server/utils/backend-proxy';

interface DownloadParams {
  params: Promise<{
    productId: string;
  }>;
}

export async function GET(request: NextRequest, { params }: DownloadParams) {
  const { productId } = await params;

  return proxyBackendRequest(request, {
    path: `/api/download/${productId}`,
  });
}
