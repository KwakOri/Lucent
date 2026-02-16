import { NextRequest } from 'next/server';
import { proxyBackendRequest } from '@/lib/server/utils/backend-proxy';

interface ParamsContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: ParamsContext) {
  const { id } = await params;
  return proxyBackendRequest(request, {
    path: `/api/products/${id}`,
    includeSearchParams: true,
  });
}

export async function PATCH(request: NextRequest, { params }: ParamsContext) {
  const { id } = await params;
  return proxyBackendRequest(request, {
    path: `/api/products/${id}`,
  });
}

export async function DELETE(request: NextRequest, { params }: ParamsContext) {
  const { id } = await params;
  return proxyBackendRequest(request, {
    path: `/api/products/${id}`,
  });
}
