import { NextRequest } from 'next/server';
import { proxyBackendRequest } from '@/lib/server/utils/backend-proxy';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

export async function GET(request: NextRequest) {
  return proxyBackendRequest(request, {
    path: '/api/products',
    includeSearchParams: true,
  });
}

export async function POST(request: NextRequest) {
  return proxyBackendRequest(request, {
    path: '/api/products',
    successStatusOverride: 201,
  });
}
