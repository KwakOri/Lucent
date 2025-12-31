# 자동 샘플 생성 기능 스펙

## 개요

관리자가 보이스팩 상품을 등록할 때 샘플 파일을 별도로 업로드하지 않으면, 시스템이 자동으로 메인 파일에서 **앞 20초**를 추출하여 샘플 파일을 생성합니다.

### 목적

- 관리자의 작업 편의성 향상 (샘플 파일 별도 제작 불필요)
- 일관된 샘플 길이 제공 (20초)
- 샘플 파일 누락 방지

---

## 트리거 시점

### 상품 등록 시

관리자가 보이스팩 상품을 등록할 때 두 개의 별도 인풋 제공:

```
1. 보이스팩 파일 업로드 (mainFile) - 필수 ⭐
2. 샘플 오디오 파일 업로드 (sampleFile) - 선택

   [케이스 1] mainFile이 null
   → 상품 생성 불가 (에러 반환) ❌

   [케이스 2] mainFile 있음 + sampleFile 있음
   → 둘 다 그대로 사용 ✅

   [케이스 3] mainFile 있음 + sampleFile이 null
   → 자동 샘플 생성 프로세스 실행 ⭐
```

### API 엔드포인트

```
POST /api/admin/products
```

**Form Data 구조:**

```
Content-Type: multipart/form-data

name: "미루루 봄 보이스팩"
type: "VOICE_PACK"
price: 15000
artistId: "uuid"
mainFile: File (required) ⭐
sampleFile: File (optional)
```

**케이스별 처리:**

```typescript
// 케이스 1: mainFile이 null
if (!mainFile) {
  throw new ApiError('보이스팩 파일은 필수입니다', 400);
}

// 케이스 2: mainFile + sampleFile 둘 다 있음
if (mainFile && sampleFile) {
  // 둘 다 R2에 업로드
}

// 케이스 3: mainFile만 있고 sampleFile은 null
if (mainFile && !sampleFile) {
  // 자동 샘플 생성 ⭐
}
```

---

## 처리 프로세스

### 전체 흐름

```
관리자: 상품 등록 폼 작성
    ↓
mainFile 업로드? ─NO→ 에러: "보이스팩 파일은 필수입니다" ❌
    ↓ YES
mainFile을 R2에 업로드
    ↓
sampleFile 업로드? ─YES→ sampleFile을 R2에 업로드 → DB 저장 ✅
    ↓ NO
자동 샘플 생성 시작 ⭐
    ↓
파일 형식 확인 (ZIP vs 단일 오디오)
    ↓
[ZIP인 경우]                    [단일 오디오인 경우]
    ↓                               ↓
임시 디렉토리에 압축 해제          ffmpeg로 앞 20초 추출
    ↓                               ↓
첫 번째 오디오 파일 찾기          MP3로 변환 (필요시)
    ↓                               ↓
ffmpeg로 앞 20초 추출             R2에 sample.mp3 업로드
    ↓                               ↓
MP3로 변환                      DB에 sample_url 저장
    ↓                               ↓
R2에 sample.mp3 업로드           has_custom_sample = false
    ↓
DB에 sample_url 저장
    ↓
has_custom_sample = false
    ↓
임시 파일 정리
```

---

## 기술 스택

### 1. ffmpeg

오디오/비디오 처리를 위한 핵심 도구

**설치:**
```bash
# macOS
brew install ffmpeg

# Ubuntu/Debian
apt-get install ffmpeg

# Docker
FROM node:20
RUN apt-get update && apt-get install -y ffmpeg
```

**주요 명령어:**

```bash
# 앞 20초 추출
ffmpeg -i input.mp3 -t 20 -c copy output.mp3

# 다른 형식을 MP3로 변환하면서 20초 추출
ffmpeg -i input.wav -t 20 -codec:a libmp3lame -b:a 192k output.mp3

# 오디오 정보 확인
ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 input.mp3
```

### 2. Node.js 라이브러리

**필수 패키지:**

