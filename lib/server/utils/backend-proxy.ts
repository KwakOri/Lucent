import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from './supabase';

const PASSTHROUGH_HEADERS = [
  'content-type',
  'content-length',
  'cache-control',
  'accept-ranges',
  'content-disposition',
  'location',
  'x-lucent-backend-app-ms',
];

interface ProxyBackendOptions {
  path: string;
  includeSearchParams?: boolean;
  successStatusOverride?: number;
}

function formatDurationMs(durationMs: number): string {
  return Math.max(0, durationMs).toFixed(1);
}

function createTimingHeaders(input: {
  totalMs: number;
  authMs: number;
  backendMs: number;
  payloadMs: number;
  backendServerTiming?: string | null;
}): HeadersInit {
  const totalMs = formatDurationMs(input.totalMs);
  const authMs = formatDurationMs(input.authMs);
  const backendMs = formatDurationMs(input.backendMs);
  const payloadMs = formatDurationMs(input.payloadMs);

  return {
    'server-timing': [
      input.backendServerTiming || '',
      `lucent_proxy;dur=${totalMs}`,
      `lucent_auth;dur=${authMs}`,
      `lucent_backend;dur=${backendMs}`,
      `lucent_payload;dur=${payloadMs}`,
    ]
      .filter(Boolean)
      .join(', '),
    'x-lucent-proxy-ms': totalMs,
    'x-lucent-auth-ms': authMs,
    'x-lucent-backend-ms': backendMs,
    'x-lucent-payload-ms': payloadMs,
  };
}

function shouldLogProxyTimings(): boolean {
  return (
    process.env.NODE_ENV !== 'production' ||
    process.env.LUCENT_API_TIMING_LOG === 'true'
  );
}

function logProxyTiming(input: {
  method: string;
  path: string;
  status: number;
  totalMs: number;
  authMs: number;
  backendMs: number;
  payloadMs: number;
}): void {
  if (!shouldLogProxyTimings()) {
    return;
  }

  console.info(
    [
      '[backendProxy]',
      input.method,
      input.path,
      `status=${input.status}`,
      `total=${formatDurationMs(input.totalMs)}ms`,
      `auth=${formatDurationMs(input.authMs)}ms`,
      `backend=${formatDurationMs(input.backendMs)}ms`,
      `payload=${formatDurationMs(input.payloadMs)}ms`,
    ].join(' '),
  );
}

function resolveBackendBaseUrl(): string | null {
  const developmentFallback =
    process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3001';

  const baseUrl = (
    process.env.BACKEND_API_URL ||
    process.env.NEXT_PUBLIC_BACKEND_API_URL ||
    developmentFallback
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
  const requestStartedAt = performance.now();
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
    const authStartedAt = performance.now();
    const authorization = await resolveAuthorizationHeader(request);
    const authCompletedAt = performance.now();
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

    let body: ArrayBuffer | undefined;
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      const rawBody = await request.arrayBuffer();
      body = rawBody.byteLength > 0 ? rawBody : undefined;
    }

    const backendStartedAt = performance.now();
    const backendResponse = await fetch(backendUrl, {
      method: request.method,
      headers,
      body,
      cache: 'no-store',
      redirect: 'manual',
    });
    const backendHeadersReceivedAt = performance.now();

    const payload = await backendResponse.arrayBuffer();
    const payloadReadAt = performance.now();
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

    const totalMs = payloadReadAt - requestStartedAt;
    const authMs = authCompletedAt - authStartedAt;
    const backendMs = backendHeadersReceivedAt - backendStartedAt;
    const payloadMs = payloadReadAt - backendHeadersReceivedAt;
    const timingHeaders = createTimingHeaders({
      totalMs,
      authMs,
      backendMs,
      payloadMs,
      backendServerTiming: backendResponse.headers.get('server-timing'),
    });
    for (const [name, value] of Object.entries(timingHeaders)) {
      responseHeaders.set(name, value);
    }
    logProxyTiming({
      method: request.method,
      path: `${options.path}${search}`,
      status,
      totalMs,
      authMs,
      backendMs,
      payloadMs,
    });

    return new NextResponse(payload.byteLength > 0 ? payload : null, {
      status,
      headers: responseHeaders,
    });
  } catch {
    const totalMs = performance.now() - requestStartedAt;
    return NextResponse.json(
      {
        status: 'error',
        message: '백엔드 API 요청에 실패했습니다',
        errorCode: 'BACKEND_REQUEST_FAILED',
      },
      {
        status: 502,
        headers: createTimingHeaders({
          totalMs,
          authMs: 0,
          backendMs: totalMs,
          payloadMs: 0,
        }),
      },
    );
  }
}
