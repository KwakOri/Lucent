# UI – Common Switch

이 문서는 서비스 전반에서 사용되는 **Switch (Toggle) UI의 공통 규칙과 UX 정책**을 정의한다.

본 문서는 `ui/index.md`, `ui/common/form.md`, `ui/common/form-field.md`, `ui/common/checkbox.md`의 원칙을 따른다.

---

## 1. 역할 정의 (Role)

Switch는 **상태의 ON / OFF 전환**을 표현하는 UI이다.

### Switch가 적합한 경우

- 설정의 활성 / 비활성 전환
- 즉시 반영되는 상태 변경
- 현재 상태가 명확해야 하는 경우

### Switch가 부적합한 경우

- 복수 선택 개념 → Checkbox 사용
- 명시적인 선택 결과 제출이 필요한 경우 → Checkbox / Radio

> Switch는 "선택"이 아니라 **"상태"**를 표현한다.

---

## 2. Checkbox와의 차이

| 항목      | Switch      | Checkbox        |
| --------- | ----------- | --------------- |
| 의미      | 상태 전환   | 선택 여부       |
| 즉시 반영 | O           | △ (submit 필요) |
| 사용 예   | 알림 ON/OFF | 약관 동의       |

---

## 3. 구현 전제

- Switch UI는 **Form 라이브러리에 종속되지 않는다**.
- React Hook Form과의 연결은 Form 또는 Page 레벨에서 수행한다.
- Switch 컴포넌트의 책임은 다음으로 제한한다:

  - 현재 상태 시각화
  - 토글 인터랙션 제공
  - disabled / error 상태 표현

---

## 4. CVA 기반 Variant 구조

### 4.1 State Variant

- `on`
- `off`
- `disabled`
- `error`

### 4.2 Size Variant

- `md` (default)
- 필요 시 `sm`, `lg` 확장 가능

> 현재 프로젝트에서는 `md`를 기본값으로 사용한다.

---

## 5. Label 정책

- Switch는 반드시 label을 함께 제공한다.
- label 클릭 시 상태가 전환되어야 한다.
- label은 Switch의 의미를 명확히 설명해야 한다.

```tsx
<Switch label="알림 받기" />
```

---

## 6. Error 처리 규칙

- Switch는 에러를 생성하지 않는다.
- 외부에서 전달된 에러 상태를 시각적으로 표현만 한다.
- 에러 메시지가 필요한 경우 Form Field 레벨에서 처리한다.

---

## 7. 접근성 (Accessibility)

- `role="switch"` 사용을 권장한다.
- `aria-checked`로 상태를 명확히 전달한다.
- 키보드(space, enter)로 토글 가능해야 한다.

---

## 8. Mobile UX 고려

- 터치 영역은 최소 44px 이상 확보한다.
- 상태 변화는 애니메이션으로 명확히 전달한다.

---

## 9. 확장 고려

- 로딩 상태 포함 Switch
- 설명 텍스트(sub label)
- 비동기 상태 반영 (optimistic UI)

> 모든 확장은 상태 전환의 명확성을 해치지 않는 방향으로 설계한다.
