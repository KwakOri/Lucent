import { NextRequest } from 'next/server';
import { proxyBackendRequest } from '@/lib/server/utils/backend-proxy';

export async function GET(request: NextRequest) {
  return proxyBackendRequest(request, {
    path: '/api/images',
    includeSearchParams: true,
  });
}
