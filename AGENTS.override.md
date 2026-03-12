# frontend 작업 규칙 (override)

이 문서는 `frontend` 저장소에서 Codex가 따라야 할 기술 규칙을 정의한다.
상위 `../AGENTS.md`보다 이 문서가 우선한다.

## 1) 아키텍처 원칙 (프로젝트 맞춤형)

현재 프로젝트는 Next.js + React Query + NestJS 백엔드 조합이며,
복잡도를 과하게 올리지 않고 아래 레이어를 유지한다.

`Page/UI -> Hook(React Query) -> Service(lib/client/api) -> API Route(app/api) -> Backend`

참고:
- `lib/client/hooks/*`
- `lib/client/api/*`
- `app/api/*/route.ts`

## 2) 레이어별 책임

### Page / UI (`app/**`, `src/components/**`)
- 화면 렌더링과 사용자 상호작용 담당.
- 서버 상태 read는 가능한 Hook을 통해 사용.
- 서버 상태 공유가 필요한 mutation은 Hook(`useMutation`) 경유를 우선.
- 단발성 submit(공유 캐시 영향이 적은 경우)은 Service 직접 호출 허용.

### Hook (`lib/client/hooks/**`)
- React Query `queryKey`, `queryFn`, `enabled`, `staleTime`, `invalidate` 관리.
- 한 도메인의 조회/수정 캐시 전략을 한 곳에서 정리.

### Service (`lib/client/api/**`)
- HTTP 요청만 담당한다.
- 경로/쿼리/payload 조립과 응답 타입 정의를 담당한다.
- 비즈니스 로직/렌더링 로직을 넣지 않는다.

### API Route (`app/api/**/route.ts`)
- 기본은 thin BFF/proxy 유지.
- 허용 역할: 인증 전달, 경로 라우팅, 최소한의 파라미터 정리.
- 금지: 도메인 비즈니스 로직 추가, 복잡한 상태 변경 로직.

## 3) React Query 규칙

- query key는 `lib/client/hooks/query-keys.ts`에 우선 정의한다.
- 새 도메인 추가 시 `query-keys.ts`에 키를 먼저 추가한다.
- mutation 성공 시 어떤 key를 invalidate 할지 반드시 코드에 명시한다.
- 페이지 컴포넌트에서 ad-hoc key를 만들기보다 공통 key 사용을 우선한다.

## 4) 스타일링 규칙

- 기본: Tailwind utility class.
- 재사용 UI 컴포넌트(`src/components/ui/**`)는 `cva`로 variant를 관리한다.
- 페이지/단일 컴포넌트의 일회성 스타일은 Tailwind 인라인 허용.
- `className` 분기 로직이 2개 이상 반복되면 `cva` 추출을 우선 검토한다.

## 5) 금지/제한

- `next/image` 사용 금지.
- 새 코드에서 UI 계층의 직접 `fetch/axios` 호출 금지.
- 서비스 계층 밖에서 백엔드 URL 문자열 하드코딩 금지.

## 6) 변경 시 최소 검증

작업 범위에 따라 아래 중 1개 이상 수행:
- `npm run lint`
- `npm run test:run`
- `npm run build`

## 7) 상세 참고

- `../docs/engineering/lucent-technical-architecture.md`
