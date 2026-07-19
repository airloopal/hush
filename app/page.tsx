import { LandingHeader } from "@/components/landing/landing-header";
import { LandingHero } from "@/components/landing/landing-hero";
import { LandingCreatorShowcase } from "@/components/landing/landing-creator-showcase";
import { LandingHowItWorks } from "@/components/landing/landing-how-it-works";
import { LandingForFans } from "@/components/landing/landing-for-fans";
import { LandingForCreators } from "@/components/landing/landing-for-creators";
import { LandingFeatureGrid } from "@/components/landing/landing-feature-grid";
import { LandingFaq } from "@/components/landing/landing-faq";
import { LandingFooter } from "@/components/landing/landing-footer";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <LandingHeader />
      <main>
        <LandingHero />
        <LandingCreatorShowcase />
        <LandingHowItWorks />
        <LandingForFans />
        <LandingForCreators />
        <LandingFeatureGrid />
        <LandingFaq />
      </main>
      <LandingFooter />
    </div>
  );
}
