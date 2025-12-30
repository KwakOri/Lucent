# UI – Common Loading

이 문서는 서비스 전반에서 사용되는 **Loading UI (로딩 상태 표현)**의 공통 규칙과 UX 정책을 정의한다.

본 문서는 `ui/index.md`, `ui/common/button.md`, `ui/common/form.md`의 원칙을 따른다.

---

## 1. 역할 정의 (Role)

Loading UI는 시스템이 작업을 처리 중임을 사용자에게 명확히 전달하고, **중복 행동을 방지**하기 위한 UI이다.

### Loading UI의 목적

- 현재 상태가 정상적으로 처리 중임을 전달
- 사용자의 불안 감소
- 중복 요청 방지

---

## 2. Loading 유형 분류

### 2.1 Inline Loading

- 버튼 내부
- Input, Select 등 컴포넌트 내부

사용 예:

- 로그인 버튼 submit 중
- 폼 제출 처리 중

### 2.2 Section Loading

- 특정 영역만 로딩 상태인 경우
- 리스트, 카드 영역 등

### 2.3 Page Loading

- 페이지 전체 데이터 로딩
- 초기 진입 또는 라우트 전환 시

---

## 3. 표현 방식 선택 기준

| 상황              | 권장 방식          |
| ----------------- | ------------------ |
| 짧은 처리 (1~2초) | Spinner            |
| 중간 처리         | Spinner + Skeleton |
| 긴 처리 / 불확실  | Skeleton           |

> Skeleton은 레이아웃 안정성을 유지하기 위해 사용한다.

---

## 4. Spinner 정책

- Spinner는 **보조적 시각 요소**로 사용한다.
- 단독 의미 전달은 텍스트와 함께 사용을 권장한다.

### 사용 예

- "처리 중이에요"
- "불러오는 중입니다"

---

## 5. Skeleton 정책

- Skeleton은 실제 UI 구조를 최대한 반영한다.
- 과도한 애니메이션은 지양한다.
- 데이터 로딩 완료 후 자연스럽게 전환한다.

---

## 6. Button Loading 규칙

- submit 중 버튼은 disabled 처리한다.
- 버튼 내부에 Spinner를 표시한다.
- 버튼 텍스트는 유지하거나 대체 텍스트 사용 가능하다.

---

## 7. 접근성 (Accessibility)

- 로딩 상태는 스크린 리더에 인식되어야 한다.
- `aria-busy="true"` 사용을 권장한다.
- 포커스를 강제로 이동시키지 않는다.

---

## 8. Mobile UX 고려

- 로딩 중 레이아웃 점프를 방지한다.
- 전체 페이지 로딩 시 과도한 차단 UI는 지양한다.

---

## 9. 에러와의 관계

- 로딩 실패 시 즉시 에러 상태로 전환한다.
- 에러 피드백은 Toast 또는 Error UI를 사용한다.

---

## 10. 확장 고려

- Promise 기반 Loading 관리
- Suspense 연계 가능성
- 글로벌 Loading Indicator

---

### 요약

- Loading은 상태 전달을 위한 필수 UX 요소
- 상황에 따라 Spinner / Skeleton 선택
- Button, Section, Page 레벨로 구분
- 접근성과 모바일 UX 고려
