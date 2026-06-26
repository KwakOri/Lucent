"use client";

import { useState } from "react";

interface VoicePackCoverProps {
  index: number;
  name?: string;
  thumbnail?: string | null;
  appearance?: "gradient" | "media";
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
  appearance = "gradient",
}: VoicePackCoverProps) {
  const gradient = GRADIENTS[index % GRADIENTS.length];
  const [isHovered, setIsHovered] = useState(false);
  const usesMediaBackground = appearance === "media";

  return (
    <div
      className="aspect-4/3 relative overflow-hidden"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 홀로그램 배경 */}
      {usesMediaBackground ? (
        <>
          {thumbnail ? (
            <img
              src={thumbnail}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 h-full w-full scale-125 object-cover opacity-90 blur-2xl"
            />
          ) : null}
          <div className="absolute inset-0 bg-[#070711]/80" />
          <div
            className="absolute inset-0 opacity-70 mix-blend-screen"
            style={{
              background:
                "radial-gradient(circle at 55% 45%, rgba(255,255,255,0.32), rgba(255,255,255,0.08) 20%, rgba(255,255,255,0) 44%), linear-gradient(135deg, rgba(255,255,255,0.22), rgba(255,255,255,0.03) 38%, rgba(80,160,255,0.16) 68%, rgba(255,255,255,0.06))",
            }}
          />
        </>
      ) : (
        <div className={`absolute inset-0 bg-linear-to-br ${gradient}`} />
      )}

      {/* 노이즈 텍스처 오버레이 */}
      <div
        className={`absolute inset-0 mix-blend-overlay ${
          usesMediaBackground ? "opacity-20" : "opacity-30"
        }`}
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* CD 케이스 프레임 */}
      <div className="absolute inset-2 rounded-lg border border-white/40" />

      {/* 왼쪽 사이드 패턴 */}
      <div
        className={`absolute bottom-0 left-0 top-0 flex w-8 flex-col items-center justify-center gap-1.5 py-3 backdrop-blur-sm ${
          usesMediaBackground ? "bg-white/10" : "bg-white/30"
        }`}
      >
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className={`h-4 w-4 rotate-45 border-2 ${
              usesMediaBackground ? "border-white/30" : "border-[#1a1a2e]/30"
            }`}
          />
        ))}
      </div>

      {/* 상단 좌측 라벨 */}
      <div className="absolute top-3 left-11">
        <p
          className={`font-mono text-[8px] font-medium ${
            usesMediaBackground ? "text-white/80" : "text-[#1a1a2e]/70"
          }`}
        >
          Voice Pack
        </p>
        <p
          className={`font-mono text-[8px] ${
            usesMediaBackground ? "text-white/60" : "text-[#1a1a2e]/50"
          }`}
        >
          Digital Archive
        </p>
        <p
          className={`font-mono text-[8px] ${
            usesMediaBackground ? "text-white/60" : "text-[#1a1a2e]/50"
          }`}
        >
          Collection
        </p>
      </div>

      {/* 썸네일 이미지 (있을 경우) */}
      {thumbnail && (
        <div className="absolute left-11 top-12 h-14 w-14 overflow-hidden rounded-md border border-white/50 shadow-lg">
          <img
            src={thumbnail}
            alt={name || "Voice Pack"}
            className="absolute inset-0 h-full w-full object-cover"
          />
        </div>
      )}

      {/* CD 디스크 - 호버 시 계속 회전 */}
      <div
        className={
          usesMediaBackground
            ? "absolute left-1/2 top-1/2 h-36 w-36 -translate-x-1/2 -translate-y-[35%] sm:h-40 sm:w-40"
            : "absolute bottom-4 right-4 h-24 w-24"
        }
        style={{
          animation: isHovered ? "spin 3s linear infinite" : "none",
        }}
      >
        {/* 디스크 외곽 */}
        <div className="absolute inset-0 rounded-full bg-linear-to-br from-[#e8e8e8] via-[#f8f8f8] to-[#d0d0d0] shadow-xl">
          {/* 홀로그램 효과 */}
          <div
            className={`absolute inset-0 rounded-full bg-linear-to-tr from-[#ff6b9d]/30 via-[#c44eff]/20 to-[#00d4ff]/30 mix-blend-overlay ${
              usesMediaBackground ? "opacity-90" : ""
            }`}
          />
          {usesMediaBackground ? (
            <div className="absolute inset-0 rounded-full bg-linear-to-br from-white/40 via-transparent to-black/20 mix-blend-overlay" />
          ) : null}

          {/* 썸네일을 CD에도 표시 */}
          {thumbnail && (
            <div className="absolute inset-2 rounded-full overflow-hidden opacity-40">
              <img
                src={thumbnail}
                alt={name || "Voice Pack"}
                className="absolute inset-0 h-full w-full object-cover"
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
            <div
              className={`rounded-full bg-[#1a1a2e] ${
                usesMediaBackground ? "h-6 w-6" : "h-4 w-4"
              }`}
            />
          </div>

          {/* 디스크 라벨 */}
          <div
            className={`absolute inset-0 flex items-end justify-center ${
              usesMediaBackground ? "pb-10" : "pb-7"
            }`}
          >
            <p className="font-mono text-[5px] tracking-widest text-[#1a1a2e]/40">
              DISC-DRIVE
            </p>
          </div>
        </div>
      </div>

      {/* 우측 상단 코드 */}
      <div className="absolute top-3 right-3">
        <p
          className={`font-mono text-[10px] font-bold ${
            usesMediaBackground ? "text-white/65" : "text-[#1a1a2e]/60"
          }`}
        >
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