```bash
npm install fluent-ffmpeg
npm install adm-zip
npm install @types/fluent-ffmpeg @types/adm-zip --save-dev
```

**패키지 설명:**

- `fluent-ffmpeg`: ffmpeg을 Node.js에서 쉽게 사용
- `adm-zip`: ZIP 파일 압축 해제

---

## 상세 구현 로직

### 1. 파일 형식 판별

```typescript
function getFileType(filename: string): 'zip' | 'audio' | 'unknown' {
  const ext = filename.toLowerCase().split('.').pop();

  if (ext === 'zip') return 'zip';

  const audioExts = ['mp3', 'wav', 'flac', 'm4a', 'aac', 'ogg', 'wma'];
  if (audioExts.includes(ext || '')) return 'audio';

  return 'unknown';
}
```

### 2. ZIP 파일 처리

```typescript
import AdmZip from 'adm-zip';
import path from 'path';
import fs from 'fs';

async function extractFirstAudioFromZip(
  zipBuffer: Buffer,
  tempDir: string
): Promise<string | null> {
  const zip = new AdmZip(zipBuffer);
  const zipEntries = zip.getEntries();

  // 오디오 파일 확장자
  const audioExts = ['.mp3', '.wav', '.flac', '.m4a', '.aac', '.ogg', '.wma'];

  // 첫 번째 오디오 파일 찾기
  for (const entry of zipEntries) {
    if (entry.isDirectory) continue;

    const ext = path.extname(entry.entryName).toLowerCase();
    if (audioExts.includes(ext)) {
      // 임시 디렉토리에 추출
      const outputPath = path.join(tempDir, path.basename(entry.entryName));
      fs.writeFileSync(outputPath, entry.getData());
      return outputPath;
    }
  }

  return null; // 오디오 파일 없음
}
```

### 3. ffmpeg로 20초 추출

```typescript
import ffmpeg from 'fluent-ffmpeg';
import { promisify } from 'util';

async function extractFirst20Seconds(
  inputPath: string,
  outputPath: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .setStartTime(0) // 시작 위치
      .duration(20)    // 20초
      .audioCodec('libmp3lame') // MP3 코덱
      .audioBitrate('192k')     // 비트레이트
      .output(outputPath)
      .on('end', () => resolve())
      .on('error', (err) => reject(err))
      .run();
  });
}
```

### 4. 오디오 길이 확인

20초보다 짧은 파일 처리:

```typescript
async function getAudioDuration(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) return reject(err);
      const duration = metadata.format.duration || 0;
      resolve(duration);
    });
  });
}

// 사용 예시
const duration = await getAudioDuration(inputPath);

if (duration < 20) {
  // 20초보다 짧으면 전체 파일을 샘플로 사용
  await extractFirst20Seconds(inputPath, outputPath);
  console.warn(`파일이 ${duration}초로 20초보다 짧습니다. 전체를 샘플로 사용합니다.`);
} else {
  await extractFirst20Seconds(inputPath, outputPath);
}
```

---

## 서비스 레이어 구현

### SampleGenerationService

