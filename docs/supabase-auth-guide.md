# Supabase 인증 및 세션 관리 가이드

Lucent Management 프로젝트에서 Supabase Auth를 사용한 세션 관리 방법을 설명합니다.

## 🔑 핵심 개념

우리 프로젝트는 **쿠키 기반 세션 관리**를 사용합니다:

- ✅ **쿠키에 세션 저장** (서버/클라이언트 모두 접근 가능)
- ✅ **Proxy에서 자동 세션 갱신** (Next.js 15+의 새로운 방식)
- ✅ **로그인 상태 유지** (새로고침, 페이지 이동 시에도)
- ❌ localStorage 사용 안 함
- ❌ Zustand 같은 전역 상태 관리 필요 없음

---

## 📁 파일 구조

```
/
├── proxy.ts                             # 세션 자동 갱신 (모든 요청, Next.js 15+)
├── src/utils/supabase/
│   ├── client.ts                        # 클라이언트 컴포넌트용
│   └── server.ts                        # 서버 컴포넌트용
└── lib/server/utils/supabase.ts         # API Routes용 (기존)
```

> **참고:** Next.js 15+에서는 `middleware.ts` 대신 `proxy.ts`를 사용합니다.

---

## 🛠 사용 방법

### 1. 클라이언트 컴포넌트에서 사용

브라우저에서 실행되는 컴포넌트 (이벤트 핸들러, useEffect 등)

```tsx
'use client';

import { createClient } from '@/utils/supabase/client';
import { useEffect, useState } from 'react';

export default function UserProfile() {
  const [user, setUser] = useState(null);
  const supabase = createClient();

  useEffect(() => {
    // 현재 로그인한 사용자 정보 가져오기
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };

    getUser();

    // 세션 변경 감지 (로그인/로그아웃 시)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  if (!user) {
    return <div>로그인이 필요합니다</div>;
  }

  return (
    <div>
      <h1>환영합니다, {user.email}님!</h1>
      <button onClick={async () => {
        await supabase.auth.signOut();
      }}>
        로그아웃
      </button>
    </div>
  );
}
```

### 2. 서버 컴포넌트에서 사용

Next.js App Router의 서버 컴포넌트 (async 컴포넌트)

```tsx
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

export default async function MyPage() {
  const supabase = await createClient();

  // 로그인 확인
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // 데이터베이스 조회
  const { data: orders } = await supabase
    .from('orders')
    .select('*')
    .eq('user_id', user.id);

  return (
    <div>
      <h1>마이페이지</h1>
      <p>로그인: {user.email}</p>
      <ul>
        {orders?.map(order => (
          <li key={order.id}>{order.product_name}</li>
        ))}
      </ul>
    </div>
  );
}
```

### 3. API Routes에서 사용

기존과 동일하게 `lib/server/utils/supabase.ts` 사용

```tsx
// app/api/mypage/route.ts
import { NextRequest } from 'next/server';
import { createServerClient } from '@/lib/server/utils/supabase';
import { successResponse, handleApiError } from '@/lib/server/utils/api-response';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    // 로그인 확인
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return handleApiError(new Error('인증이 필요합니다'));
    }

    // 사용자 데이터 조회
    const { data: orders } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', user.id);

    return successResponse({ orders });
  } catch (error) {
    return handleApiError(error);
  }
}
```

### 4. Server Actions에서 사용

Form 처리, 데이터 변경 등

```tsx
'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('인증이 필요합니다');
  }

  const name = formData.get('name') as string;

  await supabase
    .from('profiles')
    .update({ name })
    .eq('id', user.id);

  revalidatePath('/mypage');

  return { success: true };
}
```

---

## 🔐 로그인 플로우

### 클라이언트에서 API 호출 방식

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    // API Routes를 통해 로그인
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (res.ok) {
      // 로그인 성공 - 세션이 쿠키에 저장됨
      router.push('/mypage');
      router.refresh(); // 서버 컴포넌트 새로고침
    } else {
      alert('로그인 실패');
    }
  };

  return (
    <form onSubmit={handleLogin}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="이메일"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="비밀번호"
      />
      <button type="submit">로그인</button>
    </form>
  );
}
```

### 클라이언트에서 직접 로그인 (선택사항)

```tsx
'use client';

