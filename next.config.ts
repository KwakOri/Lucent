import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  serverExternalPackages: ['ffmpeg-static', 'ffprobe-static'],
};

export default nextConfig;