```typescript
// lib/server/services/sample-generation.service.ts

import ffmpeg from 'fluent-ffmpeg';
import AdmZip from 'adm-zip';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';

export class SampleGenerationService {
  /**
   * 메인 파일에서 자동으로 샘플 생성
   *
   * @param mainFileBuffer - 메인 파일 Buffer
   * @param mainFileName - 메인 파일 이름
   * @returns 샘플 파일 Buffer (MP3)
   */
  static async generateSample(
    mainFileBuffer: Buffer,
    mainFileName: string
  ): Promise<Buffer> {
    const tempDir = path.join(os.tmpdir(), `sample-gen-${uuidv4()}`);

    try {
      // 임시 디렉토리 생성
      await fs.mkdir(tempDir, { recursive: true });

      // 파일 형식 판별
      const fileType = this.getFileType(mainFileName);

      let audioPath: string;

      if (fileType === 'zip') {
        // ZIP 파일에서 첫 번째 오디오 추출
        audioPath = await this.extractFirstAudioFromZip(mainFileBuffer, tempDir);
        if (!audioPath) {
          throw new Error('ZIP 파일 내에 오디오 파일이 없습니다');
        }
      } else if (fileType === 'audio') {
        // 단일 오디오 파일
        audioPath = path.join(tempDir, mainFileName);
        await fs.writeFile(audioPath, mainFileBuffer);
      } else {
        throw new Error('지원하지 않는 파일 형식입니다');
      }

      // 오디오 길이 확인
      const duration = await this.getAudioDuration(audioPath);
      const extractDuration = Math.min(duration, 20);

      // 20초 추출
      const samplePath = path.join(tempDir, 'sample.mp3');
      await this.extractAudio(audioPath, samplePath, extractDuration);

      // Buffer로 읽기
      const sampleBuffer = await fs.readFile(samplePath);

      return sampleBuffer;
    } finally {
      // 임시 파일 정리
      await this.cleanupTempDir(tempDir);
    }
  }

  /**
   * 파일 형식 판별
   */
  private static getFileType(filename: string): 'zip' | 'audio' | 'unknown' {
    const ext = filename.toLowerCase().split('.').pop();

    if (ext === 'zip') return 'zip';

    const audioExts = ['mp3', 'wav', 'flac', 'm4a', 'aac', 'ogg', 'wma'];
    if (audioExts.includes(ext || '')) return 'audio';

    return 'unknown';
  }

  /**
   * ZIP에서 첫 번째 오디오 파일 추출
   */
  private static async extractFirstAudioFromZip(
    zipBuffer: Buffer,
    tempDir: string
  ): Promise<string | null> {
    const zip = new AdmZip(zipBuffer);
    const zipEntries = zip.getEntries();

    const audioExts = ['.mp3', '.wav', '.flac', '.m4a', '.aac', '.ogg', '.wma'];

    for (const entry of zipEntries) {
      if (entry.isDirectory) continue;

      const ext = path.extname(entry.entryName).toLowerCase();
      if (audioExts.includes(ext)) {
        const outputPath = path.join(tempDir, path.basename(entry.entryName));
        await fs.writeFile(outputPath, entry.getData());
        return outputPath;
      }
    }

    return null;
  }

  /**
   * 오디오 길이 가져오기 (초)
   */
  private static async getAudioDuration(filePath: string): Promise<number> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) return reject(err);
        const duration = metadata.format.duration || 0;
        resolve(duration);
      });
    });
  }

  /**
   * 오디오 추출 (앞 N초)
   */
  private static async extractAudio(
    inputPath: string,
    outputPath: string,
    duration: number
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .setStartTime(0)
        .duration(duration)
        .audioCodec('libmp3lame')
        .audioBitrate('192k')
        .output(outputPath)
        .on('end', () => resolve())
        .on('error', (err) => reject(err))
        .run();
    });
  }

  /**
   * 임시 디렉토리 정리
   */
  private static async cleanupTempDir(dirPath: string): Promise<void> {
    try {
      await fs.rm(dirPath, { recursive: true, force: true });
    } catch (error) {
      console.error(`[SampleGen] 임시 디렉토리 정리 실패: ${dirPath}`, error);
    }
  }
}
```

---

## API 통합

### 상품 등록 API 수정

