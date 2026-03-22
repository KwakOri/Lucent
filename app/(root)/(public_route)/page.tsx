import { AboutSection } from "@/components/home/AboutSection";
import { NewsSection } from "@/components/home/NewsSection";
import { HeroSlider } from "@/components/home/HeroSlider";
import { ProjectsSection } from "@/components/home/ProjectsSection";
import dynamic from "next/dynamic";

const MainCampaignPopup = dynamic(
  () =>
    import("@/components/home/MainCampaignPopup").then(
      (module) => module.MainCampaignPopup
    ),
  { ssr: false }
);

export default async function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      <MainCampaignPopup />

      {/* Hero Section */}
      <HeroSlider />

      {/* Projects Preview Section */}
      <ProjectsSection />

      <NewsSection />

      <AboutSection />
    </div>
  );
}
