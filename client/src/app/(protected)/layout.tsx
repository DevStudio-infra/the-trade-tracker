"use client";

import { FloatingDock, navigationItems } from "@/components/ui/floating-dock";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
      {/* Subtle gradient background */}
      <div className="fixed inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-transparent dark:from-blue-950/20 dark:via-slate-900 dark:to-slate-900 pointer-events-none" />

      {/* Main content */}
      <div className="relative">
        {children}
        <FloatingDock items={navigationItems} />
      </div>
    </div>
  );
}
