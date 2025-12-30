# Lucent Management – Specification Index

이 문서는 Lucent Management 프로젝트의 단일 기준 스펙 문서이다. 세부 주제는 `specs/` 하위 문서로 분리 관리한다.

---

## 1. 프로젝트 개요

### 1.1 프로젝트 정체성

**Lucent Management**는 버츄얼 아티스트 매니지먼트 레이블이다.

- 버츄얼 MCN이 아닌 **매니지먼트 레이블**
- 프로젝트를 기록하고 관리하는 레이블
- "숨겨진 감정과 목소리가 자연스럽게 드러나는 순간을 기록"

### 1.2 MVP 목표 (1차 오픈)

1. Lucent는 프로젝트를 기록하는 레이블이다 (정체성 확립)
2. 미루루의 보이스팩을 안전하게 살 수 있다 (수익 모델 검증)

### 1.3 운영 방침

- 레이블 정체성 명확화
- 굿즈 판매 가능
- 운영 및 CS 최소화
- 확장 여지 확보

---

## 2. 기술 스택

- **Frontend**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS + CVA (Class Variance Authority)
- **Backend**: Next.js API Routes
  - 추후 NestJS 등으로 분리 가능하도록 레이어링
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **Storage**: Cloudflare R2 (디지털 상품, 이미지)
- **Deployment**: Vercel

---

## 3. 인증 시스템 개요

- 고객 및 관리자 모두 인증 필요
- Supabase Auth 사용
- 이메일/비밀번호 기본 인증
- SNS 로그인은 2차 확장 기능

📄 상세: `specs/api/auth/`

---

## 4. 주요 기능 요구사항

### 4.1 고객 영역

- 회원가입 / 로그인 / 로그아웃
- 프로젝트 목록 및 상세 조회
- 아티스트별 굿즈샵 진입
- **보이스팩 구매** (디지털 상품)
  - 샘플 청취 기능
  - 구매 후 다운로드
- **실물 굿즈 구매**
  - 이미지, 설명, 가격 표시
  - 계좌이체 주문
- 본인 주문 내역 및 상태 조회
- 디지털 상품 재다운로드

### 4.2 관리자 영역 (2차 확장)

- 관리자 로그인
- 상품 CRUD
- 주문 목록 조회
- 주문 상태 수동 변경 (입금 확인 → 제작 중 → 발송 중 → 완료)
- 디지털 상품 파일 업로드

---

## 5. 결제 및 주문 정책

### 5.1 결제 수단

- **계좌이체 단일** (PG 연동 없음)
- 주문 생성 시 계좌 정보 안내
- 주문 완료 페이지에서 입금 안내 표시

### 5.2 주문 상태 플로우

```
입금대기 → 입금확인 → 제작중 → 발송중 → 배송완료
```

- 주문 생성 시 상태는 `입금대기`
- 관리자 수동 입금 확인 후 `입금확인`으로 변경
- 자동 입금 확인 기능 없음 (1차 MVP)

### 5.3 디지털 상품 (보이스팩)

- 입금 확인 후 즉시 다운로드 가능
- 마이페이지에서 재다운로드 가능
- 파일 형식: MP3, ZIP 등

### 5.4 실물 굿즈

- 주문 시 배송지 정보 입력
- 제작 기간 안내 필수
- 배송 추적 정보 제공 (2차 확장)

---

## 6. 데이터 모델 (요약)

### 6.1 User (고객)

- id
- email
- created_at

### 6.2 Project (프로젝트)

- id
- name (예: "0th Project", "1st Project")
- description
- order_index
- is_active

### 6.3 Artist (아티스트)

- id
- name (예: "미루루", "Drips")
- project_id
- description
- shop_theme (굿즈샵 테마 설정)

### 6.4 Product (상품)

- id
- artist_id
- name
- type (VOICE_PACK / PHYSICAL_GOODS)
- price
- description
- image_url
- sample_audio_url (보이스팩 전용)
- digital_file_url (보이스팩 전용)
- is_active

### 6.5 Order (주문)

- id
- user_id
- status (PENDING / PAID / MAKING / SHIPPING / DONE)
- total_price
- shipping_address (실물 굿즈용)
- created_at

### 6.6 OrderItem (주문 항목)

- id
- order_id
- product_id
- quantity
- price_snapshot

---

## 7. API 레이어링 원칙

- **API Route**: Thin Controller (요청/응답 처리)
- **Service Layer**: 비즈니스 로직
- **Repository Layer**: DB 접근

구조는 NestJS 이전을 고려하여 설계한다.

---

## 8. UI 시스템

- **Mobile First** 반응형
- **CVA 기반** UI 컴포넌트
- 단순하고 직관적인 레이아웃
- 친절한 UX 톤

📄 상세: `specs/ui/index.md`

---

## 9. 페이지 구조 (1차 MVP)

### 9.1 필수 페이지

| 경로 | 설명 | 우선순위 |
|------|------|----------|
| `/` | 메인 페이지 (Hero + 프로젝트 프리뷰 + Lucent 소개) | ⭐⭐⭐ |
| `/projects` | 프로젝트 목록 | ⭐⭐⭐ |
| `/projects/{project}` | 프로젝트 상세 | ⭐⭐⭐ |
| `/goods` | 굿즈 허브 (아티스트별 굿즈샵 진입) | ⭐⭐⭐ |
| `/goods/miruru` | 미루루 굿즈샵 | ⭐⭐⭐ |
| `/login` | 로그인 | ⭐⭐⭐ |
| `/signup` | 회원가입 | ⭐⭐⭐ |
| `/mypage` | 마이페이지 | ⭐⭐⭐ |
| `/terms` | 이용약관 | ⭐⭐ |
| `/privacy` | 개인정보처리방침 | ⭐⭐ |

### 9.2 2차 확장 페이지

- `/goods/drips` (Drips 굿즈샵)
- `/admin/*` (관리자 대시보드)
- `/archive` (레이블 아카이브)

📄 각 페이지 상세: `specs/ui/{page}/`

---

## 10. 테스트 전략

- Service 단위 테스트 중심
- 핵심 API 플로우 테스트
- E2E / UI 테스트는 최소화 (1차 MVP)

---

## 11. 1차 오픈 제외 항목

아래는 **절대 지금 안 해도 되는 것**들:

- Archive 페이지 (Lucent 정체성 강화용)
- Projects 타임라인
- Drips 굿즈샵 (껍데기만 준비)
- SNS 외부 임베드 다중화
- 마이페이지 알림 / 프로필 설정
- 관리자 대시보드
- 자동 입금 확인
- 배송 추적 연동
- 후기 시스템
- 추천 알고리즘

---

## 12. 추후 논의 항목

- 재고 관리 수준
- 주문 취소 / 환불 정책 세부화
- 배송비 정책
- 관리자 계정 권한 체계
- 디지털 상품 DRM 정책
- 마케팅 연동 (이메일, 푸시 알림)

---

## 13. 문서 구조

```
/specs
├── index.md              # 본 문서 (전체 스펙 인덱스)
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
│   └── /auth            # 인증 API
└── /components           # 컴포넌트 스펙
```

---

## 요약

Lucent Management는 **버츄얼 아티스트 매니지먼트 레이블**이며, 1차 MVP의 핵심은:

1. **레이블 정체성 확립** (프로젝트 기록하는 레이블)
2. **미루루 보이스팩 안전 판매** (수익 모델 검증)

기술적으로는 **Mobile First**, **CVA 기반 UI**, **계좌이체 전용 결제**를 특징으로 한다.