```typescript
// app/api/admin/products/route.ts

import { SampleGenerationService } from '@/lib/server/services/sample-generation.service';
import { uploadToR2 } from '@/lib/server/utils/r2';
import { ApiError } from '@/lib/server/utils/errors';

export async function POST(request: NextRequest) {
  try {
    // ... 관리자 권한 확인 ...

    const formData = await request.formData();
    const mainFile = formData.get('mainFile') as File | null;
    const sampleFile = formData.get('sampleFile') as File | null;

    // 0. 필수 파일 검증 ⭐
    if (!mainFile) {
      throw new ApiError('보이스팩 파일은 필수입니다', 400);
    }

    // 1. 메인 파일 업로드
    const mainFileBuffer = Buffer.from(await mainFile.arrayBuffer());
    const mainFileUrl = await uploadToR2({
      key: `voicepacks/${productId}/main.zip`,
      body: mainFileBuffer,
      contentType: mainFile.type,
    });

    // 2. 샘플 파일 처리
    let sampleFileUrl: string;
    let hasCustomSample: boolean;

    if (sampleFile) {
      // 케이스 2: 샘플 파일이 있으면 그대로 업로드 ✅
      console.log('[Product] 커스텀 샘플 파일 업로드');

      const sampleBuffer = Buffer.from(await sampleFile.arrayBuffer());
      sampleFileUrl = await uploadToR2({
        key: `voicepacks/${productId}/sample.mp3`,
        body: sampleBuffer,
        contentType: 'audio/mpeg',
      });

      hasCustomSample = true;
    } else {
      // 케이스 3: 샘플 파일이 없으면 자동 생성 ⭐
      console.log('[Product] 샘플 파일 자동 생성 시작...');

      const sampleBuffer = await SampleGenerationService.generateSample(
        mainFileBuffer,
        mainFile.name
      );

      sampleFileUrl = await uploadToR2({
        key: `voicepacks/${productId}/sample.mp3`,
        body: sampleBuffer,
        contentType: 'audio/mpeg',
      });

      hasCustomSample = false;

      console.log('[Product] 샘플 파일 자동 생성 완료');
    }

    // 3. DB에 저장
    const product = await ProductService.create({
      name,
      type: 'VOICE_PACK',
      price,
      digital_file_url: mainFileUrl,
      sample_audio_url: sampleFileUrl,
      has_custom_sample: hasCustomSample,
    });

    return successResponse(product);
  } catch (error) {
    return handleApiError(error);
  }
}
```

---

## 에러 핸들링

### 예상 에러 케이스

| 에러 상황 | 처리 방법 |
|----------|----------|
| **보이스팩 파일(mainFile)이 null** | **에러 반환: "보이스팩 파일은 필수입니다" ⭐** |
| ZIP 파일 내 오디오 파일 없음 | 에러 반환, 관리자에게 샘플 파일 직접 업로드 요청 |
| 지원하지 않는 오디오 형식 | 에러 반환, 지원 형식 안내 (MP3, WAV, FLAC 등) |
| 파일이 20초보다 짧음 | 경고 로그 출력, 전체 길이를 샘플로 사용 |
| ffmpeg 실행 실패 | 에러 반환, 관리자에게 샘플 파일 직접 업로드 요청 |
| 임시 디렉토리 생성 실패 | 에러 반환, 서버 상태 점검 필요 |
| R2 업로드 실패 | 에러 반환, R2 연결 상태 확인 |

### 에러 메시지

```typescript
const ERROR_MESSAGES = {
  MAIN_FILE_REQUIRED: '보이스팩 파일은 필수입니다.', // ⭐ 추가
  NO_AUDIO_IN_ZIP: 'ZIP 파일 내에 오디오 파일이 없습니다. 샘플 파일을 별도로 업로드해주세요.',
  UNSUPPORTED_FORMAT: '지원하지 않는 파일 형식입니다. MP3, WAV, FLAC, M4A 형식을 사용해주세요.',
  FFMPEG_ERROR: '샘플 생성 중 오류가 발생했습니다. 샘플 파일을 별도로 업로드해주세요.',
  FILE_TOO_SHORT: '파일이 20초보다 짧습니다. 전체를 샘플로 사용합니다.',
};
```

---

## 성능 고려사항

### 1. 비동기 처리

샘플 생성은 시간이 걸릴 수 있으므로 두 가지 옵션 고려:

**옵션 A: 동기 처리 (권장 - MVP)**
- 상품 등록 요청 시 즉시 샘플 생성
- 응답 시간: 5-15초 예상
- 간단하고 안정적

