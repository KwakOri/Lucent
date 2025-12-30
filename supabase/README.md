# Supabase Database Migrations

이 폴더는 Lucent Management 프로젝트의 Supabase 데이터베이스 마이그레이션 파일을 포함합니다.

## 마이그레이션 파일

### 1. `20250101000000_initial_schema.sql`

초기 데이터베이스 스키마를 생성합니다.

**포함 내용:**
- ENUM 타입 정의 (product_type, order_status, verification_purpose)
- 테이블 생성:
  - `email_verifications` - 이메일 인증
  - `profiles` - 사용자 프로필
  - `projects` - 프로젝트
  - `artists` - 아티스트
  - `products` - 상품
  - `orders` - 주문
  - `order_items` - 주문 항목
- 인덱스 생성
- 트리거 (updated_at 자동 업데이트, profile 자동 생성)
- RLS (Row Level Security) 정책

### 2. `20250101000001_seed_data.sql`

초기 데이터를 삽입합니다.

**포함 내용:**
- 프로젝트: 0th Project, 1st Project
- 아티스트: 미루루, Drips (2명)
- 샘플 상품: 미루루 보이스팩, 아크릴 스탠드 (테스트용)

## 마이그레이션 실행 방법

### 방법 1: Supabase CLI 사용 (권장)

1. **Supabase CLI 설치**
   ```bash
   npm install -g supabase
   ```

2. **Supabase 프로젝트 초기화**
   ```bash
   supabase init
   ```

3. **Supabase 로컬 환경 시작**
   ```bash
   supabase start
   ```

4. **마이그레이션 실행**
   ```bash
   supabase db reset
   ```
   또는 개별 마이그레이션 실행:
   ```bash
   supabase db push
   ```

5. **원격 Supabase 프로젝트에 배포**
   ```bash
   supabase link --project-ref your-project-ref
   supabase db push
   ```

### 방법 2: Supabase Dashboard (SQL Editor)

1. Supabase Dashboard 접속
2. SQL Editor 메뉴로 이동
3. 각 마이그레이션 파일의 내용을 복사하여 순서대로 실행
   - 먼저 `20250101000000_initial_schema.sql` 실행
   - 다음 `20250101000001_seed_data.sql` 실행

### 방법 3: psql 직접 연결

```bash
psql -h db.xxxxx.supabase.co -U postgres -d postgres -f supabase/migrations/20250101000000_initial_schema.sql
psql -h db.xxxxx.supabase.co -U postgres -d postgres -f supabase/migrations/20250101000001_seed_data.sql
```

## 데이터베이스 스키마 다이어그램

```
auth.users (Supabase Auth)
    ↓
profiles
    ↓
orders → order_items → products → artists → projects
```

## RLS 정책 요약

### Public 접근 (읽기 전용)
- `projects` (is_active = true)
- `artists` (is_active = true)
- `products` (is_active = true)

### Authenticated 사용자
- `profiles`: 본인 프로필만 읽기/수정
- `orders`: 본인 주문만 조회/생성
- `order_items`: 본인 주문의 항목만 조회

### Service Role (관리자)
- 모든 테이블에 대한 전체 권한

## 주의사항

1. **Seed Data**: `20250101000001_seed_data.sql`의 샘플 상품은 테스트용이므로 운영 전 삭제 또는 수정 필요
2. **Cloudflare R2**: 이미지 및 오디오 파일은 Cloudflare R2에 업로드 후 URL 업데이트 필요
3. **UUID**: 고정 UUID는 개발/테스트 환경용이며, 운영 환경에서는 자동 생성 권장
4. **Service Role Key**: 절대 클라이언트에 노출하지 말 것

## 환경 변수 설정

`.env.local` 파일에 다음 환경 변수를 설정하세요:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## 다음 단계

1. Supabase 프로젝트 생성
2. 마이그레이션 실행
3. Cloudflare R2 설정 및 파일 업로드
4. 환경 변수 설정
5. API 개발 시작

## 참고 문서

- Supabase 스키마: `/specs/index.md` (섹션 6)
- API 스펙: `/specs/api/`
- UI 스펙: `/specs/ui/`
