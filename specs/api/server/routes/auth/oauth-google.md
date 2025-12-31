# Google OAuth Authentication

이 문서는 **Google OAuth 로그인** API 엔드포인트와 구현을 정의한다.

> **범위**: Google OAuth 로그인 플로우
> **관련 문서**:
> - OAuth Service: `/specs/api/server/services/auth/oauth.md`
> - Auth API Overview: `/specs/api/server/routes/auth/index.md`
> - Profiles Service: `/specs/api/server/services/profiles/index.md`

---

## 1. Google OAuth 개요

### 1.1 인증 방식

- **제공자**: Google OAuth 2.0
- **Supabase 통합**: Supabase Auth를 통한 Google OAuth
- **세션 관리**: JWT 기반 (HTTP-only cookie)
- **프로필 관리**: `profiles` 테이블에서 사용자 정보 관리

### 1.2 OAuth 설정

**Supabase 콜백 URL**:
```
https://zzckbomchrebuyetgvqv.supabase.co/auth/v1/callback
```

**Google Cloud Console 설정**:
- OAuth 2.0 클라이언트 ID 생성
- 승인된 리디렉션 URI에 Supabase 콜백 URL 추가
- Client ID와 Client Secret을 Supabase에 등록

---

## 2. OAuth 플로우

### 2.1 전체 플로우

```
1. 사용자가 "Google로 로그인" 버튼 클릭
   ↓
2. 프론트엔드에서 Supabase Auth 호출 (signInWithOAuth)
   ↓
3. Google 로그인 페이지로 리디렉션
   ↓
4. 사용자가 Google 계정으로 인증
   ↓
5. Google이 Supabase 콜백 URL로 리디렉션
   ↓
6. Supabase가 auth.users에 사용자 자동 생성/업데이트
   ↓
7. 프론트엔드 앱으로 리디렉션 (with session)
   ↓
8. 백엔드에서 프로필 확인 및 생성 (POST /api/auth/oauth/callback)
   - profiles 테이블에 레코드 없으면 자동 생성
   - 있으면 기존 프로필 사용
   ↓
9. 로그인 완료
```

### 2.2 첫 로그인 vs 재로그인

**첫 로그인 (회원가입)**:
1. Google OAuth 인증 완료
2. `auth.users`에 사용자 생성
3. **자동으로** `profiles` 테이블에 레코드 생성
   - `id`: auth.users.id (UUID)
   - `email`: Google 계정 이메일
   - `name`: Google 계정 이름 (또는 null)
   - `phone`: null (추후 입력 가능)
   - `address`: null (추후 입력 가능)
   - `created_at`: 현재 시각

**재로그인 (기존 사용자)**:
1. Google OAuth 인증 완료
2. `auth.users`에서 기존 사용자 확인
3. `profiles` 테이블에서 기존 프로필 로드
4. 로그인 완료

---

## 3. API 엔드포인트

### 3.1 Google OAuth 시작 (클라이언트 사이드)

**프론트엔드에서 직접 Supabase Auth 호출**:

```ts
// 클라이언트 사이드 코드
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Google OAuth 시작
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: `${window.location.origin}/auth/callback`,
  },
});
```

**설명**:
- 별도의 백엔드 API 엔드포인트 불필요
- Supabase Auth가 Google OAuth 플로우를 처리
- `redirectTo`: OAuth 완료 후 돌아올 프론트엔드 URL

---

### 3.2 OAuth 콜백 처리 (백엔드)

```
POST /api/auth/oauth/callback
```

**목적**: OAuth 인증 완료 후 프로필 자동 생성/확인

**인증**: 필수 (Supabase session)

**Request Body**: 없음 (session에서 user 정보 추출)

**Response (200 OK)** - 첫 로그인 (프로필 생성):
```json
{
  "status": "success",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@gmail.com"
    },
    "profile": {
      "id": "uuid",
      "email": "user@gmail.com",
      "name": "홍길동",
      "phone": null,
      "address": null,
      "created_at": "2025-01-01T00:00:00Z"
    },
    "isNewUser": true
  },
  "message": "Google 로그인 성공 (새 계정 생성)"
}
```

**Response (200 OK)** - 재로그인 (기존 프로필):
```json
{
  "status": "success",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@gmail.com"
    },
    "profile": {
      "id": "uuid",
      "email": "user@gmail.com",
      "name": "홍길동",
      "phone": "010-1234-5678",
      "address": "서울시 강남구...",
      "created_at": "2025-01-01T00:00:00Z"
    },
    "isNewUser": false
  },
  "message": "Google 로그인 성공"
}
```

**Error (401 Unauthorized)**:
```json
{
  "status": "error",
  "message": "로그인이 필요합니다",
  "errorCode": "UNAUTHORIZED"
}
```

---

### 3.3 프로필 확인 (프론트엔드 자동 호출)

```
GET /api/auth/session
```

OAuth 로그인 후 프론트엔드에서 세션 확인 시 자동으로 프로필 존재 여부 확인.

