import Link from "next/link";
import { ArrowRight, ArrowUpRight, Wallet, BarChart, Shield, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const highlights = [
  {
    title: "Risk-Free Start",
    description: "10 free AI credits monthly, no commitments",
    icon: Wallet,
  },
  {
    title: "Proven Performance",
    description: "Data-driven strategies with live tracking",
    icon: BarChart,
  },
  {
    title: "Smart Protection",
    description: "Intelligent capital protection system",
    icon: Shield,
  },
  {
    title: "Hands-Free Trading",
    description: "Focus on strategy, let AI handle execution",
    icon: Sparkles,
  },
];

export function HeroSection() {
  return (
    <section className="container flex flex-col items-center justify-center text-center gap-8 pt-24 md:pt-32 pb-20 px-4 sm:px-6 lg:px-8 mx-auto">
      <div className="relative animate-in slide-in-from-bottom duration-1000 space-y-6 max-w-4xl mx-auto w-full">
        {/* Glow effect */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-blue-500/20 via-sky-500/20 to-transparent rounded-[40px] blur-3xl animate-pulse" />

        <div className="space-y-6 w-full">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-7xl">
            Elevate Your Trading with
            <span className="block mt-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500">AI-Driven Precision</span>
          </h1>
          <p className="mx-auto max-w-2xl text-xl text-muted-foreground/80">
            Trade smarter with AI-backed signals, automated execution, and intelligent risk management—all in one platform.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-8">
          <Button
            asChild
            size="lg"
            className="rounded-full bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 text-white hover:opacity-90 transform transition-transform duration-500 hover:scale-105 px-8">
            <Link href="/dashboard">
              Get Started Free <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="rounded-full border-blue-500/20 hover:bg-blue-500/10 transform transition-transform duration-500 hover:scale-105">
            <Link href="/features">
              Explore Features <ArrowUpRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="w-full max-w-5xl mx-auto mt-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
          {highlights.map((item, index) => (
            <div
              key={item.title}
              className={cn(
                "relative group rounded-3xl bg-gradient-to-b from-background/50 to-background/80 backdrop-blur-xl border border-white/10 p-6",
                "transition-all duration-500 hover:scale-105",
                "animate-in fade-in-0 slide-in-from-bottom-4",
                { "delay-200": index % 4 === 1, "delay-300": index % 4 === 2, "delay-400": index % 4 === 3 }
              )}>
              <div className="absolute inset-0 -z-10 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-b from-blue-500/20 to-transparent" />
              <item.icon className="w-6 h-6 mb-4 text-blue-500" />
              <div className="font-semibold">{item.title}</div>
              <div className="text-sm text-muted-foreground mt-1">{item.description}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
