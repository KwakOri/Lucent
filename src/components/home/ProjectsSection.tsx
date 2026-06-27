"use client";

import { useProjects } from "@/lib/client/hooks";
import { useRouter } from "next/navigation";
import { useCallback, useMemo } from "react";

const SOCIAL_ICON_CONFIG = {
  chzzk: {
    label: "치지직",
    icon: "/icons/icon_chzzk.svg",
  },
  twitter: {
    label: "X",
    icon: "/icons/icon_twitter.svg",
  },
  youtube: {
    label: "YouTube",
    icon: "/icons/icon_youtube.svg",
  },
  cafe: {
    label: "네이버 카페",
    icon: "/icons/icon_naver_cafe.svg",
  },
} as const;

type SocialKey = keyof typeof SOCIAL_ICON_CONFIG;

const SOCIAL_ICON_ORDER: SocialKey[] = ["chzzk", "twitter", "youtube", "cafe"];

type ProjectCardItem = {
  id: string;
  slug: string;
  name: string;
  is_active: boolean;
};

const STATIC_LUCENT_PROJECTS: ProjectCardItem[] = [
  {
    id: "static-miruru",
    slug: "miruru",
    name: "시로우미 미루루",
    is_active: true,
  },
  {
    id: "static-leafy",
    slug: "leafy",
    name: "리피",
    is_active: true,
  },
  {
    id: "static-pukong",
    slug: "pukong",
    name: "푸콩",
    is_active: true,
  },
];

// Project display config
const PROJECT_DISPLAY_CONFIG: Record<
  string,
  {
    bgColor?: string;
    artist?: string;
    image?: string;
    detailPath?: string;
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
    detailPath: "/projects/miruru",
    socials: {
      chzzk: "https://chzzk.naver.com/3e4cec21aa539da475b12e6f294ee766",
      twitter: "https://x.com/SiroumiMiruru",
      youtube: "https://www.youtube.com/@MiruruASMR",
      cafe: "https://cafe.naver.com/rurudrug",
    },
  },
  leafy: {
    bgColor: "#D8F0D7",
    artist: "리피",
    image: "/profile_leafy.png",
    detailPath: "/projects/leafy",
    socials: {
      chzzk: "https://chzzk.naver.com/c0087678584dde072491be66f0662e40",
      twitter: "https://x.com/Melting_Leafy",
      youtube: "https://www.youtube.com/@%EB%A6%AC%ED%94%BCleafy",
      cafe: "https://cafe.naver.com/meltingleafy",
    },
  },
  pukong: {
    bgColor: "#BBDCF8",
    artist: "푸콩",
    image: "/profile_pukong.png",
    detailPath: "/projects/pukong",
    socials: {
      chzzk: "https://chzzk.naver.com/43341c5abdd1fb6b3645d195977a1c10",
      twitter: "https://x.com/pukongi1004",
      youtube: "https://www.youtube.com/@%ED%91%B8%EC%BD%A9%EC%9D%B4PUKONG",
      cafe: "https://cafe.naver.com/brownrm9jg",
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
  const router = useRouter();
  const { data: projects, isLoading, isError, error } = useProjects();

  const projectCards = useMemo(() => {
    const fetchedProjects = projects ?? [];
    const fetchedSlugs = new Set(fetchedProjects.map((project) => project.slug));
    const staticFallbacks = STATIC_LUCENT_PROJECTS.filter(
      (project) => !fetchedSlugs.has(project.slug),
    );

    return [...fetchedProjects, ...staticFallbacks];
  }, [projects]);

  console.log('[ProjectsSection] 렌더링 상태:', {
    isLoading,
    isError,
    error,
    projectsCount: projects?.length ?? null,
  });

  // 소셜 링크 클릭 시 이벤트 버블링 방지
  const handleSocialClick = useCallback((e: React.MouseEvent, url: string) => {
    e.preventDefault();
    e.stopPropagation();
    window.open(url, "_blank");
  }, []);

  const handleProjectClick = useCallback(
    (path: string) => {
      router.push(path);
    },
    [router],
  );

  const handleProjectKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>, path: string) => {
      if (e.key !== "Enter" && e.key !== " ") {
        return;
      }
      e.preventDefault();
      handleProjectClick(path);
    },
    [handleProjectClick],
  );

  return (
    <section id="projects" className="py-20 px-4 bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-text-primary mb-4">
            Lucent
          </h2>
          <p className="text-lg text-text-secondary">
            Lucent의 아티스트를 만나보세요
          </p>
        </div>

        <div className="grid grid-cols-1 gap-x-8 gap-y-36 md:grid-cols-2 lg:gap-y-40">
          {projectCards.length > 0 ? (
            projectCards.map((project) => {
              const displayConfig = PROJECT_DISPLAY_CONFIG[project.slug] || {};
              const isDisabled = !project.is_active;
              const detailPath =
                displayConfig.detailPath || `/projects/${project.slug}`;

              return (
                <div
                  key={project.id}
                  role="button"
                  tabIndex={isDisabled ? -1 : 0}
                  onClick={
                    isDisabled ? undefined : () => handleProjectClick(detailPath)
                  }
                  onKeyDown={
                    isDisabled
                      ? undefined
                      : (event) => handleProjectKeyDown(event, detailPath)
                  }
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
                            {SOCIAL_ICON_ORDER.map((socialKey) => {
                              const socialUrl = displayConfig.socials?.[socialKey];
                              if (!socialUrl) {
                                return null;
                              }
                              const socialIcon = SOCIAL_ICON_CONFIG[socialKey];
                              return (
                                <button
                                  key={socialKey}
                                  onClick={(e) => handleSocialClick(e, socialUrl)}
                                  className="group/social flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-[#A8D5E2] bg-transparent transition-colors hover:border-[#A8D5E2] hover:bg-[#A8D5E2] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#66B5F3]"
                                  aria-label={socialIcon.label}
                                >
                                  <span
                                    aria-hidden="true"
                                    className="h-[1.375rem] w-[1.375rem] bg-[#A8D5E2] transition-colors [mask-position:center] [mask-repeat:no-repeat] [mask-size:contain] group-hover/social:bg-white"
                                    style={{
                                      WebkitMaskImage: `url(${socialIcon.icon})`,
                                      maskImage: `url(${socialIcon.icon})`,
                                    }}
                                  />
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="absolute -bottom-20 left-0 right-0 z-30 bg-white px-6 py-10 rounded-b-3xl transition-all duration-500 ease-out group-hover:-translate-y-4"></div>
                  </div>
                </div>
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
