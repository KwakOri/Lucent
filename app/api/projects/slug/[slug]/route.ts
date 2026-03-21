import { NextRequest } from 'next/server';
import { proxyBackendRequest } from '@/lib/server/utils/backend-proxy';

interface ParamsContext {
  params: Promise<{ slug: string }>;
}

export async function GET(request: NextRequest, { params }: ParamsContext) {
  const { slug } = await params;
  return proxyBackendRequest(request, {
    path: `/api/projects/slug/${slug}`,
  });
}
