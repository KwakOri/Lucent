import { NextRequest } from 'next/server';
import { proxyBackendRequest } from '@/lib/server/utils/backend-proxy';

interface ParamsContext {
  params: Promise<{ segments: string[] }>;
}

async function proxyV2FulfillmentAdminRequest(
  request: NextRequest,
  paramsPromise: Promise<{ segments: string[] }>,
) {
  const { segments } = await paramsPromise;
  const path = `/api/v2/fulfillment/admin/${segments.join('/')}`;

  return proxyBackendRequest(request, {
    path,
    includeSearchParams: true,
  });
}

export async function GET(request: NextRequest, { params }: ParamsContext) {
  return proxyV2FulfillmentAdminRequest(request, params);
}

export async function POST(request: NextRequest, { params }: ParamsContext) {
  return proxyV2FulfillmentAdminRequest(request, params);
}

export async function PATCH(request: NextRequest, { params }: ParamsContext) {
  return proxyV2FulfillmentAdminRequest(request, params);
}

export async function DELETE(request: NextRequest, { params }: ParamsContext) {
  return proxyV2FulfillmentAdminRequest(request, params);
}
