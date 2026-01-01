# Modal 레이아웃 컴포넌트 스펙

**문서 버전**: 1.0
**작성일**: 2026-01-01

---

## 📋 목차

1. [레이아웃 구조 개요](#레이아웃-구조-개요)
2. [Overlay 컴포넌트](#overlay-컴포넌트)
3. [ModalContainer 컴포넌트](#modalcontainer-컴포넌트)
4. [Header 컴포넌트](#header-컴포넌트)
5. [Content 컴포넌트](#content-컴포넌트)
6. [Footer 컴포넌트](#footer-컴포넌트)
7. [조합 패턴](#조합-패턴)

---

## 🎯 레이아웃 구조 개요

Modal은 **모듈화된 레이아웃 컴포넌트**로 구성됩니다.

### 설계 원칙

1. **독립성**: 각 레이아웃 컴포넌트는 모달 상태에 의존하지 않음
2. **재사용성**: Overlay는 BottomSheet 등 다른 컴포넌트에서도 사용 가능
3. **유연성**: 사용자가 필요한 부분만 조합하여 사용 가능
4. **접근성**: 키보드 제어, 포커스 트랩, ARIA 속성 지원

### 컴포넌트 계층 구조

```
Overlay (배경 + 닫기 처리)
  └─ ModalContainer (모달 박스)
      ├─ Header (제목 + 닫기 버튼)
      ├─ Content (사용자 정의 콘텐츠)
      └─ Footer (CTA 버튼)
```

---

## 🌐 Overlay 컴포넌트

### 역할

- 배경 어둡게 처리 (backdrop)
- 배경 클릭 시 모달 닫기
- ESC 키 처리
- 스크롤 잠금 (body scroll lock)
- 포커스 트랩 (Focus Trap)

### Props

```tsx
interface OverlayProps {
  id: string;
  onClose: () => void;
  disableBackdropClick?: boolean;
  disableEscapeKey?: boolean;
  zIndex?: number;
  children: React.ReactNode;
}
```

### 구현 요구사항

#### 1. 배경 클릭 처리

```tsx
const handleBackdropClick = (e: React.MouseEvent) => {
  // 자식 요소 클릭은 무시
  if (e.target === e.currentTarget && !disableBackdropClick) {
    onClose();
  }
};
```

#### 2. ESC 키 처리

```tsx
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && !disableEscapeKey) {
      onClose();
    }
  };

  document.addEventListener('keydown', handleKeyDown);
  return () => document.removeEventListener('keydown', handleKeyDown);
}, [onClose, disableEscapeKey]);
```

#### 3. 스크롤 잠금

```tsx
useEffect(() => {
  // body 스크롤 잠금
  document.body.style.overflow = 'hidden';

  return () => {
    document.body.style.overflow = '';
  };
}, []);
```

#### 4. 포커스 트랩

```tsx
useEffect(() => {
  const modalElement = document.getElementById(id);
  if (!modalElement) return;

  // 포커스 가능한 요소들
  const focusableElements = modalElement.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );

  const firstElement = focusableElements[0] as HTMLElement;
  const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

  // 첫 번째 요소로 포커스 이동
  firstElement?.focus();

  const handleTab = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;

    if (e.shiftKey) {
      // Shift + Tab
      if (document.activeElement === firstElement) {
        lastElement?.focus();
        e.preventDefault();
      }
    } else {
      // Tab
      if (document.activeElement === lastElement) {
        firstElement?.focus();
        e.preventDefault();
      }
    }
  };

  document.addEventListener('keydown', handleTab);
  return () => document.removeEventListener('keydown', handleTab);
}, [id]);
```

### 구현 예시

```tsx
'use client';

import { useEffect } from 'react';
import type { OverlayProps } from './types';

export function Overlay({
  id,
  onClose,
  disableBackdropClick = false,
  disableEscapeKey = false,
  zIndex = 1000,
  children,
}: OverlayProps) {
  // 배경 클릭 처리
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !disableBackdropClick) {
      onClose();
    }
  };

  // ESC 키 처리
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !disableEscapeKey) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, disableEscapeKey]);

  // 스크롤 잠금
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  return (
    <div
      id={id}
      className="fixed inset-0 flex items-center justify-center bg-black/50"
      style={{ zIndex }}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
    >
      {children}
    </div>
  );
}
```

---

## 📦 ModalContainer 컴포넌트

### 역할

- 모달 박스 렌더링
- 크기, 위치, 톤 스타일 적용 (CVA)
- 애니메이션 적용

### Props

```tsx
interface ModalContainerProps {
  size?: 'sm' | 'md' | 'lg' | 'full';
  position?: 'center' | 'bottom';
  tone?: 'default' | 'danger' | 'success' | 'warning';
  className?: string;
  children: React.ReactNode;
}
```

### CVA 스타일 정의

```tsx
import { cva } from 'class-variance-authority';

const modalContainerVariants = cva(
  'bg-white rounded-lg shadow-xl overflow-hidden',
  {
    variants: {
      size: {
        sm: 'w-full max-w-sm',
        md: 'w-full max-w-md',
        lg: 'w-full max-w-lg',
        full: 'w-full h-full',
      },
      position: {
        center: '',
        bottom: 'absolute bottom-0 left-0 right-0 rounded-b-none',
      },
      tone: {
        default: '',
        danger: 'border-2 border-red-500',
        success: 'border-2 border-green-500',
        warning: 'border-2 border-yellow-500',
      },
    },
    defaultVariants: {
      size: 'md',
      position: 'center',
      tone: 'default',
    },
  }
);
```

### 구현 예시

```tsx
'use client';

import { cva } from 'class-variance-authority';
import { clsx } from 'clsx';
import type { ModalContainerProps } from './types';

const modalContainerVariants = cva(
  'bg-white rounded-lg shadow-xl overflow-hidden animate-modal-in',
  {
    variants: {
      size: {
        sm: 'w-full max-w-sm',
        md: 'w-full max-w-md',
        lg: 'w-full max-w-lg',
        full: 'w-full h-full',
      },
      position: {
        center: '',
        bottom: 'absolute bottom-0 left-0 right-0 rounded-b-none',
      },
      tone: {
        default: '',
        danger: 'border-2 border-red-500',
        success: 'border-2 border-green-500',
        warning: 'border-2 border-yellow-500',
      },
    },
    defaultVariants: {
      size: 'md',
      position: 'center',
      tone: 'default',
    },
  }
);

export function ModalContainer({
  size,
  position,
  tone,
  className,
  children,
}: ModalContainerProps) {
  return (
    <div
      className={clsx(
        modalContainerVariants({ size, position, tone }),
        className
      )}
      onClick={(e) => e.stopPropagation()} // 배경 클릭 방지
    >
      {children}
    </div>
  );
}
```

---

## 📌 Header 컴포넌트

### 역할

- 모달 제목 표시
- 닫기(X) 버튼 표시
- 커스텀 헤더 지원

### Props

```tsx
interface HeaderProps {
  title?: string;
  showCloseButton?: boolean;
  onClose?: () => void;
  className?: string;
  children?: React.ReactNode;
}
```

### 구현 예시

```tsx
'use client';

import { clsx } from 'clsx';
import { XMarkIcon } from '@heroicons/react/24/outline';
import type { HeaderProps } from './types';

export function Header({
  title,
  showCloseButton = true,
  onClose,
  className,
  children,
}: HeaderProps) {
  // 커스텀 헤더가 있으면 그대로 렌더링
  if (children) {
    return <div className={clsx('px-6 py-4', className)}>{children}</div>;
  }

  return (
    <div
      className={clsx(
        'flex items-center justify-between px-6 py-4 border-b',
        className
      )}
    >
      <h2 className="text-lg font-semibold">{title}</h2>
      {showCloseButton && onClose && (
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 rounded"
          aria-label="모달 닫기"
        >
          <XMarkIcon className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}
```

---

## 📄 Content 컴포넌트

### 역할

- 사용자 정의 콘텐츠 영역
- 스크롤 가능 영역

### Props

```tsx
interface ContentProps {
  className?: string;
  children: React.ReactNode;
}
```

### 구현 예시

```tsx
'use client';

import { clsx } from 'clsx';
import type { ContentProps } from './types';

export function Content({ className, children }: ContentProps) {
  return (
    <div className={clsx('px-6 py-4 overflow-y-auto', className)}>
      {children}
    </div>
  );
}
```

---

## 🔘 Footer 컴포넌트

### 역할

- CTA 버튼 영역
- Sticky 처리 가능

### Props

```tsx
interface FooterProps {
  className?: string;
  children: React.ReactNode;
}
```

### 구현 예시

```tsx
'use client';

import { clsx } from 'clsx';
import type { FooterProps } from './types';

export function Footer({ className, children }: FooterProps) {
  return (
    <div
      className={clsx(
        'flex items-center justify-end gap-2 px-6 py-4 border-t bg-gray-50',
        className
      )}
    >
      {children}
    </div>
  );
}
```

---

## 🧩 조합 패턴

### 패턴 1: 기본 모달 (제목 + 콘텐츠 + 버튼)

```tsx
import { Overlay, ModalContainer, Header, Content, Footer } from '@/components/modal';
import { Button } from '@/components/ui/button';

export function BasicModal({ onSubmit, onAbort }: ModalProps<string>) {
  return (
    <Overlay id="basic-modal" onClose={onAbort}>
      <ModalContainer size="md">
        <Header title="제목" onClose={onAbort} />
        <Content>
          <p>모달 콘텐츠</p>
        </Content>
        <Footer>
          <Button variant="secondary" onClick={onAbort}>
            취소
          </Button>
          <Button onClick={() => onSubmit('confirmed')}>확인</Button>
        </Footer>
      </ModalContainer>
    </Overlay>
  );
}
```

### 패턴 2: 헤더 없는 모달 (콘텐츠 + 버튼)

```tsx
export function NoHeaderModal({ onSubmit, onAbort }: ModalProps<void>) {
  return (
    <Overlay id="no-header-modal" onClose={onAbort}>
      <ModalContainer size="sm">
        <Content>
          <h3 className="text-lg font-bold mb-4">알림</h3>
          <p>저장되지 않은 변경사항이 있습니다.</p>
        </Content>
        <Footer>
          <Button onClick={() => onSubmit()}>확인</Button>
        </Footer>
      </ModalContainer>
    </Overlay>
  );
}
```

### 패턴 3: 풀스크린 모달 (큰 콘텐츠)

```tsx
export function FullscreenModal({ onSubmit, onAbort }: ModalProps<void>) {
  return (
    <Overlay id="fullscreen-modal" onClose={onAbort}>
      <ModalContainer size="full">
        <Header title="상세 정보" onClose={onAbort} />
        <Content className="h-full">
          {/* 스크롤 가능한 긴 콘텐츠 */}
        </Content>
      </ModalContainer>
    </Overlay>
  );
}
```

### 패턴 4: BottomSheet (모바일)

```tsx
export function BottomSheetModal({ onSubmit, onAbort }: ModalProps<string>) {
  return (
    <Overlay id="bottom-sheet-modal" onClose={onAbort}>
      <ModalContainer size="full" position="bottom">
        <Header title="옵션 선택" onClose={onAbort} />
        <Content>
          <button onClick={() => onSubmit('option1')}>옵션 1</button>
          <button onClick={() => onSubmit('option2')}>옵션 2</button>
        </Content>
      </ModalContainer>
    </Overlay>
  );
}
```

### 패턴 5: Confirm 모달 (경고)

```tsx
export function ConfirmModal({
  title,
  message,
  onSubmit,
  onAbort,
}: ModalProps<'confirm' | 'cancel'> & { title: string; message: string }) {
  return (
    <Overlay id="confirm-modal" onClose={onAbort} disableBackdropClick disableEscapeKey>
      <ModalContainer size="sm" tone="danger">
        <Header title={title} showCloseButton={false} />
        <Content>
          <p>{message}</p>
        </Content>
        <Footer>
          <Button variant="secondary" onClick={() => onAbort('cancel')}>
            취소
          </Button>
          <Button variant="danger" onClick={() => onSubmit('confirm')}>
            삭제
          </Button>
        </Footer>
      </ModalContainer>
    </Overlay>
  );
}
```

---

## 📝 폼 통합 패턴

Modal 내부에서 폼을 사용하는 경우, 다음 패턴을 따릅니다.

### 기본 패턴

```tsx
import { Overlay, ModalContainer, Header, Content, Footer } from '@/components/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { ModalProps } from '@/components/modal/types';

interface FormData {
  username: string;
  email: string;
}

export function FormModal({ onSubmit, onAbort }: ModalProps<FormData>) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      username: formData.get('username') as string,
      email: formData.get('email') as string,
    };
    onSubmit(data);
  };

  return (
    <Overlay id="form-modal" onClose={onAbort}>
      <ModalContainer>
        <form onSubmit={handleSubmit}>
          <Header title="사용자 정보 입력" onClose={onAbort} />
          <Content>
            <div className="space-y-4">
              <Input name="username" label="이름" required />
              <Input name="email" type="email" label="이메일" required />
            </div>
          </Content>
          <Footer>
            <Button type="button" variant="secondary" onClick={onAbort}>
              취소
            </Button>
            <Button type="submit">제출</Button>
          </Footer>
        </form>
      </ModalContainer>
    </Overlay>
  );
}
```

### React Hook Form 사용

```tsx
import { useForm } from 'react-hook-form';

export function FormModalWithRHF({ onSubmit, onAbort }: ModalProps<FormData>) {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>();

  const onFormSubmit = (data: FormData) => {
    onSubmit(data);
  };

  return (
    <Overlay id="form-modal" onClose={onAbort}>
      <ModalContainer>
        <form onSubmit={handleSubmit(onFormSubmit)}>
          <Header title="사용자 정보 입력" onClose={onAbort} />
          <Content>
            <div className="space-y-4">
              <Input
                {...register('username', { required: '이름을 입력하세요' })}
                label="이름"
                error={errors.username?.message}
              />
              <Input
                {...register('email', {
                  required: '이메일을 입력하세요',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: '유효한 이메일을 입력하세요',
                  },
                })}
                label="이메일"
                type="email"
                error={errors.email?.message}
              />
            </div>
          </Content>
          <Footer>
            <Button type="button" variant="secondary" onClick={onAbort}>
              취소
            </Button>
            <Button type="submit">제출</Button>
          </Footer>
        </form>
      </ModalContainer>
    </Overlay>
  );
}
```

### 주의사항

1. **`<form>` 태그 위치**
   - `<form>` 태그는 **ModalContainer 내부**에 위치해야 합니다
   - Header, Content, Footer를 모두 감싸야 합니다

2. **버튼 타입**
   - 제출 버튼: `type="submit"` (폼 제출 트리거)
   - 취소 버튼: `type="button"` (폼 제출하지 않음)
   - 기타 버튼: `type="button"` (기본값)

3. **Enter 키 동작**
   - `type="submit"` 버튼이 있으면 Enter 키로 폼 제출 가능
   - `onSubmit` 핸들러에서 `e.preventDefault()` 필수

4. **폼 유효성 검사**
   - HTML5 기본 검증: `required`, `type="email"` 등 사용
   - 라이브러리 사용: React Hook Form, Formik 등

---

## 🎨 애니메이션

### Tailwind CSS 설정

```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      keyframes: {
        'modal-in': {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'modal-out': {
          '0%': { opacity: '1', transform: 'scale(1)' },
          '100%': { opacity: '0', transform: 'scale(0.95)' },
        },
      },
      animation: {
        'modal-in': 'modal-in 0.2s ease-out',
        'modal-out': 'modal-out 0.2s ease-in',
      },
    },
  },
};
```

---

## ✅ 구현 체크리스트

### Overlay
- [ ] 배경 클릭 처리
- [ ] ESC 키 처리
- [ ] 스크롤 잠금
- [ ] 포커스 트랩
- [ ] z-index 관리

### ModalContainer
- [ ] CVA 스타일 정의
- [ ] size variant (sm, md, lg, full)
- [ ] position variant (center, bottom)
- [ ] tone variant (default, danger, success, warning)
- [ ] 애니메이션 적용

### Header
- [ ] 제목 표시
- [ ] 닫기 버튼
- [ ] 커스텀 헤더 지원

### Content
- [ ] 스크롤 가능 영역
- [ ] className 지원

### Footer
- [ ] CTA 버튼 영역
- [ ] className 지원

---

## 📚 관련 문서

- [아키텍처 전체 개요](./index.md)
- [ModalContext 스펙](./context.md)
- [useModal Hook 스펙](./hook.md)
- [TypeScript 타입 정의](./types.md)
- [Modal UI/UX 정책](/specs/ui/common/modal.md)

---

**구현 준비 완료!** 이제 실제 컴포넌트 구현을 시작하세요.
