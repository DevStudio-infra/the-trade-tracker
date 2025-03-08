"use client";
import { Bot, Shield, LineChart, Zap, BarChart3, Database, Gauge, Cpu, Users, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { motion } from "framer-motion";
import { FeatureCard } from "../../../components/features/FeatureCard";
import { TechSpecCard } from "../../../components/features/TechSpecCard";
import { RoadmapCard } from "../../../components/features/RoadmapCard";

const mainFeatures = [
  {
    title: "AI-Powered Trade Signals",
    description: "Advanced machine learning models analyze market patterns to deliver high-probability trading opportunities with real-time precision.",
    icon: Bot,
    iconGradient: "from-blue-600 to-cyan-400",
    techSpecs: ["Pattern Recognition", "Real-Time Analysis", "75%+ Accuracy"],
  },
  {
    title: "Automated Trade Execution",
    description: "Connect your broker account and let our AI execute trades based on your predefined strategies and risk parameters.",
    icon: Zap,
    iconGradient: "from-blue-700 to-blue-400",
    techSpecs: ["5ms Execution", "Strategy Automation", "Risk Controls"],
  },
  {
    title: "Customizable Risk Management",
    description: "Advanced risk control system with customizable stop-loss, position sizing, and dynamic risk adjustment.",
    icon: Shield,
    iconGradient: "from-sky-600 to-blue-400",
    techSpecs: ["1.25-4% Risk Range", "Dynamic Stops", "Position Sizing"],
  },
  {
    title: "Multi-Asset Trading",
    description: "Trade Forex, Stocks, and Crypto from a single unified platform powered by sophisticated AI analysis.",
    icon: LineChart,
    iconGradient: "from-blue-600 to-cyan-400",
    techSpecs: ["100+ Trading Pairs", "Cross-Market Analysis", "Real-Time Data"],
  },
  {
    title: "Real-Time Market Analysis",
    description: "Stay ahead with instant market insights powered by our high-performance data pipeline and AI analytics.",
    icon: BarChart3,
    iconGradient: "from-cyan-600 to-blue-400",
    techSpecs: ["Live Analytics", "Market Insights", "Trend Detection"],
  },
  {
    title: "Backtesting & Optimization",
    description: "Test and refine your strategies using historical data and AI-powered optimization tools.",
    icon: Database,
    iconGradient: "from-blue-700 to-blue-400",
    techSpecs: ["Historical Data", "Strategy Testing", "Performance Metrics"],
  },
];

const technicalSpecs = [
  {
    category: "Performance",
    specs: [
      {
        title: "Signal Generation",
        value: "5ms",
        description: "Ultra-fast processing for real-time trading decisions",
        icon: Cpu,
      },
      {
        title: "System Uptime",
        value: "99.9%",
        description: "Enterprise-grade reliability for 24/7 trading",
        icon: Gauge,
      },
    ],
  },
  {
    category: "Coverage",
    specs: [
      {
        title: "Trading Pairs",
        value: "100+",
        description: "Comprehensive market coverage across assets",
        icon: LineChart,
      },
      {
        title: "Data Points",
        value: "1M+",
        description: "Daily market data points analyzed",
        icon: Database,
      },
    ],
  },
  {
    category: "Intelligence",
    specs: [
      {
        title: "AI Models",
        value: "5+",
        description: "Specialized models for different market conditions",
        icon: Bot,
      },
      {
        title: "Success Rate",
        value: "75%+",
        description: "Consistent signal accuracy in live trading",
        icon: BarChart3,
      },
    ],
  },
];

const upcomingFeatures = [
  {
    title: "Smart Trade Management",
    description: "AI-driven system that dynamically adjusts trades to maximize profits and minimize losses",
    icon: Gauge,
    date: "Q2 2024",
  },
  {
    title: "Custom AI Strategy Builder",
    description: "Build and automate your own trading strategies using our AI-driven tools",
    icon: Cpu,
    date: "Q2 2024",
  },
  {
    title: "Multiple Broker Integration",
    description: "Seamlessly connect and trade with major brokers beyond Capital.com",
    icon: Users,
    date: "Q3 2024",
  },
  {
    title: "Advanced Analytics Dashboard",
    description: "Enhanced interface with comprehensive trade monitoring and insights",
    icon: LineChart,
    date: "Q3 2024",
  },
];

export default function FeaturesPage() {
  return (
    <div className="relative min-h-screen bg-gradient-to-b from-gray-50 via-gray-100 to-gray-50 dark:from-gray-900 dark:via-blue-900 dark:to-gray-900">
      {/* Animated background elements */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_800px_at_50%_-100%,#3b82f6,transparent)] opacity-30 dark:opacity-100" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_800px_at_80%_60%,rgba(59,130,246,0.2),transparent)] opacity-30 dark:opacity-100" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_800px_at_20%_40%,rgba(59,130,246,0.1),transparent)] opacity-30 dark:opacity-100" />
      </div>

      <div className="container relative">
        {/* Overview Section */}
        <section id="overview" className="flex flex-col items-center justify-center py-24 md:py-32">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="mx-auto max-w-[800px] text-center">
            <h1 className="text-4xl font-bold tracking-tighter text-black dark:text-white sm:text-5xl md:text-6xl lg:text-7xl">AI-Powered Trading Features</h1>
            <p className="mt-6 text-xl text-black/70 dark:text-white/70">Experience the future of trading with our comprehensive suite of AI-driven tools and features</p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Button asChild size="lg" className="rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white">
                <Link href="/dashboard">Start Trading</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="rounded-full border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 text-black dark:text-white backdrop-blur-xl hover:bg-black/10 dark:hover:bg-white/10">
                <a href="#core-features">
                  Explore Features <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </div>
          </motion.div>
        </section>

        {/* Core Features Section */}
        <section id="core-features" className="py-20">
          <div className="mx-auto max-w-[1200px]">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} viewport={{ once: true }} className="mb-16 text-center">
              <h2 className="text-3xl font-bold text-black dark:text-white">Core Features</h2>
              <p className="mt-4 text-lg text-black/70 dark:text-white/70">Everything you need for successful algorithmic trading</p>
            </motion.div>

            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {mainFeatures.map((feature) => (
                <FeatureCard key={feature.title} {...feature} />
              ))}
            </div>
          </div>
        </section>

        {/* Technical Specifications Section */}
        <section id="technical" className="border-t border-black/10 dark:border-white/10 py-20">
          <div className="mx-auto max-w-[1200px]">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} viewport={{ once: true }} className="mb-16 text-center">
              <h2 className="text-3xl font-bold text-black dark:text-white">Technical Specifications</h2>
              <p className="mt-4 text-lg text-black/70 dark:text-white/70">Built for performance and reliability</p>
            </motion.div>

            <div className="grid gap-8 md:grid-cols-3">
              {technicalSpecs.map((category) => (
                <div key={category.category} className="space-y-6">
                  <h3 className="text-xl font-semibold text-black dark:text-white">{category.category}</h3>
                  <div className="grid gap-4">
                    {category.specs.map((spec) => (
                      <TechSpecCard key={spec.title} {...spec} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Roadmap Section */}
        <section id="roadmap" className="border-t border-black/10 dark:border-white/10 py-20">
          <div className="mx-auto max-w-[1200px]">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} viewport={{ once: true }} className="mb-16 text-center">
              <h2 className="text-3xl font-bold text-black dark:text-white">Product Roadmap</h2>
              <p className="mt-4 text-lg text-black/70 dark:text-white/70">Upcoming features and improvements</p>
            </motion.div>

            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
              {upcomingFeatures.map((feature) => (
                <RoadmapCard key={feature.title} {...feature} />
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="mx-auto max-w-[800px] rounded-2xl border border-black/10 dark:border-white/10 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 p-8 text-center backdrop-blur-xl md:p-12">
            <h2 className="text-2xl font-bold text-black dark:text-white md:text-3xl">Ready to Start Trading?</h2>
            <p className="mt-4 text-black/70 dark:text-white/70">Get started with 6 free AI credits. No credit card required.</p>
            <Button asChild size="lg" className="mt-8 rounded-full bg-black dark:bg-white text-white dark:text-black hover:bg-black/90 dark:hover:bg-white/90">
              <Link href="/dashboard">
                Get Started Free <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </motion.div>
        </section>
      </div>
    </div>
  );
}
