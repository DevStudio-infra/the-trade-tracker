import { Bot, Shield, LineChart, Zap } from "lucide-react";
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

export function BenefitsSection() {
  return (
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
                  "bg-gradient-to-br",
                  benefit.iconGradient
                )}>
                <benefit.icon className="w-7 h-7 text-white" />
              </div>

              {/* Content */}
              <div className="text-2xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-cyan-500">{benefit.stat}</div>
              <div className="text-sm text-muted-foreground mb-4">{benefit.statLabel}</div>
              <h3 className="text-xl font-semibold mb-3 group-hover:text-white transition-colors">{benefit.title}</h3>
              <p className="text-muted-foreground group-hover:text-white/80 transition-colors leading-relaxed">{benefit.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
