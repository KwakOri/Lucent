# Cloudflare R2 설정 가이드

Cloudflare R2는 S3 호환 객체 스토리지 서비스로, 이미지 및 디지털 상품(보이스팩 등)을 저장하는 데 사용됩니다.

---

## 📋 필요한 환경 변수

`.env.local` 파일에 다음 환경변수를 추가해야 합니다:

```env
R2_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-access-key
R2_SECRET_ACCESS_KEY=your-secret-key
R2_BUCKET_NAME=your-bucket-name
R2_PUBLIC_URL=https://your-bucket.r2.dev
```

---

## 🔍 1. R2_ACCOUNT_ID 찾기

### 방법 1: R2 대시보드에서
1. [Cloudflare 대시보드](https://dash.cloudflare.com) 로그인
2. 좌측 메뉴에서 **R2** 클릭
3. 우측 상단에 **Account ID**가 표시됨
   - 또는 URL에서 확인: `https://dash.cloudflare.com/{account-id}/r2/overview`

### 방법 2: 계정 설정에서
1. Cloudflare 대시보드 우측 상단의 프로필 아이콘 클릭
2. **Account Home** 선택
3. 우측에 **Account ID** 표시됨

**예시:**
```
R2_ACCOUNT_ID=a1b2c3d4e5f6g7h8i9j0
```

---

## 🔑 2. API 토큰 생성 (R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY)

### 단계 1: API 토큰 페이지 이동
1. Cloudflare 대시보드 → **R2** 클릭
2. 상단 탭에서 **Settings** 선택
3. 또는 직접 이동: **R2** → 우측 **Manage R2 API Tokens** 클릭

### 단계 2: 새 API 토큰 생성
1. **Create API Token** 버튼 클릭
2. 설정:
   - **Token Name**: 예) `lucent-management-production`
   - **Permissions**:
     - ✅ `Object Read & Write` (읽기/쓰기 권한)
     - 또는 `Admin Read & Write` (전체 권한)
   - **TTL (Time to Live)**:
     - `Forever` (만료 없음) 권장
     - 또는 보안을 위해 1년 후 만료 설정
3. **Create API Token** 클릭

### 단계 3: 토큰 정보 복사
생성 직후 **단 한 번만** 표시됩니다:

```
Access Key ID: a1b2c3d4e5f6g7h8
Secret Access Key: i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6
```

**⚠️ 주의:**
- **Secret Access Key는 다시 볼 수 없습니다!**
- 반드시 안전한 곳에 복사해두세요
- 분실 시 새로운 토큰을 재생성해야 합니다

**환경변수에 추가:**
```env
R2_ACCESS_KEY_ID=a1b2c3d4e5f6g7h8
R2_SECRET_ACCESS_KEY=i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6
```

---

## 🪣 3. R2 버킷 생성 및 이름 설정

### 단계 1: 버킷 생성
1. Cloudflare 대시보드 → **R2** → **Overview**
2. **Create bucket** 버튼 클릭
3. 설정:
   - **Bucket Name**: 예) `lucent-management-files`
     - 소문자, 숫자, 하이픈(-)만 사용 가능
     - 3~63자
     - 예시: `lucent-prod`, `vshop-files`, `miruru-voicepacks`
   - **Location**: `Automatic` (자동 선택) 또는 원하는 리전
4. **Create bucket** 클릭

### 단계 2: 환경변수 설정
```env
R2_BUCKET_NAME=lucent-management-files
```

---

## 🌐 4. R2_PUBLIC_URL 설정 (선택사항)

R2 버킷을 공개적으로 접근 가능하게 하려면 커스텀 도메인을 연결해야 합니다.

### 방법 1: R2.dev 서브도메인 사용

1. Cloudflare 대시보드 → **R2** → 생성한 버킷 클릭
2. **Settings** 탭 선택
3. **Public Access** 섹션에서:
   - **Allow Access** 활성화
   - 자동 생성된 URL 복사: `https://<bucket-name>.<account-id>.r2.dev`

**예시:**
```env
R2_PUBLIC_URL=https://lucent-management-files.a1b2c3d4e5f6.r2.dev
```

### 방법 2: 커스텀 도메인 연결 (권장)

1. 버킷 설정 → **Settings** 탭
2. **Custom Domains** 섹션에서 **Connect Domain** 클릭
3. 도메인 입력: 예) `cdn.lucentmanagement.com`
4. Cloudflare DNS가 자동으로 설정됨
5. 환경변수 설정:

```env
R2_PUBLIC_URL=https://cdn.lucentmanagement.com
```

**⚠️ 주의:**
- 커스텀 도메인은 반드시 Cloudflare에서 관리하는 도메인이어야 합니다
- DNS 전파에 몇 분이 걸릴 수 있습니다

---

## 📝 최종 환경변수 설정

`.env.local` 파일에 다음과 같이 추가:

```env
# ===== Cloudflare R2 설정 =====
# 디지털 상품 파일 및 이미지 스토리지

# Cloudflare 계정 ID (R2 대시보드에서 확인)
R2_ACCOUNT_ID=a1b2c3d4e5f6g7h8i9j0

# R2 API 토큰 (R2 Settings → Manage R2 API Tokens에서 생성)
R2_ACCESS_KEY_ID=a1b2c3d4e5f6g7h8
R2_SECRET_ACCESS_KEY=i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6

# 버킷 이름
R2_BUCKET_NAME=lucent-management-files

# 공개 URL (버킷 설정에서 Public Access 활성화 후)
R2_PUBLIC_URL=https://lucent-management-files.a1b2c3d4e5f6.r2.dev
# 또는 커스텀 도메인:
# R2_PUBLIC_URL=https://cdn.lucentmanagement.com
```

