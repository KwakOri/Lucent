# Admin UI 스펙

이 문서는 **Lucent Management Admin 페이지** UI 스펙을 정의한다.

> **범위**: 관리자 전용 페이지 (인증 필요)
> **접근 권한**: ADMIN_EMAILS 환경변수에 등록된 이메일만
> **관련 문서**:
> - API Routes: `/specs/api/server/routes/`
> - Auth 스펙: `/specs/api/server/routes/auth/index.md`

---

## 1. Admin 페이지 개요

### 1.1 목적
- 레이블 콘텐츠 관리 (프로젝트, 아티스트, 상품)
- 주문 및 결제 관리
- 고객 문의 및 로그 조회

### 1.2 접근 경로
```
/admin              # 대시보드
├─ /admin/artists   # 아티스트 관리
├─ /admin/projects  # 프로젝트 관리
├─ /admin/products  # 상품 관리
├─ /admin/orders    # 주문 관리
└─ /admin/logs      # 로그 조회
```

### 1.3 인증 및 권한
- **인증 방식**: Supabase Auth (세션)
- **권한 확인**: `isAdmin()` 유틸리티 사용
- **접근 제한**: 환경변수 `ADMIN_EMAILS`에 등록된 이메일만
- **미인증 시**: `/login?redirect=/admin` 리다이렉트

---

## 2. 공통 레이아웃

### 2.1 Admin Layout
```tsx
// app/admin/layout.tsx
<AdminLayout>
  <AdminSidebar />
  <AdminHeader />
  <main>{children}</main>
</AdminLayout>
```

### 2.2 Sidebar 메뉴
```
📊 대시보드         /admin
👥 아티스트 관리    /admin/artists
📁 프로젝트 관리    /admin/projects
🛍️ 상품 관리       /admin/products
📦 주문 관리        /admin/orders
📋 로그 조회        /admin/logs
```

### 2.3 공통 컴포넌트
- `AdminTable`: 데이터 테이블 (정렬, 필터, 페이지네이션)
- `AdminForm`: 폼 컴포넌트 (생성/수정)
- `AdminModal`: 모달 다이얼로그
- `StatusBadge`: 상태 배지
- `ImageUploader`: 이미지 업로드
- `ConfirmDialog`: 확인 다이얼로그

---

## 3. 1차 MVP 범위

### 포함 ✅
- ✅ 대시보드 (주문 통계, 최근 주문)
- ✅ 아티스트 관리 (CRUD)
- ✅ 프로젝트 관리 (CRUD)
- ✅ 상품 관리 (CRUD)
- ✅ 주문 관리 (목록, 상세, 상태 변경)
- ✅ 로그 조회 (보안 로그, 주문 로그)

### 제외 ⏸️ (2차 이후)
- ⏸️ 이메일 템플릿 편집
- ⏸️ 사이트 설정 (계좌 정보, 약관 등)
- ⏸️ 통계 및 분석 대시보드
- ⏸️ 회원 관리
- ⏸️ 알림 설정

---

## 4. 디자인 원칙

### 4.1 스타일
- **컨셉**: 깔끔하고 직관적인 관리 도구
- **컬러**:
  - Primary: `blue-600` (액션 버튼)
  - Danger: `red-600` (삭제)
  - Success: `green-600` (완료)
  - Warning: `yellow-600` (대기)
- **폰트**: 시스템 폰트 스택

### 4.2 반응형
- **Desktop First**: 관리자 페이지는 데스크톱 중심
- **최소 화면 크기**: 1024px (태블릿 가로)
- **모바일**: 기본 기능만 지원

### 4.3 UX 원칙
- **빠른 접근**: 2클릭 이내에 주요 기능 도달
- **명확한 피드백**: 성공/실패 메시지, 로딩 상태
- **실수 방지**: 삭제 전 확인 다이얼로그
- **키보드 지원**: 주요 액션에 단축키 제공

---

## 5. 페이지별 스펙

각 페이지의 상세 스펙은 별도 문서 참조:

- [대시보드](/specs/ui/admin/dashboard.md)
- [아티스트 관리](/specs/ui/admin/artists.md)
- [프로젝트 관리](/specs/ui/admin/projects.md)
- [상품 관리](/specs/ui/admin/products.md)
- [주문 관리](/specs/ui/admin/orders.md)
- [로그 조회](/specs/ui/admin/logs.md)

---

## 6. 기술 스택

- **Framework**: Next.js 15 App Router
- **Styling**: Tailwind CSS + CVA
- **State**: React Query (서버 상태)
- **Forms**: React Hook Form + Zod (유효성 검사)
- **Tables**: TanStack Table
- **Date**: date-fns
- **Toast**: React Hot Toast

---

## 7. 보안 고려사항

### 7.1 인증
- 모든 admin 페이지는 서버 컴포넌트에서 `isAdmin()` 확인
- API 호출 시 서버에서 권한 재확인

### 7.2 XSS 방지
- 사용자 입력 sanitize (DOMPurify)
- HTML 입력 시 iframe, script 태그 제거

### 7.3 CSRF 방지
- Next.js 기본 CSRF 보호 사용
- Supabase 세션 쿠키 httpOnly

---

## 8. 참고 문서

- UI 컴포넌트: `/specs/ui/common/`
- API Routes: `/specs/api/server/routes/`
- 프로젝트 가이드: `/CLAUDE.md`
