"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Check, ArrowRight, Zap, Bot, Shield, LineChart, Users, Database } from "lucide-react";
import Link from "next/link";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const pricingTiers = [
  {
    name: "Free",
    description: "Perfect for trying out our AI trading features",
    price: "Free",
    duration: "",
    features: ["6 AI Credits", "Basic Trading Signals", "Market Analysis", "Paper Trading", "Email Support", "Basic Risk Management"],
    cta: "Get Started",
    highlighted: false,
  },
  {
    name: "Pro",
    description: "For active traders who want more signals and features",
    price: "$17.99",
    duration: "/month",
    features: [
      "100 AI Credits",
      "Advanced Trading Signals",
      "Real-time Market Analysis",
      "Live Trading",
      "Strategy Backtesting",
      "24/7 Priority Support",
      "Custom Risk Management",
      "Team Collaboration",
    ],
    cta: "Start Pro Plan",
    highlighted: true,
  },
];

const features = [
  {
    icon: Bot,
    title: "AI Trading Signals",
    description: "Get real-time trading signals powered by our advanced AI models",
  },
  {
    icon: Shield,
    title: "Risk Management",
    description: "Advanced risk control system with customizable parameters",
  },
  {
    icon: LineChart,
    title: "Market Analysis",
    description: "Deep market analysis with pattern recognition",
  },
  {
    icon: Database,
    title: "Backtesting",
    description: "Test your strategies against historical market data",
  },
  {
    icon: Zap,
    title: "Automated Trading",
    description: "Execute trades automatically based on AI signals",
  },
  {
    icon: Users,
    title: "Team Access",
    description: "Collaborate with team members on trading strategies",
  },
];

const pricingFaqData = [
  {
    id: "item-1",
    question: "What are AI credits?",
    answer:
      "Credits are your currency for AI trading analysis. Each time you request an analysis of your trading chart, it consumes one credit. Free users receive 6 credits monthly, while Pro users get 100 credits. Each credit allows you to analyze one chart and receive detailed AI-powered insights about patterns, trends, and potential trading opportunities.",
  },
  {
    id: "item-2",
    question: "What&apos;s included in the Free plan?",
    answer:
      "The Free plan includes 6 monthly credits, basic pattern recognition, real-time market analysis, and standard support with 48-hour response time. You&apos;ll get access to our basic AI model for trading insights, making it perfect for beginners or those wanting to test our platform&apos;s capabilities.",
  },
  {
    id: "item-3",
    question: "What additional features do I get with Pro?",
    answer:
      "Pro users get 100 monthly credits, advanced pattern recognition with our sophisticated AI models, both real-time and historical analysis capabilities, priority 24-hour support, custom chart annotations, and the ability to export detailed reports. You&apos;ll also receive advanced trading insights and faster analysis response times.",
  },
  {
    id: "item-4",
    question: "How does the AI analysis work?",
    answer:
      "Our AI analyzes your trading charts using advanced pattern recognition algorithms. It identifies key patterns, trends, and potential trading opportunities. Pro users get access to our advanced AI models that provide more sophisticated analysis, including historical data correlation and detailed market insights.",
  },
  {
    id: "item-5",
    question: "Can I upgrade or downgrade my plan?",
    answer:
      "Yes, you can upgrade to Pro or downgrade to Free at any time. When upgrading, you&apos;ll get immediate access to all Pro features and your new credit allocation of 100 credits. When downgrading, you&apos;ll keep Pro features until the end of your current billing period.",
  },
  {
    id: "item-6",
    question: "Do unused credits roll over?",
    answer:
      "No, credits reset at the beginning of each billing cycle. This helps us maintain optimal system performance and ensure fair usage for all users. We recommend using your credits throughout the month for regular trading analysis.",
  },
];

