import { AboutSection } from "@/components/home/AboutSection";
import { NewsSection } from "@/components/home/NewsSection";
import { HeroSlider } from "@/src/components/home/HeroSlider";
import { ProjectsSection } from "@/src/components/home/ProjectsSection";

export default async function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <HeroSlider />

      {/* Projects Preview Section */}
      <ProjectsSection />

      <NewsSection />

      <AboutSection />
    </div>
  );
}
