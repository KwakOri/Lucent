# Project Detail (프로젝트 상세) - UI Spec

## 경로

`/projects/{project-slug}`

예시:
- `/projects/0th-miruru`
- `/projects/1st-drips`

## 페이지 목적

- 특정 프로젝트 상세 정보 제공
- 참여 아티스트 소개
- 제작된 콘텐츠(보이스팩, 굿즈) 목록
- 굿즈샵으로 이동

## 레이아웃 구조

### 1. Project Header

**구성**:
- 프로젝트 번호 (0th, 1st, ...)
- 프로젝트 이름
- 대표 이미지/키비주얼
- 프로젝트 설명 (2-3문단)

**레이아웃**:
- 모바일: 세로 배치 (이미지 → 텍스트)
- 데스크톱: 좌우 배치 (이미지 | 텍스트) 또는 세로 유지

### 2. Artists Section

**목적**: 참여 아티스트 소개

**구성**:
- 섹션 제목: "참여 아티스트"
- 아티스트 목록 (텍스트)
  - 예: 0th Project → 미루루
  - 예: 1st Project → Drips (2명)
- 각 아티스트:
  - 이름
  - 간단한 소개 (선택)
  - 프로필 이미지 (선택)

**레이아웃**:
- 아티스트 카드 형태 또는 리스트 형태

### 3. Contents Section

**목적**: 제작된 콘텐츠 목록

**구성**:
- 섹션 제목: "콘텐츠"
- 보이스팩 목록
  - 제목
  - 간단한 설명
  - 썸네일 이미지 (선택)
- 굿즈 목록
  - 제목
  - 간단한 설명
  - 썸네일 이미지 (선택)

**레이아웃**:
- 카드 그리드 또는 리스트
- 모바일: 1열
- 데스크톱: 2-3열

### 4. Shop Link Section

**목적**: 굿즈샵 이동

**구성**:
- CTA 버튼: "굿즈샵 보러가기"
- 버튼 클릭 → `/goods/{artist-slug}` 이동

**레이아웃**:
- 중앙 정렬 큰 버튼
- 눈에 띄는 디자인

## 상태 관리

### 데이터 로딩
- `project`: 프로젝트 상세 데이터
- `artists`: 참여 아티스트 목록
- `contents`: 콘텐츠 목록
- `isLoading`: 로딩 상태
- `error`: 에러 상태

## 데이터 구조

```typescript
interface ProjectDetail {
  id: string
  name: string
  order: string
  description: string
  coverImage: string
  artists: Artist[]
  contents: Content[]
}

interface Artist {
  id: string
  name: string
  description?: string
  profileImage?: string
  shopSlug: string
}

interface Content {
  id: string
  type: 'VOICE_PACK' | 'PHYSICAL_GOODS'
  title: string
  description: string
  thumbnail?: string
}
```

## 디자인 가이드

### 프로젝트별 테마
- 각 프로젝트별 메인 컬러 설정 가능
- 예: 미루루 → 파스텔 하늘색
- 예: Drips → (별도 지정)

### 이미지
- 고품질 이미지 사용
- 일관된 이미지 비율

### 타이포그래피
- 제목: 명확하고 큰 폰트
- 본문: 가독성 좋은 폰트

## 반응형

### 모바일 (< 768px)
- 전체 섹션 세로 스크롤
- 이미지 전체 너비
- 콘텐츠 카드 1열

### 태블릿 (768px ~ 1024px)
- 헤더 이미지/텍스트 좌우 배치 (선택)
- 콘텐츠 카드 2열

### 데스크톱 (> 1024px)
- 헤더 레이아웃 최적화
- 콘텐츠 카드 2-3열
- 최대 너비 제한 (1200px)

## 접근성

- 적절한 heading 레벨
- 이미지 alt 텍스트
- 키보드 네비게이션 지원
- 링크/버튼 명확한 설명

## 성능

- 이미지 최적화
- 초기 로딩 속도 우선
- 콘텐츠 목록이 많을 경우 페이지네이션 (추후)

## 1차 MVP 제외 기능

- 장문 기록 아카이브
- 이미지 갤러리 확장 기능
- 프로젝트 타임라인
- SNS 피드 임베드

## API 연동

- API: `GET /api/projects/{slug}`
- 응답: 프로젝트 상세 정보
- 404 처리: 존재하지 않는 프로젝트

## 참고사항

- 본 페이지는 "설명 페이지" 역할만 수행
- 실제 구매는 굿즈샵에서 진행
- 단순하고 명확한 정보 전달에 집중
