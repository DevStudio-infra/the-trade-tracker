"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IndicatorConfig } from "../utils/chartTypes";

interface IndicatorBadgeProps {
  indicator: IndicatorConfig;
  onRemove: (id: string) => void;
}

/**
 * Component for displaying active indicator badges
 */
export function IndicatorBadge({ indicator, onRemove }: IndicatorBadgeProps) {
  return (
    <Badge
      key={indicator.id}
      variant="outline"
      className="flex items-center gap-1 py-0 h-6 text-xs cursor-pointer group"
      style={{ borderColor: indicator.color + "80" }} // Add transparency to border color
    >
      {/* Indicator color dot */}
      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: indicator.color }} />

      {/* Indicator name with period */}
      <span>
        {indicator.type.toUpperCase()}-{indicator.parameters.period || "—"}
      </span>

      {/* Remove button */}
      <Button
        variant="ghost"
        size="icon"
        className="h-4 w-4 p-0 ml-1 opacity-70 hover:opacity-100"
        onClick={() => onRemove(indicator.id)}
        aria-label={`Remove ${indicator.name} indicator`}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </Button>
    </Badge>
  );
}
