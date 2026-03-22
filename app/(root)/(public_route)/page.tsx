import { AboutSection } from "@/components/home/AboutSection";
import { NewsSection } from "@/components/home/NewsSection";
import { HeroSlider } from "@/components/home/HeroSlider";
import { MainCampaignPopupClient } from "@/components/home/MainCampaignPopupClient";
import { ProjectsSection } from "@/components/home/ProjectsSection";

export default async function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      <MainCampaignPopupClient />

      {/* Hero Section */}
      <HeroSlider />

      {/* Projects Preview Section */}
      <ProjectsSection />

      <NewsSection />

      <AboutSection />
    </div>
  );
}
