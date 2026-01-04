import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  serverExternalPackages: ['ffmpeg-static', 'ffprobe-static'],

  // API Route body size limit 증가 (보이스팩 업로드용)
  experimental: {
    serverActions: {
      bodySizeLimit: '500mb', // 기본 10MB -> 500MB로 증가
    },
  },
};

export default nextConfig;
