import { Brain, LineChart, Shield, Zap } from "lucide-react";

const highlights = [
  {
    title: "AI-Powered Signals",
    description: "Get real-time trading signals powered by advanced machine learning algorithms.",
    icon: Brain,
  },
  {
    title: "Advanced Analytics",
    description: "Track your performance with detailed analytics and insights.",
    icon: LineChart,
  },
  {
    title: "Automated Trading",
    description: "Execute trades automatically based on your predefined strategies.",
    icon: Zap,
  },
  {
    title: "Risk Management",
    description: "Built-in risk management tools to protect your investments.",
    icon: Shield,
  },
];

export function HighlightsSection() {
  return (
    <section className="py-20 relative">
      <div className="container px-4 mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight gradient-heading mb-4">Why Choose The Trade Tracker</h2>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">Experience the future of trading with our cutting-edge features and tools.</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {highlights.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="relative p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40 backdrop-blur-sm">
                <div className="p-3 bg-blue-500/10 dark:bg-blue-400/10 rounded-lg w-fit mb-4">
                  <Icon className="w-6 h-6 text-blue-500 dark:text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">{item.title}</h3>
                <p className="text-slate-600 dark:text-slate-400">{item.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
