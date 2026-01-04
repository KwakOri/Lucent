/**
 * Sample Generation Service
 *
 * 보이스팩 메인 파일에서 자동으로 샘플 생성
 * - ZIP 파일 내 첫 번째 오디오 추출
 * - 단일 오디오 파일 처리
 * - ffmpeg로 앞 20초 추출 및 MP3 변환
 */

import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import ffprobeStatic from 'ffprobe-static';
import AdmZip from 'adm-zip';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';

// ffmpeg 바이너리 경로 설정
if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic);
}

// ffprobe 바이너리 경로 설정
if (ffprobeStatic.path) {
  ffmpeg.setFfprobePath(ffprobeStatic.path);
}

/**
 * Sample Generation Service
 */
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
    console.log('[SampleGen] 샘플 생성 시작:', {
      fileName: mainFileName,
      bufferSize: mainFileBuffer.length,
    });

    const tempDir = path.join(os.tmpdir(), `sample-gen-${uuidv4()}`);
    console.log('[SampleGen] 임시 디렉토리:', tempDir);

    try {
      // 임시 디렉토리 생성
      await fs.mkdir(tempDir, { recursive: true });
      console.log('[SampleGen] 임시 디렉토리 생성 완료');

      // 파일 형식 판별
      const fileType = this.getFileType(mainFileName);
      console.log('[SampleGen] 파일 타입 판별:', fileType);

      let audioPath: string | null = null;

      if (fileType === 'zip') {
        // ZIP 파일에서 첫 번째 오디오 추출
        console.log('[SampleGen] ZIP 파일 처리 시작...');
        audioPath = await this.extractFirstAudioFromZip(mainFileBuffer, tempDir);
        if (!audioPath) {
          console.error('[SampleGen] ZIP 파일 내 오디오 파일 없음');
          throw new Error('ZIP 파일 내에 오디오 파일이 없습니다. 샘플 파일을 별도로 업로드해주세요.');
        }
        console.log('[SampleGen] ZIP에서 오디오 추출 완료:', audioPath);
      } else if (fileType === 'audio') {
        // 단일 오디오 파일
        console.log('[SampleGen] 단일 오디오 파일 처리...');
        audioPath = path.join(tempDir, mainFileName);
        await fs.writeFile(audioPath, mainFileBuffer);
        console.log('[SampleGen] 오디오 파일 저장 완료:', audioPath);
      } else {
        console.error('[SampleGen] 지원하지 않는 파일 형식:', mainFileName);
        throw new Error('지원하지 않는 파일 형식입니다. MP3, WAV, FLAC, M4A 형식 또는 ZIP 파일을 사용해주세요.');
      }

      // TypeScript 타입 가드 - 여기 도달했다면 audioPath는 항상 string
      if (!audioPath) {
        console.error('[SampleGen] audioPath가 null입니다');
        throw new Error('오디오 파일 경로를 찾을 수 없습니다.');
      }

      console.log('[SampleGen] 오디오 경로 확정:', audioPath);

      // 오디오 길이 확인
      console.log('[SampleGen] ffprobe로 오디오 길이 확인 중...');
      const duration = await this.getAudioDuration(audioPath);
      console.log('[SampleGen] 오디오 길이:', duration.toFixed(1), '초');

      const extractDuration = Math.min(duration, 20);

      if (duration < 20) {
        console.warn(`[SampleGen] 파일이 ${duration.toFixed(1)}초로 20초보다 짧습니다. 전체를 샘플로 사용합니다.`);
      }

      // 20초 추출
      const samplePath = path.join(tempDir, 'sample.mp3');
      console.log('[SampleGen] ffmpeg로 샘플 추출 시작:', {
        inputPath: audioPath,
        outputPath: samplePath,
        extractDuration,
      });

      await this.extractAudio(audioPath, samplePath, extractDuration);
      console.log('[SampleGen] ffmpeg 처리 완료');

      // Buffer로 읽기
      const sampleBuffer = await fs.readFile(samplePath);

      console.log(`[SampleGen] 샘플 생성 완료: ${sampleBuffer.length} bytes, ${extractDuration.toFixed(1)}초`);

      return sampleBuffer;
    } catch (error) {
      console.error('[SampleGen] 샘플 생성 중 에러 발생:', error);
      console.error('[SampleGen] 에러 스택:', error instanceof Error ? error.stack : 'No stack trace');
      throw error;
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
    console.log('[SampleGen] 파일 확장자:', ext);

    if (ext === 'zip') {
      console.log('[SampleGen] ZIP 파일로 판별됨');
      return 'zip';
    }

    const audioExts = ['mp3', 'wav', 'flac', 'm4a', 'aac', 'ogg', 'wma'];
    if (audioExts.includes(ext || '')) {
      console.log('[SampleGen] 오디오 파일로 판별됨:', ext);
      return 'audio';
    }

    console.log('[SampleGen] 알 수 없는 파일 형식:', ext);
    return 'unknown';
  }

  /**
   * ZIP에서 첫 번째 오디오 파일 추출
   */
  private static async extractFirstAudioFromZip(
    zipBuffer: Buffer,
    tempDir: string
  ): Promise<string | null> {
    console.log('[SampleGen] ZIP 파일 파싱 시작, 크기:', zipBuffer.length, 'bytes');

    const zip = new AdmZip(zipBuffer);
    const zipEntries = zip.getEntries();
    console.log('[SampleGen] ZIP 엔트리 개수:', zipEntries.length);

    const audioExts = ['.mp3', '.wav', '.flac', '.m4a', '.aac', '.ogg', '.wma'];

    for (const entry of zipEntries) {
      console.log('[SampleGen] ZIP 엔트리 확인:', {
        name: entry.entryName,
        isDirectory: entry.isDirectory,
        size: entry.header.size,
      });

      if (entry.isDirectory) continue;

      const ext = path.extname(entry.entryName).toLowerCase();
      console.log('[SampleGen] 파일 확장자:', ext);

      if (audioExts.includes(ext)) {
        const outputPath = path.join(tempDir, path.basename(entry.entryName));
        console.log(`[SampleGen] ZIP에서 오디오 파일 추출 중: ${entry.entryName} -> ${outputPath}`);

        await fs.writeFile(outputPath, entry.getData());
        console.log(`[SampleGen] ZIP에서 오디오 파일 추출 완료: ${entry.entryName}`);
        return outputPath;
      }
    }

    console.warn('[SampleGen] ZIP 파일 내 오디오 파일을 찾지 못했습니다');
    return null;
  }

  /**
   * 오디오 길이 가져오기 (초)
   */
  private static async getAudioDuration(filePath: string): Promise<number> {
    console.log('[SampleGen] ffprobe 실행:', filePath);
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) {
          console.error('[SampleGen] ffprobe 에러:', err);
          return reject(err);
        }
        const duration = metadata.format.duration || 0;
        console.log('[SampleGen] ffprobe 메타데이터:', {
          duration,
          format: metadata.format.format_name,
          codec: metadata.streams[0]?.codec_name,
        });
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
    console.log('[SampleGen] ffmpeg 명령 구성:', {
      input: inputPath,
      output: outputPath,
      duration,
      codec: 'libmp3lame',
      bitrate: '192k',
    });

    return new Promise((resolve, reject) => {
      const command = ffmpeg(inputPath)
        .setStartTime(0)
        .duration(duration)
        .audioCodec('libmp3lame')
        .audioBitrate('192k')
        .output(outputPath)
        .on('start', (commandLine) => {
          console.log('[SampleGen] ffmpeg 실행 시작:', commandLine);
        })
        .on('progress', (progress) => {
          console.log('[SampleGen] ffmpeg 진행률:', progress);
        })
        .on('end', () => {
          console.log(`[SampleGen] ffmpeg 처리 완료: ${outputPath}`);
          resolve();
        })
        .on('error', (err) => {
          console.error('[SampleGen] ffmpeg 에러:', err);
          console.error('[SampleGen] ffmpeg 에러 메시지:', err.message);
          reject(new Error('샘플 생성 중 오류가 발생했습니다. 샘플 파일을 별도로 업로드해주세요.'));
        });

      command.run();
    });
  }

  /**
   * 임시 디렉토리 정리
   */
  private static async cleanupTempDir(dirPath: string): Promise<void> {
    try {
      await fs.rm(dirPath, { recursive: true, force: true });
      console.log(`[SampleGen] 임시 디렉토리 정리 완료: ${dirPath}`);
    } catch (error) {
      console.error(`[SampleGen] 임시 디렉토리 정리 실패: ${dirPath}`, error);
      // 정리 실패는 무시 (임시 파일이므로)
    }
  }
}