기존 엔드포인트이지만, OAuth 사용자도 동일하게 처리.

---

## 4. 구현 예시

### 4.1 OAuth 콜백 처리 API

```ts
// app/api/auth/oauth/callback/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/server/utils/supabase';
import { OAuthService } from '@/lib/server/services/oauth.service';
import { handleApiError } from '@/lib/server/utils/api-response';

export async function POST(request: NextRequest) {
  try {
    // 인증 확인
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { status: 'error', message: '로그인이 필요합니다' },
        { status: 401 }
      );
    }

    // OAuth 프로필 처리 (자동 생성 또는 로드)
    const result = await OAuthService.handleOAuthCallback(user);

    return NextResponse.json({
      status: 'success',
      data: result,
      message: result.isNewUser
        ? 'Google 로그인 성공 (새 계정 생성)'
        : 'Google 로그인 성공',
    });
  } catch (error) {
    return handleApiError(error);
  }
}
```

---

## 5. 데이터 플로우

### 5.1 Google 사용자 정보 → profiles 매핑

**Google에서 제공하는 정보**:
```json
{
  "id": "google-user-id",
  "email": "user@gmail.com",
  "name": "홍길동",
  "picture": "https://lh3.googleusercontent.com/...",
  "email_verified": true
}
```

**profiles 테이블에 저장**:
```sql
INSERT INTO profiles (id, email, name, phone, address)
VALUES (
  auth_user_id,        -- Supabase auth.users.id
  'user@gmail.com',    -- Google email
  '홍길동',             -- Google name (또는 null)
  null,                -- phone (추후 입력)
  null                 -- address (추후 입력)
);
```

### 5.2 프로필 업데이트 정책

**첫 로그인 시**:
- `email`, `name`은 Google에서 가져온 값으로 자동 설정
- `phone`, `address`는 null

**재로그인 시**:
- 기존 프로필 정보 유지 (변경 없음)
- 사용자가 마이페이지에서 수동으로 수정 가능

---

## 6. 보안 고려사항

### 6.1 이메일 중복 방지

**문제**:
- 일반 회원가입 (이메일 + 비밀번호)으로 가입한 사용자가
- 동일한 이메일로 Google OAuth 로그인 시도 시

**해결**:
```ts
// 프로필 생성 전 이메일 중복 확인
const { data: existingProfile } = await supabase
  .from('profiles')
  .select('id, email')
  .eq('email', user.email)
  .single();

if (existingProfile) {
  // 이미 동일 이메일로 가입된 계정이 있음
  // → 기존 프로필 사용 (자동 연결)
  return existingProfile;
}
```

**정책**: 동일 이메일이면 자동으로 계정 연결 (profiles.id는 auth.users.id로 통일)

### 6.2 CSRF 보호

Supabase Auth가 자동으로 처리:
- `state` 파라미터 검증
- PKCE (Proof Key for Code Exchange) 사용

### 6.3 세션 관리

- JWT 세션은 HTTP-only cookie에 저장
- XSS 공격 방지
- CSRF 토큰 검증 (Supabase 자동 처리)

---

## 7. 로깅

### 7.1 로그인 성공

```ts
await LogService.log({
  eventCategory: 'auth',
  eventType: 'oauth_login_success',
  message: `Google OAuth 로그인 성공${isNewUser ? ' (신규 가입)' : ''}`,
  userId: user.id,
  metadata: {
    provider: 'google',
    isNewUser,
    email: user.email,
  },
  ipAddress: request.ip,
});
```

### 7.2 프로필 생성

```ts
await LogService.log({
  eventCategory: 'auth',
  eventType: 'oauth_profile_created',
  message: 'Google OAuth 프로필 자동 생성',
  userId: user.id,
  metadata: {
    email: user.email,
    name: userData.user_metadata?.full_name,
  },
  ipAddress: request.ip,
});
```

---

## 8. 에러 처리

### 8.1 OAuth 인증 실패

**원인**:
- 사용자가 Google 인증 거부
- Google API 오류
- 네트워크 오류

**처리**:
- 프론트엔드에서 에러 메시지 표시
- 로그인 페이지로 리디렉션
- 로그 기록

### 8.2 프로필 생성 실패

**원인**:
- 데이터베이스 오류
- 필수 정보 누락

**처리**:
```ts
try {
  await createProfile(user);
} catch (error) {
  // 로그 기록
  await LogService.log({
    eventCategory: 'auth',
    eventType: 'oauth_profile_creation_failed',
    message: 'Google OAuth 프로필 생성 실패',
    userId: user.id,
    metadata: { error: error.message },
    severity: 'error',
  });

  // 사용자에게 에러 반환
  throw new ApiError(
    '프로필 생성에 실패했습니다. 다시 시도해주세요.',
    500,
    'PROFILE_CREATION_FAILED'
  );
}
```

---

## 9. 테스트 시나리오

### 9.1 첫 로그인 (회원가입)

