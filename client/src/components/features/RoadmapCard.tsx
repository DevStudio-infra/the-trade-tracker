"use client";
import { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";

interface RoadmapCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  date: string;
}

export function RoadmapCard({ title, description, icon: Icon, date }: RoadmapCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      viewport={{ once: true }}
      className="group relative overflow-hidden rounded-xl border border-white/10 dark:border-white/10 border-black/10 bg-white/5 dark:bg-white/5 bg-black/5 p-6 backdrop-blur-xl transition-all hover:shadow-lg hover:shadow-blue-500/10">
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-blue-500/5 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

      <div className="mb-4 flex items-center justify-between">
        <motion.div initial={{ scale: 1 }} whileHover={{ scale: 1.1 }} className="rounded-full bg-blue-500/10 p-2">
          <Icon className="h-5 w-5 text-blue-400" />
        </motion.div>
        <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-400">{date}</span>
      </div>

      <h3 className="mb-2 text-lg font-semibold text-black/90 dark:text-white/90">{title}</h3>
      <p className="text-sm text-black/60 dark:text-white/60">{description}</p>
    </motion.div>
  );
}
