import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from './supabase';

const PASSTHROUGH_HEADERS = [
  'content-type',
  'content-length',
  'cache-control',
  'accept-ranges',
  'content-disposition',
  'location',
];

interface ProxyBackendOptions {
  path: string;
  includeSearchParams?: boolean;
  successStatusOverride?: number;
}

function resolveBackendBaseUrl(): string | null {
  const baseUrl = (
    process.env.BACKEND_API_URL ||
    process.env.NEXT_PUBLIC_BACKEND_API_URL ||
    ''
  ).trim();

  if (!baseUrl) {
    return null;
  }

  return baseUrl.replace(/\/$/, '');
}

async function resolveAuthorizationHeader(
  request: NextRequest,
): Promise<string | null> {
  const requestAuth = request.headers.get('authorization');
  if (requestAuth) {
    return requestAuth;
  }

  try {
    const supabase = await createServerClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.access_token) {
      return `Bearer ${session.access_token}`;
    }
  } catch {
    // Ignore auth fallback errors and continue without Authorization header.
  }

  return null;
}

export async function proxyBackendRequest(
  request: NextRequest,
  options: ProxyBackendOptions,
): Promise<NextResponse> {
  const baseUrl = resolveBackendBaseUrl();
  if (!baseUrl) {
    return NextResponse.json(
      {
        status: 'error',
        message:
          'Backend API URL is not configured. Set BACKEND_API_URL or NEXT_PUBLIC_BACKEND_API_URL.',
        errorCode: 'BACKEND_URL_NOT_CONFIGURED',
      },
      { status: 500 },
    );
  }

  const search = options.includeSearchParams ? request.nextUrl.search : '';
  const backendUrl = `${baseUrl}${options.path}${search}`;

  try {
    const headers = new Headers();
    const authorization = await resolveAuthorizationHeader(request);
    if (authorization) {
      headers.set('authorization', authorization);
    }

    const contentType = request.headers.get('content-type');
    if (contentType) {
      headers.set('content-type', contentType);
    }

    const accept = request.headers.get('accept');
    if (accept) {
      headers.set('accept', accept);
    }

    let body: string | undefined;
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      const rawBody = await request.text();
      body = rawBody.length > 0 ? rawBody : undefined;
    }

    const backendResponse = await fetch(backendUrl, {
      method: request.method,
      headers,
      body,
      cache: 'no-store',
    });

    const payload = await backendResponse.arrayBuffer();
    const responseHeaders = new Headers();

    for (const headerName of PASSTHROUGH_HEADERS) {
      const value = backendResponse.headers.get(headerName);
      if (value) {
        responseHeaders.set(headerName, value);
      }
    }

    let status = backendResponse.status;
    if (
      options.successStatusOverride &&
      backendResponse.ok &&
      backendResponse.status !== options.successStatusOverride
    ) {
      status = options.successStatusOverride;
    }

    return new NextResponse(payload.byteLength > 0 ? payload : null, {
      status,
      headers: responseHeaders,
    });
  } catch {
    return NextResponse.json(
      {
        status: 'error',
        message: '백엔드 API 요청에 실패했습니다',
        errorCode: 'BACKEND_REQUEST_FAILED',
      },
      { status: 502 },
    );
  }
}
