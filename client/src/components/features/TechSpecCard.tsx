"use client";
import { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";

interface TechSpecCardProps {
  title: string;
  value: string;
  description: string;
  icon: LucideIcon;
}

export function TechSpecCard({ title, value, description, icon: Icon }: TechSpecCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      whileHover={{ y: -5 }}
      className="rounded-xl border border-white/10 dark:border-white/10 border-black/10 bg-white/5 dark:bg-white/5 bg-black/5 p-4 backdrop-blur-xl transition-all hover:shadow-lg hover:shadow-blue-500/10">
      <div className="mb-3 flex items-center gap-3">
        <Icon className="h-5 w-5 text-blue-400" />
        <div className="font-medium text-black/90 dark:text-white/90">{title}</div>
      </div>
      <motion.div initial={{ scale: 1 }} whileHover={{ scale: 1.05 }} className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
        {value}
      </motion.div>
      <p className="mt-1 text-sm text-black/60 dark:text-white/60">{description}</p>
    </motion.div>
  );
}
