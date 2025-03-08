"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface FloatingDockProps {
  items: {
    title: string;
    icon: React.ReactNode;
    href: string;
  }[];
}

export function FloatingDock({ items }: FloatingDockProps) {
  const pathname = usePathname();

  return (
    <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.4 }} className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <div className="relative">
        {/* Background blur effect */}
        <div className="absolute inset-0 bg-black/40 backdrop-blur-md rounded-full" />

        {/* Content */}
        <div className="relative flex items-center justify-center gap-4 px-4 py-3 rounded-full bg-[#0A1A2F]/60 border border-[#1E3A59]/50 shadow-[0_0_32px_0_rgba(15,39,68,0.3)]">
          {items.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative group flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300",
                  isActive ? "bg-[#1E3A59]/80 shadow-[0_0_12px_0_rgba(30,58,89,0.3)]" : "hover:bg-[#1E3A59]/40"
                )}>
                {/* Icon with zoom effect */}
                <motion.div className="w-5 h-5" whileHover={{ scale: 1.2 }} transition={{ duration: 0.2 }}>
                  {item.icon}
                </motion.div>

                {/* Title tooltip */}
                <div className="absolute -top-10 scale-0 transition-all rounded-lg px-2 py-1 text-sm text-white bg-[#1E3A59]/90 backdrop-blur-sm group-hover:scale-100">
                  {item.title}
                  <svg className="absolute text-[#1E3A59]/90 h-2 w-full left-0 top-full" x="0px" y="0px" viewBox="0 0 255 255" xmlSpace="preserve">
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
