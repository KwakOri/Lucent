import { NextRequest } from 'next/server';
import { proxyBackendRequest } from '@/lib/server/utils/backend-proxy';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  const { id, itemId } = await params;

  return proxyBackendRequest(request, {
    path: `/api/orders/${id}/items/${itemId}/download`,
  });
}
