# useModal Hook 스펙

**문서 버전**: 1.0
**작성일**: 2026-01-01

---

## 📋 목차

1. [역할 정의](#역할-정의)
2. [Hook 인터페이스](#hook-인터페이스)
3. [구현 요구사항](#구현-요구사항)
4. [라이프사이클 관리](#라이프사이클-관리)
5. [렌더링 로직](#렌더링-로직)
6. [구현 예시](#구현-예시)

---

## 🎯 역할 정의

`useModal` Hook은 모달의 **로직과 라이프사이클**을 담당합니다.

### Hook의 역할 (O)
- ✅ 모달 ID 생성 및 관리
- ✅ 라이프사이클 제어 (cleanup)
- ✅ 렌더링 로직 캡슐화 (createPortal)
- ✅ 호출 컴포넌트에 간결한 API 제공

### Hook의 역할이 아닌 것 (X)
- ❌ 전역 상태 직접 관리 (Context가 담당)
- ❌ UI 렌더링 (레이아웃 컴포넌트가 담당)

> **원칙**: Hook은 Context와 컴포넌트 사이의 **중간 레이어**입니다.

---

## 🧩 Hook 인터페이스

### 반환값

```tsx
interface UseModalReturn {
  // 모달 열기 함수
  openModal: <T = void>(
    component: React.ComponentType<ModalProps<T>>,
    options?: ModalOptions
  ) => Promise<T>;

  // 모달 닫기 함수 (ID 없으면 현재 Hook에서 연 모든 모달 닫기)
  closeModal: (id?: string) => void;

  // 모달 렌더링 함수 (컴포넌트 JSX에서 호출)
  renderModal: () => React.ReactPortal | null;
}
```

### 사용 예시

```tsx
const { openModal, closeModal, renderModal } = useModal();
```

---

## 🏗️ 구현 요구사항

### 1. ModalContext 접근

```tsx
import { useModalContext } from '@/components/modal/ModalProvider';

export function useModal(): UseModalReturn {
  const context = useModalContext();
  // ...
}
```

### 2. 로컬 모달 ID 관리

Hook에서 열린 모달들의 ID를 추적하여, cleanup 시 해당 모달만 닫습니다:

```tsx
const modalIdsRef = useRef<Set<string>>(new Set());
```

**왜 `useRef`를 사용하는가?**
- 렌더링 간 ID 목록을 유지
- 상태 변경으로 인한 불필요한 리렌더링 방지

### 3. openModal 래핑

Context의 `openModal`을 호출하되, 생성된 ID를 로컬에 저장:

```tsx
const openModal = useCallback(
  async <T = void>(
    component: React.ComponentType<ModalProps<T>>,
    options?: ModalOptions
  ): Promise<T> => {
    // 고유 ID 생성
    const id = crypto.randomUUID();
    modalIdsRef.current.add(id);

    try {
      // ID를 options에 포함하여 Context의 openModal 호출
      const result = await context.openModal(component, { ...options, id });
      return result;
    } finally {
      // 모달이 닫히면 ID 제거
      modalIdsRef.current.delete(id);
    }
  },
  [context]
);
```

**동작 방식**:
- useModal Hook에서 ID를 생성하여 options에 포함
- Context는 options에 ID가 있으면 사용하고, 없으면 생성 (폴백)

### 4. closeModal 래핑

ID가 없으면 현재 Hook에서 연 모든 모달을 닫습니다:

```tsx
const closeModal = useCallback(
  (id?: string) => {
    if (id) {
      // 특정 모달 닫기
      context.closeModal(id);
      modalIdsRef.current.delete(id);
    } else {
      // 현재 Hook에서 연 모든 모달 닫기
      modalIdsRef.current.forEach((modalId) => {
        context.closeModal(modalId);
      });
      modalIdsRef.current.clear();
    }
  },
  [context]
);
```

### 5. cleanup (unmount 시)

컴포넌트가 언마운트되면 해당 Hook에서 연 모든 모달을 자동으로 닫습니다:

```tsx
useEffect(() => {
  return () => {
    // cleanup: 모든 모달 닫기
    modalIdsRef.current.forEach((id) => {
      context.closeModal(id);
    });
    modalIdsRef.current.clear();
  };
}, [context]);
```

**효과**:
- 페이지 이동 시 자동으로 모달 정리
- 메모리 누수 방지

---

## 🔄 라이프사이클 관리

### 시나리오 1: 정상 종료

```
1. 사용자가 모달 내 버튼 클릭
   ↓
2. onSubmit('result') 호출
   ↓
3. Promise resolve
   ↓
4. modalIdsRef에서 ID 제거
   ↓
5. 완료
```

### 시나리오 2: 페이지 이동

```
1. 사용자가 다른 페이지로 이동
   ↓
2. 컴포넌트 언마운트
   ↓
3. useEffect cleanup 실행
   ↓
4. modalIdsRef의 모든 ID 순회
   ↓
5. 각 모달 closeModal 호출
   ↓
6. modalIdsRef 초기화
```

### 시나리오 3: 강제 닫기 (ESC, Backdrop 클릭)

```
1. ESC 키 또는 Backdrop 클릭
   ↓
2. Overlay 컴포넌트에서 closeModal(id) 호출
   ↓
3. Context의 closeModal 실행
   ↓
4. Promise reject('closed')
   ↓
5. modalIdsRef에서 ID 제거
```

---

## 🎨 렌더링 로직

### renderModal 함수

**역할**: Context의 `modals` 배열을 읽어 createPortal로 렌더링

```tsx
const renderModal = useCallback(() => {
  if (context.modals.length === 0) return null;

  return createPortal(
    <>
      {context.modals.map((modal) => (
        <ModalRenderer key={modal.id} modal={modal} />
      ))}
    </>,
    document.getElementById('modal-root')!
  );
}, [context.modals]);
```

### ModalRenderer 컴포넌트

각 모달을 렌더링하는 내부 컴포넌트:

```tsx
function ModalRenderer({ modal }: { modal: Modal }) {
  const { id, component: Component, options, resolve, reject } = modal;

  const handleSubmit = useCallback(
    (value: any) => {
      resolve(value);
      // Context의 closeModal은 호출하지 않음 (resolve 후 자동 정리)
    },
    [resolve]
  );

  const handleAbort = useCallback(
    (reason?: any) => {
      reject(reason || 'aborted');
    },
    [reject]
  );

  return (
    <Overlay
      id={id}
      onClose={() => handleAbort('backdrop')}
      disableBackdropClick={options?.disableBackdropClick}
      disableEscapeKey={options?.disableEscapeKey}
    >
      <ModalContainer>
        <Component
          onSubmit={handleSubmit}
          onAbort={handleAbort}
          {...options}
        />
      </ModalContainer>
    </Overlay>
  );
}
```

**주의**:
- `onSubmit`, `onAbort`는 직접 props로 전달됩니다
- 모달 컴포넌트는 `ModalProps<T>`를 확장하여 이 props를 받아 사용합니다

---

## 💻 구현 예시

### 전체 코드

```tsx
'use client';

import { useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useModalContext } from '@/components/modal/ModalProvider';
import { Overlay, ModalContainer } from '@/components/modal';
import type { Modal, ModalOptions, ModalProps } from './types';

interface UseModalReturn {
  openModal: <T = void>(
    component: React.ComponentType<ModalProps<T>>,
    options?: ModalOptions
  ) => Promise<T>;
  closeModal: (id?: string) => void;
  renderModal: () => React.ReactPortal | null;
}

export function useModal(): UseModalReturn {
  const context = useModalContext();
  const modalIdsRef = useRef<Set<string>>(new Set());

  // openModal 래핑
  const openModal = useCallback(
    async <T = void>(
      component: React.ComponentType<ModalProps<T>>,
      options?: ModalOptions
    ): Promise<T> => {
      const id = crypto.randomUUID();
      modalIdsRef.current.add(id);

      try {
        const result = await context.openModal(component, { ...options, id });
        return result;
      } finally {
        modalIdsRef.current.delete(id);
      }
    },
    [context]
  );

  // closeModal 래핑
  const closeModal = useCallback(
    (id?: string) => {
      if (id) {
        context.closeModal(id);
        modalIdsRef.current.delete(id);
      } else {
        modalIdsRef.current.forEach((modalId) => {
          context.closeModal(modalId);
        });
        modalIdsRef.current.clear();
      }
    },
    [context]
  );

  // cleanup
  useEffect(() => {
    return () => {
      modalIdsRef.current.forEach((id) => {
        context.closeModal(id);
      });
      modalIdsRef.current.clear();
    };
  }, [context]);

  // renderModal
  const renderModal = useCallback(() => {
    if (context.modals.length === 0) return null;

    // SSR 체크: 서버 사이드에서는 렌더링하지 않음
    if (typeof window === 'undefined') return null;

    const modalRoot = document.getElementById('modal-root');
    if (!modalRoot) {
      console.warn('modal-root element not found');
      return null;
    }

    return createPortal(
      <>
        {context.modals.map((modal) => (
          <ModalRenderer key={modal.id} modal={modal} />
        ))}
      </>,
      modalRoot
    );
  }, [context.modals]);

  return {
    openModal,
    closeModal,
    renderModal,
  };
}

// ModalRenderer 내부 컴포넌트
function ModalRenderer({ modal }: { modal: Modal }) {
  const { id, component: Component, options, resolve, reject } = modal;
  const context = useModalContext();

  const handleSubmit = useCallback(
    (value: any) => {
      resolve(value);
      context.closeModal(id);
    },
    [resolve, context, id]
  );

  const handleAbort = useCallback(
    (reason?: any) => {
      reject(reason || 'aborted');
      context.closeModal(id);
    },
    [reject, context, id]
  );

  return (
    <Overlay
      id={id}
      onClose={() => handleAbort('backdrop')}
      disableBackdropClick={options?.disableBackdropClick}
      disableEscapeKey={options?.disableEscapeKey}
    >
      <ModalContainer>
        <Component
          onSubmit={handleSubmit}
          onAbort={handleAbort}
          {...options}
        />
      </ModalContainer>
    </Overlay>
  );
}
```

---

## 🔧 사용 방법

### 기본 사용

```tsx
'use client';

import { useModal } from '@/hooks/useModal';
import { ConfirmModal } from '@/components/modal';

export default function MyPage() {
  const { openModal, renderModal } = useModal();

  const handleDelete = async () => {
    try {
      const result = await openModal(ConfirmModal, {
        title: '삭제 확인',
        message: '정말 삭제하시겠습니까?',
      });

      if (result === 'confirm') {
        console.log('삭제 완료');
      }
    } catch (error) {
      console.log('모달 취소:', error);
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

### 모든 모달 닫기

```tsx
const { closeModal } = useModal();

// 현재 Hook에서 연 모든 모달 닫기
closeModal();
```

### 특정 모달만 닫기

```tsx
const { openModal, closeModal } = useModal();

const modalId = await openModal(MyModal);

// 나중에 특정 모달만 닫기
closeModal(modalId);
```

---

## 🎯 사용 패턴 및 최적화

### 패턴 1: 최상위에서 한 번만 호출 (권장)

단일 모달 또는 소수의 모달을 사용하는 경우, 최상위 컴포넌트에서 한 번만 호출하여 사용합니다:

```tsx
'use client';

import { useModal } from '@/hooks/useModal';
import { ConfirmModal } from '@/components/modal';

export default function MyPage() {
  const { openModal, renderModal } = useModal();

  const handleDelete = async () => {
    const result = await openModal(ConfirmModal, {
      title: '삭제 확인',
      message: '정말 삭제하시겠습니까?',
    });

    if (result === 'confirm') {
      // 삭제 로직
    }
  };

  const handleUpdate = async () => {
    const result = await openModal(ConfirmModal, {
      title: '수정 확인',
      message: '정말 수정하시겠습니까?',
    });

    if (result === 'confirm') {
      // 수정 로직
    }
  };

  return (
    <div>
      <button onClick={handleDelete}>삭제</button>
      <button onClick={handleUpdate}>수정</button>
      {renderModal()}
    </div>
  );
}
```

**장점**:
- 하나의 `renderModal()`로 모든 모달 관리
- 불필요한 포털 중복 생성 방지
- 간결한 코드 유지

---

### 패턴 2: 여러 모달 독립 관리

여러 종류의 모달을 **독립적으로** 관리해야 하는 경우, 각 모달마다 별도의 `useModal` 호출을 권장합니다:

```tsx
'use client';

import { useModal } from '@/hooks/useModal';
import { ConfirmModal, AlertModal, FormModal } from '@/components/modal';

export default function MyPage() {
  const confirmModal = useModal();
  const alertModal = useModal();
  const formModal = useModal();

  const handleDelete = async () => {
    const result = await confirmModal.openModal(ConfirmModal, {
      title: '삭제 확인',
      message: '정말 삭제하시겠습니까?',
    });

    if (result === 'confirm') {
      // 삭제 성공 후 알림
      await alertModal.openModal(AlertModal, {
        title: '삭제 완료',
        message: '성공적으로 삭제되었습니다.',
      });
    }
  };

  return (
    <div>
      <button onClick={handleDelete}>삭제</button>
      {confirmModal.renderModal()}
      {alertModal.renderModal()}
      {formModal.renderModal()}
    </div>
  );
}
```

**장점**:
- 각 모달의 라이프사이클을 독립적으로 관리
- 모달 타입별로 분리된 상태 관리
- 여러 모달을 순차적으로 열 때 유용

**사용 시나리오**:
- 확인 → 성공 알림 → 추가 입력 등 여러 단계의 모달 흐름
- 서로 다른 컨텍스트에서 사용되는 모달들

---

### 패턴 3: 하위 컴포넌트에 전달

최상위 컴포넌트에서 `useModal`을 호출하고, 하위 컴포넌트에 `openModal` 함수만 전달할 수 있습니다:

```tsx
'use client';

import { useModal } from '@/hooks/useModal';
import { DeleteButton } from './DeleteButton';

export default function MyPage() {
  const { openModal, renderModal } = useModal();

  return (
    <div>
      <DeleteButton openModal={openModal} />
      {renderModal()}
    </div>
  );
}
```

```tsx
// DeleteButton.tsx
import { ConfirmModal } from '@/components/modal';
import type { OpenModalFunction } from '@/components/modal/types';

interface DeleteButtonProps {
  openModal: OpenModalFunction;
}

export function DeleteButton({ openModal }: DeleteButtonProps) {
  const handleClick = async () => {
    const result = await openModal(ConfirmModal, {
      title: '삭제 확인',
      message: '정말 삭제하시겠습니까?',
    });

    if (result === 'confirm') {
      // 삭제 로직
    }
  };

  return <button onClick={handleClick}>삭제</button>;
}
```

**장점**:
- 하위 컴포넌트에서 `useModal` 호출하지 않아도 됨
- 포털 중복 생성 방지
- Props Drilling 최소화 (필요한 함수만 전달)

---

### ❌ 안티패턴: 여러 컴포넌트에서 각각 호출

**비추천**: 여러 컴포넌트에서 각각 `useModal`을 호출하고 각자 `renderModal()` 호출

```tsx
// ❌ 나쁜 예시
function ParentComponent() {
  const { openModal, renderModal } = useModal();

  return (
    <div>
      <ChildComponent />
      {renderModal()} {/* 부모에서 렌더링 */}
    </div>
  );
}

function ChildComponent() {
  const { openModal, renderModal } = useModal();

  return (
    <div>
      <button onClick={() => openModal(MyModal)}>모달 열기</button>
      {renderModal()} {/* 자식에서도 렌더링 */}
    </div>
  );
}
```

**문제점**:
- `modal-root`에 중복된 포털이 생성됨
- 불필요한 렌더링 발생
- 예상치 못한 z-index 충돌 가능

**해결책**: 패턴 1 또는 패턴 3 사용

---

### 💡 권장 사항

1. **기본적으로 패턴 1 사용**
   - 대부분의 경우 최상위에서 한 번만 호출하면 충분

2. **복잡한 모달 흐름이 있다면 패턴 2 사용**
   - 여러 단계의 모달을 순차적으로 열 때
   - 각 모달의 라이프사이클을 독립적으로 관리해야 할 때

3. **하위 컴포넌트에서 모달이 필요하다면 패턴 3 사용**
   - 함수만 전달하여 불필요한 Hook 호출 방지

4. **여러 페이지에서 공통으로 사용한다면 Context 고려**
   - 전역 모달 관리가 필요한 경우 별도의 ModalContext 생성 고려

---

## ✅ 구현 체크리스트

- [ ] `useModal` Hook 구현
- [ ] `modalIdsRef`로 로컬 ID 관리
- [ ] `openModal` 래핑 (ID 추적)
- [ ] `closeModal` 래핑 (전체/개별 닫기)
- [ ] cleanup 로직 (unmount 시)
- [ ] `renderModal` 함수 구현 (createPortal)
- [ ] `ModalRenderer` 컴포넌트 구현
- [ ] `onSubmit`, `onAbort` props 주입

---

## 📚 관련 문서

- [아키텍처 전체 개요](./index.md)
- [ModalContext 스펙](./context.md)
- [TypeScript 타입 정의](./types.md)
- [레이아웃 컴포넌트](./layout.md)

---

**다음 단계**: [TypeScript 타입 정의](./types.md) 문서를 읽고 타입을 정의하세요.