export default function PricingPage() {
  return (
    <div className="relative min-h-screen bg-gradient-to-b from-gray-50 via-gray-100 to-gray-50 dark:from-gray-900 dark:via-blue-900 dark:to-gray-900">
      {/* Animated background elements */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_800px_at_50%_-100%,#3b82f6,transparent)] opacity-30 dark:opacity-100" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_800px_at_80%_60%,rgba(59,130,246,0.2),transparent)] opacity-30 dark:opacity-100" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_800px_at_20%_40%,rgba(59,130,246,0.1),transparent)] opacity-30 dark:opacity-100" />
      </div>

      <div className="container relative py-24">
        {/* Header Section */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="mx-auto max-w-[800px] text-center">
          <h1 className="text-4xl font-bold tracking-tighter text-black dark:text-white sm:text-5xl md:text-6xl">Simple, Transparent Pricing</h1>
          <p className="mt-6 text-xl text-black/70 dark:text-white/70">Choose the perfect plan for your trading needs. Start free, upgrade when you need to.</p>
        </motion.div>

        {/* Pricing Tiers */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mx-auto mt-16 grid max-w-[800px] gap-8 md:grid-cols-2">
          {pricingTiers.map((tier) => (
            <div
              key={tier.name}
              className={`group relative overflow-hidden rounded-2xl border backdrop-blur-xl transition-all ${
                tier.highlighted
                  ? "border-blue-500 bg-blue-500/10 dark:border-blue-400 dark:bg-blue-400/10"
                  : "border-black/10 dark:border-white/10 bg-white/5 dark:bg-white/5 bg-black/5"
              } p-8`}>
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-black dark:text-white">{tier.name}</h3>
                <p className="mt-2 text-black/70 dark:text-white/70">{tier.description}</p>
              </div>
              <div className="mb-6">
                <div className="flex items-baseline">
                  <span className="text-4xl font-bold text-black dark:text-white">{tier.price}</span>
                  <span className="ml-1 text-black/70 dark:text-white/70">{tier.duration}</span>
                </div>
              </div>
              <ul className="mb-8 space-y-4">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-center text-black/80 dark:text-white/80">
                    <Check className="mr-3 h-5 w-5 text-blue-500" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button
                asChild
                size="lg"
                className={`w-full rounded-xl ${
                  tier.highlighted
                    ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white"
                    : "bg-black dark:bg-white text-white dark:text-black hover:bg-black/90 dark:hover:bg-white/90"
                }`}>
                <Link href="/dashboard">
                  {tier.cta}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          ))}
        </motion.div>

        {/* Features Grid */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.4 }} className="mx-auto mt-24 max-w-[1200px]">
          <h2 className="mb-12 text-center text-3xl font-bold text-black dark:text-white">Everything You Need to Trade Smarter</h2>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="group relative overflow-hidden rounded-xl border border-black/10 dark:border-white/10 bg-white/5 dark:bg-white/5 bg-black/5 p-6 backdrop-blur-xl transition-all hover:shadow-lg hover:shadow-blue-500/10">
                <div className="mb-4 flex items-center gap-4">
                  <div className="rounded-full bg-blue-500/10 p-3">
                    <feature.icon className="h-6 w-6 text-blue-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-black/90 dark:text-white/90">{feature.title}</h3>
                </div>
                <p className="text-black/70 dark:text-white/70">{feature.description}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* FAQ Section */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.6 }} className="mx-auto mt-24 max-w-[800px]">
          <h2 className="mb-12 text-center text-3xl font-bold text-black dark:text-white">Frequently Asked Questions</h2>
          <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-white/5 dark:bg-white/5 bg-black/5 p-6 backdrop-blur-xl">
            <Accordion type="single" collapsible className="w-full">
              {pricingFaqData.map((faqItem) => (
                <AccordionItem key={faqItem.id} value={faqItem.id}>
                  <AccordionTrigger className="text-left text-black/90 dark:text-white/90 hover:text-black dark:hover:text-white">{faqItem.question}</AccordionTrigger>
                  <AccordionContent className="text-sm text-black/70 dark:text-white/70 sm:text-[15px]">{faqItem.answer}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </motion.div>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="mx-auto mt-24 max-w-[800px] rounded-2xl border border-black/10 dark:border-white/10 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 p-8 text-center backdrop-blur-xl md:p-12">
          <h2 className="text-2xl font-bold text-black dark:text-white md:text-3xl">Ready to Start Trading?</h2>
          <p className="mt-4 text-black/70 dark:text-white/70">Get started with 6 free AI credits. No credit card required.</p>
          <Button asChild size="lg" className="mt-8 rounded-full bg-black dark:bg-white text-white dark:text-black hover:bg-black/90 dark:hover:bg-white/90">
            <Link href="/dashboard">
              Get Started Free <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
