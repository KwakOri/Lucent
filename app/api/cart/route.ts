import { NextRequest } from 'next/server';
import { proxyBackendRequest } from '@/lib/server/utils/backend-proxy';

export async function GET(request: NextRequest) {
  return proxyBackendRequest(request, {
    path: '/api/cart',
  });
}

export async function POST(request: NextRequest) {
  return proxyBackendRequest(request, {
    path: '/api/cart',
  });
}

export async function DELETE(request: NextRequest) {
  return proxyBackendRequest(request, {
    path: '/api/cart',
  });
}
