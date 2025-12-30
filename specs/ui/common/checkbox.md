# UI – Common Checkbox

이 문서는 서비스 전반에서 사용되는 **Checkbox UI의 공통 규칙과 UX 정책**을 정의한다.

본 문서는 `ui/index.md`, `ui/common/form.md`, `ui/common/form-field.md`의 원칙을 따른다.

---

## 1. 역할 정의

Checkbox는 **복수 선택** 또는 **상태의 on/off 전환**을 표현하는 UI이다.

### 적합한 경우

- 여러 항목 중 복수 선택이 가능한 경우
- 약관 동의, 옵션 활성화/비활성화

### 부적합한 경우

- 단일 선택 → Radio 사용
- 즉시 실행이 필요한 액션 → Switch 또는 Button

---

## 2. 구현 전제

- Checkbox UI는 Form 라이브러리에 종속되지 않는다.
- 상태 관리는 외부(FormField / Page)에서 수행한다.
- Checkbox 컴포넌트는 다음 책임만 가진다:

  - 체크 상태 시각화
  - disabled / error 상태 표현

---

## 3. 구조 원칙

- Checkbox는 반드시 **label과 함께 사용**한다.
- 클릭 영역은 체크 박스 + label 전체를 포함해야 한다.
- 단독 Checkbox 사용은 지양하고 `FormField` 내부에서 사용한다.

---

## 4. Variant 설계 (CVA 기준)

### State Variant

- `default`
- `checked`
- `error`
- `disabled`

### Size Variant

- `md` (default)
- `sm` (필요 시 확장)

---

## 5. Label 정책

- label은 Checkbox 우측에 배치한다.
- 줄바꿈이 발생해도 체크 박스와 시각적 연결이 유지되어야 한다.
- 필수 여부가 있는 경우 label에 `*`를 사용한다.

---

## 6. Error 처리

- Checkbox는 에러를 생성하지 않는다.
- FormField에서 전달된 errorMessage만 표시한다.
- 에러 메시지는 그룹 하단에 1회만 표시한다.

---

## 7. 접근성 (Accessibility)

- `input[type=checkbox]`를 사용한다.
- label 클릭 시 체크 상태가 변경되어야 한다.
- 키보드(Space)로 토글 가능해야 한다.

---

## 8. 확장 고려

- Checkbox Group 컴포넌트 분리
- 전체 선택 / 부분 선택(indeterminate) 상태
