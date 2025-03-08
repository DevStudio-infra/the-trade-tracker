"use client";

import { FloatingDock, navigationItems } from "@/components/ui/floating-dock";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      {/* Subtle blue gradient background */}
      <div className="fixed inset-0 dark:bg-gradient-to-br dark:from-[#050E1A] dark:via-black dark:to-black light:bg-gradient-to-br light:from-slate-100 light:to-white pointer-events-none" />

      {/* Main content */}
      <div className="relative">
        {children}
        <FloatingDock items={navigationItems} />
      </div>
    </div>
  );
}
