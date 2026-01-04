import { AboutSection } from "@/components/home/AboutSection";
import { NewsSection } from "@/components/home/NewsSection";
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

      <NewsSection />

      <AboutSection />
    </div>
  );
}
