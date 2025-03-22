"use client";

import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChartErrorStateProps {
  error: string;
  onRetry: () => void;
}

/**
 * Component for displaying chart error messages
 */
export function ChartErrorState({ error, onRetry }: ChartErrorStateProps) {
  const isRateLimitError = error.toLowerCase().includes("rate limit");

  return (
    <div className="flex flex-col items-center justify-center max-w-md mx-auto">
      <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300 p-4 rounded-lg text-center">
        <AlertCircle className="h-8 w-8 mb-2 mx-auto" />
        <p className="font-medium">Error loading chart data</p>
        <p className="text-sm mt-1">{error}</p>

        {isRateLimitError && (
          <p className="text-xs mt-3 text-slate-500 dark:text-slate-400">The broker API has rate limits to prevent abuse. Please wait a few minutes and try again.</p>
        )}
      </div>

      <Button className="mt-4" variant="outline" onClick={onRetry} size="sm">
        Try Again
      </Button>
    </div>
  );
}