---

## 🧪 설정 테스트

### Node.js 스크립트로 연결 테스트

```bash
# 테스트 스크립트 실행 (아직 작성되지 않았다면 아래 코드 참조)
npx tsx scripts/test-r2.ts
```

**테스트 스크립트 예시** (`scripts/test-r2.ts`):

```typescript
import { S3Client, ListBucketsCommand } from '@aws-sdk/client-s3';

const client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

async function testR2Connection() {
  try {
    console.log('🔄 R2 연결 테스트 중...\n');

    const command = new ListBucketsCommand({});
    const response = await client.send(command);

    console.log('✅ R2 연결 성공!\n');
    console.log('📦 버킷 목록:');
    response.Buckets?.forEach((bucket) => {
      console.log(`  - ${bucket.Name}`);
    });

    console.log('\n환경변수 확인:');
    console.log(`  R2_ACCOUNT_ID: ${process.env.R2_ACCOUNT_ID}`);
    console.log(`  R2_BUCKET_NAME: ${process.env.R2_BUCKET_NAME}`);
    console.log(`  R2_PUBLIC_URL: ${process.env.R2_PUBLIC_URL}`);
  } catch (error) {
    console.error('❌ R2 연결 실패:', error);
    console.log('\n다음을 확인하세요:');
    console.log('  1. R2_ACCOUNT_ID가 올바른지');
    console.log('  2. R2_ACCESS_KEY_ID와 R2_SECRET_ACCESS_KEY가 올바른지');
    console.log('  3. API 토큰에 적절한 권한이 있는지');
  }
}

testR2Connection();
```

---

## 🗂️ 버킷 구조 권장사항

```
lucent-management-files/
├── images/
│   ├── artists/
│   │   ├── miruru/
│   │   │   ├── profile.png
│   │   │   └── banner.png
│   │   └── drips/
│   ├── products/
│   │   └── voicepack-vol1/
│   │       ├── main.png
│   │       └── gallery/
│   └── projects/
│       └── 0th/
│           └── cover.png
└── products/
    └── voicepacks/
        └── miruru-vol1.zip
```

---

## 💰 비용 안내

### Cloudflare R2 무료 할당량 (2025년 기준)

- **저장 용량**: 10 GB/월 무료
- **Class A 작업** (쓰기): 100만 요청/월 무료
- **Class B 작업** (읽기): 1,000만 요청/월 무료

**초과 시 요금:**
- 저장 용량: $0.015/GB/월
- Class A: $4.50/100만 요청
- Class B: $0.36/100만 요청

**특징:**
- ✅ 송신(egress) 비용 **완전 무료** (AWS S3와 가장 큰 차이점)
- ✅ 대역폭 제한 없음
- ✅ 글로벌 CDN 자동 적용

**예상 비용 (1차 MVP):**
- 저장 용량 ~5GB → **무료**
- 월 요청 수 ~50만 → **무료**
- **총 비용: $0/월**

---

## 🔒 보안 권장사항

### 1. API 토큰 관리
- ✅ 프로덕션과 개발 환경에 **다른 토큰** 사용
- ✅ 토큰은 절대 Git에 커밋하지 않기 (`.env.local`은 `.gitignore`에 포함됨)
- ✅ 정기적으로 토큰 교체 (6개월~1년)
- ✅ 사용하지 않는 토큰은 즉시 삭제

### 2. 버킷 권한
- ✅ 공개 읽기만 허용 (쓰기는 API에서만)
- ✅ CORS 설정으로 허용된 도메인만 접근 가능하도록 제한
- ✅ 민감한 파일은 별도 비공개 버킷에 저장

### 3. 환경변수 관리
- ✅ Vercel 배포 시: Vercel 대시보드 → Settings → Environment Variables에서 설정
- ✅ 로컬 개발: `.env.local` 파일 사용
- ✅ 절대 코드에 하드코딩하지 않기

---

## 📚 참고 문서

- [Cloudflare R2 공식 문서](https://developers.cloudflare.com/r2/)
- [R2 API 토큰 관리](https://developers.cloudflare.com/r2/api/s3/tokens/)
- [R2 커스텀 도메인 연결](https://developers.cloudflare.com/r2/buckets/public-buckets/)
- [AWS SDK for JavaScript (S3 호환)](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-s3/)

---

## 🆘 문제 해결

### "Access Denied" 에러

**원인:** API 토큰 권한 부족

**해결:**
1. R2 Settings → Manage R2 API Tokens
2. 기존 토큰 삭제
3. **Admin Read & Write** 권한으로 새 토큰 생성

### "Bucket not found" 에러

**원인:** 버킷 이름 오타 또는 Account ID 불일치

**해결:**
1. `R2_BUCKET_NAME`이 실제 버킷 이름과 일치하는지 확인
2. `R2_ACCOUNT_ID`가 버킷을 생성한 계정 ID인지 확인

### "Invalid credentials" 에러

**원인:** Access Key 또는 Secret Key 오류

**해결:**
1. `.env.local` 파일의 키 값 재확인
2. 공백이나 줄바꿈이 포함되지 않았는지 확인
3. 토큰 재생성

---

**문서 작성일:** 2025-01-15
**관련 문서:**
- `/docs/api-testing-guide.md` - API 테스트 가이드
- `/docs/email-setup.md` - 이메일 설정 가이드
