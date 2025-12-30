# Storybook Setup

이 프로젝트는 Storybook 10을 사용하여 UI 컴포넌트를 개발하고 테스트합니다.

## 실행 방법

### 개발 모드로 Storybook 실행

```bash
npm run storybook
```

기본적으로 `http://localhost:6006`에서 실행됩니다.

### Storybook 빌드

```bash
npm run build-storybook
```

정적 사이트가 `storybook-static/` 폴더에 생성됩니다.

## 설정

### Tailwind CSS

- Storybook은 프로젝트의 `app/globals.css`를 자동으로 import합니다.
- 모든 Tailwind CSS 유틸리티와 CSS Variables를 사용할 수 있습니다.
- `.storybook/preview.ts`에서 설정되어 있습니다.

### Next.js 통합

- Storybook은 `@storybook/nextjs-vite` 프레임워크를 사용합니다.
- Next.js의 Image, Link 등의 컴포넌트를 스토리에서 사용할 수 있습니다.

## 스토리 작성 위치

스토리는 다음 위치에 작성합니다:

```
/stories
  ├── Button.stories.ts
  ├── Input.stories.ts
  └── ...
```

**중요**: `/stories` 폴더는 `.gitignore`에 포함되어 있습니다.

## 컴포넌트 작성 위치

UI 컴포넌트는 다음 위치에 작성합니다:

```
/components
  └── /ui
      ├── Button.tsx
      ├── Input.tsx
      └── ...
```

## 스토리 작성 예시

```typescript
// stories/Button.stories.ts
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Button } from '../components/ui/Button';

const meta = {
  title: 'UI/Button',
  component: Button,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    variant: 'primary',
    children: '버튼',
  },
};
```

## 컬러 시스템 사용

Storybook에서도 프로젝트의 컬러 시스템을 동일하게 사용합니다:

```tsx
// ✅ 올바른 사용
<button className="bg-[var(--color-primary-700)] text-[var(--color-text-inverse)]">
  버튼
</button>

// ❌ 잘못된 사용
<button className="bg-blue-500 text-white">
  버튼
</button>
```

자세한 컬러 사용 가이드는 `/specs/ui/theme.md`를 참조하세요.

## Addons

다음 애드온이 설치되어 있습니다:

- **@chromatic-com/storybook**: Visual regression testing
- **@storybook/addon-a11y**: 접근성 테스트
- **@storybook/addon-docs**: 자동 문서 생성
- **@storybook/addon-vitest**: Vitest 통합 (수동 설정 필요)

## 참고

- Storybook 공식 문서: https://storybook.js.org/
- UI 시스템 가이드: `/specs/ui/index.md`
- 컬러 테마 가이드: `/specs/ui/theme.md`
