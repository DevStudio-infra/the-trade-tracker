"use client";

import { Loader2 } from "lucide-react";

interface ChartLoadingStateProps {
  timeframe: string;
  isRetrying?: boolean;
  retryCount?: number;
}

/**
 * Component for showing loading state while chart data is being fetched
 */
export function ChartLoadingState({ timeframe, isRetrying = false, retryCount = 0 }: ChartLoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-slate-500 dark:text-slate-400">
      <Loader2 className="h-8 w-8 animate-spin mb-2 text-blue-500" />
      <p>Loading chart data...</p>
      <p className="text-xs mt-1">Timeframe: {timeframe}</p>

      {isRetrying && (
        <div className="mt-2 px-3 py-2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 rounded-md flex items-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 mr-2"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>Retrying request ({retryCount}/3)...</span>
        </div>
      )}
    </div>
  );
}
