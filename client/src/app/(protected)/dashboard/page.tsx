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
  revenue: "from-blue-500/5 to-blue-500/10",
  trades: "from-blue-600/5 to-blue-600/10",
  winRate: "from-blue-700/5 to-blue-700/10",
  credits: "from-blue-800/5 to-blue-800/10",
};

export default function DashboardPage() {
  return (
    <>
      <div className="min-h-screen bg-white dark:bg-slate-900">
        {/* Subtle gradient background */}
        <div className="fixed inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-transparent dark:from-blue-950/20 dark:via-slate-900 dark:to-slate-900 pointer-events-none" />

        {/* Main content */}
        <div className="relative p-6 space-y-6 max-w-[1600px] mx-auto">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Dashboard</h1>
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
                    "relative rounded-xl p-6 overflow-hidden",
                    "border border-slate-200 dark:border-slate-800",
                    "bg-white/40 dark:bg-slate-900/40 backdrop-blur-sm",
                    "shadow-lg dark:shadow-2xl"
                  )}>
                  {/* Gradient background */}
                  <div className={cn("absolute inset-0 bg-gradient-to-br opacity-80 dark:opacity-40", stat.gradient)} />

                  {/* Content */}
                  <div className="relative">
                    <h3 className="text-sm text-slate-500 dark:text-slate-400">{stat.title}</h3>
                    <p className="text-2xl font-bold mt-2 text-slate-900 dark:text-white">
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
