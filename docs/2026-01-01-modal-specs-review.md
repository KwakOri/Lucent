# Modal 컴포넌트 스펙 검토 보고서

**작성일**: 2026-01-01
**검토자**: Claude Code
**참고 자료**: [Flexible and Reusable Modals](https://www.highjoon-dev.com/blogs/flexible-and-reusable-modals)

---

## 📋 목차

1. [검토 개요](#검토-개요)
2. [새로운 글과의 비교 분석](#새로운-글과의-비교-분석)
3. [반영 가능한 개선점](#반영-가능한-개선점)
4. [기술 스택 호환성 점검](#기술-스택-호환성-점검)
5. [발견된 문제점 및 해결 방안](#발견된-문제점-및-해결-방안)
6. [권장 조치 사항](#권장-조치-사항)

---

## 🎯 검토 개요

Modal 컴포넌트 스펙 문서 5개를 대상으로 다음 두 가지를 검토했습니다:

1. **[highjoon-dev.com의 Flexible and Reusable Modals](https://www.highjoon-dev.com/blogs/flexible-and-reusable-modals)** 글과 비교하여 우리 프로젝트에 반영할 수 있는 부분 확인
2. **React 19.2.3 및 Next.js 16.1.1** 환경에서 deprecated되거나 작동하지 않는 API 점검

### 검토 대상 문서

- `specs/components/modal/index.md` - 아키텍처 전체 개요
- `specs/components/modal/context.md` - ModalContext 스펙
- `specs/components/modal/hook.md` - useModal Hook 스펙
- `specs/components/modal/types.md` - TypeScript 타입 정의
- `specs/components/modal/layout.md` - 레이아웃 컴포넌트 스펙

---

## 🔍 새로운 글과의 비교 분석

### 공통점 ✅

| 패턴/기능 | 우리 스펙 | 새로운 글 | 상태 |
|-----------|-----------|-----------|------|
| 합성 컴포넌트 패턴 | ✅ | ✅ | 일치 |
| Context API 사용 | ✅ | ✅ | 일치 |
| createPortal 사용 | ✅ | ✅ | 일치 |
| ESC 키 처리 | ✅ | ✅ | 일치 |
| 배경 클릭으로 닫기 | ✅ | ✅ | 일치 |
| 스크롤 잠금 | ✅ | ✅ | 일치 |

### 차이점 및 개선 가능 영역 📊

#### 1. **forwardRef 사용**

**새로운 글**:
- 모든 레이아웃 컴포넌트(Overlay, ModalContainer, Header, Content, Footer)에 `forwardRef` 적용
- 부모 컴포넌트에서 DOM 요소에 직접 접근 가능

**우리 스펙**:
- `forwardRef` 언급 없음

**반영 가능성**: ⭐⭐⭐ (선택사항)
- DOM 직접 조작이 필요한 경우 유용
- 애니메이션, 포커스 제어 등에 활용 가능
- 현재 스펙에서는 필수는 아니지만, 확장성을 위해 추가 권장

#### 2. **훅 실행 최적화**

**새로운 글**:
- `isOpen`이 `false`일 때도 내부 훅(useEffect 등)이 실행되는 문제 해결
- Modal.Content를 별도 컴포넌트로 분리하여 조건부 렌더링 활용

**우리 스펙**:
- `createPortal` + 조건부 렌더링으로 이미 해결됨
- `renderModal()` 함수가 `modals.length === 0`이면 `null` 반환

**반영 필요성**: ✅ 이미 해결됨
- 하지만 문서에 명시적으로 기술되지 않음
- **개선**: 문서에 "훅 실행 최적화" 섹션 추가

#### 3. **폼(Form) 통합**

**새로운 글**:
- Modal 내부에서 `<form onSubmit>` 사용하는 패턴 명시적으로 다룸
- 제출 버튼을 `type="submit"`으로 지정

**우리 스펙**:
- 폼 통합 패턴 언급 없음

**반영 가능성**: ⭐⭐⭐⭐ (권장)
- 실무에서 자주 사용되는 패턴
- **추가 필요**: `layout.md`에 "폼 통합 패턴" 섹션 추가

---

## ✨ 반영 가능한 개선점

### 1. forwardRef 추가 (우선순위: 낮음)

#### 구현 예시

```tsx
// Before
export function Overlay({ id, onClose, children }: OverlayProps) {
  // ...
}

// After
export const Overlay = forwardRef<HTMLDivElement, OverlayProps>(
  ({ id, onClose, children }, ref) => {
    return (
      <div ref={ref} id={id} className="..." onClick={handleBackdropClick}>
        {children}
      </div>
    );
  }
);
Overlay.displayName = 'Overlay';
```

#### 장점
- DOM 직접 접근 가능
- 애니메이션 라이브러리 연동 용이
- 포커스 제어 간편화

#### 단점
- 복잡도 증가
- 현재 스펙에서는 불필요

**결론**: 구현 시 필요하다고 판단되면 추가

---

### 2. 폼 통합 패턴 문서화 (우선순위: 높음)

#### 추가할 내용 (layout.md에)

```markdown
## 폼 통합 패턴

Modal 내부에서 폼을 사용하는 경우:

### 기본 패턴

```tsx
export function FormModal({ onSubmit, onAbort }: ModalProps<FormData>) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData);
    onSubmit(data);
  };

  return (
    <Overlay id="form-modal" onClose={onAbort}>
      <ModalContainer>
        <form onSubmit={handleSubmit}>
          <Header title="폼 제목" onClose={onAbort} />
          <Content>
            <Input name="username" label="이름" required />
            <Input name="email" type="email" label="이메일" required />
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

1. `type="submit"` 버튼은 폼 제출을 트리거합니다
2. `type="button"` 버튼은 폼 제출을 하지 않습니다
3. `<form>` 태그는 ModalContainer 내부에 위치해야 합니다
```

---

### 3. 훅 실행 최적화 문서화 (우선순위: 중간)

#### 추가할 내용 (hook.md에)

```markdown
## 훅 실행 최적화

### 문제

일반적인 모달 구현에서는 `isOpen`이 `false`일 때도 모달 내부의 훅(useEffect, useState 등)이 실행되어 불필요한 API 호출이 발생할 수 있습니다.

### 해결 방법

우리의 Modal 시스템은 **조건부 렌더링 + createPortal**을 사용하여 이 문제를 해결합니다:

```tsx
const renderModal = useCallback(() => {
  // modals 배열이 비어있으면 아예 렌더링하지 않음
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

**효과**:
- 모달이 열리지 않았을 때는 컴포넌트가 마운트되지 않음
- 내부 훅이 실행되지 않음
- 불필요한 API 호출 방지
```

---

## 🔧 기술 스택 호환성 점검

### React 19.2.3 호환성

| API | 사용 위치 | 상태 | 비고 |
|-----|----------|------|------|
| `createPortal` | hook.md:358 | ✅ 정상 | React 19에서 정상 작동 |
| `useEffect` | hook.md:345, layout.md:81 | ✅ 정상 | - |
| `useCallback` | hook.md:310, context.md:101 | ✅ 정상 | - |
| `useRef` | hook.md:83 | ✅ 정상 | - |
| `useState` | context.md:84 | ✅ 정상 | - |
| `createContext` | context.md:267 | ✅ 정상 | - |
| `useContext` | context.md:318 | ✅ 정상 | - |
| `forwardRef` | - | ⚠️ 미사용 | 필요시 추가 가능 |

### Next.js 16.1.1 호환성

| 기능 | 사용 위치 | 상태 | 비고 |
|------|----------|------|------|
| `'use client'` 디렉티브 | 모든 예시 | ✅ 정상 | App Router 필수 |
| Client Component | 모든 컴포넌트 | ✅ 정상 | - |
| `crypto.randomUUID()` | context.md:107, hook.md:315 | ✅ 정상 | 브라우저 API |

### 브라우저 API 호환성

| API | 사용 위치 | 지원 브라우저 | 비고 |
|-----|----------|--------------|------|
| `crypto.randomUUID()` | context.md:107 | Chrome 92+, Firefox 95+, Safari 15.4+ | 최신 브라우저 지원 |
| `document.getElementById()` | hook.md:364, layout.md:110 | 모든 브라우저 | ⚠️ SSR 주의 |
| `document.body.style` | layout.md:98 | 모든 브라우저 | ⚠️ SSR 주의 |
| `document.addEventListener()` | layout.md:88 | 모든 브라우저 | ⚠️ SSR 주의 |

---

## ⚠️ 발견된 문제점 및 해결 방안

### 1. SSR 호환성 문제 (심각도: 높음)

#### 문제

```tsx
// hook.md:364
return createPortal(
  <>...</>,
  document.getElementById('modal-root')!  // ❌ SSR에서 undefined
);
```

Next.js App Router는 서버 사이드 렌더링을 사용하므로, `document`가 서버에서 undefined입니다.

#### 해결 방안

```tsx
const renderModal = useCallback(() => {
  if (context.modals.length === 0) return null;

  // SSR 체크 추가
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
```

**수정 필요 파일**: `hook.md:355-366`

---

### 2. ID 생성 중복 문제 (심각도: 중간)

#### 문제

- `context.md:107`: ModalProvider에서 `crypto.randomUUID()` 사용
- `hook.md:315`: useModal Hook에서 `crypto.randomUUID()` 사용
- 두 곳에서 ID를 생성하면 중복 ID가 발생할 수 있음

#### 현재 코드 (hook.md:315)

```tsx
const id = crypto.randomUUID();  // ❌ 중복 생성
modalIdsRef.current.add(id);

try {
  const result = await context.openModal(component, { ...options, id });  // id를 options에 포함
  return result;
} finally {
  modalIdsRef.current.delete(id);
}
```

#### 해결 방안 1: Hook에서만 ID 생성

```tsx
// hook.md
const openModal = useCallback(
  async <T = void>(
    component: React.ComponentType<ModalProps<T>>,
    options?: ModalOptions
  ): Promise<T> => {
    const id = crypto.randomUUID();
    modalIdsRef.current.add(id);

    try {
      // ID를 options에 포함하여 전달
      const result = await context.openModal(component, { ...options, id });
      return result;
    } finally {
      modalIdsRef.current.delete(id);
    }
  },
  [context]
);

// context.md
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

**수정 필요 파일**: `context.md:100-122`, `hook.md:310-326`

---

### 3. ESC 키 옵션 미구현 (심각도: 낮음)

#### 문제

- `types.md:119`: `disableEscapeKey` 옵션이 `ModalOptions`에 정의됨
- `layout.md:78-90`: Overlay 컴포넌트에서 ESC 키를 처리하지만, `disableEscapeKey` 옵션을 받지 않음

#### 해결 방안

```tsx
// layout.md
export function Overlay({
  id,
  onClose,
  disableBackdropClick = false,
  disableEscapeKey = false,  // 추가
  zIndex = 1000,
  children,
}: OverlayProps) {
  // ESC 키 처리
  useEffect(() => {
    if (disableEscapeKey) return;  // 추가

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, disableEscapeKey]);  // dependency 추가

  // ...
}
```

**수정 필요 파일**: `types.md:187-203`, `layout.md:55-63`, `layout.md:170-179`

---

### 4. 포커스 트랩 복잡도 (심각도: 낮음)

#### 문제

`layout.md:107-144`의 포커스 트랩 구현이 복잡하고, 엣지 케이스 처리가 부족합니다.

#### 해결 방안

라이브러리 사용 권장:

```tsx
import FocusTrap from 'focus-trap-react';

export function Overlay({ id, onClose, children }: OverlayProps) {
  return (
    <FocusTrap>
      <div id={id} className="..." onClick={handleBackdropClick}>
        {children}
      </div>
    </FocusTrap>
  );
}
```

**권장 라이브러리**: `focus-trap-react` (https://github.com/focus-trap/focus-trap-react)

**수정 필요**: `layout.md:107-144` 섹션을 라이브러리 사용으로 대체

---

### 5. cloneElement 언급 불일치 (심각도: 낮음)

#### 문제

- `hook.md:278`: "onSubmit, onAbort는 cloneElement 또는 직접 props 전달로 주입"
- `hook.md:403-407`: 실제 구현에서는 직접 props 전달만 사용
- `cloneElement`는 언급만 되고 실제 예시 없음

#### 해결 방안

문서 정리:

```markdown
// hook.md:278 수정
**주의**:
- `onSubmit`, `onAbort`는 직접 props로 전달됩니다
- 모달 컴포넌트는 이 props를 받아 사용해야 합니다
```

**수정 필요 파일**: `hook.md:277-279`

---

## 📋 권장 조치 사항

### 우선순위 HIGH (즉시 수정 필요)

1. **SSR 호환성 수정**
   - 파일: `specs/components/modal/hook.md`
   - 라인: 355-366
   - 조치: `typeof window !== 'undefined'` 체크 추가

2. **ID 생성 중복 문제 해결**
   - 파일: `specs/components/modal/context.md`, `specs/components/modal/hook.md`
   - 조치: ID 생성 로직을 한 곳으로 통일

3. **폼 통합 패턴 문서화**
   - 파일: `specs/components/modal/layout.md`
   - 조치: "폼 통합 패턴" 섹션 추가

### 우선순위 MEDIUM (개선 권장)

4. **ESC 키 옵션 구현**
   - 파일: `specs/components/modal/types.md`, `specs/components/modal/layout.md`
   - 조치: `disableEscapeKey` 옵션을 Overlay props에 추가

5. **훅 실행 최적화 문서화**
   - 파일: `specs/components/modal/hook.md`
   - 조치: "훅 실행 최적화" 섹션 추가

6. **cloneElement 언급 제거**
   - 파일: `specs/components/modal/hook.md`
   - 조치: 불필요한 언급 삭제

### 우선순위 LOW (선택사항)

7. **forwardRef 추가**
   - 파일: `specs/components/modal/layout.md`
   - 조치: 레이아웃 컴포넌트에 forwardRef 적용 (필요시)

8. **포커스 트랩 라이브러리 사용**
   - 파일: `specs/components/modal/layout.md`
   - 조치: `focus-trap-react` 라이브러리 사용으로 대체 (선택사항)

---

## ✅ 결론

### 전체 평가

| 항목 | 평가 | 비고 |
|------|------|------|
| **아키텍처 설계** | ⭐⭐⭐⭐⭐ | 전역 모달 관리 패턴 우수 |
| **React 19 호환성** | ⭐⭐⭐⭐⭐ | 모든 API 정상 작동 |
| **Next.js 16 호환성** | ⭐⭐⭐⭐ | SSR 체크만 추가하면 완벽 |
| **타입 안정성** | ⭐⭐⭐⭐⭐ | TypeScript 타입 정의 우수 |
| **문서 품질** | ⭐⭐⭐⭐ | 상세하고 체계적, 일부 개선 필요 |

### 종합 의견

작성된 Modal 스펙 문서는 **전반적으로 우수한 품질**입니다. 새로운 글과 비교했을 때도 대부분의 패턴을 이미 반영하고 있으며, React 19 및 Next.js 16과의 호환성도 양호합니다.

다만 **3가지 즉시 수정이 필요한 사항**(SSR 체크, ID 중복, 폼 통합 문서화)과 **3가지 개선 권장 사항**(ESC 키 옵션, 훅 최적화 문서화, cloneElement 언급 제거)이 있습니다.

이러한 수정을 적용하면 **프로덕션 환경에서 안전하게 사용 가능한 Modal 시스템**이 될 것입니다.

---

**다음 단계**: 우선순위 HIGH 항목부터 스펙 문서를 수정하고, 실제 구현 시 반영하세요.
