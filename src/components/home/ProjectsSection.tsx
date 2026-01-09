"use client";

import { useProjects } from "@/lib/client/hooks";
import Link from "next/link";
import { useCallback } from "react";

// Project display config
const PROJECT_DISPLAY_CONFIG: Record<
  string,
  {
    bgColor?: string;
    artist?: string;
    image?: string;
    socials?: {
      chzzk?: string;
      twitter?: string;
      youtube?: string;
      cafe?: string;
    };
  }
> = {
  miruru: {
    bgColor: "#A8D5E2",
    artist: "시로우미 미루루",
    image: "/profilemiruru.png",
    socials: {
      chzzk: "https://chzzk.naver.com/3e4cec21aa539da475b12e6f294ee766",
      twitter: "https://x.com/SiroumiMiruru",
      youtube: "https://www.youtube.com/@MiruruASMR",
      cafe: "https://cafe.naver.com/rurudrug",
    },
  },
  "1st": {
    bgColor: "#E5E5E5",
    artist: "Drips",
    socials: {
      chzzk: "https://chzzk.naver.com/drips",
      twitter: "https://twitter.com/drips",
      youtube: "https://youtube.com/@drips",
      cafe: "https://cafe.naver.com/drips",
    },
  },
};

export function ProjectsSection() {
  const { data: projects } = useProjects();

  // 소셜 링크 클릭 시 이벤트 버블링 방지
  const handleSocialClick = useCallback((e: React.MouseEvent, url: string) => {
    e.preventDefault();
    e.stopPropagation();
    window.open(url, "_blank");
  }, []);

  return (
    <section id="projects" className="py-20 px-4 bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-text-primary mb-4">
            Projects
          </h2>
          <p className="text-lg text-text-secondary">
            Lucent의 프로젝트를 만나보세요
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {projects && projects.length > 0 ? (
            projects.map((project) => {
              const displayConfig = PROJECT_DISPLAY_CONFIG[project.slug] || {};
              const isDisabled = !project.is_active;

              return (
                <Link
                  key={project.id}
                  href={`/projects/${project.slug}`}
                  className={`block ${
                    !isDisabled
                      ? ""
                      : "opacity-60 cursor-not-allowed pointer-events-none"
                  } group`}
                >
                  {/* 카드 컨테이너 */}
                  <div className="relative pt-32">
                    {/* 캐릭터 이미지 - z-10 */}
                    {displayConfig.image && (
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-80 z-10 transition-all duration-500 scale-140 ease-out group-hover:translate-y-4 group-hover:scale-170 overflow-hidden">
                        <img
                          src={displayConfig.image}
                          alt={displayConfig.artist || project.name}
                          className="absolute inset-0 w-full h-full object-contain object-top"
                        />
                      </div>
                    )}

                    {/* 배경 카드 - 호버 시 위로 올라옴 */}
                    <div
                      className="relative rounded-3xl transition-all duration-500 ease-out group-hover:-translate-y-4 "
                      style={{
                        backgroundColor: displayConfig.bgColor || "#E5E5E5",
                      }}
                    >
                      {/* 이미지 영역 (높이 확보) */}
                      <div className="h-70" />
                    </div>

                    {/* 하단 정보 영역 - z-30으로 항상 최상위, 별도 요소로 분리 */}
                    <div className="absolute bottom-0 left-0 right-0 z-30 bg-[#f9f9ed] px-6 py-4 rounded-b-3xl transition-all duration-500 ease-out group-hover:-translate-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xl font-bold text-[#1a1a2e]">
                          {displayConfig.artist || project.name}
                        </h3>

                        {/* 소셜 아이콘 */}
                        {displayConfig.socials && (
                          <div className="flex gap-2">
                            {displayConfig.socials.chzzk && (
                              <button
                                onClick={(e) =>
                                  handleSocialClick(
                                    e,
                                    displayConfig.socials!.chzzk!
                                  )
                                }
                                className="w-9 h-9 rounded-xl bg-[#00FFA3] flex items-center justify-center hover:opacity-80 transition-opacity"
                                aria-label="치지직"
                              >
                                <svg
                                  className="w-4 h-4 text-black"
                                  viewBox="0 0 24 24"
                                  fill="currentColor"
                                >
                                  <path d="M4 4h16v12H5.17L4 17.17V4m0-2c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2H4zm2 10h12v2H6v-2zm0-3h12v2H6V9zm0-3h12v2H6V6z" />
                                </svg>
                              </button>
                            )}
                            {displayConfig.socials.twitter && (
                              <button
                                onClick={(e) =>
                                  handleSocialClick(
                                    e,
                                    displayConfig.socials!.twitter!
                                  )
                                }
                                className="w-9 h-9 rounded-xl bg-[#000000] flex items-center justify-center hover:opacity-80 transition-opacity"
                                aria-label="Twitter"
                              >
                                <svg
                                  className="w-4 h-4 text-white"
                                  fill="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                                </svg>
                              </button>
                            )}
                            {displayConfig.socials.youtube && (
                              <button
                                onClick={(e) =>
                                  handleSocialClick(
                                    e,
                                    displayConfig.socials!.youtube!
                                  )
                                }
                                className="w-9 h-9 rounded-xl bg-[#FF0000] flex items-center justify-center hover:opacity-80 transition-opacity"
                                aria-label="YouTube"
                              >
                                <svg
                                  className="w-4 h-4 text-white"
                                  fill="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                                </svg>
                              </button>
                            )}
                            {displayConfig.socials.cafe && (
                              <button
                                onClick={(e) =>
                                  handleSocialClick(
                                    e,
                                    displayConfig.socials!.cafe!
                                  )
                                }
                                className="w-9 h-9 rounded-xl bg-[#03C75A] flex items-center justify-center hover:opacity-80 transition-opacity"
                                aria-label="네이버 카페"
                              >
                                <span className="text-white font-bold text-xs">
                                  N
                                </span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="absolute -bottom-20 left-0 right-0 z-30 bg-white px-6 py-10 rounded-b-3xl transition-all duration-500 ease-out group-hover:-translate-y-4"></div>
                  </div>
                </Link>
              );
            })
          ) : (
            <div className="col-span-2 text-center py-12">
              <p className="text-text-secondary">프로젝트를 불러오는 중...</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
