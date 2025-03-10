"use client";

import { Card } from "@/components/ui/card";
import { Check } from "lucide-react";

const benefits = [
  {
    title: "For Beginners",
    description: "Perfect for those just starting their trading journey",
    features: ["Easy-to-understand interface", "Educational resources", "Risk management tools", "Practice with demo accounts"],
  },
  {
    title: "For Experienced Traders",
    description: "Advanced features for seasoned professionals",
    features: ["Advanced technical analysis", "Custom strategy builder", "API integration", "Multiple broker support"],
  },
];

export function BenefitsSection() {
  return (
    <section className="py-20 relative">
      <div className="container px-4 mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight gradient-heading mb-4">Benefits for Every Trader</h2>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Whether you&apos;re just starting out or an experienced trader, we have features to help you succeed.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {benefits.map((benefit) => (
            <Card key={benefit.title} className="backdrop-blur-sm bg-white/40 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800">
              <div className="p-6">
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">{benefit.title}</h3>
                <p className="text-slate-600 dark:text-slate-400 mb-6">{benefit.description}</p>
                <ul className="space-y-3">
                  {benefit.features.map((feature) => (
                    <li key={feature} className="flex items-start">
                      <Check className="w-5 h-5 text-blue-500 dark:text-blue-400 mr-2 shrink-0" />
                      <span className="text-slate-700 dark:text-slate-300">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
