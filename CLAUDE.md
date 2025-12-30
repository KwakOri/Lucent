# Lucent Management - Project Overview

## 프로젝트 정체성

**Lucent Management**는 버츄얼 아티스트 매니지먼트 레이블입니다.

> "숨겨진 감정과 목소리가 자연스럽게 드러나는 순간을 기록하는 레이블"

우리는 버츄얼 MCN이 아닌, **프로젝트를 기록하고 관리하는 매니지먼트 레이블**입니다.

---

## MVP 핵심 목표 (1차 오픈)

이 프로젝트의 1차 오픈 목표는 명확합니다:

1. **Lucent는 프로젝트를 기록하는 레이블이다**
2. **미루루의 보이스팩을 안전하게 살 수 있다**

이 두 가지만 성공하면 1차 오픈은 성공입니다.

---

## 작업 방법론 (중요)

### 📋 작업 시작 전 필수 절차

모든 작업을 시작하기 전에 **반드시** 다음을 확인하십시오:

1. **스펙 문서 참조**
   - 작업 유형에 맞는 `/specs` 폴더의 문서를 먼저 읽으십시오
   - UI 작업: `/specs/ui/` 확인
   - API 작업: `/specs/api/` 확인
   - 컴포넌트 작업: `/specs/components/` 확인

2. **기존 코드 확인**
   - 기존 API가 존재하는지 확인
   - 기존 컴포넌트가 존재하는지 확인
   - 재사용 가능한 코드를 먼저 찾으십시오

3. **중복 방지**
   - 같은 기능을 두 번 만들지 마십시오
   - 기존 코드를 수정/확장할 수 있는지 먼저 검토하십시오

### 🔄 작업 순서

```
1. /specs 폴더에서 관련 문서 읽기
   ↓
2. 기존 API/Component 검색
   ↓
3. 재사용 가능 여부 판단
   ↓
4. 새 코드 작성 또는 기존 코드 수정
   ↓
5. 스펙 문서 업데이트 (필요시)
```

### 📁 스펙 문서 구조

```
/specs
├── index.md              # 프로젝트 전체 스펙 인덱스
├── /ui                   # UI 스펙
│   ├── index.md         # UI 시스템 전체 가이드
│   ├── /common          # 공통 컴포넌트 스펙
│   ├── /home            # 메인 페이지
│   ├── /projects        # 프로젝트 페이지
│   ├── /goods           # 굿즈 관련 페이지
│   ├── /auth            # 인증 UI
│   ├── /mypage          # 마이페이지
│   └── /legal           # 약관/정책 페이지
├── /api                  # API 스펙
│   ├── index.md         # API 전체 가이드
│   ├── /client          # 클라이언트 API
│   │   ├── /hooks      # React Query Hooks
│   │   └── /services   # 클라이언트 서비스
│   └── /server          # 서버 API
│       ├── /routes     # API 엔드포인트 스펙
│       │   ├── /auth          # 인증 API
│       │   ├── /logs          # 로그 API ✅
│       │   ├── /orders        # 주문 API
│       │   ├── /products      # 상품 API
│       │   ├── /projects      # 프로젝트 API
│       │   ├── /artists       # 아티스트 API
│       │   ├── /images        # 이미지 API
│       │   └── /profiles      # 프로필 API
│       └── /services   # 서비스 레이어 스펙
│           ├── /auth          # 인증 서비스
│           ├── /logs          # 로그 서비스 ✅
│           ├── /orders        # 주문 서비스
│           ├── /products      # 상품 서비스
│           ├── /projects      # 프로젝트 서비스
│           ├── /artists       # 아티스트 서비스
│           ├── /images        # 이미지 서비스
│           └── /profiles      # 프로필 서비스
└── /components           # 컴포넌트 스펙
```

**✅ 표시**: 이미 구현된 항목

---

## 기술 스택

- **Frontend**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS + CVA
- **UI Components**: Storybook (개발 중)
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **Storage**: Cloudflare R2 (디지털 상품, 이미지)
- **Deployment**: Vercel
- **Logging**: Custom Log Service (인증, 주문, 다운로드, 보안)

---

## 프로젝트 폴더 구조

