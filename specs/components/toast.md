# Toast Notification System 구현 계획

전역 관리 토스트 알림 시스템 - 모달보다 간단한 구조

> **작성일**: 2025-01-02
> **참고**: 기존 Modal 시스템 (`src/components/modal/`) 패턴 일부 차용
> **목적**: 사용자에게 간단한 피드백을 제공하는 비침투적 알림

---

## 1. 개요

### 1.1 설계 원칙

- **전역 관리**: Context API를 사용한 중앙 집중식 상태 관리
- **Portal 렌더링**: React Portal로 DOM 트리 최상위에 렌더링
- **접근성 우선**: WCAG 2.1 AA 준수 (ARIA 속성, 키보드 네비게이션)
- **단순한 구조**: 모달과 달리 제네릭 타입, Promise 불필요 (문자열 메시지만 표시)

### 1.2 기존 Modal 시스템과의 비교

| 항목 | Modal | Toast |
|------|-------|-------|
| **렌더링** | Portal (`#modal-root`) | Portal (`#toast-root`) |
| **상태 관리** | ModalProvider + Context | ToastProvider + Context |
| **Hook** | `useModal()` | `useToast()` |
| **반환 타입** | `Promise<T>` (결과 대기) | `string` (ID만 반환) |
| **제네릭 타입** | 필요 (사용자 입력) | 불필요 (문자열만) |
| **사용자 액션** | 필수 (확인/취소) | 선택적 (자동 닫힘) |
| **포커스** | 모달로 이동 | 포커스 이동 없음 |
| **다중 표시** | 스택 (새 모달이 위) | 큐 (새 토스트가 아래) |
| **복잡도** | 높음 (resolve/reject) | 낮음 (단순 추가/제거) |

---

## 2. 주요 기능

### 2.1 필수 기능

- ✅ **4가지 타입**: `success`, `error`, `warning`, `info`
- ✅ **자동 닫힘**: 기본 6초 (사용자 정의 가능)
- ✅ **수동 닫기**: X 버튼 클릭
- ✅ **다중 토스트**: 최대 3개까지 스택
- ✅ **위치 설정**: `top-right`, `top-left`, `bottom-right`, `bottom-left`, `top-center`, `bottom-center`
- ✅ **애니메이션**: 슬라이드 인/아웃
- ✅ **접근성**: ARIA 속성, 스크린 리더 지원

### 2.2 선택적 기능 (2차 확장)

- ⏸️ Pause on Hover (마우스 오버 시 타이머 일시정지)
- ⏸️ Progress Bar (닫히기까지 남은 시간 표시)
- ⏸️ Action Button (토스트 내 액션 버튼)
- ⏸️ 토스트 히스토리 (지난 알림 확인)

---

## 3. 아키텍처

### 3.1 폴더 구조

```
src/components/toast/
├── ToastProvider.tsx      # Context Provider (상태 관리)
├── useToast.tsx           # Hook (toast 열기/닫기)
├── ToastContainer.tsx     # Portal 렌더링 컨테이너
├── Toast.tsx              # 개별 토스트 컴포넌트
├── types.ts               # TypeScript 타입 정의
└── index.ts               # Public API 내보내기
```

### 3.2 데이터 흐름

```
Component
    ↓
useToast().showToast()
    ↓
ToastProvider (Context)
    ↓
toasts[] 배열에 추가
    ↓
ToastContainer (Portal)
    ↓
Toast 컴포넌트 렌더링
    ↓
자동 타이머 시작 (6초)
    ↓
toasts[] 배열에서 제거
```

---

## 4. API 설계

### 4.1 `useToast()` Hook

```typescript
interface UseToastReturn {
  showToast: (message: string, options?: ToastOptions) => string; // toast ID 반환
  dismissToast: (id: string) => void;
  dismissAll: () => void;
}

const { showToast, dismissToast, dismissAll } = useToast();
```

### 4.2 `showToast()` 사용 예시

```typescript
// 기본 사용
showToast('저장되었습니다', { type: 'success' });

// 커스텀 옵션
showToast('오류가 발생했습니다', {
  type: 'error',
  duration: 8000,
  position: 'top-center',
});

// ID를 받아서 나중에 수동으로 닫기
const toastId = showToast('처리 중...', { type: 'info', duration: Infinity });
// ... 작업 완료 후
dismissToast(toastId);
```