1. Google OAuth 로그인 시도
2. Google 계정 선택 및 권한 승인
3. 콜백 처리 → 프로필 자동 생성
4. 로그인 완료 → 메인 페이지 이동
5. profiles 테이블에 레코드 생성 확인

### 9.2 재로그인 (기존 사용자)

1. Google OAuth 로그인 시도
2. Google 계정 선택
3. 콜백 처리 → 기존 프로필 로드
4. 로그인 완료
5. 기존 프로필 정보 유지 확인

### 9.3 계정 연결 (동일 이메일)

**시나리오**:
- 이메일 회원가입으로 `user@gmail.com` 계정 생성
- 이후 동일 이메일로 Google OAuth 로그인 시도

**예상 동작**:
- 기존 profiles 레코드 사용
- auth.users는 별도로 존재할 수 있음
- profiles.id를 기준으로 사용자 식별

---

## 10. UI/UX 가이드

### 10.1 로그인 버튼

```tsx
// 예시: Google 로그인 버튼
<button
  onClick={handleGoogleLogin}
  className="flex items-center justify-center gap-2 w-full px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
>
  <GoogleIcon />
  <span>Google로 계속하기</span>
</button>
```

### 10.2 로딩 상태

OAuth 리디렉션 중:
```tsx
{isLoading && (
  <div className="text-center text-sm text-gray-500">
    Google 로그인 중...
  </div>
)}
```

### 10.3 에러 메시지

```tsx
{error && (
  <div className="text-sm text-red-600">
    {error.message}
  </div>
)}
```

---

## 11. 프론트엔드 구현 예시

### 11.1 Google 로그인 버튼 핸들러

```tsx
// src/components/auth/GoogleLoginButton.tsx
'use client';

import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

export function GoogleLoginButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        throw error;
      }

      // 리디렉션 시작됨
    } catch (err: any) {
      setError(err.message || 'Google 로그인에 실패했습니다');
      setIsLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={handleGoogleLogin}
        disabled={isLoading}
        className="..."
      >
        {isLoading ? '로그인 중...' : 'Google로 계속하기'}
      </button>
      {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
    </div>
  );
}
```

### 11.2 OAuth 콜백 페이지

```tsx
// app/auth/callback/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const handleCallback = async () => {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      // URL에서 session 정보 추출
      const { data, error } = await supabase.auth.getSession();

      if (error || !data.session) {
        console.error('OAuth callback error:', error);
        router.push('/login?error=oauth_failed');
        return;
      }

      // 백엔드에 프로필 확인/생성 요청
      try {
        const response = await fetch('/api/auth/oauth/callback', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('프로필 처리 실패');
        }

        const result = await response.json();

        // 로그인 완료 → 메인 페이지로 이동
        router.push('/');
      } catch (err) {
        console.error('프로필 처리 오류:', err);
        router.push('/login?error=profile_failed');
      }
    };

    handleCallback();
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">로그인 처리 중...</p>
      </div>
    </div>
  );
}
```

---

## 12. 환경 변수

```env
# .env.local

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://zzckbomchrebuyetgvqv.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Google OAuth (Supabase에 등록되어 있으므로 앱에서는 불필요)
# GOOGLE_CLIENT_ID=... (Supabase에서 관리)
# GOOGLE_CLIENT_SECRET=... (Supabase에서 관리)
```

---

## 13. 참고 문서

- [Supabase Auth - OAuth](https://supabase.com/docs/guides/auth/social-login)
- [Google OAuth 2.0](https://developers.google.com/identity/protocols/oauth2)
- [Supabase Auth Helpers](https://supabase.com/docs/guides/auth/auth-helpers/nextjs)

---

## 14. 마이그레이션 고려사항

### 14.1 기존 이메일 사용자 → OAuth 연동

**문제**:
- 기존에 이메일로 가입한 사용자
- 나중에 동일 이메일로 Google OAuth 로그인 시도

**해결 방안**:

**옵션 1: 자동 병합 (권장)**
```ts
// profiles.email 기준으로 자동 연결
const existingProfile = await getProfileByEmail(user.email);
if (existingProfile) {
  // 기존 프로필 사용 (auth.users.id 업데이트 필요 없음)
  return existingProfile;
}
```

**옵션 2: 수동 연결 (보안 강화)**
- 사용자에게 "이미 가입된 이메일입니다" 안내
- 기존 계정 로그인 후 설정에서 Google 계정 연결 기능 제공

**우리 프로젝트**: 옵션 1 (자동 병합) 적용

---

## 15. 향후 확장

### 15.1 다른 OAuth 제공자 추가

- Kakao OAuth
- Naver OAuth
- Apple Sign In

동일한 `OAuthService.handleOAuthCallback()` 메서드 재사용 가능.

### 15.2 프로필 정보 추가 수집

첫 로그인 후 추가 정보 입력 페이지:
- 전화번호
- 배송 주소
- 마케팅 수신 동의

---

**작성일**: 2025-01-01
**업데이트**: 필요 시 수정
