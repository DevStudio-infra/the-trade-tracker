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
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: "rgba(0, 0, 0, 0.1)",
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
        borderColor: "#22c55e",
        backgroundColor: "rgba(34, 197, 94, 0.1)",
        fill: true,
        tension: 0.4,
      },
    ],
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Performance Metrics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 md:grid-cols-4">
          <div>
            <p className="text-sm text-muted-foreground">Total Trades</p>
            <p className="text-2xl font-bold">{formatNumber(mockPerformanceData.total_trades)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Win Rate</p>
            <p className="text-2xl font-bold">{mockPerformanceData.win_rate}%</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Profit/Loss</p>
            <p className={`text-2xl font-bold ${mockPerformanceData.profit_loss >= 0 ? "text-green-500" : "text-red-500"}`}>
              {mockPerformanceData.profit_loss >= 0 ? "+" : ""}
              {mockPerformanceData.profit_loss_percentage}%
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Risk/Reward</p>
            <p className="text-2xl font-bold">{mockPerformanceData.average_risk_reward.toFixed(2)}</p>
          </div>
        </div>

        <div className="h-[300px] mt-6">
          <Line options={chartOptions} data={chartData} />
        </div>

        <div className="grid gap-4 md:grid-cols-3 mt-6">
          <div>
            <p className="text-sm text-muted-foreground">Largest Win</p>
            <p className="text-lg font-medium text-green-500">+${formatNumber(mockPerformanceData.largest_win)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Largest Loss</p>
            <p className="text-lg font-medium text-red-500">${formatNumber(mockPerformanceData.largest_loss)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Sharpe Ratio</p>
            <p className="text-lg font-medium">{mockPerformanceData.sharpe_ratio.toFixed(2)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