---

## 5. 타입 정의

### 5.1 Toast 타입

```typescript
// types.ts
export type ToastType = 'success' | 'error' | 'warning' | 'info';

export type ToastPosition =
  | 'top-right'
  | 'top-left'
  | 'top-center'
  | 'bottom-right'
  | 'bottom-left'
  | 'bottom-center';

export interface ToastOptions {
  /** 토스트 타입 (기본: 'info') */
  type?: ToastType;

  /** 자동 닫힘 시간 (ms, 기본: 6000) */
  duration?: number;

  /** 토스트 위치 (기본: 'bottom-right') */
  position?: ToastPosition;

  /** X 버튼 표시 여부 (기본: true) */
  dismissible?: boolean;
}

export interface Toast {
  /** 고유 ID */
  id: string;

  /** 토스트 메시지 */
  message: string;

  /** 토스트 타입 */
  type: ToastType;

  /** 자동 닫힘 시간 (ms) */
  duration: number;

  /** 토스트 위치 */
  position: ToastPosition;

  /** X 버튼 표시 여부 */
  dismissible: boolean;

  /** 생성 시간 */
  createdAt: number;
}

export interface ToastContextValue {
  /** 현재 표시 중인 토스트 목록 */
  toasts: Toast[];

  /** 토스트 추가 */
  addToast: (message: string, options?: ToastOptions) => string;

  /** 토스트 제거 */
  removeToast: (id: string) => void;

  /** 모든 토스트 제거 */
  clearAll: () => void;
}
```

---

## 6. 컴포넌트 상세

### 6.1 ToastProvider

**역할**: Context로 토스트 상태 관리

**Modal과의 차이점**:
- ❌ Promise 반환 없음 (단순히 ID만 반환)
- ❌ resolve/reject 없음 (사용자 입력 대기 불필요)
- ❌ 제네릭 타입 없음 (문자열 메시지만 처리)
- ✅ 단순한 배열 추가/제거만 수행

```typescript
'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import type { Toast, ToastContextValue, ToastOptions } from './types';

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Modal과 달리 Promise를 반환하지 않고 ID만 반환
  const addToast = useCallback((message: string, options?: ToastOptions): string => {
    const id = crypto.randomUUID();
    const newToast: Toast = {
      id,
      message,
      type: options?.type || 'info',
      duration: options?.duration ?? 6000,
      position: options?.position || 'bottom-right',
      dismissible: options?.dismissible ?? true,
      createdAt: Date.now(),
    };

    setToasts((prev) => {
      // 최대 3개까지만 표시
      const newToasts = [...prev, newToast];
      return newToasts.slice(-3);
    });

    return id; // 단순히 ID만 반환
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setToasts([]);
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, clearAll }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToastContext() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToastContext must be used within ToastProvider');
  }
  return context;
}
```

### 6.2 useToast Hook

**역할**: 토스트 열기/닫기 API 제공

```typescript
'use client';

import { useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useToastContext } from './ToastProvider';
import { ToastContainer } from './ToastContainer';
import type { ToastOptions } from './types';

interface UseToastReturn {
  showToast: (message: string, options?: ToastOptions) => string;
  dismissToast: (id: string) => void;
  dismissAll: () => void;
  renderToasts: () => React.ReactPortal | null;
}

export function useToast(): UseToastReturn {
  const context = useToastContext();
  const toastIdsRef = useRef<Set<string>>(new Set());

  const showToast = useCallback(
    (message: string, options?: ToastOptions): string => {
      const id = context.addToast(message, options);
      toastIdsRef.current.add(id);
      return id;
    },
    [context]
  );

  const dismissToast = useCallback(
    (id: string) => {
      context.removeToast(id);
      toastIdsRef.current.delete(id);
    },
    [context]
  );

  const dismissAll = useCallback(() => {
    context.clearAll();
    toastIdsRef.current.clear();
  }, [context]);

  // Cleanup: 컴포넌트 언마운트 시 해당 컴포넌트에서 생성한 토스트 제거
  useEffect(() => {
    return () => {
      toastIdsRef.current.forEach((id) => {
        context.removeToast(id);
      });
      toastIdsRef.current.clear();
    };
  }, [context]);

  const renderToasts = useCallback(() => {
    if (typeof window === 'undefined') return null;

    const toastRoot = document.getElementById('toast-root');
    if (!toastRoot) {
      console.warn('toast-root element not found');
      return null;
    }

    return createPortal(<ToastContainer toasts={context.toasts} />, toastRoot);
  }, [context.toasts]);

  return {
    showToast,
    dismissToast,
    dismissAll,
    renderToasts,
  };
}
```

