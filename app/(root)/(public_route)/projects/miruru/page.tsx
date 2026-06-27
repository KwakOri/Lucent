import Link from "next/link";
import {
  Cormorant_Garamond,
  Gowun_Batang,
  IBM_Plex_Mono,
  IBM_Plex_Sans_KR,
} from "next/font/google";
import { Play, ShoppingBag } from "lucide-react";

const ibmPlexSansKr = IBM_Plex_Sans_KR({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-miruru-sans",
  display: "swap",
});

const gowunBatang = Gowun_Batang({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-miruru-batang",
  display: "swap",
});

const cormorantGaramond = Cormorant_Garamond({
  weight: ["400", "600", "700"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-miruru-cormorant",
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  weight: ["400", "500"],
  subsets: ["latin"],
  variable: "--font-miruru-mono",
  display: "swap",
});

const SOCIAL_LINKS = [
  {
    label: "CHZZK",
    href: "https://chzzk.naver.com/3e4cec21aa539da475b12e6f294ee766",
    icon: "/icons/icon_chzzk.svg",
  },
  {
    label: "YouTube",
    href: "https://www.youtube.com/@MiruruASMR",
    icon: "/icons/icon_youtube.svg",
  },
  {
    label: "X",
    href: "https://x.com/SiroumiMiruru",
    icon: "/icons/icon_twitter.svg",
  },
  {
    label: "네이버카페",
    href: "https://cafe.naver.com/rurudrug",
    icon: "/icons/icon_naver_cafe.svg",
  },
];

const PROFILE_ITEMS = [
  { label: "생일", value: "7월 7일" },
  { label: "키", value: "152cm" },
  { label: "나이", value: "비밀" },
  { label: "팬네임", value: "미루링" },
  { label: "마마 (일러스트)", value: "작가명" },
  { label: "해시태그", value: "#미루루" },
];

export default function MiruruProjectPage() {
  return (
    <main
      className={`${ibmPlexSansKr.variable} ${gowunBatang.variable} ${cormorantGaramond.variable} ${ibmPlexMono.variable} min-h-screen bg-[#f8f7ef] text-[#1a1a2e] [font-family:var(--font-miruru-sans)]`}
    >
      <section className="relative isolate overflow-hidden px-5 pb-0 pt-14 sm:px-8 lg:px-14 lg:pt-16">
        <div
          aria-hidden="true"
          className="absolute right-4 top-20 -z-10 text-[5.4rem] font-semibold leading-[0.78] tracking-tight text-[#a8d5e2]/30 [font-family:var(--font-miruru-cormorant)] sm:right-8 sm:top-24 sm:text-[9rem] lg:right-10 lg:top-36 lg:text-[11.75rem]"
        >
          MIRU
          <br />
          RU
        </div>

        <div className="mx-auto flex max-w-6xl flex-col items-center gap-10 lg:flex-row lg:items-end lg:gap-16">
          <div className="relative w-full max-w-[430px] flex-none">
            <div className="mb-4 ml-3 text-xs font-semibold tracking-[0.36em] text-[#9bb3cf] [font-family:var(--font-miruru-cormorant)] sm:absolute sm:left-8 sm:top-[-2.125rem] sm:mb-0 sm:ml-0">
              LUCENT / No.01
            </div>
            <div className="relative h-[26rem] overflow-hidden rounded-t-[13rem] rounded-b-md bg-linear-to-br from-[#eaf4fd] to-[#dceefe] shadow-[0_18px_44px_rgba(74,136,185,0.16)] sm:h-[37.5rem]">
              <span
                aria-hidden="true"
                className="absolute right-7 top-14 text-base text-[#f4d03f]"
              >
                *
              </span>
              <span
                aria-hidden="true"
                className="absolute left-8 top-36 text-sm text-[#7fb0e0]"
              >
                *
              </span>
              <img
                src="/profilemiruru.png"
                alt="시로우미 미루루"
                className="absolute bottom-0 left-1/2 w-[25rem] max-w-none -translate-x-1/2 sm:w-[27rem]"
              />
            </div>
          </div>

          <div className="w-full pb-14 text-left lg:flex-1 lg:pb-10">
            <div className="mb-7 h-0.5 w-12 bg-[#f4d03f]" />
            <h1 className="text-5xl font-bold leading-[1.14] tracking-tight [font-family:var(--font-miruru-batang)] sm:text-6xl lg:text-[4.75rem]">
              시로우미
              <br />
              미루루
            </h1>
            <p className="mt-5 text-2xl italic tracking-[0.18em] text-[#6f8db3] [font-family:var(--font-miruru-cormorant)] sm:text-[1.75rem]">
              Shiroumi Miruru
            </p>
            <div className="mt-7 inline-flex rounded-full border border-[#cfe0f0] px-5 py-2 text-xs font-semibold tracking-[0.16em] text-[#4a88b9]">
              회복의 간호사
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 py-16 text-center sm:px-8 lg:px-14 lg:py-20">
        <div className="text-xs font-semibold tracking-[0.4em] text-[#9bb3cf] [font-family:var(--font-miruru-cormorant)]">
          STORY
        </div>
        <div className="mt-4 text-sm text-[#f4d03f]">*</div>
        <p className="mx-auto mt-6 max-w-3xl space-y-3 text-lg leading-relaxed text-[#33384a] [font-family:var(--font-miruru-batang)] sm:space-y-0 sm:text-xl sm:leading-[2.2]">
          <span className="block">
            작은 불빛 하나도 놓치지 않는 밤의 간호사, 시로우미 미루루.
          </span>
          <span className="block">
            아픈 마음에도 살며시 다가가 체온을 나누는 그녀는,
          </span>
          <span className="block">
            오늘도 누군가의 회복을 기다리며 병동의 불을 밝힌다.
          </span>
          <span className="block text-[#6f8db3]">
            당신의 가장 약한 순간에, 가장 다정한 목소리로.
          </span>
        </p>
      </section>

      <section className="bg-linear-to-b from-[#f2f6ef] to-[#eef4fb] px-5 py-16 sm:px-8 lg:px-14 lg:py-20">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-2 lg:gap-14">
          <div className="flex flex-col">
            <div className="mb-6 text-xs font-semibold tracking-[0.4em] text-[#9bb3cf] [font-family:var(--font-miruru-cormorant)]">
              DEBUT
            </div>
            <a
              href="https://www.youtube.com/@MiruruASMR"
              target="_blank"
              rel="noreferrer"
              className="group relative flex aspect-video items-center justify-center overflow-hidden rounded-xl bg-linear-to-br from-[#dceefe] to-[#a8d5e2] shadow-[0_16px_38px_rgba(74,136,185,0.20)]"
            >
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-[repeating-linear-gradient(135deg,rgba(255,255,255,0.12)_0_14px,rgba(255,255,255,0)_14px_28px)]"
              />
              <div className="relative flex flex-col items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/90 shadow-[0_8px_22px_rgba(26,26,46,0.20)] transition-transform group-hover:scale-105 sm:h-[4.625rem] sm:w-[4.625rem]">
                  <Play className="ml-1 h-7 w-7 fill-[#4a88b9] text-[#4a88b9]" />
                </div>
                <div className="rounded-full bg-white/75 px-4 py-1.5 text-center text-xs tracking-wide text-[#2f567a] [font-family:var(--font-miruru-mono)]">
                  데뷔 PV - 유튜브에서 보기
                </div>
              </div>
            </a>
          </div>

          <div className="flex flex-col">
            <div className="mb-6 text-xs font-semibold tracking-[0.4em] text-[#9bb3cf] [font-family:var(--font-miruru-cormorant)]">
              PROFILE
            </div>
            <dl className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
              {PROFILE_ITEMS.map((item) => (
                <div
                  key={item.label}
                  className="flex flex-col justify-center rounded-xl border border-white/70 bg-white/45 px-5 py-5 backdrop-blur-sm sm:px-6"
                >
                  <dt className="text-xs font-semibold tracking-[0.1em] text-[#4a88b9]">
                    {item.label}
                  </dt>
                  <dd className="mt-2 text-[1.45rem] text-[#1a1a2e] [font-family:var(--font-miruru-batang)]">
                    {item.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      <section className="px-5 py-16 text-center sm:px-8 lg:px-14 lg:py-20">
        <div className="mb-8 text-xs font-semibold tracking-[0.4em] text-[#9bb3cf] [font-family:var(--font-miruru-cormorant)]">
          FOLLOW
        </div>
        <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
          {SOCIAL_LINKS.map((social) => (
            <a
              key={social.label}
              href={social.href}
              target="_blank"
              rel="noreferrer"
              aria-label={social.label}
              className="group inline-flex h-12 w-12 items-center justify-center rounded-full border border-[#dde9f4] bg-white shadow-[0_1px_2px_rgba(26,26,46,0.05)] transition-colors hover:border-[#66b5f3] hover:bg-[#eef7ff] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#66b5f3]"
            >
              <span
                aria-hidden="true"
                className="h-6 w-6 bg-[#A8D5E2] transition-colors [mask-position:center] [mask-repeat:no-repeat] [mask-size:contain] group-hover:bg-[#4a88b9]"
                style={{
                  WebkitMaskImage: `url(${social.icon})`,
                  maskImage: `url(${social.icon})`,
                }}
              />
            </a>
          ))}
        </div>

        <Link
          href="/shop"
          className="mt-10 inline-flex items-center gap-2 rounded-full bg-[#1a1a2e] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#4a88b9]"
        >
          <ShoppingBag className="h-4 w-4" />
          굿즈샵 보기
        </Link>

        <div className="mx-auto mt-14 max-w-6xl border-t border-[#ece9da] pt-7 text-xs tracking-[0.18em] text-[#aab0bd] [font-family:var(--font-miruru-cormorant)]">
          © 2026 LUCENT MANAGEMENT · SHIROUMI MIRURU
        </div>
      </section>
    </main>
  );
}