import { createClient } from '@/utils/supabase/client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (!error) {
      router.push('/mypage');
      router.refresh();
    } else {
      alert('로그인 실패: ' + error.message);
    }
  };

  return (
    <form onSubmit={handleLogin}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="이메일"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="비밀번호"
      />
      <button type="submit">로그인</button>
    </form>
  );
}
```

**주의:** 클라이언트에서 직접 로그인하면 **로깅 시스템이 작동하지 않습니다**. 보안 로그가 필요한 경우 반드시 API Routes를 통해 로그인하세요.

---

## 🛡 Proxy 동작 방식

`proxy.ts`는 모든 요청에 대해 자동으로 실행되며:

1. **세션 갱신**: 쿠키의 세션을 확인하고 만료 시 자동 갱신
2. **보호된 라우트 처리**: 로그인하지 않은 사용자는 `/mypage` 접근 시 `/login`으로 리다이렉트
3. **자동 리다이렉트**: 이미 로그인한 사용자가 `/login`, `/signup` 접근 시 홈으로 리다이렉트

### Proxy 커스터마이징

```ts
// proxy.ts

// 보호된 라우트 추가
if (!user && (
  request.nextUrl.pathname.startsWith('/mypage') ||
  request.nextUrl.pathname.startsWith('/admin')
)) {
  // 로그인 페이지로 리다이렉트
  const url = request.nextUrl.clone();
  url.pathname = '/login';
  url.searchParams.set('redirect', request.nextUrl.pathname);
  return NextResponse.redirect(url);
}

// 관리자 전용 라우트
if (request.nextUrl.pathname.startsWith('/admin')) {
  // 관리자 권한 확인 로직 추가
}
```

---

## 🔄 세션 상태 동기화

### React Query와 함께 사용 (권장)

```tsx
'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';

export function useUser() {
  const supabase = createClient();

  return useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
    staleTime: 5 * 60 * 1000, // 5분
  });
}

// 사용 예시
export default function Header() {
  const { data: user, isLoading } = useUser();

  if (isLoading) return <div>로딩 중...</div>;

  return (
    <header>
      {user ? (
        <span>환영합니다, {user.email}님</span>
      ) : (
        <a href="/login">로그인</a>
      )}
    </header>
  );
}
```

---

## ❓ FAQ

### Q1. 로그인 후 새로고침하면 세션이 사라져요

**A:** `proxy.ts`가 제대로 작동하고 있는지 확인하세요:
```bash
# proxy.ts 파일이 프로젝트 루트에 있는지 확인
ls proxy.ts

# 개발 서버 재시작
npm run dev
```

> **참고:** Next.js 15 이전 버전을 사용 중이라면 `middleware.ts`를 사용해야 할 수도 있습니다.

### Q2. 클라이언트에서 `supabase.auth.getUser()`가 null을 반환해요

**A:** 두 가지 원인이 있을 수 있습니다:
1. 로그인이 제대로 안 됨 → API Routes의 로그인 로직 확인
2. 쿠키가 설정되지 않음 → 브라우저 개발자 도구 → Application → Cookies 확인

### Q3. localStorage vs 쿠키, 어떤 차이인가요?

| 방식 | localStorage | 쿠키 (우리 프로젝트) |
|------|--------------|---------------------|
| 서버 접근 | ❌ 불가능 | ✅ 가능 |
| SSR 지원 | ❌ 불가능 | ✅ 가능 |
| 자동 갱신 | ❌ 수동 처리 | ✅ Proxy 자동 |
| 보안 | 중간 | 더 안전 (httpOnly 가능) |

쿠키 방식이 Next.js App Router와 더 잘 맞습니다.

### Q4. Zustand나 전역 상태 관리가 필요한가요?

**A:** 필요 없습니다. Supabase Auth는 자체적으로 세션을 관리하며, React Query와 함께 사용하면 충분합니다.

---

## 🚀 다음 단계

1. ✅ 로그인 페이지 구현 (`app/login/page.tsx`)
2. ✅ 회원가입 페이지 구현 (`app/signup/page.tsx`)
3. ✅ 마이페이지 구현 (`app/mypage/page.tsx`)
4. ✅ 로그아웃 기능 추가
5. 선택사항: React Query를 사용한 사용자 상태 관리

---

## 📚 참고 자료

- [Supabase Auth 공식 문서](https://supabase.com/docs/guides/auth)
- [Supabase SSR 가이드](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [Next.js Proxy 문서](https://nextjs.org/docs/messages/middleware-to-proxy) (Next.js 15+)
- [Next.js Middleware 문서](https://nextjs.org/docs/app/building-your-application/routing/middleware) (Next.js 14 이하)