### 6.3 ToastContainer

**역할**: 위치별로 토스트를 그룹화하여 렌더링

```typescript
'use client';

import React from 'react';
import { Toast } from './Toast';
import type { Toast as ToastType, ToastPosition } from './types';

interface ToastContainerProps {
  toasts: ToastType[];
}

export function ToastContainer({ toasts }: ToastContainerProps) {
  // 위치별로 토스트 그룹화
  const toastsByPosition = toasts.reduce((acc, toast) => {
    if (!acc[toast.position]) {
      acc[toast.position] = [];
    }
    acc[toast.position].push(toast);
    return acc;
  }, {} as Record<ToastPosition, ToastType[]>);

  return (
    <>
      {Object.entries(toastsByPosition).map(([position, positionToasts]) => (
        <div
          key={position}
          className={getPositionClass(position as ToastPosition)}
          aria-live="polite"
          aria-atomic="false"
        >
          {positionToasts.map((toast) => (
            <Toast key={toast.id} toast={toast} />
          ))}
        </div>
      ))}
    </>
  );
}

function getPositionClass(position: ToastPosition): string {
  const baseClass = 'fixed z-[9999] flex flex-col gap-2 p-4 pointer-events-none';

  const positionClasses: Record<ToastPosition, string> = {
    'top-right': 'top-0 right-0',
    'top-left': 'top-0 left-0',
    'top-center': 'top-0 left-1/2 -translate-x-1/2',
    'bottom-right': 'bottom-0 right-0',
    'bottom-left': 'bottom-0 left-0',
    'bottom-center': 'bottom-0 left-1/2 -translate-x-1/2',
  };

  return `${baseClass} ${positionClasses[position]}`;
}
```

### 6.4 Toast 컴포넌트

**역할**: 개별 토스트 UI 렌더링 및 자동 닫힘

```typescript
'use client';

import React, { useEffect } from 'react';
import { X, CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';
import { clsx } from 'clsx';
import { useToastContext } from './ToastProvider';
import type { Toast as ToastType } from './types';

interface ToastProps {
  toast: ToastType;
}

export function Toast({ toast }: ToastProps) {
  const { removeToast } = useToastContext();

  // 자동 닫힘 타이머
  useEffect(() => {
    if (toast.duration === Infinity) return;

    const timer = setTimeout(() => {
      removeToast(toast.id);
    }, toast.duration);

    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, removeToast]);

  const handleDismiss = () => {
    removeToast(toast.id);
  };

  const { icon, bgClass, iconClass } = getToastStyles(toast.type);

  return (
    <div
      role={toast.type === 'error' ? 'alert' : 'status'}
      aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
      aria-atomic="true"
      className={clsx(
        'pointer-events-auto',
        'flex items-start gap-3 p-4 rounded-lg shadow-lg',
        'min-w-[320px] max-w-[480px]',
        'animate-slide-in',
        bgClass
      )}
    >
      {/* Icon */}
      <div className={clsx('flex-shrink-0', iconClass)}>
        {icon}
      </div>

      {/* Message */}
      <div className="flex-1 text-sm font-medium text-gray-900">
        {toast.message}
      </div>

      {/* Dismiss Button */}
      {toast.dismissible && (
        <button
          onClick={handleDismiss}
          aria-label="알림 닫기"
          className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X size={18} />
        </button>
      )}
    </div>
  );
}

function getToastStyles(type: ToastType) {
  const styles = {
    success: {
      icon: <CheckCircle size={20} />,
      bgClass: 'bg-green-50 border border-green-200',
      iconClass: 'text-green-600',
    },
    error: {
      icon: <XCircle size={20} />,
      bgClass: 'bg-red-50 border border-red-200',
      iconClass: 'text-red-600',
    },
    warning: {
      icon: <AlertTriangle size={20} />,
      bgClass: 'bg-yellow-50 border border-yellow-200',
      iconClass: 'text-yellow-600',
    },
    info: {
      icon: <Info size={20} />,
      bgClass: 'bg-blue-50 border border-blue-200',
      iconClass: 'text-blue-600',
    },
  };

  return styles[type];
}
```