```
/
├── app/                      # Next.js 15 App Router
│   ├── api/                 # API Routes
│   │   └── logs/            # 로그 API (관리자 전용)
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
│
├── lib/                      # 서버 사이드 라이브러리
│   └── server/
│       ├── services/        # 비즈니스 로직 (Service Layer)
│       │   └── log.service.ts
│       └── utils/           # 서버 유틸리티
│           ├── supabase.ts       # Supabase 클라이언트
│           ├── errors.ts         # 에러 클래스
│           └── api-response.ts   # API 응답 헬퍼
│
├── src/                      # 클라이언트 사이드 코드
│   ├── components/
│   │   └── ui/              # UI 컴포넌트 (Storybook)
│   ├── constants/           # 상수
│   ├── hooks/               # React Hooks
│   └── services/
│       ├── client/          # 클라이언트 서비스
│       └── server/          # 서버 서비스
│
├── specs/                    # 스펙 문서 (설계 문서)
│   ├── index.md             # 프로젝트 전체 스펙
│   ├── api/                 # API 스펙
│   │   ├── index.md
│   │   ├── client/          # 클라이언트 API (hooks, services)
│   │   └── server/          # 서버 API (routes, services)
│   │       ├── routes/      # API 엔드포인트 스펙
│   │       └── services/    # 서비스 레이어 스펙
│   └── ui/                  # UI 스펙
│       ├── index.md
│       ├── common/
│       ├── home/
│       ├── projects/
│       ├── goods/
│       ├── auth/
│       ├── mypage/
│       └── legal/
│
├── examples/                 # 예시 코드 (구현 참고용)
│   └── logging/             # 로깅 시스템 적용 예시
│       ├── README.md
│       ├── auth-api-example.ts
│       ├── order-api-example.ts
│       ├── download-api-example.ts
│       └── security-example.ts
│
├── supabase/                 # Supabase 설정
│   └── migrations/          # 데이터베이스 마이그레이션
│       ├── 20250101000000_initial_schema.sql
│       ├── 20250101000001_seed_data.sql
│       └── create_logs_table.sql
│
├── types/                    # TypeScript 타입 정의
│   └── database.ts          # Supabase 생성 타입
│
├── public/                   # 정적 파일
├── stories/                  # Storybook 스토리
├── .storybook/              # Storybook 설정
│
├── CLAUDE.md                # 본 문서 (프로젝트 가이드)
├── package.json
├── tsconfig.json
└── next.config.ts
```

---

## 1차 MVP 페이지 맵

```
/                         # 메인 페이지 (Hero + 슬라이드 + 프로젝트 프리뷰)
├─ /projects              # 프로젝트 목록
│  └─ /projects/{id}      # 프로젝트 상세
├─ /goods                 # 굿즈 허브 (아티스트별 굿즈샵 진입)
│  └─ /goods/miruru       # 미루루 굿즈샵 ⭐ 핵심
├─ /login                 # 로그인
├─ /signup                # 회원가입
├─ /mypage                # 마이페이지 (주문 내역 + 디지털 상품)
├─ /terms                 # 이용약관
└─ /privacy               # 개인정보처리방침
```

---

## 주요 기능 개요

### 고객 기능
- 이메일 회원가입/로그인
- 프로젝트 및 아티스트 정보 열람
- 보이스팩 구매 (샘플 청취 가능)
- 실물 굿즈 구매
- 주문 내역 및 상태 확인
- 디지털 상품 재다운로드

### 결제 정책
- **계좌이체 전용** (PG 연동 없음)
- 주문 생성 시 상태: `입금대기`
- 관리자 수동 입금 확인 후 상태 변경

---

## 디자인 철학

### 전체 사이트
- 레이블 정체성: 감성적, 섬세함, 기록의 가치
- Mobile First 반응형
- 단순하고 직관적인 UX

### 미루루 굿즈샵
- 컨셉: **포근하고 다정한 동물의 숲**
- 컬러: 말랑말랑한 파스텔 하늘색
- 보이스팩 레이아웃: CD 플레이어 느낌

---

## 구현된 기능 (2025-12-30 기준)

### ✅ 로깅 시스템
- **목적**: 보안, 거래, 고객 지원을 위한 이벤트 기록
- **구성 요소**:
  - `logs` 테이블 (Supabase)
  - `LogService` (lib/server/services/log.service.ts)
  - 로그 조회 API (app/api/logs/)
- **로깅 대상**:
  1. **인증/보안**: 회원가입, 로그인, 이메일 인증, 비밀번호 재설정
  2. **주문/결제**: 주문 생성, 상태 변경, 환불
  3. **디지털 상품**: 다운로드, 링크 생성, 권한 없는 접근 시도
  4. **보안 위협**: 권한 없는 접근, API Rate Limit 초과, 의심스러운 활동
- **사용법**: `/examples/logging/README.md` 참조

### ✅ 서버 인프라
- Supabase 서버 클라이언트 (lib/server/utils/supabase.ts)
- 에러 처리 클래스 (lib/server/utils/errors.ts)
- API 응답 헬퍼 (lib/server/utils/api-response.ts)

### ✅ UI 컴포넌트 (Storybook)
- Badge, Button, Checkbox, Input, Select
- Form Field, Loading, Radio, Switch
- Empty State

### 🚧 진행 중
- 인증 API (회원가입, 로그인, 이메일 인증)
- 주문 API (생성, 조회, 상태 변경)
- 상품 API (목록, 상세, 샘플 재생)

