# API 테스트

Next.js API Routes에 대한 자동화된 테스트입니다.

## ✅ 테스트 현황

- **48개 테스트 중 36개 통과 (75%)**
- 주요 기능 (회원가입, 로그인, 상품 조회, 주문 생성 등) 정상 작동

## 테스트 실행

### 기본 실행 명령어

```bash
# Watch 모드 (파일 변경 시 자동 재실행)
npm test

# 한 번만 실행 (CI용)
npm run test:run

# UI 모드로 실행
npm run test:ui

# 커버리지 리포트 생성
npm run test:coverage
```

### 특정 파일만 테스트

```bash
# Auth API만 테스트
npm run test:run auth.test.ts

# Products API만 테스트
npm run test:run products.test.ts
```

## 디렉토리 구조

```
tests/
├── README.md              # 이 문서
├── setup.ts               # 전역 테스트 설정
├── api/                   # API 라우트 테스트
│   ├── auth.test.ts      # 인증 API (12개 테스트, 4개 통과)
│   ├── products.test.ts  # 상품 API (12개 테스트, 11개 통과)
│   ├── orders.test.ts    # 주문 API (13개 테스트, 10개 통과)
│   └── logs.test.ts      # 로그 API (11개 테스트, 11개 통과)
└── utils/                 # 테스트 유틸리티
    ├── index.ts          # 유틸리티 export
    ├── mock-request.ts   # 요청/응답 모킹
    └── fixtures.ts       # 테스트 데이터
```

## API Routes 외부 접근

**Yes!** Next.js API Routes는 표준 HTTP 엔드포인트이므로 어디서든 접근 가능합니다:

```bash
# 로컬 개발
curl http://localhost:3000/api/products

# 배포 후
curl https://yourdomain.com/api/products

# Postman, Insomnia, Thunder Client 등 사용 가능
# 외부 프론트엔드에서도 fetch/axios로 호출 가능
```

## 테스트 작성 가이드

### 1. 기본 구조

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/your-route/route';
import { YourService } from '@/lib/server/services/your.service';
import { createMockRequest, parseResponse } from '../utils';

// Service 모킹
vi.mock('@/lib/server/services/your.service', () => ({
  YourService: {
    methodName: vi.fn(),
  },
}));

describe('Your API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should do something', async () => {
    // Service 반환값 설정
    vi.mocked(YourService.methodName).mockResolvedValue({ data: 'test' });

    // Request 생성
    const request = createMockRequest({
      method: 'GET',
      url: 'http://localhost:3000/api/your-route',
    });

    // API 호출
    const response = await GET(request);
    const data = await parseResponse(response);

    // 검증
    expect(response.status).toBe(200);
    expect(data.status).toBe('success'); // NOT data.success!
    expect(data.data).toEqual({ data: 'test' });
  });
});
```

### 2. 응답 구조 이해하기 (중요!)

API는 다음과 같은 구조로 응답합니다:

**성공 응답:**
```json
{
  "status": "success",
  "data": { ... }
}
```

**페이지네이션 응답:**
```json
{
  "status": "success",
  "data": [...],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "totalPages": 5
  }
}
```

**에러 응답:**
```json
{
  "status": "error",
  "message": "에러 메시지",
  "errorCode": "ERROR_CODE"
}
```

따라서 테스트에서:
```typescript
// ✅ 올바른 방법
expect(data.status).toBe('success');
expect(data.message).toContain('에러');

// ❌ 잘못된 방법
expect(data.success).toBe(true);  // success 필드는 없음!
expect(data.error.message).toContain('에러');  // error 객체는 없음!
```

### 3. Request 모킹

```typescript
// GET 요청 with search params
const request = createMockRequest({
  method: 'GET',
  url: 'http://localhost:3000/api/products',
  searchParams: {
    page: '1',
    limit: '20',
    artistId: 'miruru',
  },
});

