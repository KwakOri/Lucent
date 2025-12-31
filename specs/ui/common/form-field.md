# FormField 컴포넌트 사용 가이드

> **중요**: FormField는 **Wrapper 컴포넌트**입니다. Input을 children으로 전달해야 합니다.

## 컴포넌트 역할

FormField는 다음을 담당합니다:
- ✅ Label 표시 (required 표시 포함)
- ✅ Error 메시지 표시
- ✅ Help 메시지 표시
- ✅ Accessibility 연결 (htmlFor, aria-describedby)

FormField는 **Input을 렌더링하지 않습니다**. Input은 children으로 전달해야 합니다.

---

## ✅ 올바른 사용법

### 기본 사용

```tsx
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';

<FormField
  label="이메일"
  htmlFor="email"
  required
  error={errors.email}
>
  <Input
    id="email"
    name="email"
    type="email"
    value={value}
    onChange={handleChange}
    error={!!errors.email}
  />
</FormField>
```

### Textarea 사용

```tsx
import { FormField } from '@/components/ui/form-field';
import { Textarea } from '@/components/ui/input';

<FormField
  label="메모"
  htmlFor="memo"
  help="선택사항입니다"
>
  <Textarea
    id="memo"
    name="memo"
    value={value}
    onChange={handleChange}
    rows={3}
  />
</FormField>
```

---

## ❌ 잘못된 사용법

### 🚫 Props로 Input 속성 전달 (동작하지 않음)

```tsx
// ❌ 이렇게 하면 Input이 렌더링되지 않습니다!
<FormField
  label="이름"
  name="name"           // ❌
  value={value}         // ❌
  onChange={onChange}   // ❌
  placeholder="이름"    // ❌
/>
```

**문제점:**
- FormField는 \`value\`, \`onChange\`, \`placeholder\` 같은 props를 받지 않음
- children이 없어서 **아무것도 렌더링되지 않음**
- Label만 보이고 Input은 보이지 않음

### ✅ 올바른 수정

```tsx
// ✅ Input을 children으로 전달
<FormField label="이름" htmlFor="name">
  <Input
    id="name"
    name="name"
    value={value}
    onChange={onChange}
    placeholder="이름"
  />
</FormField>
```

---

## 자주하는 실수

### 1. children 없이 사용

❌ **잘못됨:**
```tsx
<FormField label="이름" value={name} onChange={setName} />
```

✅ **올바름:**
```tsx
<FormField label="이름" htmlFor="name">
  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
</FormField>
```

### 2. htmlFor와 id 불일치

❌ **잘못됨:**
```tsx
<FormField label="이름" htmlFor="userName">
  <Input id="name" />  {/* id가 다름! */}
</FormField>
```

✅ **올바름:**
```tsx
<FormField label="이름" htmlFor="userName">
  <Input id="userName" />  {/* 일치함 */}
</FormField>
```

---

**참조:**
- 컴포넌트: \`src/components/ui/form-field/index.tsx\`
- Input: \`src/components/ui/input/index.tsx\`
- 사용 예시: \`src/components/order/BuyerInfoForm.tsx\`

**마지막 업데이트:** 2025-01-01
