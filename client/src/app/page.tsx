import { HeroSection } from "@/components/landing/HeroSection";
import { BenefitsSection } from "@/components/landing/BenefitsSection";
import { CTASection } from "@/components/landing/CTASection";

export default function HomePage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-dot-pattern">
      {/* Background gradients */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background to-background/80 backdrop-blur-[2px]" />
      <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-sky-500/10 to-blue-700/10" />

      <div className="relative">
        <HeroSection />
        <BenefitsSection />
        <CTASection />
      </div>
    </div>
  );
}
