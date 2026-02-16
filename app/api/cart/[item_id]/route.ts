import { NextRequest } from 'next/server';
import { proxyBackendRequest } from '@/lib/server/utils/backend-proxy';

interface RouteParams {
  params: Promise<{ item_id: string }>;
}

export async function PATCH(request: NextRequest, context: RouteParams) {
  const { item_id } = await context.params;

  return proxyBackendRequest(request, {
    path: `/api/cart/${item_id}`,
  });
}

export async function DELETE(request: NextRequest, context: RouteParams) {
  const { item_id } = await context.params;

  return proxyBackendRequest(request, {
    path: `/api/cart/${item_id}`,
  });
}
