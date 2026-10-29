/**
 * Proxy Matcher Tests
 *
 * proxy.ts(미들웨어)는 페이지·RSC 요청에서만 Supabase 세션을 갱신하고,
 * BFF(/api/...) 요청에는 실행되지 않는다(WN-486, FE-01).
 */

import { describe, expect, it } from 'vitest';
import { unstable_doesMiddlewareMatch } from 'next/experimental/testing/server';
import { config } from '@/proxy';

const matches = (url: string, headers?: Record<string, string>) =>
  unstable_doesMiddlewareMatch({ config, url, headers });

describe('proxy matcher', () => {
  it.each([
    '/api/v2/shop/campaigns?channel=WEB',
    '/api/v2/checkout/cart',
    '/api/v2/checkout/me/digital-entitlements/76fad096-7ffe-4fb0-a9d0-ac97f8e0b377/download',
    '/api/auth/session',
    '/api/auth/login',
  ])('skips API route %s', (url) => {
    expect(matches(url)).toBe(false);
  });

  it.each([
    '/',
    '/mypage',
    '/mypage/digital-products',
    '/login',
    '/signup',
    '/policy',
    '/admin',
    '/auth/callback?code=abc',
    '/api-docs',
  ])('runs on page %s', (url) => {
    expect(matches(url)).toBe(true);
  });

  it('runs on RSC requests for pages', () => {
    expect(matches('/mypage?_rsc=abc123', { rsc: '1' })).toBe(true);
  });

  it.each(['/_next/static/chunks/main.js', '/_next/image?url=%2Fa.png&w=64&q=75', '/favicon.ico', '/images/hero.png'])(
    'skips static asset %s',
    (url) => {
      expect(matches(url)).toBe(false);
    },
  );
});
