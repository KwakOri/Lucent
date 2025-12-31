'use client';

import Link from 'next/link';
import { useProjects } from '@/hooks';

// Project display config
const PROJECT_DISPLAY_CONFIG: Record<string, {
  emoji?: string;
  color?: string;
  artist?: string;
}> = {
  '0th': {
    emoji: '🌸',
    color: 'from-[#E3F2FD] to-[#A8D5E2]',
    artist: '미루루',
  },
  '1st': {
    emoji: '💧',
    color: 'from-neutral-100 to-neutral-200',
    artist: 'Drips',
  },
};

export function ProjectsSection() {
  const { data: projects } = useProjects();

  return (
    <section className="py-20 px-4 bg-neutral-50">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-text-primary mb-4">
            Projects
          </h2>
          <p className="text-lg text-text-secondary">
            Lucent Management 소속 아티스트를 만나보세요
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
                  className={`block bg-white rounded-2xl border-2 border-neutral-200 overflow-hidden hover:shadow-xl transition-all duration-300 ${
                    !isDisabled ? 'hover:scale-105' : 'opacity-60 cursor-not-allowed pointer-events-none'
                  }`}
                >
                  <div className={`aspect-video bg-gradient-to-br ${displayConfig.color || 'from-neutral-100 to-neutral-200'} flex items-center justify-center`}>
                    <div className="text-center">
                      <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-white/50 backdrop-blur-sm flex items-center justify-center">
                        <span className="text-6xl">{displayConfig.emoji || '📦'}</span>
                      </div>
                      <h3 className="text-3xl font-bold text-text-primary">
                        {project.name}
                      </h3>
                    </div>
                  </div>
                  <div className="p-6">
                    <p className="text-xl font-semibold text-text-primary mb-2">
                      {displayConfig.artist || project.name}
                    </p>
                    <p className="text-text-secondary">
                      {project.description || '프로젝트 설명'}
                    </p>
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
