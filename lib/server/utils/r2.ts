/**
 * Cloudflare R2 Utility
 *
 * S3 호환 API를 사용하여 R2 버킷에 파일을 업로드/다운로드/삭제합니다.
 */

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// ===== R2 클라이언트 설정 =====

/**
 * R2 S3 클라이언트 생성
 *
 * Cloudflare R2는 S3 호환 API를 제공합니다.
 * S3 엔드포인트는 `https://{ACCOUNT_ID}.r2.cloudflarestorage.com` 형식입니다.
 */
const r2Client = new S3Client({
  region: 'auto', // R2는 리전이 없으므로 'auto' 사용
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME = process.env.R2_BUCKET_NAME!;
const PUBLIC_URL = process.env.R2_PUBLIC_URL!;

// ===== 파일 업로드 =====

export interface UploadFileOptions {
  key: string; // 파일 경로 (예: "images/products/voicepack-vol1.png")
  body: Buffer | Uint8Array | string; // 파일 내용
  contentType?: string; // MIME 타입 (예: "image/png")
  metadata?: Record<string, string>; // 사용자 정의 메타데이터
}

/**
 * R2에 파일 업로드
 *
 * @example
 * await uploadFile({
 *   key: 'images/products/voicepack-vol1.png',
 *   body: buffer,
 *   contentType: 'image/png'
 * });
 */
export async function uploadFile(options: UploadFileOptions): Promise<string> {
  const { key, body, contentType, metadata } = options;

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: body,
    ContentType: contentType,
    Metadata: metadata,
  });

  await r2Client.send(command);

  // Public URL 반환 (CDN을 통해 접근 가능)
  return `${PUBLIC_URL}/${key}`;
}

// ===== 파일 다운로드 =====

/**
 * R2에서 파일 다운로드
 *
 * @example
 * const buffer = await downloadFile('images/products/voicepack-vol1.png');
 */
export async function downloadFile(key: string): Promise<Buffer> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  const response = await r2Client.send(command);
  const stream = response.Body as NodeJS.ReadableStream;

  // Stream을 Buffer로 변환
  const chunks: Uint8Array[] = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks);
}

// ===== 서명된 URL 생성 (임시 다운로드 링크) =====

export interface SignedUrlOptions {
  key: string; // 파일 경로
  expiresIn?: number; // 만료 시간 (초 단위, 기본: 3600초 = 1시간)
}

/**
 * 임시 다운로드 링크 생성 (Signed URL)
 *
 * 디지털 상품 다운로드 시 사용:
 * - 구매한 사용자만 다운로드 가능
 * - 일정 시간 후 자동 만료
 * - Public URL로 직접 접근 불가능한 파일에 사용
 *
 * @example
 * const downloadUrl = await generateSignedUrl({
 *   key: 'products/voicepacks/miruru-vol1.zip',
 *   expiresIn: 600 // 10분
 * });
 */
export async function generateSignedUrl(options: SignedUrlOptions): Promise<string> {
  const { key, expiresIn = 3600 } = options;

  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  // S3 Presigned URL 생성
  const signedUrl = await getSignedUrl(r2Client, command, { expiresIn });

  return signedUrl;
}

// ===== 파일 삭제 =====

/**
 * R2에서 파일 삭제
 *
 * @example
 * await deleteFile('images/products/old-image.png');
 */
export async function deleteFile(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  await r2Client.send(command);
}

// ===== 파일 목록 조회 =====

export interface ListFilesOptions {
  prefix?: string; // 접두사 필터 (예: "images/products/")
  maxKeys?: number; // 최대 반환 개수 (기본: 1000)
}

/**
 * R2 버킷의 파일 목록 조회
 *
 * @example
 * const files = await listFiles({ prefix: 'images/products/' });
 */
export async function listFiles(options: ListFilesOptions = {}): Promise<string[]> {
  const { prefix, maxKeys = 1000 } = options;

  const command = new ListObjectsV2Command({
    Bucket: BUCKET_NAME,
    Prefix: prefix,
    MaxKeys: maxKeys,
  });

  const response = await r2Client.send(command);

  return response.Contents?.map(obj => obj.Key!).filter(Boolean) || [];
}

// ===== Public URL 생성 =====

/**
 * Public URL 생성
 *
 * Public Access가 활성화된 파일의 CDN URL을 반환합니다.
 * 이미지, 공개 파일 등에 사용합니다.
 *
 * @example
 * const imageUrl = getPublicUrl('images/products/voicepack-vol1.png');
 * // https://cdn.example.com/images/products/voicepack-vol1.png
 */
export function getPublicUrl(key: string): string {
  return `${PUBLIC_URL}/${key}`;
}

// ===== 유틸리티 함수 =====

/**
 * 파일 확장자로 MIME 타입 추론
 */
export function getMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();

  const mimeTypes: Record<string, string> = {
    // 이미지
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',

    // 오디오
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    ogg: 'audio/ogg',

    // 비디오
    mp4: 'video/mp4',
    webm: 'video/webm',

    // 문서
    pdf: 'application/pdf',
    zip: 'application/zip',
    json: 'application/json',
    txt: 'text/plain',
  };

  return mimeTypes[ext || ''] || 'application/octet-stream';
}

/**
 * 파일 크기를 사람이 읽기 쉬운 형식으로 변환
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}
