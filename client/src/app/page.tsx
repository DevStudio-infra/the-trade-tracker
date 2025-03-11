import Link from "next/link";
import { ArrowRight, ArrowUpRight, Bot, Shield, LineChart, Zap, Wallet, BarChart, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const benefits = [
  {
    title: "AI-Powered Trade Optimization",
    description: "Leverage cutting-edge AI to analyze market conditions and generate high-probability trade signals.",
    icon: Bot,
    gradient: "from-blue-600/20 to-cyan-400/20",
    iconGradient: "from-blue-600 to-cyan-400",
    stat: "75%+",
    statLabel: "Signal Confidence",
  },
  {
    title: "Advanced Risk Management",
    description: "Trade confidently with automated stop-loss and risk calculation tailored to your strategy.",
    icon: Shield,
    gradient: "from-blue-700/20 to-blue-400/20",
    iconGradient: "from-blue-700 to-blue-400",
    stat: "1.25-4%",
    statLabel: "Risk Range",
  },
  {
    title: "Seamless Automation",
    description: "Execute trades automatically with precision and efficiency, reducing emotional decision-making.",
    icon: Zap,
    gradient: "from-cyan-600/20 to-blue-400/20",
    iconGradient: "from-cyan-600 to-blue-400",
    stat: "5ms",
    statLabel: "Execution Speed",
  },
  {
    title: "Multi-Asset Trading",
    description: "Access Forex, Stocks, and Crypto—all from a single AI-powered trading hub.",
    icon: LineChart,
    gradient: "from-sky-600/20 to-blue-400/20",
    iconGradient: "from-sky-600 to-blue-400",
    stat: "100+",
    statLabel: "Trading Pairs",
  },
];

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

export default function HomePage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-dot-pattern">
      {/* Background gradients */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background to-background/80 backdrop-blur-[2px]" />
      <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-sky-500/10 to-blue-700/10" />

      <div className="relative">
        {/* Hero Section */}
        <section className="container flex flex-col items-center justify-center text-center gap-8 pt-24 md:pt-32 pb-20 px-4 sm:px-6 lg:px-8  mx-auto">
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
              <Button
                asChild
                variant="outline"
                size="lg"
                className="rounded-full border-blue-500/20 hover:bg-blue-500/10 transform transition-transform duration-500 hover:scale-105">
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

        {/* Benefits Section */}
        <section className="container py-20 mx-auto">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold mb-4">Key Benefits</h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">Experience the power of AI-driven trading with features designed for success</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {benefits.map((benefit, index) => (
                <div
                  key={benefit.title}
                  className={cn(
                    "group relative rounded-3xl p-8",
                    "transition-all duration-500",
                    "hover:shadow-2xl hover:-translate-y-1",
                    "bg-gradient-to-b from-background/50 to-background/80",
                    "backdrop-blur-xl border border-white/10",
                    "animate-in fade-in-0 slide-in-from-bottom-4 duration-1000",
                    { "delay-200": index % 4 === 1, "delay-300": index % 4 === 2, "delay-400": index % 4 === 3 }
                  )}>
                  {/* Background gradient */}
                  <div
                    className={cn("absolute inset-0 -z-10 rounded-3xl opacity-0 group-hover:opacity-100", "transition-opacity duration-500", "bg-gradient-to-b", benefit.gradient)}
                  />

                  {/* Icon */}
                  <div
                    className={cn(
                      "mb-6 w-14 h-14 rounded-2xl flex items-center justify-center",
                      "transform transition-transform duration-500 group-hover:scale-110",
                      "bg-gradient-to-br ",
                      benefit.iconGradient
                    )}>
                    <benefit.icon className="w-7 h-7 text-white" />
                  </div>

                  {/* Content */}
                  <div className=" text-2xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-cyan-500  ">{benefit.stat}</div>
                  <div className="text-sm text-muted-foreground mb-4">{benefit.statLabel}</div>
                  <h3 className="text-xl font-semibold mb-3 group-hover:text-white transition-colors">{benefit.title}</h3>
                  <p className="text-muted-foreground group-hover:text-white/80 transition-colors leading-relaxed">{benefit.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="container pb-32 mx-auto">
          <div className="max-w-5xl mx-auto">
            <div className="relative rounded-[32px] overflow-hidden transform transition-transform duration-500 hover:scale-[1.02]">
              {/* Background with blur */}
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500" />
              <div className="absolute inset-[1px] bg-gradient-to-b from-white/10 to-white/5 backdrop-blur-xl rounded-[32px]" />

              {/* Content */}
              <div className="relative p-12 md:p-20 text-center">
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Start Trading Smarter Today</h2>
                <p className="text-white/80 mb-8 max-w-2xl mx-auto text-lg">
                  Begin with 10 free AI credits monthly. Experience the power of AI-driven trading with no commitments.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-4">
                  <Button asChild size="lg" className="rounded-full bg-white text-blue-600 hover:bg-white/90 transform transition-transform duration-500 hover:scale-105">
                    <Link href="/dashboard">
                      Get Started Free <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    size="lg"
                    className="rounded-full border-white text-white hover:bg-white/10 transform transition-transform duration-500 hover:scale-105">
                    <Link href="/pricing">View Plans</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
