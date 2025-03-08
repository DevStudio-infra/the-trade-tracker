"use client";

import { PerformanceMetrics } from "@/components/dashboard/performance-metrics";
import { RecentTrades } from "@/components/dashboard/recent-trades";
import { ActiveSignals } from "@/components/dashboard/active-signals";
import { AccountOverview } from "@/components/dashboard/account-overview";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { mockStats } from "@/lib/mock-data";
import { formatNumber } from "@/lib/utils";
import { cn } from "@/lib/utils";

const gradients = {
  revenue: "from-blue-500/5 to-blue-600/10",
  trades: "from-blue-400/5 to-blue-500/10",
  winRate: "from-blue-500/5 to-blue-400/10",
  credits: "from-blue-600/5 to-blue-500/10",
};

export default function DashboardPage() {
  return (
    <>
      <div className="min-h-screen bg-background">
        {/* Subtle blue gradient background */}
        <div className="fixed inset-0 dark:bg-gradient-to-br dark:from-[#050E1A] dark:via-black dark:to-black light:bg-gradient-to-br light:from-slate-100 light:to-white pointer-events-none" />

        {/* Main content */}
        <div className="relative p-6 space-y-6 max-w-[1600px] mx-auto">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <DatePickerWithRange />
          </div>

          <div className="grid gap-4">
            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[
                { title: "Total Revenue", value: mockStats.totalRevenue, gradient: gradients.revenue },
                { title: "Active Trades", value: mockStats.activeTrades, gradient: gradients.trades },
                { title: "Win Rate", value: mockStats.winRate, gradient: gradients.winRate },
                { title: "AI Credits", value: mockStats.aiCredits, gradient: gradients.credits },
              ].map((stat) => (
                <div
                  key={stat.title}
                  className={cn(
                    "relative rounded-xl p-6 overflow-hidden backdrop-blur-sm",
                    "border border-[#1E3A59]/20",
                    "dark:bg-[#0A1A2F]/40 dark:shadow-[0_0_32px_0_rgba(15,39,68,0.2)]",
                    "bg-white/40 shadow-lg"
                  )}>
                  {/* Gradient background */}
                  <div className={cn("absolute inset-0 bg-gradient-to-br opacity-80", stat.gradient, "dark:opacity-40")} />

                  {/* Content */}
                  <div className="relative">
                    <h3 className="text-sm text-muted-foreground">{stat.title}</h3>
                    <p className="text-2xl font-bold mt-2">
                      {stat.title === "Total Revenue" ? "$" : ""}
                      {formatNumber(stat.value.value)}
                      {stat.title === "Win Rate" ? "%" : ""}
                    </p>
                    <p className="text-sm text-blue-500 dark:text-blue-400 mt-1">
                      +{stat.value.change}
                      {typeof stat.value.change === "number" && stat.value.change > 1 ? "%" : ""} from {stat.value.timeframe}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2">
                <PerformanceMetrics />
              </div>
              <div className="space-y-4">
                <RecentTrades />
              </div>
            </div>

            {/* Active Signals */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2">
                <ActiveSignals />
              </div>
              <div>
                <AccountOverview />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
