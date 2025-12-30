# UI – Common Radio

이 문서는 서비스 전반에서 사용되는 **Radio UI의 공통 규칙과 UX 정책**을 정의한다.

본 문서는 `ui/index.md`, `ui/common/form.md`, `ui/common/form-field.md`의 원칙을 따른다.

---

## 1. 역할 정의 (Role)

Radio는 **여러 선택지 중 단 하나만 선택**해야 하는 경우에 사용한다.

### Radio가 적합한 경우

- 선택지가 2~5개 정도로 적은 경우
- 모든 선택지를 한눈에 비교해야 하는 경우
- 선택 결과가 즉시 명확해야 하는 경우

### Radio가 부적합한 경우

- 선택지가 많은 경우 → Select 사용
- 복수 선택이 가능한 경우 → Checkbox 사용

---

## 2. 구현 전제

- Radio UI는 **Form 라이브러리에 종속되지 않는다**.
- React Hook Form과의 연결은 Form 또는 Page 레벨에서 수행한다.
- Radio 컴포넌트의 책임은 다음으로 한정한다:

  - 선택 상태 표시
  - 상태 시각화
  - 에러 메시지 표시

---

## 3. CVA 기반 구조

### 3.1 Variant 설계

#### State Variant

- `default`
- `checked`
- `disabled`
- `error`

#### Size Variant

- `md` (default)
- 필요 시 `sm`, `lg` 확장 가능

> 현재 프로젝트에서는 `md`를 기본으로 사용한다.

---

## 4. Group 구조 원칙

- Radio는 반드시 **Group 단위**로 사용한다.
- Group에는 하나의 `name`을 공유한다.
- Group 단위로 하나의 validation 결과를 가진다.

```tsx
<RadioGroup name="deliveryType">
  <Radio value="normal" label="일반 배송" />
  <Radio value="express" label="빠른 배송" />
</RadioGroup>
```

---

## 5. Label 정책

- 각 Radio 항목은 반드시 label을 가진다.
- label 클릭 시 Radio가 선택되어야 한다.
- Group 단위의 설명(label 또는 legend)을 제공할 수 있다.

---

## 6. Error 표시 규칙

### 6.1 Error 책임

- Radio는 에러를 생성하지 않는다.
- 외부에서 전달된 에러 메시지를 Group 하단에 표시한다.

### 6.2 Error UX

- 한 Group당 하나의 에러 메시지만 노출한다.
- 에러 메시지는 친절하고 명확한 톤을 사용한다.

---

## 7. 접근성 (Accessibility)

- `fieldset` / `legend` 사용을 권장한다.
- 키보드 방향키로 선택 이동이 가능해야 한다.
- `aria-checked`, `role="radiogroup"`을 올바르게 사용한다.

---

## 8. Mobile UX 고려

- 터치 영역은 충분히 크게 제공한다.
- Radio 버튼과 label 간 간격을 확보한다.

---

## 9. 확장 고려

- 아이콘 포함 Radio
- 설명 텍스트(sub description) 지원
- 카드형 Radio UI

> 확장은 기본 Radio UX를 해치지 않는 방향으로 설계한다.
