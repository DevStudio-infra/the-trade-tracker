"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Line } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from "chart.js";
import { mockPerformanceData } from "@/lib/mock-data";
import { formatNumber } from "@/lib/utils";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

export function PerformanceMetrics() {
  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        mode: "index" as const,
        intersect: false,
        backgroundColor: "rgb(255, 255, 255)",
        titleColor: "rgb(15, 23, 42)",
        bodyColor: "rgb(15, 23, 42)",
        borderColor: "rgb(226, 232, 240)",
        borderWidth: 1,
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: "rgb(100, 116, 139)",
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: "rgba(226, 232, 240, 0.1)",
        },
        ticks: {
          color: "rgb(100, 116, 139)",
        },
      },
    },
  };

  const chartData = {
    labels: mockPerformanceData.chart_data.labels,
    datasets: [
      {
        label: "Equity Curve",
        data: mockPerformanceData.chart_data.equity_curve,
        borderColor: "rgb(59, 130, 246)",
        backgroundColor: "rgba(59, 130, 246, 0.1)",
        fill: true,
        tension: 0.4,
      },
    ],
  };

  return (
    <Card className="backdrop-blur-sm bg-white/40 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800">
      <CardHeader>
        <CardTitle className="text-slate-900 dark:text-white">Performance Metrics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 md:grid-cols-4">
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">Total Trades</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{formatNumber(mockPerformanceData.total_trades)}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">Win Rate</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{mockPerformanceData.win_rate}%</p>
          </div>
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">Profit/Loss</p>
            <p className={`text-2xl font-bold ${mockPerformanceData.profit_loss >= 0 ? "text-blue-500 dark:text-blue-400" : "text-red-500 dark:text-red-400"}`}>
              {mockPerformanceData.profit_loss >= 0 ? "+" : ""}
              {mockPerformanceData.profit_loss_percentage}%
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">Risk/Reward</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{mockPerformanceData.average_risk_reward.toFixed(2)}</p>
          </div>
        </div>

        <div className="h-[300px] mt-6">
          <Line options={chartOptions} data={chartData} />
        </div>

        <div className="grid gap-4 md:grid-cols-3 mt-6">
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">Largest Win</p>
            <p className="text-lg font-medium text-blue-500 dark:text-blue-400">+${formatNumber(mockPerformanceData.largest_win)}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">Largest Loss</p>
            <p className="text-lg font-medium text-red-500 dark:text-red-400">${formatNumber(mockPerformanceData.largest_loss)}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">Sharpe Ratio</p>
            <p className="text-lg font-medium text-slate-900 dark:text-white">{mockPerformanceData.sharpe_ratio.toFixed(2)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
