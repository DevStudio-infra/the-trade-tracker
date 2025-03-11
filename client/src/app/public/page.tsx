import { HeroSection, HighlightsSection, BenefitsSection, CTASection } from "./components/landing";

export default function HomePage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-dot-pattern">
      {/* Background gradients */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background to-background/80 backdrop-blur-[2px]" />
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-sky-500/10 to-cyan-500/10" />

      <div className="relative">
        <HeroSection />
        <HighlightsSection />
        <BenefitsSection />
        <CTASection />
      </div>
    </div>
  );
}
