"use client";
import { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface FeatureCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  iconGradient: string;
  techSpecs: string[];
}

export function FeatureCard({ title, description, icon: Icon, iconGradient, techSpecs }: FeatureCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      viewport={{ once: true }}
      className="group relative overflow-hidden rounded-2xl border border-white/10 dark:border-white/10 border-black/10 bg-white/5 dark:bg-white/5 bg-black/5 p-6 backdrop-blur-xl transition-all hover:shadow-2xl hover:shadow-blue-500/10">
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-blue-500/10 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
      <div className="absolute inset-0 -z-20 bg-gradient-radial from-blue-500/20 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

      <motion.div initial={{ scale: 1 }} whileHover={{ scale: 1.05 }} className="mb-4 flex items-center gap-4">
        <div
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-xl text-white shadow-lg transition-transform duration-300 group-hover:scale-110",
            "bg-gradient-to-br",
            iconGradient
          )}>
          <Icon className="h-6 w-6" />
        </div>
        <h3 className="text-xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-black to-black/80 dark:from-white dark:to-white/80">{title}</h3>
      </motion.div>

      <p className="mb-6 text-black/70 dark:text-white/70">{description}</p>

      <div className="space-y-2 rounded-xl bg-black/5 dark:bg-white/5 p-4 backdrop-blur-sm">
        {techSpecs.map((spec) => (
          <motion.div
            key={spec}
            initial={{ x: -10, opacity: 0 }}
            whileInView={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="flex items-center text-sm text-black/80 dark:text-white/80">
            <div className="mr-2 h-1.5 w-1.5 rounded-full bg-blue-500" />
            {spec}
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
