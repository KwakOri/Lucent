# 보이스팩 기능 스펙

## 개요

보이스팩은 Lucent Management의 핵심 디지털 상품입니다. 사용자는 보이스팩을 구매하고, 입금 확인 후 이메일로 다운로드 링크를 받아 파일을 다운로드할 수 있습니다.

## 파일 저장소

### Cloudflare R2 스토리지

모든 보이스팩 파일은 Cloudflare R2에 저장됩니다:

- **메인 파일**: 전체 보이스팩 (구매자에게 제공)
- **샘플 파일**: 미리듣기용 샘플 (모든 사용자에게 공개)

### 파일 경로 구조

```
voicepacks/
├── {product_id}/
│   ├── main.zip           # 메인 보이스팩 파일
│   └── sample.mp3         # 샘플 파일
```

예시:
```
voicepacks/miruru-spring-2025/main.zip
voicepacks/miruru-spring-2025/sample.mp3
```

---

## 샘플 파일 처리

### 1. 사용자가 샘플 파일을 별도로 업로드하는 경우

관리자가 보이스팩을 등록할 때 샘플 파일을 별도로 업로드:

```
✅ 메인 파일: miruru-spring-2025.zip (업로드)
✅ 샘플 파일: miruru-spring-2025-sample.mp3 (업로드)
```

→ 두 파일 모두 R2에 업로드

### 2. 샘플 파일을 업로드하지 않는 경우

메인 파일만 업로드하고 샘플을 업로드하지 않으면:

```
✅ 메인 파일: miruru-spring-2025.zip (업로드)
❌ 샘플 파일: (없음)
```

→ 시스템이 자동으로 메인 파일에서 **앞 20초**를 추출하여 샘플 생성

**자동 샘플 생성 프로세스:**

1. 메인 파일이 ZIP인 경우:
   - ZIP 압축 해제
   - 첫 번째 오디오 파일 (mp3, wav, m4a 등) 찾기
   - 해당 파일의 앞 20초 추출
   - `sample.mp3`로 변환 및 저장

2. 메인 파일이 단일 오디오 파일인 경우:
   - 앞 20초 추출
   - `sample.mp3`로 저장

**사용 도구:**
- `ffmpeg`: 오디오 추출 및 변환
- `node-archiver` 또는 `adm-zip`: ZIP 처리

---

## 구매 프로세스

### 전체 플로우

```
1. [사용자] 보이스팩 상품 페이지 접속
          ↓
2. [사용자] 샘플 미리듣기 (무료, 로그인 불필요)
          ↓
3. [사용자] 구매하기 버튼 클릭 → 로그인/회원가입
          ↓
4. [사용자] 주문서 작성 (주문자 정보 입력)
          ↓
5. [시스템] 주문 생성 (status: PENDING)
          ↓
6. [사용자] 주문 완료 페이지에서 계좌번호 안내 확인
          ↓
7. [사용자] 계좌이체 입금
          ↓
8. [관리자] 주문 관리 대시보드에서 입금 확인
          ↓
9. [관리자] "입금 확인" 버튼 클릭 → 주문 상태 변경 (PENDING → PAID)
          ↓
10. [관리자] "전송" 버튼 클릭
          ↓
11. [시스템] 이메일 발송 (다운로드 링크 포함)
          ↓
12. [사용자] 이메일에서 다운로드 링크 클릭
          ↓
13. [시스템] Presigned URL 생성 (유효기간 1시간)
          ↓
14. [사용자] 보이스팩 다운로드
```

### 주문 상태별 설명

| 상태 | 설명 | 사용자 액션 | 관리자 액션 |
|------|------|-------------|-------------|
| `PENDING` | 입금 대기 | 계좌이체 입금 | 입금 확인 후 상태 변경 |
| `PAID` | 입금 완료 | - | "전송" 버튼으로 이메일 발송 |
| `DONE` | 전송 완료 | 마이페이지에서 재다운로드 | - |

---

## 이메일 전송

### 전송 버튼 (관리자)

**위치**: 관리자 대시보드 → 주문 관리 → 주문 상세

**조건**:
- 주문 상태가 `PAID`일 때만 활성화
- 디지털 상품(VOICE_PACK)만 전송 버튼 표시

**동작**:
1. "전송" 버튼 클릭
2. 시스템이 다운로드 링크 생성
3. 구매자 이메일로 발송
4. 주문 상태를 `DONE`으로 변경
5. 로그 기록

### 이메일 템플릿

**제목**:
```
[Lucent Management] {상품명} 다운로드 링크 안내
```

**본문**:
```html
안녕하세요, {구매자 이름}님!

주문하신 보이스팩의 결제가 확인되었습니다.
아래 링크에서 다운로드하실 수 있습니다.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📦 상품명: {상품명}
💰 결제 금액: {금액}원
📅 주문 번호: {주문번호}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔗 다운로드 링크
{다운로드_링크}

⏰ 링크 유효기간: 1시간
※ 링크가 만료된 경우 마이페이지에서 재다운로드하실 수 있습니다.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 마이페이지에서 언제든지 재다운로드 가능합니다
{마이페이지_링크}

감사합니다.
Lucent Management
```