---

## 1차 오픈 제외 항목

다음은 **절대 지금 안 해도 되는 것**들입니다:

- Archive 페이지 (레이블 정체성 강화용)
- Projects 타임라인
- Drips 굿즈샵 (껍데기만 준비)
- SNS 외부 임베드 다중화
- 마이페이지 알림 / 프로필 설정
- 관리자 대시보드 (로그 조회 API는 구현됨)

---

## 개발 가이드

### API 개발 패턴

모든 API는 **3-Layer 아키텍처**를 따릅니다:

```
API Route (app/api/*)
    ↓
Service Layer (lib/server/services/*)
    ↓
Database (Supabase)
```

**예시**:
```typescript
// app/api/products/route.ts (API Route - Thin Controller)
import { ProductService } from '@/lib/server/services/product.service';
import { handleApiError, successResponse } from '@/lib/server/utils/api-response';

export async function GET(request: NextRequest) {
  try {
    const products = await ProductService.getProducts();
    return successResponse(products);
  } catch (error) {
    return handleApiError(error);
  }
}

// lib/server/services/product.service.ts (Service Layer - Business Logic)
import { createServerClient } from '@/lib/server/utils/supabase';

export class ProductService {
  static async getProducts() {
    const supabase = createServerClient();
    const { data, error } = await supabase.from('products').select('*');
    if (error) throw new ApiError('상품 조회 실패', 500);
    return data;
  }
}
```

### 로깅 적용 방법

모든 중요 이벤트는 `LogService`를 통해 기록합니다:

```typescript
import { LogService } from '@/lib/server/services/log.service';

// 성공 시
await LogService.logLoginSuccess(userId, request.ip);

// 실패 시
await LogService.logLoginFailed(email, '잘못된 비밀번호', request.ip);
```

**중요**: 로그 기록 실패로 서비스가 중단되지 않도록 `LogService.log()`는 내부적으로 에러를 처리합니다.

상세 예시: `/examples/logging/` 참조

---

## 환경변수 설정

`.env.local` 파일에 다음 환경변수가 필요합니다:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# 관리자 이메일 (쉼표로 구분)
ADMIN_EMAILS=admin@example.com,manager@example.com

# Cloudflare R2 (디지털 상품 저장소)
R2_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-access-key
R2_SECRET_ACCESS_KEY=your-secret-key
R2_BUCKET_NAME=your-bucket-name
```

---

## 문서 활용 원칙

1. **본 문서(CLAUDE.md)**는 프로젝트의 큰 그림과 작업 방법론을 제시합니다
2. **구체적인 스펙**은 `/specs` 폴더 내 문서에서 확인하십시오
3. **새로운 작업** 시작 시 항상 관련 스펙 문서를 먼저 읽으십시오
4. **스펙 문서가 없는 경우**, 작업 전에 스펙 문서부터 작성하십시오

---

## 빠른 시작 가이드

### 1. 프로젝트 세팅
```bash
# 의존성 설치
npm install

# 환경변수 설정
cp .env.example .env.local
# .env.local 파일 수정 (Supabase URL, Key 등)

# Storybook 실행 (UI 컴포넌트 개발)
npm run storybook

# 개발 서버 실행
npm run dev
```

### 2. 데이터베이스 마이그레이션
```bash
# Supabase Dashboard → SQL Editor에서 실행
# 1. supabase/migrations/20250101000000_initial_schema.sql
# 2. supabase/migrations/20250101000001_seed_data.sql
# 3. supabase/migrations/create_logs_table.sql

# 타입 재생성 (선택적)
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > types/database.ts
```

### 3. 문서 참조 순서

새로운 기능 개발 시:
1. **스펙 문서 먼저 읽기**: `/specs/api/server/`
2. **기존 코드 확인**: `lib/server/services/`, `app/api/`
3. **예시 코드 참조**: `/examples/logging/`
4. **구현 후 스펙 업데이트**

주요 문서:
- 전체 프로젝트 스펙: `/specs/index.md`
- UI 시스템 가이드: `/specs/ui/index.md`
- API 스펙: `/specs/api/index.md`
- 로깅 시스템 가이드: `/examples/logging/README.md`

**기억하십시오: 작업 전에 항상 스펙을 먼저 읽고, 기존 코드를 먼저 확인하십시오.**

---

## 참고 자료

### 프로젝트 핵심 문서
- 본 문서 (CLAUDE.md): 프로젝트 개요 및 작업 방법론
- /specs/: 상세 설계 문서
- /examples/: 구현 예시 코드

### 외부 문서
- [Next.js 15 문서](https://nextjs.org/docs)
- [Supabase 문서](https://supabase.com/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [CVA (Class Variance Authority)](https://cva.style/docs)
- [Storybook](https://storybook.js.org/docs)