**옵션 B: 비동기 처리 (2차 개선)**
- 상품 등록 후 백그라운드에서 샘플 생성
- Job Queue 사용 (Bull, BullMQ 등)
- 생성 완료 시 DB 업데이트
- 응답 시간 빠름, 구현 복잡도 높음

**MVP에서는 옵션 A 사용 권장**

### 2. 임시 파일 관리

```typescript
// 임시 디렉토리는 반드시 정리
try {
  // ... 샘플 생성 로직 ...
} finally {
  await cleanupTempDir(tempDir);
}
```

### 3. 메모리 사용

- 큰 ZIP 파일 (100MB+) 처리 시 메모리 부족 가능
- 스트림 방식 처리 고려 (2차 개선)

---

## 데이터베이스 스키마

### products 테이블

```sql
CREATE TABLE products (
  ...
  has_custom_sample BOOLEAN DEFAULT false,
  -- true: 관리자가 별도 업로드
  -- false: 자동 생성
  ...
);
```

이미 스키마에 존재하는 컬럼이므로 마이그레이션 불필요.

---

## 로깅

샘플 생성 과정 로깅:

```typescript
import { LogService } from '@/lib/server/services/log.service';

// 샘플 생성 시작
console.log(`[SampleGen] 샘플 자동 생성 시작: ${productId}`);

// 샘플 생성 성공
console.log(`[SampleGen] 샘플 생성 완료: ${productId}, 크기: ${sampleBuffer.length} bytes`);

// 로그 기록 (선택적)
await LogService.log({
  eventType: 'SAMPLE_GENERATED',
  userId: adminId,
  details: {
    productId,
    mainFileName: mainFile.name,
    sampleSize: sampleBuffer.length,
    duration: extractDuration,
  },
});
```

---

## 테스트 시나리오

### 0. 보이스팩 파일 없음 (필수 검증) ⭐

**입력:**
- mainFile: null
- sampleFile: null

**기대 결과:**
- 에러 발생: "보이스팩 파일은 필수입니다"
- 상품 생성 불가

### 1. 커스텀 샘플 제공

**입력:**
- mainFile: `voicepack.zip`
- sampleFile: `custom-sample.mp3`

**기대 결과:**
- 둘 다 R2에 업로드
- 자동 생성 프로세스 실행 안 함
- `has_custom_sample = true`

### 2. ZIP 파일 (샘플 자동 생성)

**입력:**
- mainFile: `voicepack.zip` (내부: `track1.mp3`, `track2.mp3`, `cover.jpg`)
- sampleFile: null

**기대 결과:**
- `track1.mp3`의 앞 20초 추출
- `sample.mp3` 생성 및 R2 업로드
- `has_custom_sample = false`

### 3. 단일 MP3 파일 (샘플 자동 생성)

**입력:**
- mainFile: `voicepack.mp3` (길이: 180초)
- sampleFile: null

**기대 결과:**
- 앞 20초 추출
- `sample.mp3` 생성 및 R2 업로드
- `has_custom_sample = false`

### 4. WAV 파일 (형식 변환)

**입력:**
- mainFile: `voicepack.wav` (길이: 120초)
- sampleFile: null

**기대 결과:**
- 앞 20초 추출 + MP3로 변환
- `sample.mp3` 생성 및 R2 업로드
- `has_custom_sample = false`

### 5. 짧은 파일 (15초)

**입력:**
- mainFile: `short.mp3` (길이: 15초)
- sampleFile: null

**기대 결과:**
- 전체 15초를 샘플로 사용
- 경고 로그 출력
- `has_custom_sample = false`

### 6. ZIP 파일 (오디오 없음)

**입력:**
- mainFile: `images.zip` (내부: `cover.jpg`, `back.jpg`)
- sampleFile: null

**기대 결과:**
- 에러 발생: "ZIP 파일 내에 오디오 파일이 없습니다"
- 관리자에게 샘플 파일 직접 업로드 요청

---

## 구현 순서

