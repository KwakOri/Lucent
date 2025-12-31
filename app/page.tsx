import { isAdmin } from "@/lib/server/utils/supabase";
import { HeroSlider } from "@/src/components/home/HeroSlider";
import { ProjectsSection } from "@/src/components/home/ProjectsSection";
import { Settings, Twitter } from "lucide-react";
import Link from "next/link";

export default async function HomePage() {
  const isAdminUser = await isAdmin();

  return (
    <div className="min-h-screen bg-white">
      {/* Admin Button (Fixed Position) */}
      {isAdminUser && (
        <Link
          href="/admin"
          className="fixed bottom-4 right-4 z-50 inline-flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-lg font-medium transition-colors shadow-lg"
        >
          <Settings className="w-5 h-5" />
          관리자 페이지
        </Link>
      )}

      {/* Hero Section */}
      <HeroSlider />

      {/* Projects Preview Section */}
      <ProjectsSection />

      {/* About Lucent Section */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-text-primary mb-8">
            Lucent Management
          </h2>
          <div className="space-y-6 text-lg text-text-secondary">
            <p>
              우리는 버츄얼 MCN이 아니라{" "}
              <strong className="text-text-primary">매니지먼트 레이블</strong>
              입니다.
            </p>
            <p>
              프로젝트를 기록하고 관리하는 레이블로서,
              <br />
              숨겨진 감정과 목소리가 자연스럽게 드러나는 순간을 포착합니다.
            </p>
            <p>
              각 프로젝트의 고유한 정체성을 존중하며,
              <br />
              그들의 이야기를 세상에 전합니다.
            </p>
          </div>
        </div>
      </section>

      {/* Social Link Section */}
      <section className="py-20 px-4 bg-neutral-50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-text-primary mb-8">
            Follow Us
          </h2>
          <a
            href="https://twitter.com/lucent_mgmt"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 px-8 py-4 bg-[#1DA1F2] hover:bg-[#1a8cd8] text-white rounded-full font-medium transition-colors"
          >
            <Twitter className="w-6 h-6" />
            공식 트위터 팔로우하기
          </a>
        </div>
      </section>
    </div>
  );
}
