# 프로젝트 구현 상태 보고서

**작성일**: 2026-01-01
**프로젝트**: Lucent Management - 버츄얼 아티스트 매니지먼트 레이블

---

## 📋 목차

1. [구현 완료 사항](#구현-완료-사항)
2. [추가 구현 필요 사항](#추가-구현-필요-사항)
3. [MVP 1차 오픈 준비도](#mvp-1차-오픈-준비도)
4. [우선순위 작업 목록](#우선순위-작업-목록)

---

## ✅ 구현 완료 사항

### 1. 백엔드 API (36개 엔드포인트)

#### 인증 API (9개)
- ✅ `POST /api/auth/signup` - 이메일 회원가입
- ✅ `POST /api/auth/login` - 로그인
- ✅ `POST /api/auth/logout` - 로그아웃
- ✅ `GET /api/auth/session` - 세션 확인
- ✅ `POST /api/auth/send-verification` - 이메일 인증 코드 발송
- ✅ `POST /api/auth/verify-code` - 인증 코드 확인
- ✅ `POST /api/auth/verify-email` - 이메일 인증 완료
- ✅ `POST /api/auth/reset-password` - 비밀번호 재설정 요청
- ✅ `POST /api/auth/update-password` - 비밀번호 변경

#### 상품 API (4개)
- ✅ `GET /api/products` - 상품 목록 조회
- ✅ `POST /api/products` - 상품 생성 (Admin)
- ✅ `GET /api/products/[id]` - 상품 상세 조회
- ✅ `GET /api/products/[id]/sample` - 보이스팩 샘플 조회
- ✅ `GET /api/products/slug/[slug]` - Slug로 상품 조회

#### 주문 API (5개)
- ✅ `GET /api/orders` - 주문 목록 조회
- ✅ `POST /api/orders` - 주문 생성
- ✅ `GET /api/orders/[id]` - 주문 상세 조회
- ✅ `PATCH /api/orders/[id]/status` - 주문 상태 변경 (Admin)
- ✅ `GET /api/orders/[id]/items/[itemId]/download` - 디지털 상품 다운로드 링크
- ✅ `POST /api/orders/[id]/items/[itemId]/shipment` - 배송 정보 등록 (Admin)

#### 아티스트 API (3개)
- ✅ `GET /api/artists` - 아티스트 목록 조회
- ✅ `GET /api/artists/[id]` - 아티스트 상세 조회
- ✅ `GET /api/artists/slug/[slug]` - Slug로 아티스트 조회

#### 프로젝트 API (4개)
- ✅ `GET /api/projects` - 프로젝트 목록 조회
- ✅ `GET /api/projects/[id]` - 프로젝트 상세 조회
- ✅ `GET /api/projects/slug/[slug]` - Slug로 프로젝트 조회
- ✅ `POST /api/projects/reorder` - 프로젝트 순서 변경 (Admin)

#### 프로필 API (3개)
- ✅ `GET /api/profiles` - 프로필 목록 조회 (Admin)
- ✅ `GET /api/profiles/[id]` - 프로필 조회
- ✅ `GET /api/profiles/me` - 내 프로필 조회

#### 로그 API (3개)
- ✅ `GET /api/logs` - 로그 목록 조회 (Admin)
- ✅ `GET /api/logs/[id]` - 로그 상세 조회 (Admin)
- ✅ `GET /api/logs/stats` - 로그 통계 조회 (Admin)

#### 이미지 API (3개)
- ✅ `GET /api/images` - 이미지 목록 조회
- ✅ `POST /api/images/upload` - 이미지 업로드 (R2)
- ✅ `DELETE /api/images/[id]` - 이미지 삭제

#### 기타 API (2개)
- ✅ `GET /api/address/search` - 카카오 주소 검색
- ✅ `GET /api/users/me/voicepacks` - 내가 구매한 보이스팩 목록

---

### 2. 서비스 레이어 (11개)

- ✅ `auth.service.ts` - 인증 로직 (회원가입, 로그인, 비밀번호 재설정)
- ✅ `email-verification.service.ts` - 이메일 인증 로직
- ✅ `oauth.service.ts` - OAuth 인증 (Google, 준비됨)
- ✅ `product.service.ts` - 상품 관리 로직
- ✅ `order.service.ts` - 주문 관리 로직 (v2, 디지털/실물/세트 통합)
- ✅ `artist.service.ts` - 아티스트 관리 로직
- ✅ `project.service.ts` - 프로젝트 관리 로직
- ✅ `profile.service.ts` - 프로필 관리 로직
- ✅ `log.service.ts` - 로깅 시스템 (인증, 주문, 다운로드, 보안)
- ✅ `image.service.ts` - 이미지 업로드/관리 (R2)
- ✅ `sample-generation.service.ts` - 보이스팩 샘플 자동 생성 (FFmpeg)

---

### 3. UI 컴포넌트 (10개, Storybook 포함)

- ✅ `Button` - 버튼 컴포넌트 (variant, size)
- ✅ `Input` - 텍스트 입력 필드
- ✅ `Select` - 드롭다운 선택
- ✅ `Radio` - 라디오 버튼
- ✅ `Switch` - 토글 스위치
- ✅ `Checkbox` - 체크박스
- ✅ `Badge` - 뱃지 (상태 표시)
- ✅ `Loading` - 로딩 스피너
- ✅ `EmptyState` - 빈 상태 UI
- ✅ `FormField` - 폼 필드 래퍼 (라벨, 에러 메시지)

**Storybook**: 모든 컴포넌트에 스토리 파일 포함 (`npm run storybook`)

---

### 4. 페이지 (28개)

#### Public 페이지 (11개)
- ✅ `/` - 메인 페이지
- ✅ `/login` - 로그인
- ✅ `/signup` - 회원가입
- ✅ `/signup/verify-email` - 이메일 인증
- ✅ `/signup/complete` - 회원가입 완료
- ✅ `/welcome` - 웰컴 페이지 (주소 입력)
- ✅ `/projects` - 프로젝트 목록
- ✅ `/projects/[slug]` - 프로젝트 상세
- ✅ `/shop` - 굿즈 샵
- ✅ `/shop/[product_id]` - 상품 상세
- ✅ `/terms` - 이용약관
- ✅ `/privacy` - 개인정보처리방침

#### Private 페이지 (4개)
- ✅ `/mypage` - 마이페이지 (주문 내역, 디지털 상품)
- ✅ `/order/[product_id]` - 주문 페이지
- ✅ `/order/complete/[order_id]` - 주문 완료

#### Admin 페이지 (13개)
- ✅ `/admin` - 관리자 대시보드
- ✅ `/admin/artists` - 아티스트 관리
- ✅ `/admin/artists/new` - 아티스트 생성
- ✅ `/admin/artists/[id]/edit` - 아티스트 수정
- ✅ `/admin/projects` - 프로젝트 관리
- ✅ `/admin/projects/new` - 프로젝트 생성
- ✅ `/admin/projects/[id]/edit` - 프로젝트 수정
- ✅ `/admin/products` - 상품 관리
- ✅ `/admin/products/new` - 상품 생성
- ✅ `/admin/products/[id]/edit` - 상품 수정
- ✅ `/admin/orders` - 주문 관리
- ✅ `/admin/orders/[id]` - 주문 상세 (상태 변경, 배송 정보 입력)
- ✅ `/admin/logs` - 로그 조회

---

### 5. React Hooks (6개)

- ✅ `useAuth` - 인증 관련 훅
- ✅ `useProducts` - 상품 관련 훅
- ✅ `useProjects` - 프로젝트 관련 훅
- ✅ `useOrders` - 주문 관련 훅
- ✅ `useAddressSearch` - 카카오 주소 검색 훅
- ✅ `index` - 훅 중앙 export

---

### 6. 데이터베이스 마이그레이션 (11개)

- ✅ `20250101000000_initial_schema.sql` - 초기 스키마 (users, products, orders 등)
- ✅ `20250101000001_seed_data.sql` - 초기 데이터 (테스트용)
- ✅ `create_logs_table.sql` - 로그 테이블 생성
- ✅ `20250101000002_add_project_fields.sql` - 프로젝트 필드 추가
- ✅ `20250101000003_change_product_artist_to_project.sql` - 상품-프로젝트 연결
- ✅ `20250101000002_add_buyer_fields.sql` - 주문자 정보 필드 추가
- ✅ `20250101000002_split_address_fields.sql` - 주소 필드 분리
- ✅ `20250101000003_add_last_downloaded_at.sql` - 다운로드 시간 추적
- ✅ `20250131000000_order_system_v2.sql` - 주문 시스템 v2 (디지털/실물/세트 통합)
- ✅ `20250101000002_update_email_verifications.sql` - 이메일 인증 테이블 업데이트
- ✅ `20250101000004_remove_profile_trigger.sql` - 프로필 트리거 제거

---

### 7. 스펙 문서 (79개)

#### UI 스펙 (29개)
- 공통 컴포넌트: button, input, select, checkbox, radio, switch, badge, loading, empty-state, form-field, modal, toast
- 페이지별: home, projects, goods, auth, mypage, legal, order, admin

#### API 스펙 (44개)
- 서버 API (routes): auth, products, orders, artists, projects, profiles, logs, images
- 서버 서비스: auth, products, orders, artists, projects, profiles, logs, images
- 클라이언트 훅: auth, products, orders, artists, projects, profiles, logs, images
- 클라이언트 서비스: auth, products, orders, artists, projects, profiles, logs, images

#### 기타 스펙 (6개)
- 프로젝트 전체 스펙 (`specs/index.md`)
- UI 테마 (`specs/ui/theme.md`)
- 보이스팩 기능 (`specs/features/voicepack.md`)
- 자동 샘플 생성 (`specs/features/auto-sample-generation.md`)
- 주문 시스템 v2 (`specs/database/order-system-v2.md`)

---

### 8. 개발 문서 (5개)

- ✅ `docs/README.md` - 문서 인덱스
- ✅ `docs/api-testing-guide.md` - API 테스트 가이드 (Postman)
- ✅ `docs/email-setup.md` - 이메일 설정 가이드 (SMTP)
- ✅ `docs/r2-setup.md` - Cloudflare R2 설정 가이드
- ✅ `docs/supabase-auth-guide.md` - Supabase 인증 가이드

---

### 9. 인프라 및 도구

- ✅ **로깅 시스템**: `logs` 테이블 + `LogService` (인증, 주문, 다운로드, 보안 이벤트)
- ✅ **이메일 발송**: Nodemailer (Gmail SMTP)
- ✅ **이미지 업로드**: Cloudflare R2 연동
- ✅ **주소 검색**: 카카오 API 연동
- ✅ **샘플 생성**: FFmpeg 기반 자동 샘플 생성
- ✅ **Storybook**: UI 컴포넌트 개발 환경
- ✅ **Vitest**: 테스트 프레임워크 설정
- ✅ **TypeScript 타입**: Supabase 타입 자동 생성

---

## 🚧 추가 구현 필요 사항

### 1. 클라이언트 서비스 레이어 (우선순위: 중)

현재 React Hooks는 구현되었으나, **클라이언트 서비스 레이어**(`src/services/client/`)가 누락되었습니다.

**필요한 서비스**:
- ❌ `src/services/client/auth.ts` - 로그인, 회원가입, 로그아웃 API 호출
- ❌ `src/services/client/products.ts` - 상품 목록/상세 API 호출
- ❌ `src/services/client/orders.ts` - 주문 생성/조회 API 호출
- ❌ `src/services/client/projects.ts` - 프로젝트 목록/상세 API 호출
- ❌ `src/services/client/artists.ts` - 아티스트 목록/상세 API 호출
- ❌ `src/services/client/profiles.ts` - 프로필 조회 API 호출
- ❌ `src/services/client/images.ts` - 이미지 업로드 API 호출

**스펙 문서**: `/specs/api/client/services/` (이미 작성됨)

**해결 방법**: 스펙 문서를 참조하여 클라이언트 서비스 구현

---

### 2. 추가 UI 컴포넌트 (우선순위: 높음)

**필요한 컴포넌트**:
- ❌ `Modal` - 모달 다이얼로그 (주문 확인, 다운로드 안내 등)
- ❌ `Toast` - 토스트 알림 (성공, 에러 메시지)

**스펙 문서**:
- `/specs/ui/common/modal.md`
- `/specs/ui/common/toast.md`

**사용 사례**:
- 주문 완료 모달
- 다운로드 링크 만료 안내
- API 에러 메시지 표시

---

### 3. 결제 안내 UI (우선순위: 높음)

**현재 상태**: 주문 생성 API는 구현됨, 하지만 **계좌이체 안내 UI**가 명확하지 않음

**필요한 작업**:
1. 주문 완료 페이지에 계좌번호 표시
2. 입금 기한 안내 (예: 주문 후 3일)
3. 입금자명 안내 (주문자명과 일치 필요)
4. 주문 상태 안내 (`입금대기` → `입금확인` → `배송중` → `배송완료`)

**관련 페이지**:
- `/order/complete/[order_id]` (주문 완료 페이지)
- `/mypage` (주문 내역 페이지)

---

### 4. 디지털 상품 다운로드 UI (우선순위: 높음)

**현재 상태**: 다운로드 API는 구현됨 (`GET /api/orders/[id]/items/[itemId]/download`)

**필요한 작업**:
1. 마이페이지에 구매한 디지털 상품 목록 표시
2. 다운로드 버튼 추가
3. 다운로드 링크 만료 안내 (24시간)
4. 다운로드 이력 표시 (`last_downloaded_at`)
5. 재다운로드 제한 안내

**관련 페이지**:
- `/mypage` (마이페이지)

**관련 API**:
- `GET /api/users/me/voicepacks` (구매한 보이스팩 목록)
- `GET /api/orders/[id]/items/[itemId]/download` (다운로드 링크)

---

### 5. 배송 추적 UI (우선순위: 중)

**현재 상태**: 배송 정보 등록 API는 구현됨 (`POST /api/orders/[id]/items/[itemId]/shipment`)

**필요한 작업**:
1. 마이페이지에 배송 상태 표시
2. 배송 추적 정보 표시 (택배사, 운송장 번호)
3. 배송 상태 표시 (`배송준비중` → `배송중` → `배송완료`)

**관련 페이지**:
- `/mypage` (마이페이지)
- `/admin/orders/[id]` (관리자 주문 상세)

---

### 6. 관리자 기능 보완 (우선순위: 중)

**필요한 작업**:
1. ✅ 주문 상태 변경 UI (이미 구현됨)
2. ❌ 입금 확인 체크리스트
3. ❌ 배송 정보 일괄 입력 (엑셀 업로드)
4. ❌ 디지털 상품 파일 업로드 UI (R2)
5. ❌ 대시보드 통계 (주문, 매출, 신규 회원)

**관련 페이지**:
- `/admin` (대시보드)
- `/admin/orders` (주문 관리)
- `/admin/products/new` (상품 생성)

---

### 7. OAuth 로그인 (우선순위: 낮음)

**현재 상태**: OAuth 서비스 레이어는 구현됨 (`oauth.service.ts`), 하지만 UI 및 라우트는 미구현

**필요한 작업**:
1. Google OAuth 로그인 버튼 추가
2. `/api/auth/google/callback` 엔드포인트 구현
3. OAuth 에러 처리

**관련 페이지**:
- `/login` (로그인 페이지)

**스펙 문서**:
- `/specs/api/server/routes/auth/oauth-google.md`
- `/specs/api/server/services/auth/oauth.md`

---

### 8. 프로필 설정 페이지 (우선순위: 낮음)

**필요한 작업**:
1. 프로필 정보 수정 (이름, 전화번호, 주소)
2. 비밀번호 변경
3. 회원 탈퇴

**관련 페이지**:
- `/mypage/profile` (신규 페이지)

**스펙 문서**:
- `/specs/ui/mypage/profile.md`

---

### 9. 알림톡 연동 (우선순위: 2-3차 확장)

**현재 상태**: 데이터베이스 준비 완료 (`order_system_v2.sql`), 실제 연동은 미구현

**필요한 작업**:
1. 카카오 알림톡 API 연동
2. 주문 생성 알림
3. 입금 확인 알림
4. 발송 완료 알림
5. 배송 완료 알림

**관련 서비스**:
- `lib/server/services/notification.service.ts` (신규)

---

### 10. 테스트 코드 (우선순위: 중)

**현재 상태**: Vitest 설정은 완료됨, 하지만 실제 테스트 파일은 거의 없음

**필요한 작업**:
1. API 통합 테스트 (`tests/api/`)
2. 서비스 레이어 단위 테스트
3. UI 컴포넌트 테스트 (Storybook + Vitest)

**관련 폴더**:
- `/tests/api/` (API 테스트)
- `/tests/services/` (서비스 테스트)

---

## 🎯 MVP 1차 오픈 준비도

### 목표 확인

**MVP 핵심 목표**:
1. ✅ **Lucent는 프로젝트를 기록하는 레이블이다**
   - 프로젝트 목록/상세 페이지 구현됨
   - 아티스트 정보 표시
   - UI 구현 필요 (디자인 적용)

2. ⚠️ **미루루의 보이스팩을 안전하게 살 수 있다**
   - API는 모두 구현됨
   - 샘플 청취 기능 구현됨
   - 주문 생성 기능 구현됨
   - **부족한 부분**:
     - 계좌이체 안내 UI
     - 디지털 상품 다운로드 UI
     - 주문 내역 UI 개선

### 준비도 평가

| 기능 | 백엔드 | 프론트엔드 | 상태 |
|------|--------|------------|------|
| 회원가입/로그인 | ✅ | ✅ | **완료** |
| 이메일 인증 | ✅ | ✅ | **완료** |
| 프로젝트 조회 | ✅ | ✅ | **완료** |
| 상품 목록/상세 | ✅ | ✅ | **완료** |
| 샘플 청취 | ✅ | ✅ | **완료** |
| 주문 생성 | ✅ | ⚠️ | **UI 개선 필요** |
| 결제 안내 (계좌이체) | ✅ | ❌ | **UI 구현 필요** |
| 디지털 상품 다운로드 | ✅ | ❌ | **UI 구현 필요** |
| 주문 내역 조회 | ✅ | ⚠️ | **UI 개선 필요** |
| 배송 추적 | ✅ | ❌ | **UI 구현 필요** |
| 관리자 주문 관리 | ✅ | ✅ | **완료** |
| 관리자 상품 관리 | ✅ | ✅ | **완료** |

**종합 평가**: **백엔드 95% / 프론트엔드 70%**

---

## 📝 우선순위 작업 목록

### 🔴 High Priority (1차 오픈 필수)

1. **계좌이체 안내 UI** (2-3일)
   - 주문 완료 페이지에 계좌번호, 입금 기한 표시
   - 주문 내역 페이지에 입금 상태 표시

2. **디지털 상품 다운로드 UI** (2-3일)
   - 마이페이지에 구매한 보이스팩 목록 표시
   - 다운로드 버튼 및 만료 안내

3. **Modal 컴포넌트** (1일)
   - 주문 확인, 다운로드 안내 등에 사용

4. **Toast 컴포넌트** (1일)
   - API 성공/에러 메시지 표시

5. **마이페이지 UI 개선** (2-3일)
   - 주문 내역 표시 개선
   - 디지털 상품 다운로드 섹션 추가
   - 배송 상태 표시

### 🟡 Medium Priority (1차 오픈 후)

6. **클라이언트 서비스 레이어 구현** (3-5일)
   - `src/services/client/` 폴더 생성
   - 7개 서비스 구현

7. **배송 추적 UI** (2일)
   - 마이페이지에 택배사, 운송장 번호 표시

8. **관리자 기능 보완** (5-7일)
   - 입금 확인 체크리스트
   - 대시보드 통계
   - 디지털 상품 파일 업로드 UI

9. **테스트 코드 작성** (5-7일)
   - API 통합 테스트
   - 서비스 레이어 단위 테스트

### 🟢 Low Priority (2-3차 확장)

10. **OAuth 로그인** (3-5일)
    - Google OAuth 구현

11. **프로필 설정 페이지** (2-3일)
    - 프로필 수정, 비밀번호 변경

12. **알림톡 연동** (5-7일)
    - 카카오 알림톡 API 연동

---

## 💡 권장 작업 순서

### Week 1: 1차 오픈 필수 기능 완성
1. Modal, Toast 컴포넌트 구현
2. 계좌이체 안내 UI 구현
3. 디지털 상품 다운로드 UI 구현
4. 마이페이지 UI 개선

**목표**: 1차 오픈 준비 완료 (MVP 핵심 목표 달성)

### Week 2: 안정화 및 테스트
1. 전체 기능 QA 테스트
2. 버그 수정
3. 클라이언트 서비스 레이어 구현 (선택)
4. 테스트 코드 작성 (선택)

**목표**: 1차 오픈 안정화

### Week 3-4: 2차 확장
1. 배송 추적 UI
2. 관리자 기능 보완
3. OAuth 로그인
4. 프로필 설정 페이지

**목표**: 사용자 경험 개선

### Week 5+: 3차 확장
1. 알림톡 연동
2. 추가 기능 (Archive 페이지, Projects 타임라인 등)

---

## 📊 요약

### 구현 완료
- ✅ **백엔드 API**: 36개 엔드포인트 (인증, 상품, 주문, 아티스트, 프로젝트 등)
- ✅ **서비스 레이어**: 11개 서비스 (로깅, 이메일, 이미지, 샘플 생성 포함)
- ✅ **UI 컴포넌트**: 10개 기본 컴포넌트 (Storybook 포함)
- ✅ **페이지**: 28개 페이지 (Public, Private, Admin)
- ✅ **데이터베이스**: 주문 시스템 v2, 로깅 시스템 완료
- ✅ **인프라**: R2, 이메일, 카카오 주소 검색, FFmpeg 샘플 생성

### 추가 필요
- 🚧 **UI 개선**: 계좌이체 안내, 디지털 상품 다운로드, 배송 추적
- 🚧 **컴포넌트**: Modal, Toast
- 🚧 **클라이언트 서비스**: 7개 서비스 레이어
- 🚧 **관리자 기능**: 입금 확인, 대시보드 통계
- 🚧 **테스트 코드**: API, 서비스, UI 테스트

### 1차 오픈 준비도
- **백엔드**: 95% 완료
- **프론트엔드**: 70% 완료
- **1차 오픈 필수 작업**: 4-5일 소요 예상

---

**문서 작성자**: Claude Code
**문서 버전**: 1.0
**다음 업데이트**: 1차 오픈 직전 (최종 체크리스트)
