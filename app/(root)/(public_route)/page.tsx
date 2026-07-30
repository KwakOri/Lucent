import { AboutSection } from "@/components/home/AboutSection";
import { NewsSection } from "@/components/home/NewsSection";
import { HeroSlider } from "@/components/home/HeroSlider";
import { MainCampaignPopupClient } from "@/components/home/MainCampaignPopupClient";
import { PopupSection } from "@/components/home/PopupSection";
import { ProjectsSection } from "@/components/home/ProjectsSection";

export default async function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      <MainCampaignPopupClient />

      {/* Hero Section */}
      <HeroSlider />

      {/* Ongoing Popup Section */}
      <PopupSection />

      {/* Projects Preview Section */}
      <ProjectsSection />

      <NewsSection />

      <AboutSection />
    </div>
  );
}
