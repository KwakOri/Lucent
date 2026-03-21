import { NextRequest } from 'next/server';
import { proxyBackendRequest } from '@/lib/server/utils/backend-proxy';

export async function PATCH(request: NextRequest) {
  return proxyBackendRequest(request, {
    path: '/api/projects/reorder',
  });
}
