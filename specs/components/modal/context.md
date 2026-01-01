# ModalContext 스펙

**문서 버전**: 1.0
**작성일**: 2026-01-01

---

## 📋 목차

1. [역할 정의](#역할-정의)
2. [Context 구조](#context-구조)
3. [ModalProvider 구현](#modalprovider-구현)
4. [상태 관리](#상태-관리)
5. [함수 명세](#함수-명세)
6. [구현 예시](#구현-예시)

---

## 🎯 역할 정의

`ModalContext`는 전역 모달 상태를 **공유**하는 역할만 담당합니다.

### Context의 역할 (O)
- `modals` 상태 저장
- `openModal`, `closeModal` 함수 제공
- 여러 컴포넌트에서 동일한 모달 상태 접근

### Context의 역할이 아닌 것 (X)
- ❌ 모달 ID 생성 로직
- ❌ 모달 렌더링 로직
- ❌ 라이프사이클 관리
- ❌ 라우팅 변화 감지

> **원칙**: Context는 **데이터 공유 도구**이지 상태 관리 도구가 아닙니다.

---

## 🧩 Context 구조

### ModalContextValue 타입

```tsx
interface ModalContextValue {
  // 현재 열린 모달 목록
  modals: Modal[];

  // 모달 열기 함수
  openModal: <T = void>(
    component: React.ComponentType<ModalProps<T>>,
    options?: ModalOptions
  ) => Promise<T>;

  // 모달 닫기 함수
  closeModal: (id: string) => void;
}
```

### Modal 타입

```tsx
interface Modal {
  id: string;
  component: React.ComponentType<any>;
  options?: ModalOptions;
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
}
```

---

## 🏗️ ModalProvider 구현

### 파일 위치
```
src/components/modal/ModalProvider.tsx
```

### 구현 요구사항

#### 1. 상태 관리

```tsx
const [modals, setModals] = useState<Modal[]>([]);
```

- `modals` 배열로 다중 모달 지원
- 배열 순서 = 모달 z-index 순서 (나중에 추가된 모달이 위)

#### 2. openModal 함수

**역할**: 새로운 모달을 추가하고 Promise 반환

**구현 로직**:
1. 고유 ID 생성 (uuid)
2. Promise 생성 (resolve, reject 저장)
3. modals 배열에 추가
4. Promise 반환

```tsx
const openModal = useCallback(
  <T = void>(
    component: React.ComponentType<ModalProps<T>>,
    options?: ModalOptions
  ): Promise<T> => {
    return new Promise<T>((resolve, reject) => {
      // options에서 id를 가져오거나, 없으면 생성
      const id = options?.id || crypto.randomUUID();

      const newModal: Modal = {
        id,
        component,
        options,
        resolve,
        reject,
      };

      setModals((prev) => [...prev, newModal]);
    });
  },
  []
);
```

#### 3. closeModal 함수

**역할**: 특정 모달을 닫고 Promise resolve/reject 호출

**구현 로직**:
1. ID로 모달 찾기
2. modals 배열에서 제거
3. resolve 또는 reject 호출

```tsx
const closeModal = useCallback((id: string) => {
  setModals((prev) => {
    const modal = prev.find((m) => m.id === id);
    if (modal) {
      // 기본적으로 reject (사용자가 닫기 버튼을 누른 경우)
      modal.reject('closed');
    }
    return prev.filter((m) => m.id !== id);
  });
}, []);
```

#### 4. Context 제공

```tsx
const value: ModalContextValue = {
  modals,
  openModal,
  closeModal,
};

return (
  <ModalContext.Provider value={value}>
    {children}
  </ModalContext.Provider>
);
```

---

## 📦 상태 관리

### 다중 모달 스택

모달은 배열로 관리되며, 나중에 추가된 모달이 위에 표시됩니다:

```tsx
// 예시
modals = [
  { id: 'modal-1', ... }, // z-index: 1000
  { id: 'modal-2', ... }, // z-index: 1001
  { id: 'modal-3', ... }, // z-index: 1002 (최상위)
];
```

### Promise 저장

각 모달은 `resolve`와 `reject` 함수를 저장하여, 모달이 닫힐 때 호출 컴포넌트에 결과를 전달합니다:

```tsx
// 모달 열기
const result = await openModal(MyModal); // Promise 대기

// 모달 내부에서 onSubmit 호출
onSubmit('success'); // → modal.resolve('success')

// 호출 컴포넌트
console.log(result); // 'success'
```

---

## 📝 함수 명세

### openModal

**시그니처**:
```tsx
<T = void>(
  component: React.ComponentType<ModalProps<T>>,
  options?: ModalOptions
) => Promise<T>
```

**파라미터**:
- `component`: 렌더링할 모달 컴포넌트
- `options`: 모달 옵션 (제목, 크기, 닫기 옵션 등)

**반환값**:
- `Promise<T>`: 모달이 닫힐 때 resolve/reject되는 Promise

**사용 예시**:
```tsx
const result = await openModal(ConfirmModal, {
  title: '삭제 확인',
  message: '정말 삭제하시겠습니까?',
});

if (result === 'confirm') {
  // 삭제 로직
}
```

---

### closeModal

**시그니처**:
```tsx
(id: string) => void
```

**파라미터**:
- `id`: 닫을 모달의 고유 ID

**동작**:
1. `modals` 배열에서 해당 ID의 모달 찾기
2. `reject('closed')` 호출
3. 배열에서 제거

**사용 예시**:
```tsx
closeModal('modal-id-123');
```

---

## 💻 구현 예시

### 전체 코드

```tsx
'use client';

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import type { Modal, ModalContextValue, ModalOptions, ModalProps } from './types';

const ModalContext = createContext<ModalContextValue | null>(null);

export function ModalProvider({ children }: { children: ReactNode }) {
  const [modals, setModals] = useState<Modal[]>([]);

  const openModal = useCallback(
    <T = void>(
      component: React.ComponentType<ModalProps<T>>,
      options?: ModalOptions
    ): Promise<T> => {
      return new Promise<T>((resolve, reject) => {
        // options에서 id를 가져오거나, 없으면 생성
        const id = options?.id || crypto.randomUUID();

        const newModal: Modal = {
          id,
          component,
          options,
          resolve,
          reject,
        };

        setModals((prev) => [...prev, newModal]);
      });
    },
    []
  );

  const closeModal = useCallback((id: string) => {
    setModals((prev) => {
      const modal = prev.find((m) => m.id === id);
      if (modal) {
        modal.reject('closed');
      }
      return prev.filter((m) => m.id !== id);
    });
  }, []);

  const value: ModalContextValue = {
    modals,
    openModal,
    closeModal,
  };

  return (
    <ModalContext.Provider value={value}>
      {children}
    </ModalContext.Provider>
  );
}

export function useModalContext() {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModalContext must be used within ModalProvider');
  }
  return context;
}
```

---

## 🔧 사용 방법

### 1. App에 Provider 추가

```tsx
// app/layout.tsx
import { ModalProvider } from '@/components/modal/ModalProvider';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <ModalProvider>
          {children}
        </ModalProvider>
        <div id="modal-root" />
      </body>
    </html>
  );
}
```

### 2. useModalContext 사용 (내부 전용)

```tsx
// useModal Hook 내부에서만 사용
import { useModalContext } from '@/components/modal/ModalProvider';

export function useModal() {
  const { modals, openModal, closeModal } = useModalContext();

  // ...로직
}
```

> **주의**: 일반 컴포넌트에서는 `useModalContext`를 직접 사용하지 않고, `useModal` Hook을 사용합니다.

---

## ✅ 구현 체크리스트

- [ ] `ModalContext` 생성
- [ ] `ModalProvider` 컴포넌트 구현
- [ ] `modals` 상태 관리
- [ ] `openModal` 함수 구현 (Promise 반환)
- [ ] `closeModal` 함수 구현
- [ ] `useModalContext` Hook 구현
- [ ] App Layout에 Provider 추가
- [ ] `#modal-root` div 추가

---

## 📚 관련 문서

- [아키텍처 전체 개요](./index.md)
- [useModal Hook 스펙](./hook.md)
- [TypeScript 타입 정의](./types.md)
- [레이아웃 컴포넌트](./layout.md)

---

**다음 단계**: [useModal Hook 스펙](./hook.md) 문서를 읽고 Hook 구현을 시작하세요.