### Phase 1: 기본 구현
1. ✅ 스펙 문서 작성
2. [ ] 필수 패키지 설치 (`fluent-ffmpeg`, `adm-zip`)
3. [ ] `SampleGenerationService` 구현
4. [ ] 로컬 테스트 (단일 MP3, WAV 파일)
5. [ ] ZIP 파일 처리 구현
6. [ ] 에러 핸들링 추가

### Phase 2: API 통합
7. [ ] 상품 등록 API 수정
8. [ ] R2 업로드 통합
9. [ ] 로깅 추가
10. [ ] 전체 플로우 테스트

### Phase 3: 프로덕션 준비
11. [ ] Docker에 ffmpeg 설치 (Dockerfile 수정)
12. [ ] Vercel 환경 ffmpeg 확인
13. [ ] 에러 모니터링 설정
14. [ ] 성능 테스트 (다양한 파일 크기)

---

## 프로덕션 배포 고려사항

### Vercel 환경

**문제:** Vercel은 기본적으로 ffmpeg를 제공하지 않음

**해결 방법:**

**옵션 1: ffmpeg-static 사용 (권장)**
```bash
npm install ffmpeg-static
```

```typescript
import ffmpegPath from 'ffmpeg-static';
import ffmpeg from 'fluent-ffmpeg';

ffmpeg.setFfmpegPath(ffmpegPath);
```

**옵션 2: Layer 사용**
- AWS Lambda Layer로 ffmpeg 제공
- Vercel Edge Function에서는 제한적

**옵션 3: 외부 서비스 사용**
- Cloudflare Workers (ffmpeg 미지원)
- AWS Lambda + S3 (복잡도 증가)

**MVP 권장: 옵션 1 (ffmpeg-static)**

### Docker 환경 (셀프 호스팅)

```dockerfile
FROM node:20

# ffmpeg 설치
RUN apt-get update && \
    apt-get install -y ffmpeg && \
    rm -rf /var/lib/apt/lists/*

# ... 나머지 Dockerfile ...
```

---

## 대안: 외부 API 사용

ffmpeg 설치/관리가 복잡하다면 외부 API 사용 고려:

### Cloudinary

- 오디오 처리 지원
- 자동 샘플 생성 가능
- 유료 플랜 필요

### FFmpeg.wasm

- 브라우저/Node.js에서 실행
- 성능 이슈 있음
- MVP에는 비권장

**결론: ffmpeg-static 사용이 가장 현실적**

---

## 질문 체크리스트

구현 전 확인이 필요한 사항:

1. **샘플 길이**
   - [ ] 20초가 적절한가? (변경 필요 시 몇 초?)

2. **ZIP 파일 처리**
   - [ ] ZIP 내 여러 오디오 파일이 있을 때 어떤 것을 사용? (첫 번째? 가장 긴 것?)
   - [ ] ZIP 내에 폴더 구조가 있을 때 재귀 검색?

3. **비트레이트/품질**
   - [ ] MP3 192kbps가 적절한가? (128kbps? 256kbps?)

4. **에러 처리**
   - [ ] 샘플 생성 실패 시 상품 등록을 막을 것인가? 아니면 경고만?

5. **비동기 처리**
   - [ ] MVP에서는 동기 처리 (5-15초 대기), 괜찮은가?

6. **파일 크기 제한**
   - [ ] 메인 파일 최대 크기 제한? (100MB? 500MB?)

7. **지원 형식**
   - [ ] MP3, WAV, FLAC, M4A, AAC, OGG 외에 추가 형식?

---

## 참고 자료

- [ffmpeg 공식 문서](https://ffmpeg.org/documentation.html)
- [fluent-ffmpeg npm](https://www.npmjs.com/package/fluent-ffmpeg)
- [adm-zip npm](https://www.npmjs.com/package/adm-zip)
- [ffmpeg-static npm](https://www.npmjs.com/package/ffmpeg-static)
- [Vercel에서 ffmpeg 사용하기](https://vercel.com/guides/using-ffmpeg-with-vercel)