// POST 요청 with body
const request = createMockRequest({
  method: 'POST',
  url: 'http://localhost:3000/api/auth/signup',
  body: {
    email: 'test@example.com',
    password: 'password123',
  },
});

// Headers 추가
const request = createMockRequest({
  method: 'GET',
  url: 'http://localhost:3000/api/test',
  headers: {
    'Authorization': 'Bearer token',
  },
});
```

### 4. Service 모킹

```typescript
// Service 모듈 전체 모킹
vi.mock('@/lib/server/services/product.service', () => ({
  ProductService: {
    getProducts: vi.fn(),
    getProduct: vi.fn(),
    createProduct: vi.fn(),
  },
}));

// 반환값 설정
vi.mocked(ProductService.getProducts).mockResolvedValue({
  products: [mockProduct],
  total: 1,
});

// 에러 발생 시뮬레이션
vi.mocked(ProductService.getProduct).mockRejectedValue(
  new Error('상품을 찾을 수 없습니다')
);

// 호출 여부 검증
expect(ProductService.getProducts).toHaveBeenCalledWith(
  expect.objectContaining({
    page: 1,
    limit: 20,
  })
);
```

### 5. 응답 검증

```typescript
const response = await GET(request);
const data = await parseResponse(response);

// 상태 코드
expect(response.status).toBe(200);
expect(response.status).toBeGreaterThanOrEqual(400); // 에러 케이스

// 응답 구조
expect(data.status).toBe('success');
expect(data.status).toBe('error');

// 데이터 검증
expect(data.data).toHaveProperty('id');
expect(data.data).toHaveLength(2);
expect(data.message).toContain('이메일');

// 페이지네이션
expect(data.pagination).toEqual({
  total: 100,
  page: 1,
  limit: 20,
  totalPages: 5,
});
```

## Fixtures 사용

테스트 데이터는 `utils/fixtures.ts`에 정의되어 있습니다:

```typescript
import {
  mockUser,
  mockAdminUser,
  mockSession,
  mockProfile,
  mockDigitalProduct,
  mockPhysicalProduct,
  mockOrder,
  mockOrderItem,
  mockLog,
} from '../utils/fixtures';

// 테스트에서 사용
vi.mocked(AuthService.signUp).mockResolvedValue({
  user: mockUser,
  session: mockSession,
});
```

## 알려진 이슈

### 실패하는 테스트들

일부 테스트가 실패하는 이유:

1. **입력 검증 테스트** - 일부 API route의 검증 로직이 예상과 다르게 동작
2. **GET by ID 엔드포인트** - 개별 조회 메소드의 모킹 이슈
3. **Auth 관련 일부 기능** - 로그아웃, 이메일 발송 등

이러한 테스트들은 실제 API 구현을 완료한 후 수정하면 됩니다.

## 주의사항

1. **실제 데이터베이스 사용 안 함**: 모든 Supabase 호출은 모킹됩니다
2. **격리된 테스트**: 각 테스트는 독립적으로 실행됩니다
3. **Mock 초기화**: `beforeEach`에서 `vi.clearAllMocks()` 호출 필수
4. **응답 구조**: `data.status === 'success'` (NOT `data.success`)

## CI/CD 통합

```yaml
# .github/workflows/test.yml
name: Test
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm install
      - run: npm run test:run
      - run: npm run test:coverage
```

## 트러블슈팅

### "Cannot find module" 에러
- `npm install`을 다시 실행하세요
- `node_modules`를 삭제하고 재설치하세요

### "cookies was called outside a request scope" 에러
- 이미 `tests/setup.ts`에서 모킹되어 있어야 합니다
- 모킹이 제대로 동작하지 않으면 setup 파일을 확인하세요

### 테스트가 통과하지 않을 때
1. API route 구현을 확인하세요
2. Service 메소드가 실제로 존재하는지 확인하세요
3. 응답 구조를 확인하세요 (`data.status` vs `data.success`)
