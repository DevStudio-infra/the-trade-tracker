"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, LineChart, Lightbulb, Settings, CreditCard } from "lucide-react";

interface FloatingDockProps {
  items: {
    title: string;
    icon: React.ReactNode;
    href: string;
  }[];
}

export const navigationItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: <LayoutDashboard className="h-5 w-5" />,
  },
  {
    title: "Trading",
    href: "/trading",
    icon: <LineChart className="h-5 w-5" />,
  },
  {
    title: "Strategies",
    href: "/strategies",
    icon: <Lightbulb className="h-5 w-5" />,
  },
  {
    title: "Subscription",
    href: "/subscription",
    icon: <CreditCard className="h-5 w-5" />,
  },
  {
    title: "Settings",
    href: "/settings",
    icon: <Settings className="h-5 w-5" />,
  },
];

export function FloatingDock({ items }: FloatingDockProps) {
  const pathname = usePathname();

  return (
    <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.4 }} className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <div className="relative">
        {/* Background blur effect */}
        <div className="absolute inset-0 backdrop-blur-md rounded-full dark:bg-black/40 bg-white/60" />

        {/* Content */}
        <div className="relative flex items-center justify-center gap-4 px-4 py-3 rounded-full dark:bg-[#0A1A2F]/60 bg-white/80 dark:border-[#1E3A59]/50 border-gray-200/50 border shadow-lg dark:shadow-[0_0_32px_0_rgba(15,39,68,0.3)] shadow-black/5">
          {items.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative group flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300",
                  isActive ? "dark:bg-[#1E3A59]/80 bg-gray-100 dark:shadow-[0_0_12px_0_rgba(30,58,89,0.3)] shadow-black/5" : "hover:bg-gray-100 dark:hover:bg-[#1E3A59]/40"
                )}>
                {/* Icon with zoom effect */}
                <motion.div className={cn("w-5 h-5", isActive ? "text-primary" : "text-muted-foreground")} whileHover={{ scale: 1.2 }} transition={{ duration: 0.2 }}>
                  {item.icon}
                </motion.div>

                {/* Title tooltip */}
                <div className="absolute -top-10 scale-0 transition-all rounded-lg px-2 py-1 text-sm bg-popover text-popover-foreground shadow-md group-hover:scale-100">
                  {item.title}
                  <svg className="absolute text-popover h-2 w-full left-0 top-full" x="0px" y="0px" viewBox="0 0 255 255" xmlSpace="preserve">
                    <polygon className="fill-current" points="0,0 127.5,127.5 255,0" />
                  </svg>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
