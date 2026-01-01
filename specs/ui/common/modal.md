# Modal Component Specification

## 1. 역할 정의 (Role & Scope)

Modal은 **즉각적인 결정, 확인, 보조 작업**을 위한 UI 컴포넌트이다.
페이지를 대체하거나 복잡한 흐름을 담는 용도로 사용하지 않는다.

### 사용 목적

- 사용자 행동에 대한 확인 / 경고
- 짧은 설명 + CTA 제공
- 간단한 입력 (1~3개 필드)
- 옵션 선택

### 사용하지 않는 목적

- 회원가입 / 결제 전체 흐름
- 복잡한 설정 화면
- 긴 콘텐츠 열람

> Modal은 항상 **현재 맥락을 보조**하는 역할만 수행한다.

---

## 2. Modal 타입 구조

본 프로젝트는 Modal을 **명시적으로 타입 분리**하여 관리한다.

### Modal Types

- **AlertModal**

  - 단일 버튼
  - 정보 전달 / 경고

- **ConfirmModal**

  - 확인 / 취소 버튼
  - 되돌릴 수 없는 액션 전 확인

- **DialogModal**

  - 커스텀 콘텐츠
  - 짧은 입력 또는 선택 UI

- **BottomSheet**

  - 모바일 전용
  - 옵션 선택, 보조 정보

각 타입은 공통 Modal Shell을 공유하며,
variant를 통해 동작과 스타일을 분리한다.

---

## 3. Mobile First UI 정책

### 기본 원칙

- 모바일 환경을 최우선 기준으로 설계한다.

### 표현 방식

| 환경    | 기본 UI      |
| ------- | ------------ |
| Mobile  | Bottom Sheet |
| Desktop | Center Modal |

### 예외

- 파괴적 액션
- 중요한 경고

→ 모바일에서도 Center Modal 사용 가능

---

## 4. 열기 / 닫기 정책

### 기본 허용 액션

- Backdrop 클릭
- ESC 키
- 닫기(X) 버튼

### 제한 상황 (Destructive Action)

- Backdrop 클릭 ❌
- ESC 키 ❌
- 명시적 버튼으로만 종료 가능

> 실수로 인한 종료를 방지한다.

---

## 5. CTA 버튼 규칙

### 기본 규칙

- 최대 버튼 수: **2개**
- Primary CTA는 항상 **오른쪽(또는 하단)**
- Secondary → Primary 순서 유지

### Destructive Action

- 위치 변경 ❌
- 색상(tone)으로만 위험성 표현

---

## 6. 포커스 & 접근성

### 포커스 흐름

- 열릴 때: 첫 번째 focusable 요소로 이동
- 닫힐 때: Modal을 연 트리거로 focus 복귀

### 키보드 제어

- Tab 포커스는 Modal 내부로 제한 (focus trap)

### 접근성 원칙

- 명확한 포커스 스타일
- 충분한 터치 영역
- aria 역할 명시

---

## 7. 스크롤 정책

- Modal 열림 시 background scroll lock
- Modal 콘텐츠 영역만 스크롤 허용
- CTA 영역은 필요 시 sticky 처리 가능

---

## 8. 상태 관리 원칙

- Modal은 open / close 상태를 **내부에서 관리하지 않는다**
- 상태는 페이지 또는 feature 단에서 제어한다

Modal 컴포넌트는 **순수 표현 컴포넌트**로 유지한다.

---

## 9. CVA 적용 정책

Modal은 CVA를 통해 variant 기반으로 관리한다.

### Variant 예시

- `type`: alert | confirm | dialog
- `position`: center | bottom
- `size`: sm | md | lg
- `tone`: default | danger

### 원칙

- 조건부 className 분기 ❌
- variant 및 compound variant 사용 ⭕

---

## 10. 문서 참조 관계

### UI 관련 문서

- `ui/index.md`

  - UI 철학 및 CVA 시스템 정책

- `ui/common/button.md`

  - CTA 구성 및 intent 규칙

### 기능 구현 문서 (아키텍처)

본 문서는 **UI/UX 정책**을 다룹니다. 실제 구현을 위한 기능적 스펙은 아래 문서를 참조하세요:

- `/specs/components/modal/index.md`

  - 전체 아키텍처 개요 (ContextAPI, useModal Hook, Promise 기반 비동기 처리)

- `/specs/components/modal/context.md`

  - ModalContext 및 ModalProvider 구현 스펙

- `/specs/components/modal/hook.md`

  - useModal Hook 구현 스펙 (라이프사이클 관리, 렌더링 로직)

- `/specs/components/modal/types.md`

  - TypeScript 타입 정의 (Modal, ModalProps, ModalOptions 등)

- `/specs/components/modal/layout.md`

  - 레이아웃 컴포넌트 구현 스펙 (Overlay, ModalContainer, Header, Content, Footer)

---

### 요약

**UI/UX 정책** (본 문서):
- Mobile First 기반 Modal 설계
- 타입 명확 분리 (Alert / Confirm / Dialog / BottomSheet)
- CVA 기반 variant 관리
- 접근성과 UX를 기본 요건으로 포함
- 상태는 외부에서 관리

**기능 구현** (`/specs/components/modal/`):
- ContextAPI 기반 전역 상태 관리
- useModal Hook을 통한 로직 캡슐화
- Promise 기반 비동기 처리
- 자동 cleanup (페이지 이동 시)
- 모듈화된 레이아웃 컴포넌트
