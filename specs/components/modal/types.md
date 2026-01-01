# Modal TypeScript 타입 정의

**문서 버전**: 1.0
**작성일**: 2026-01-01

---

## 📋 목차

1. [타입 개요](#타입-개요)
2. [핵심 타입](#핵심-타입)
3. [컴포넌트 Props 타입](#컴포넌트-props-타입)
4. [유틸리티 타입](#유틸리티-타입)
5. [구현 예시](#구현-예시)

---

## 🎯 타입 개요

Modal 시스템은 TypeScript를 활용하여 **타입 안정성**을 보장합니다.

### 타입 설계 원칙

1. **제네릭 활용**: 모달의 반환값 타입을 유연하게 지정
2. **엄격한 타입 체크**: 필수 props 누락 방지
3. **재사용 가능한 유틸리티 타입**: 반복 코드 최소화
4. **명확한 네이밍**: 타입 이름만으로 역할 파악 가능

---

## 🧩 핵심 타입

### 1. Modal (내부 상태)

Context에서 관리하는 모달 상태 타입입니다.

```tsx
interface Modal<T = any> {
  // 모달 고유 ID
  id: string;

  // 렌더링할 컴포넌트
  component: React.ComponentType<ModalProps<T>>;

  // 모달 옵션
  options?: ModalOptions;

  // Promise resolve 함수
  resolve: (value: T) => void;

  // Promise reject 함수
  reject: (reason?: any) => void;
}
```

**사용처**: `ModalContext`, `ModalProvider`

---

### 2. ModalProps (컴포넌트 Props)

사용자 정의 모달 컴포넌트가 받는 Props입니다.

```tsx
interface ModalProps<T = void> {
  // 모달 완료 시 호출 (resolve)
  onSubmit: (value: T) => void;

  // 모달 취소 시 호출 (reject)
  onAbort: (reason?: any) => void;
}
```

**사용처**: 사용자 정의 모달 컴포넌트

**예시**:
```tsx
interface MyModalProps extends ModalProps<string> {
  title: string;
  message: string;
}

export function MyModal({ title, message, onSubmit, onAbort }: MyModalProps) {
  return (
    <div>
      <h2>{title}</h2>
      <p>{message}</p>
      <button onClick={() => onSubmit('confirmed')}>확인</button>
      <button onClick={() => onAbort('cancelled')}>취소</button>
    </div>
  );
}
```

---

### 3. ModalOptions (모달 설정)

모달을 열 때 전달하는 옵션입니다.

```tsx
interface ModalOptions {
  // 모달 ID (선택사항, 없으면 자동 생성)
  id?: string;

  // 모달 제목
  title?: string;

  // 모달 크기
  size?: 'sm' | 'md' | 'lg' | 'full';

  // 모달 위치
  position?: 'center' | 'bottom';

  // 배경 클릭으로 닫기 비활성화
  disableBackdropClick?: boolean;

  // ESC 키로 닫기 비활성화
  disableEscapeKey?: boolean;

  // 닫기(X) 버튼 표시 여부
  showCloseButton?: boolean;

  // 모달 톤 (색상 테마)
  tone?: 'default' | 'danger' | 'success' | 'warning';

  // 애니메이션 비활성화
  disableAnimation?: boolean;

  // z-index 커스터마이징
  zIndex?: number;

  // 추가 className
  className?: string;

  // 기타 사용자 정의 데이터
  [key: string]: any;
}
```

**사용처**: `openModal` 함수의 두 번째 인자

**예시**:
```tsx
openModal(MyModal, {
  title: '회원 탈퇴',
  size: 'md',
  position: 'center',
  tone: 'danger',
  disableBackdropClick: true,
});
```

---

### 4. ModalContextValue (Context 타입)

ModalContext가 제공하는 값의 타입입니다.

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

**사용처**: `ModalContext`, `useModalContext`

---

## 🏗️ 컴포넌트 Props 타입

### 1. OverlayProps

배경 오버레이 컴포넌트의 Props입니다.

```tsx
interface OverlayProps {
  // 모달 ID
  id: string;

  // 닫기 핸들러
  onClose: () => void;

  // 배경 클릭으로 닫기 비활성화
  disableBackdropClick?: boolean;

  // ESC 키로 닫기 비활성화
  disableEscapeKey?: boolean;

  // z-index
  zIndex?: number;

  // 자식 요소 (모달 컨텐츠)
  children: React.ReactNode;
}
```

---

### 2. ModalContainerProps

모달 컨테이너 컴포넌트의 Props입니다.

```tsx
interface ModalContainerProps {
  // 모달 크기
  size?: 'sm' | 'md' | 'lg' | 'full';

  // 모달 위치
  position?: 'center' | 'bottom';

  // 톤 (색상 테마)
  tone?: 'default' | 'danger' | 'success' | 'warning';

  // 추가 className
  className?: string;

  // 자식 요소
  children: React.ReactNode;
}
```

---

### 3. HeaderProps

모달 헤더 컴포넌트의 Props입니다.

```tsx
interface HeaderProps {
  // 제목
  title?: string;

  // 닫기 버튼 표시 여부
  showCloseButton?: boolean;

  // 닫기 핸들러
  onClose?: () => void;

  // 추가 className
  className?: string;

  // 자식 요소 (커스텀 헤더)
  children?: React.ReactNode;
}
```

---

### 4. ContentProps

모달 콘텐츠 영역 컴포넌트의 Props입니다.

```tsx
interface ContentProps {
  // 추가 className
  className?: string;

  // 자식 요소
  children: React.ReactNode;
}
```

---

### 5. FooterProps

모달 푸터 컴포넌트의 Props입니다.

```tsx
interface FooterProps {
  // 추가 className
  className?: string;

  // 자식 요소 (CTA 버튼)
  children: React.ReactNode;
}
```

---

## 🛠️ 유틸리티 타입

### 1. ModalComponent<T>

모달 컴포넌트 타입의 별칭입니다.

```tsx
type ModalComponent<T = void> = React.ComponentType<ModalProps<T>>;
```

**사용처**: `openModal` 함수의 첫 번째 인자

**예시**:
```tsx
const MyModal: ModalComponent<string> = ({ onSubmit, onAbort }) => {
  // ...
};
```

---

### 2. OpenModalFunction

`openModal` 함수의 타입 별칭입니다.

```tsx
type OpenModalFunction = <T = void>(
  component: ModalComponent<T>,
  options?: ModalOptions
) => Promise<T>;
```

**사용처**: Hook 반환 타입, Context 타입

---

### 3. CloseModalFunction

`closeModal` 함수의 타입 별칭입니다.

```tsx
type CloseModalFunction = (id: string) => void;
```

---

### 4. ModalResult<T>

모달의 결과 타입입니다. Promise의 반환값을 명시적으로 표현할 때 사용합니다.

```tsx
type ModalResult<T> = T | 'closed' | 'aborted';
```

**예시**:
```tsx
const result: ModalResult<'confirm' | 'cancel'> = await openModal(ConfirmModal);

if (result === 'confirm') {
  // 확인
} else if (result === 'cancel') {
  // 취소
} else {
  // 닫기 또는 중단
}
```

---

## 💻 구현 예시

### 전체 타입 정의 파일

```tsx
// src/components/modal/types.ts

import type { ReactNode, ComponentType } from 'react';

// ========================================
// 핵심 타입
// ========================================

export interface Modal<T = any> {
  id: string;
  component: ComponentType<ModalProps<T>>;
  options?: ModalOptions;
  resolve: (value: T) => void;
  reject: (reason?: any) => void;
}

export interface ModalProps<T = void> {
  onSubmit: (value: T) => void;
  onAbort: (reason?: any) => void;
}

export interface ModalOptions {
  id?: string;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'full';
  position?: 'center' | 'bottom';
  disableBackdropClick?: boolean;
  disableEscapeKey?: boolean;
  showCloseButton?: boolean;
  tone?: 'default' | 'danger' | 'success' | 'warning';
  disableAnimation?: boolean;
  zIndex?: number;
  className?: string;
  [key: string]: any;
}

export interface ModalContextValue {
  modals: Modal[];
  openModal: <T = void>(
    component: ComponentType<ModalProps<T>>,
    options?: ModalOptions
  ) => Promise<T>;
  closeModal: (id: string) => void;
}

// ========================================
// 컴포넌트 Props 타입
// ========================================

export interface OverlayProps {
  id: string;
  onClose: () => void;
  disableBackdropClick?: boolean;
  disableEscapeKey?: boolean;
  zIndex?: number;
  children: ReactNode;
}

export interface ModalContainerProps {
  size?: 'sm' | 'md' | 'lg' | 'full';
  position?: 'center' | 'bottom';
  tone?: 'default' | 'danger' | 'success' | 'warning';
  className?: string;
  children: ReactNode;
}

export interface HeaderProps {
  title?: string;
  showCloseButton?: boolean;
  onClose?: () => void;
  className?: string;
  children?: ReactNode;
}

export interface ContentProps {
  className?: string;
  children: ReactNode;
}

export interface FooterProps {
  className?: string;
  children: ReactNode;
}

// ========================================
// 유틸리티 타입
// ========================================

export type ModalComponent<T = void> = ComponentType<ModalProps<T>>;

export type OpenModalFunction = <T = void>(
  component: ModalComponent<T>,
  options?: ModalOptions
) => Promise<T>;

export type CloseModalFunction = (id: string) => void;

export type ModalResult<T> = T | 'closed' | 'aborted';
```

---

### 사용 예시

#### 1. 커스텀 모달 컴포넌트 작성

```tsx
import type { ModalProps } from '@/components/modal/types';

interface ConfirmModalProps extends ModalProps<'confirm' | 'cancel'> {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
}

export function ConfirmModal({
  title,
  message,
  confirmText = '확인',
  cancelText = '취소',
  onSubmit,
  onAbort,
}: ConfirmModalProps) {
  return (
    <div>
      <h2>{title}</h2>
      <p>{message}</p>
      <button onClick={() => onSubmit('confirm')}>{confirmText}</button>
      <button onClick={() => onAbort('cancel')}>{cancelText}</button>
    </div>
  );
}
```

#### 2. 모달 사용

```tsx
import { useModal } from '@/hooks/useModal';
import { ConfirmModal } from '@/components/modal/ConfirmModal';
import type { ModalResult } from '@/components/modal/types';

export default function MyPage() {
  const { openModal } = useModal();

  const handleDelete = async () => {
    const result: ModalResult<'confirm' | 'cancel'> = await openModal(
      ConfirmModal,
      {
        title: '삭제 확인',
        message: '정말 삭제하시겠습니까?',
        tone: 'danger',
      }
    );

    if (result === 'confirm') {
      console.log('삭제 완료');
    }
  };

  return <button onClick={handleDelete}>삭제</button>;
}
```

---

## ✅ 구현 체크리스트

- [ ] `types.ts` 파일 생성
- [ ] 핵심 타입 정의 (Modal, ModalProps, ModalOptions, ModalContextValue)
- [ ] 컴포넌트 Props 타입 정의 (Overlay, ModalContainer, Header, Content, Footer)
- [ ] 유틸리티 타입 정의 (ModalComponent, OpenModalFunction, CloseModalFunction, ModalResult)
- [ ] 타입 export
- [ ] 타입 문서화 (JSDoc 주석)

---

## 📚 관련 문서

- [아키텍처 전체 개요](./index.md)
- [ModalContext 스펙](./context.md)
- [useModal Hook 스펙](./hook.md)
- [레이아웃 컴포넌트](./layout.md)

---

**다음 단계**: [레이아웃 컴포넌트](./layout.md) 문서를 읽고 레이아웃 컴포넌트를 구현하세요.