---

## 7. 애니메이션

### 7.1 Tailwind 설정

**`tailwind.config.ts`에 추가**:

```typescript
module.exports = {
  theme: {
    extend: {
      keyframes: {
        'slide-in': {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        'slide-out': {
          '0%': { transform: 'translateX(0)', opacity: '1' },
          '100%': { transform: 'translateX(100%)', opacity: '0' },
        },
      },
      animation: {
        'slide-in': 'slide-in 0.3s ease-out',
        'slide-out': 'slide-out 0.3s ease-in',
      },
    },
  },
};
```

---

## 8. 접근성 (Accessibility)

### 8.1 ARIA 속성

- **`role="status"`**: 성공, 경고, 정보 토스트 (polite)
- **`role="alert"`**: 에러 토스트 (assertive)
- **`aria-live="polite"`**: 일반 알림 (현재 작업 방해 안 함)
- **`aria-live="assertive"`**: 긴급 알림 (즉시 읽음)
- **`aria-atomic="true"`**: 전체 메시지를 한 번에 읽음

### 8.2 키보드 네비게이션

- **Tab**: 토스트 내 액션 버튼으로 이동 (있는 경우)
- **Escape**: 현재 포커스된 토스트 닫기 (선택적, 2차 확장)

### 8.3 색상 대비

- **WCAG 2.1 AA 준수**: 텍스트와 배경 대비 최소 4.5:1
- **아이콘 + 색상**: 색맹 사용자를 위해 아이콘 병행 사용

---

## 9. 사용 예시

### 9.1 기본 사용법

```typescript
'use client';

import { useToast } from '@/src/components/toast';

export default function MyPage() {
  const { showToast, renderToasts } = useToast();

  const handleSave = async () => {
    try {
      await saveData();
      showToast('저장되었습니다', { type: 'success' });
    } catch (error) {
      showToast('저장에 실패했습니다', { type: 'error' });
    }
  };

  return (
    <>
      <button onClick={handleSave}>저장</button>
      {renderToasts()}
    </>
  );
}
```

### 9.2 Root Layout에 Provider 추가

```typescript
// app/layout.tsx
import { ToastProvider } from '@/src/components/toast';

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>
        <ToastProvider>
          {children}
          <div id="toast-root" /> {/* Portal 타겟 */}
        </ToastProvider>
      </body>
    </html>
  );
}
```

### 9.3 다양한 타입

```typescript
// 성공
showToast('프로필이 업데이트되었습니다', { type: 'success' });

// 에러
showToast('네트워크 오류가 발생했습니다', { type: 'error', duration: 8000 });

// 경고
showToast('이 작업은 되돌릴 수 없습니다', { type: 'warning' });

// 정보
showToast('새로운 업데이트가 있습니다', { type: 'info', position: 'top-center' });
```

---

## 10. 구현 순서

### Phase 1: 기본 인프라 (1시간)
1. ✅ 타입 정의 (`types.ts`)
2. ✅ Context Provider (`ToastProvider.tsx`)
3. ✅ Hook (`useToast.tsx`)
4. ✅ Portal 설정 (`app/layout.tsx`에 `#toast-root` 추가)

### Phase 2: UI 컴포넌트 (1시간)
5. ✅ ToastContainer (`ToastContainer.tsx`)
6. ✅ Toast 컴포넌트 (`Toast.tsx`)
7. ✅ 애니메이션 (Tailwind 설정)

### Phase 3: 테스트 & 문서화 (30분)
8. ✅ 테스트 페이지 작성 (`app/test/toast/page.tsx`)
9. ✅ Storybook 스토리 작성 (선택적)
10. ✅ README 업데이트

---

## 11. 참고 자료

### 11.1 베스트 프랙티스

