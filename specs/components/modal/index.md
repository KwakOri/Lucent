# Modal Component - 아키텍처 전체 개요

**문서 버전**: 1.0
**작성일**: 2026-01-01
**참고 자료**: [React 전역 모달 추상화 정복기 시리즈](https://heeheehoho.tistory.com/category/%EC%A0%84%EC%97%AD%20%EB%AA%A8%EB%8B%AC%20%EC%B6%94%EC%83%81%ED%99%94%20%EC%A0%95%EB%B3%B5%EA%B8%B0)

---

## 📋 목차

1. [아키텍처 개요](#아키텍처-개요)
2. [핵심 설계 원칙](#핵심-설계-원칙)
3. [구성 요소](#구성-요소)
4. [데이터 흐름](#데이터-흐름)
5. [사용 예시](#사용-예시)
6. [관련 문서](#관련-문서)

---

## 🎯 아키텍처 개요

본 프로젝트의 Modal 시스템은 **전역 상태 관리 기반의 재사용 가능한 모달 아키텍처**를 따릅니다.

### 핵심 목표

1. **재사용성**: 어떤 컴포넌트에서든 쉽게 모달을 호출할 수 있어야 함
2. **타입 안정성**: TypeScript를 활용한 엄격한 타입 체크
3. **라이프사이클 관리**: 페이지 이동 시 자동으로 모달이 정리되어야 함
4. **비동기 처리**: 모달의 결과를 Promise로 받아 처리 가능
5. **접근성**: 키보드 제어, 포커스 트랩, 스크린 리더 지원

### 아키텍처 다이어그램

```
┌─────────────────────────────────────────────────────────────┐
│                      App (Root)                             │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │              ModalProvider (Context)                  │ │
│  │  - modals: Modal[]                                    │ │
│  │  - openModal(component, options): Promise<T>          │ │
│  │  - closeModal(id): void                               │ │
│  └───────────────────────────────────────────────────────┘ │
│                           │                                 │
│  ┌────────────────────────┼────────────────────────────┐   │
│  │        Pages / Components                           │   │
│  │                        │                            │   │
│  │   ┌────────────────────▼──────────────────┐         │   │
│  │   │  useModal()                           │         │   │
│  │   │  - openModal()                        │         │   │
│  │   │  - closeModal()                       │         │   │
│  │   │  - renderModal()                      │         │   │
│  │   │  - cleanup on unmount                 │         │   │
│  │   └───────────────────────────────────────┘         │   │
│  │                        │                            │   │
│  │   ┌────────────────────▼──────────────────┐         │   │
│  │   │  createPortal()                       │         │   │
│  │   │  → #modal-root                        │         │   │
│  │   └───────────────────────────────────────┘         │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    DOM (Outside React Tree)                 │
│                                                             │
│  <div id="modal-root">                                      │
│    ┌───────────────────────────────────────────────────┐   │
│    │  <Overlay>                                        │   │
│    │    <ModalContainer>                               │   │
│    │      <Header />                                   │   │
│    │      <Content>                                    │   │
│    │        {User's Modal Component}                   │   │
│    │      </Content>                                   │   │
│    │      <Footer />                                   │   │
│    │    </ModalContainer>                              │   │
│    │  </Overlay>                                       │   │
│    └───────────────────────────────────────────────────┘   │
│  </div>                                                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔑 핵심 설계 원칙

### 1. Context vs Hook 역할 분리

**ModalContext의 역할**: 데이터 공유
- `modals` 상태 관리
- `openModal`, `closeModal` 함수 제공

**useModal Hook의 역할**: 로직 처리
- 모달 ID 생성 및 관리
- 라이프사이클 제어 (cleanup)
- 렌더링 로직 캡슐화

> **원칙**: Context는 상태 관리 도구가 아닌 **데이터 공유 도구**로만 사용

### 2. View-Render 분리

**View**: `createPortal`을 통해 `#modal-root`에 렌더링
**Render**: 호출 컴포넌트의 자식으로 동작

이를 통해:
- 모달의 UI는 `#modal-root`에 표시
- 모달의 상태는 호출 컴포넌트와 동기화

### 3. Promise 기반 비동기 처리

모달의 결과를 Promise로 반환하여, 호출 컴포넌트에서 직관적으로 처리:

```tsx
const result = await openModal(ConfirmModal, {
  title: '정말 삭제하시겠습니까?',
});

if (result === 'confirm') {
  // 삭제 로직 실행
}
```

### 4. 자동 정리 (Cleanup)

- 페이지 이동 시 `useModal` Hook의 cleanup 함수가 호출되어 모달 자동 제거
- 메모리 누수 방지
- 라우팅 변화에 자동 대응

### 5. 모듈화된 레이아웃

모달의 레이아웃 컴포넌트를 분리하여 재사용성 향상:

- `Overlay`: 배경 및 닫기 기능
- `ModalContainer`: 모달 컨테이너
- `Header`: 제목 및 닫기 버튼
- `Content`: 사용자 정의 콘텐츠
- `Footer`: CTA 버튼 영역

---

## 🧩 구성 요소

### 1. ModalProvider (Context)

**위치**: `src/components/modal/ModalProvider.tsx`
**역할**: 전역 모달 상태 관리

**제공 값**:
```tsx
{
  modals: Modal[];
  openModal: <T>(component: React.ComponentType, options?: ModalOptions) => Promise<T>;
  closeModal: (id: string) => void;
}
```

**상세 스펙**: [context.md](./context.md)

---

### 2. useModal Hook

**위치**: `src/hooks/useModal.ts`
**역할**: 모달 로직 캡슐화 및 라이프사이클 관리

**제공 함수**:
```tsx
{
  openModal: <T>(component: React.ComponentType, options?: ModalOptions) => Promise<T>;
  closeModal: (id?: string) => void;
  renderModal: () => React.ReactPortal | null;
}
```

**상세 스펙**: [hook.md](./hook.md)

---

### 3. 레이아웃 컴포넌트

**위치**: `src/components/modal/`

- `Overlay.tsx`: 배경 및 닫기 처리
- `ModalContainer.tsx`: 모달 컨테이너
- `Header.tsx`: 제목 및 닫기 버튼
- `Content.tsx`: 사용자 정의 콘텐츠 영역
- `Footer.tsx`: CTA 버튼 영역

**상세 스펙**: [layout.md](./layout.md)

---

### 4. TypeScript 타입

**위치**: `src/components/modal/types.ts`

주요 타입:
- `Modal`: 모달 상태 타입
- `ModalOptions`: 모달 옵션 타입
- `ModalProps`: 모달 컴포넌트 Props 타입

**상세 스펙**: [types.md](./types.md)

---

## 🔄 데이터 흐름

### 1. 모달 열기

```
1. 컴포넌트에서 useModal() 호출
   ↓
2. openModal(MyModal, options) 실행
   ↓
3. ModalContext의 openModal 함수 호출
   ↓
4. 고유 ID 생성 및 Promise 생성
   ↓
5. modals 배열에 모달 추가
   ↓
6. renderModal()이 createPortal로 렌더링
   ↓
7. #modal-root에 모달 표시
```

### 2. 모달 닫기

```
1. 모달 내부에서 onSubmit 또는 onAbort 호출
   ↓
2. closeModal(id) 실행
   ↓
3. ModalContext의 closeModal 함수 호출
   ↓
4. modals 배열에서 해당 모달 제거
   ↓
5. Promise resolve/reject 호출
   ↓
6. 호출 컴포넌트에서 결과 처리
```

### 3. 자동 정리

```
1. 페이지 이동 (라우팅 변화)
   ↓
2. useModal Hook의 cleanup 함수 실행
   ↓
3. 해당 컴포넌트에서 열린 모든 모달 닫기
   ↓
4. 메모리 정리
```

---

## 💡 사용 예시

### 기본 사용

```tsx
'use client';

import { useModal } from '@/hooks/useModal';
import { ConfirmModal } from '@/components/modal';

export default function MyPage() {
  const { openModal, renderModal } = useModal();

  const handleDelete = async () => {
    const result = await openModal(ConfirmModal, {
      title: '정말 삭제하시겠습니까?',
      message: '이 작업은 되돌릴 수 없습니다.',
      confirmText: '삭제',
      cancelText: '취소',
      tone: 'danger',
    });

    if (result === 'confirm') {
      // 삭제 로직
      console.log('삭제 완료');
    }
  };

  return (
    <div>
      <button onClick={handleDelete}>삭제</button>
      {renderModal()}
    </div>
  );
}
```

### 커스텀 모달 컴포넌트

```tsx
'use client';

import type { ModalProps } from '@/components/modal/types';

interface MyModalProps extends ModalProps<string> {
  userName: string;
}

export function MyModal({ userName, onSubmit, onAbort }: MyModalProps) {
  return (
    <div>
      <h2>{userName}님, 환영합니다!</h2>
      <button onClick={() => onSubmit('success')}>확인</button>
      <button onClick={() => onAbort('cancel')}>취소</button>
    </div>
  );
}
```

### 비동기 처리가 필요한 경우

```tsx
const handleSave = async () => {
  const result = await openModal(EditProfileModal, {
    currentProfile: user.profile,
  });

  if (result) {
    // API 호출
    await updateProfile(result);
    toast.success('프로필이 업데이트되었습니다.');
  }
};
```

---

## 📚 관련 문서

### 기능 스펙
- [ModalContext 스펙](./context.md)
- [useModal Hook 스펙](./hook.md)
- [TypeScript 타입 정의](./types.md)
- [레이아웃 컴포넌트](./layout.md)

### UI 스펙
- [Modal UI/UX 정책](/specs/ui/common/modal.md)

### 참고 자료
- [React 전역 모달 추상화 정복기 (1)](https://heeheehoho.tistory.com/entry/React-%EC%A0%84%EC%97%AD-Modal-%EC%B6%94%EC%83%81%ED%99%94-%EC%A0%95%EB%B3%B5%EA%B8%B0-1)
- [React 전역 모달 추상화 정복기 (2)](https://heeheehoho.tistory.com/entry/React-%EC%A0%84%EC%97%AD-Modal-%EC%B6%94%EC%83%81%ED%99%94-%EC%A0%95%EB%B3%B5%EA%B8%B0-2)
- [React 전역 모달 추상화 정복기 (3)](https://heeheehoho.tistory.com/entry/React-%EC%A0%84%EC%97%AD-Modal-%EC%B6%94%EC%83%81%ED%99%94-%EC%A0%95%EB%B3%B5%EA%B8%B0-3)
- [React 전역 모달 추상화 정복기 (4)](https://heeheehoho.tistory.com/entry/React-%EC%A0%84%EC%97%AD-Modal-%EC%B6%94%EC%83%81%ED%99%94-%EC%A0%95%EB%B3%B5%EA%B8%B0-4)
- [React 전역 모달 추상화 정복기 (5)](https://heeheehoho.tistory.com/entry/React-%EC%A0%84%EC%97%AD-Modal-%EC%B6%94%EC%83%81%ED%99%94-%EC%A0%95%EB%B3%B5%EA%B8%B0-5)
- [React 전역 모달 추상화 정복기 (마지막)](https://heeheehoho.tistory.com/entry/React-%EC%A0%84%EC%97%AD-Modal-%EC%B6%94%EC%83%81%ED%99%94-%EC%A0%95%EB%B3%B5%EA%B8%B0-%EB%A7%88%EC%A7%80%EB%A7%89)

---

## ✅ 구현 체크리스트

### Phase 1: 기본 구조
- [ ] ModalProvider 구현
- [ ] ModalContext 구현
- [ ] useModal Hook 구현
- [ ] TypeScript 타입 정의

### Phase 2: 레이아웃 컴포넌트
- [ ] Overlay 컴포넌트
- [ ] ModalContainer 컴포넌트
- [ ] Header 컴포넌트
- [ ] Content 컴포넌트
- [ ] Footer 컴포넌트

### Phase 3: 기본 모달 타입
- [ ] AlertModal (단일 버튼)
- [ ] ConfirmModal (확인/취소)
- [ ] DialogModal (커스텀 콘텐츠)

### Phase 4: 접근성 및 최적화
- [ ] 포커스 트랩 (Focus Trap)
- [ ] ESC 키 처리
- [ ] 배경 스크롤 잠금
- [ ] 애니메이션 (열기/닫기)

### Phase 5: 고급 기능
- [ ] BottomSheet (모바일)
- [ ] 다중 모달 스택 관리
- [ ] 모달 우선순위 (z-index)

---

**다음 단계**: [ModalContext 스펙](./context.md) 문서를 읽고 Context 구현을 시작하세요.
