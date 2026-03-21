'use client';

import { useState, useRef, ChangeEvent, DragEvent } from 'react';
import { apiClient } from '@/lib/client/utils/api-client';
import type { ApiResponse } from '@/types';

interface ImageUploadProps {
  imageType: 'project_cover' | 'artist_profile' | 'product_main' | 'product_gallery';
  onUploadSuccess: (imageId: string, publicUrl: string) => void;
  currentImageUrl?: string;
  altText?: string;
  label?: string;
}

export function ImageUpload({
  imageType,
  onUploadSuccess,
  currentImageUrl,
  altText,
  label = '이미지 업로드',
}: ImageUploadProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl || null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File) => {
    // 파일 검증
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('JPG, PNG, WEBP 파일만 업로드 가능합니다');
      return;
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      setError('파일 크기는 5MB를 초과할 수 없습니다');
      return;
    }

    // 미리보기 생성
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);

    // 업로드
    uploadFile(file);
  };

  const uploadFile = async (file: File) => {
    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('image_type', imageType);
      if (altText) {
        formData.append('alt_text', altText);
      }

      const response = await apiClient.post<
        ApiResponse<{
          id: string;
          public_url: string;
        }>
      >('/api/images/upload', formData);
      onUploadSuccess(response.data.id, response.data.public_url);
    } catch (err) {
      setError(err instanceof Error ? err.message : '이미지 업로드에 실패했습니다');
      setPreviewUrl(currentImageUrl || null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>

      {/* 업로드 영역 */}
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
          ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
          ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileInputChange}
          disabled={isUploading}
          className="hidden"
        />

        {previewUrl ? (
          <div className="space-y-3">
            <div className="relative w-full h-48 bg-gray-100 rounded-lg overflow-hidden">
              <img
                src={previewUrl}
                alt="Preview"
                className="w-full h-full object-contain"
              />
            </div>
            {!isUploading && (
              <p className="text-sm text-gray-500">클릭하거나 드래그하여 이미지 변경</p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
              aria-hidden="true"
            >
              <path
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <div className="text-sm text-gray-600">
              <span className="font-semibold text-blue-600">클릭하여 업로드</span> 또는 드래그앤드롭
            </div>
            <p className="text-xs text-gray-500">JPG, PNG, WEBP (최대 5MB)</p>
          </div>
        )}

        {isUploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 rounded-lg">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-sm text-gray-600">업로드 중...</p>
            </div>
          </div>
        )}
      </div>

      {/* 에러 메시지 */}
      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}

      {/* 도움말 */}
      <p className="mt-2 text-xs text-gray-500">
        권장 크기: {imageType === 'project_cover' ? '1200x630px' : imageType === 'artist_profile' ? '400x400px' : '800x800px'}
      </p>
    </div>
  );
}