- [React-Toastify 2025 Guide - LogRocket](https://blog.logrocket.com/react-toastify-guide/)
- [Accessibility in Toast Notifications - Syncfusion](https://ej2.syncfusion.com/react/documentation/toast/accessibility)
- [Toast UI Design Best Practices - Mobbin](https://mobbin.com/glossary/toast)
- [UX of Notification Toasts - Ben Rajalu](https://benrajalu.net/articles/ux-of-notification-toasts)

### 11.2 Custom Implementation Tutorials

- [Building Toast with React Context - DEV](https://dev.to/kevjose/building-a-reusable-notification-system-with-react-hooks-and-context-api-2phj)
- [Toast System with React Portals - Medium](https://medium.com/@ddhankhar18061995/day-10-build-a-toast-notification-system-with-react-context-portals-992f1dfe8ce2)
- [Custom Toast Component - HackerNoon](https://hackernoon.com/using-reactjs-and-context-api-to-build-a-custom-toast-notification-component)
- [How to Create Custom Toast - LogRocket](https://blog.logrocket.com/how-to-create-custom-toast-component-react/)

### 11.3 접근성 & UX

- [Designing Toast for Accessibility - Medium](https://sheribyrnehaber.medium.com/designing-toast-messages-for-accessibility-fb610ac364be)
- [Toast Notification UX Guide - LogRocket](https://blog.logrocket.com/ux-design/toast-notifications/)

### 11.4 기존 프로젝트 참고

- **Modal 시스템**: `/src/components/modal/`
  - `ModalProvider.tsx`: Context 패턴
  - `useModal.tsx`: Hook 패턴
  - `types.ts`: TypeScript 타입 정의

---

## 12. 추가 고려사항

### 12.1 성능 최적화

- **Debounce**: 동일한 메시지가 연속으로 표시되는 것 방지
- **Memoization**: `Toast` 컴포넌트에 `React.memo` 적용
- **Virtual List**: 토스트가 많을 경우 가상화 (현재는 최대 3개 제한)

### 12.2 모바일 대응

- **터치 제스처**: 스와이프로 닫기 (2차 확장)
- **Bottom Sheet**: 모바일에서는 하단에 고정 표시 (선택적)

### 12.3 테마 지원

- **다크 모드**: CSS 변수로 색상 관리
- **커스텀 스타일**: `className` prop으로 스타일 오버라이드 가능

---

## 13. FAQ

### Q1. 왜 라이브러리를 안 쓰나요?

**A**: Lucent Management 프로젝트는 **최소 의존성 원칙**을 따릅니다. 토스트는 비교적 단순한 기능이므로, 외부 라이브러리 없이 직접 구현하여 번들 크기를 줄이고 완전한 제어권을 확보합니다.

### Q2. Modal과 Toast를 통합할 수 없나요?

**A**: 모달과 토스트는 **사용 목적이 다릅니다**:
- **Modal**: 사용자의 명시적 액션 필요 (확인/취소)
- **Toast**: 수동적 알림 (자동 닫힘, 포커스 이동 없음)

따라서 별도 시스템으로 관리하는 것이 맞습니다.

### Q3. 왜 Modal처럼 제네릭 타입과 Promise를 안 쓰나요?

**A**: Toast는 **단순히 메시지만 표시**하는 컴포넌트입니다:
- **Modal**: 사용자 입력을 받고 결과를 반환 (`Promise<T>`)
- **Toast**: 일방적으로 알림만 표시 (반환값 불필요)

따라서 제네릭 타입, Promise, resolve/reject 등의 복잡한 구조가 필요 없습니다. 단순히 `showToast()`를 호출하면 ID만 반환하고, 필요시 그 ID로 수동 닫기만 가능하면 됩니다.

**코드 비교**:
```typescript
// Modal (복잡) - 사용자 입력 대기
const result = await openModal<boolean>(ConfirmModal);
if (result) { /* ... */ }

// Toast (간단) - 단순 알림
showToast('저장되었습니다', { type: 'success' });
```

### Q4. 토스트가 너무 많으면 어떻게 되나요?

**A**: **최대 3개 제한**을 두어, 오래된 토스트를 자동으로 제거합니다. UX 연구에 따르면 3개 이상의 토스트는 사용자에게 혼란을 줍니다.

---

**작성자**: Claude Code
**다음 단계**: 이 스펙을 바탕으로 실제 구현 시작
