import type {
  V2DigitalAsset,
  V2MediaAssetKind,
} from '@/lib/client/api/v2-catalog-admin.api';

export const DIGITAL_FILE_ACCEPT =
  'audio/*,.mp3,.wav,.flac,.m4a,.zip,application/zip,application/x-zip-compressed';

export type DigitalAssetInputMode = 'FILE' | 'LINK';

function isAudioFile(file: File): boolean {
  const mime = file.type.toLowerCase();
  if (mime.startsWith('audio/')) {
    return true;
  }
  return /\.(mp3|wav|flac|m4a)$/i.test(file.name);
}

function isZipFile(file: File): boolean {
  const mime = file.type.toLowerCase();
  return (
    mime === 'application/zip' ||
    mime === 'application/x-zip-compressed' ||
    /\.zip$/i.test(file.name)
  );
}

export function isSupportedDigitalFile(file: File): boolean {
  return isAudioFile(file) || isZipFile(file);
}

export function inferDigitalFileAssetKind(file: File): V2MediaAssetKind {
  return isZipFile(file) ? 'ARCHIVE' : 'AUDIO';
}

export function inferDigitalFileMimeType(file: File): string {
  if (file.type) {
    return file.type;
  }
  if (isZipFile(file)) {
    return 'application/zip';
  }
  if (/\.mp3$/i.test(file.name)) {
    return 'audio/mpeg';
  }
  if (/\.wav$/i.test(file.name)) {
    return 'audio/wav';
  }
  if (/\.flac$/i.test(file.name)) {
    return 'audio/flac';
  }
  if (/\.m4a$/i.test(file.name)) {
    return 'audio/mp4';
  }
  return 'application/octet-stream';
}

export function inferExternalLinkAssetKind(
  url: string,
  fileName: string,
): V2MediaAssetKind {
  return /\.zip(?:$|[?#\s])/i.test(`${fileName} ${url}`) ? 'ARCHIVE' : 'FILE';
}

export function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value.trim());
}

export function getExistingDigitalAssetInput(asset: V2DigitalAsset | null | undefined): {
  mode: DigitalAssetInputMode;
  linkUrl: string;
  fileName: string;
} | null {
  if (!asset) {
    return null;
  }

  const storageProvider = asset.media_asset?.storage_provider?.toUpperCase() || '';
  const isExternalLink =
    (storageProvider !== '' && storageProvider !== 'R2') || isHttpUrl(asset.storage_path);

  if (!isExternalLink) {
    return {
      mode: 'FILE',
      linkUrl: '',
      fileName: asset.file_name,
    };
  }

  const metadataUrl =
    typeof asset.metadata?.external_url === 'string'
      ? asset.metadata.external_url
      : '';
  const linkUrl = [
    metadataUrl,
    asset.media_asset?.public_url || '',
    asset.media_asset?.storage_path || '',
    asset.storage_path,
  ].find((candidate) => isHttpUrl(candidate)) || '';

  return {
    mode: 'LINK',
    linkUrl,
    fileName: asset.file_name,
  };
}