---

## 다운로드 링크 생성

### Presigned URL (R2)

보안을 위해 임시 다운로드 링크를 생성합니다:

**특징**:
- R2 Presigned URL 사용
- 유효기간: **1시간**
- 일회용이 아님 (유효기간 내 재다운로드 가능)

**구현**:
```typescript
import { generateSignedUrl } from '@/lib/server/utils/r2';

const downloadUrl = await generateSignedUrl({
  key: `voicepacks/${productId}/main.zip`,
  expiresIn: 3600, // 1시간
});
```

### 재다운로드 (마이페이지)

사용자는 마이페이지에서 언제든지 재다운로드 가능:

**조건**:
- 주문 상태가 `PAID`, `DONE`일 때만 다운로드 가능
- 다운로드 횟수 제한 없음

**프로세스**:
1. 마이페이지 → 주문 내역 → 다운로드 버튼
2. 새로운 Presigned URL 생성
3. 다운로드 시작
4. 다운로드 횟수 증가 (통계용)

---

## 데이터베이스

### products 테이블

```sql
CREATE TABLE products (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type product_type NOT NULL,           -- 'VOICE_PACK'
  price INTEGER NOT NULL,
  digital_file_url TEXT,                -- R2 메인 파일 URL
  sample_audio_url TEXT,                -- R2 샘플 파일 URL
  has_custom_sample BOOLEAN DEFAULT false, -- 별도 샘플 업로드 여부
  ...
);
```

### order_items 테이블

```sql
CREATE TABLE order_items (
  id UUID PRIMARY KEY,
  order_id UUID REFERENCES orders(id),
  product_id UUID REFERENCES products(id),
  download_count INTEGER DEFAULT 0,     -- 다운로드 횟수
  last_downloaded_at TIMESTAMPTZ,       -- 마지막 다운로드 시간
  ...
);
```

---

## API 엔드포인트

### 샘플 재생

```
GET /api/products/{product_id}/sample
```

**권한**: 누구나 (로그인 불필요)

**응답**:
```json
{
  "success": true,
  "data": {
    "sampleUrl": "https://r2.example.com/voicepacks/.../sample.mp3",
    "duration": 20 // 초
  }
}
```

### 다운로드 링크 생성

```
POST /api/orders/{order_id}/items/{item_id}/download
```

**권한**: 본인 또는 관리자

**응답**:
```json
{
  "success": true,
  "data": {
    "downloadUrl": "https://r2.example.com/...",
    "expiresIn": 3600,
    "expiresAt": "2025-01-01T12:00:00Z"
  }
}
```

### 이메일 전송 (관리자)

```
POST /api/admin/orders/{order_id}/send-download-link
```

**권한**: 관리자만

**요청**:
```json
{
  "orderId": "uuid"
}
```

**응답**:
```json
{
  "success": true,
  "data": {
    "emailSent": true,
    "sentTo": "user@example.com",
    "sentAt": "2025-01-01T10:00:00Z"
  }
}
```

---

## 보안 고려사항

### 1. 다운로드 링크 보호

- ❌ 직접 R2 URL 노출 금지
- ✅ Presigned URL 사용 (1시간 유효)
- ✅ 본인 인증 후 링크 생성

### 2. 권한 검증

다운로드 링크 생성 전 확인:
1. 주문이 존재하는가?
2. 주문이 본인의 것인가?
3. 주문 상태가 PAID/DONE인가?
4. 상품이 디지털 상품인가?

### 3. Rate Limiting

- 다운로드 링크 생성: 사용자당 분당 10회
- 샘플 재생: IP당 분당 30회

---

## 로깅

모든 다운로드 이벤트는 `logs` 테이블에 기록:

```typescript
await LogService.logDigitalProductDownload(
  productId,
  orderId,
  userId,
  ipAddress,
  {
    productName: '미루루 봄 보이스팩',
    downloadCount: 3,
  }
);
```

**로그 이벤트**:
- `DIGITAL_PRODUCT_DOWNLOAD` - 다운로드 링크 생성
- `EMAIL_SENT` - 다운로드 링크 이메일 발송
- `UNAUTHORIZED_DOWNLOAD` - 권한 없는 다운로드 시도

---

## 구현 우선순위

### MVP (1차 오픈)

- [x] R2 파일 업로드
- [x] 샘플 재생 기능
- [x] 주문 생성
- [ ] 관리자 입금 확인
- [ ] 이메일 다운로드 링크 발송
- [ ] 마이페이지 다운로드 버튼

### 추후 개선

- [ ] 자동 샘플 생성 (ffmpeg)
- [ ] 다운로드 통계 대시보드
- [ ] 다운로드 횟수 제한 (선택적)
- [ ] 자동 입금 확인 연동 (PG 도입 시)

---

## 참고 문서

- [R2 설정 가이드](/docs/r2-setup.md)
- [이메일 설정 가이드](/docs/email-setup.md)
- [로깅 시스템 가이드](/examples/logging/README.md)
- [주문 API 스펙](/specs/api/server/routes/orders.md)
