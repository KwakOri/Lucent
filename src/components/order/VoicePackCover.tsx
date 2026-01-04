"use client";

import { useState } from "react";
import Image from "next/image";

interface VoicePackCoverProps {
  index: number;
  name?: string;
  thumbnail?: string | null;
}

const GRADIENTS = [
  "from-[#a8e6cf] via-[#88c4e6] to-[#c4a8e6]",
  "from-[#ffd3a5] via-[#fd6585] to-[#c44eff]",
  "from-[#667eea] via-[#764ba2] to-[#f093fb]",
  "from-[#f093fb] via-[#f5576c] to-[#ffd3a5]",
  "from-[#4facfe] via-[#00f2fe] to-[#a8e6cf]",
];

export function VoicePackCover({
  index,
  name,
  thumbnail,
}: VoicePackCoverProps) {
  const gradient = GRADIENTS[index % GRADIENTS.length];
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="aspect-4/3 relative overflow-hidden"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 홀로그램 배경 */}
      <div className={`absolute inset-0 bg-linear-to-br ${gradient}`} />

      {/* 노이즈 텍스처 오버레이 */}
      <div
        className="absolute inset-0 opacity-30 mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* CD 케이스 프레임 */}
      <div className="absolute inset-2 border border-white/40 rounded-lg" />

      {/* 왼쪽 사이드 패턴 */}
      <div className="absolute left-0 top-0 bottom-0 w-8 bg-white/30 backdrop-blur-sm flex flex-col items-center justify-center gap-1.5 py-3">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="w-4 h-4 border-2 border-[#1a1a2e]/30 rotate-45"
          />
        ))}
      </div>

      {/* 상단 좌측 라벨 */}
      <div className="absolute top-3 left-11">
        <p className="text-[8px] text-[#1a1a2e]/70 font-mono font-medium">
          Voice Pack
        </p>
        <p className="text-[8px] text-[#1a1a2e]/50 font-mono">
          Digital Archive
        </p>
        <p className="text-[8px] text-[#1a1a2e]/50 font-mono">Collection</p>
      </div>

      {/* 썸네일 이미지 (있을 경우) */}
      {thumbnail && (
        <div className="absolute top-12 left-11 w-14 h-14 rounded-md overflow-hidden shadow-lg border border-white/50">
          <Image
            src={thumbnail}
            alt={name || "Voice Pack"}
            fill
            className="object-cover"
          />
        </div>
      )}

      {/* CD 디스크 - 호버 시 계속 회전 */}
      <div
        className="absolute bottom-4 right-4 w-24 h-24"
        style={{
          animation: isHovered ? "spin 3s linear infinite" : "none",
        }}
      >
        {/* 디스크 외곽 */}
        <div className="absolute inset-0 rounded-full bg-linear-to-br from-[#e8e8e8] via-[#f8f8f8] to-[#d0d0d0] shadow-xl">
          {/* 홀로그램 효과 */}
          <div className="absolute inset-0 rounded-full bg-linear-to-tr from-[#ff6b9d]/30 via-[#c44eff]/20 to-[#00d4ff]/30 mix-blend-overlay" />

          {/* 썸네일을 CD에도 표시 */}
          {thumbnail && (
            <div className="absolute inset-2 rounded-full overflow-hidden opacity-40">
              <Image
                src={thumbnail}
                alt={name || "Voice Pack"}
                fill
                className="object-cover"
              />
            </div>
          )}

          {/* 디스크 링 */}
          <div className="absolute inset-1 rounded-full border border-black/5" />
          <div className="absolute inset-3 rounded-full border border-black/5" />
          <div className="absolute inset-6 rounded-full border border-black/5" />
          <div className="absolute inset-9 rounded-full border border-black/10" />

          {/* 중앙 홀 */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-4 h-4 rounded-full bg-[#1a1a2e]" />
          </div>

          {/* 디스크 라벨 */}
          <div className="absolute inset-0 flex items-end justify-center pb-7">
            <p className="text-[5px] text-[#1a1a2e]/40 font-mono tracking-widest">
              DISC-DRIVE
            </p>
          </div>
        </div>
      </div>

      {/* 우측 상단 코드 */}
      <div className="absolute top-3 right-3">
        <p className="text-[10px] font-bold text-[#1a1a2e]/60 font-mono">
          VP-{String(index + 1).padStart(3, "0")}
        </p>
      </div>

      {/* 하단 우측 화살표 */}
      <div
        className={`absolute bottom-3 right-3 w-5 h-5 border border-white/50 rounded flex items-center justify-center bg-white/20 backdrop-blur-sm transition-opacity ${
          isHovered ? "opacity-100" : "opacity-0"
        }`}
      >
        <svg
          className="w-2.5 h-2.5 text-[#1a1a2e]/70"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 17L17 7M17 7H7M17 7v10"
          />
        </svg>
      </div>
    </div>
  );
}
