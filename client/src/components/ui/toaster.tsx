"use client";

import { Toaster as Sonner } from "sonner";

export function Toaster() {
  return (
    <Sonner
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            " bg-white dark:bg-black group toast group-[.toaster]:bg-white group-[.toaster]:dark:bg-slate-900 group-[.toaster]:border-slate-200 group-[.toaster]:dark:border-slate-800 group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-slate-500 group-[.toast]:dark:text-slate-400",
          actionButton: "group-[.toast]:bg-slate-900 group-[.toast]:text-slate-50 group-[.toast]:dark:bg-slate-50 group-[.toast]:dark:text-slate-900",
          cancelButton: "group-[.toast]:bg-slate-100 group-[.toast]:text-slate-500 group-[.toast]:dark:bg-slate-800 group-[.toast]:dark:text-slate-400",
          success: "group-[.toast]:bg-blue-500 group-[.toast]:text-white group-[.toast]:dark:bg-blue-900 group-[.toast]:dark:text-blue-100",
          error: "group-[.toast]:bg-red-500 group-[.toast]:text-white group-[.toast]:dark:bg-red-900 group-[.toast]:dark:text-red-100",
          info: "group-[.toast]:bg-blue-500 group-[.toast]:text-white group-[.toast]:dark:bg-blue-900 group-[.toast]:dark:text-blue-100",
          warning: "group-[.toast]:bg-yellow-500 group-[.toast]:text-white group-[.toast]:dark:bg-yellow-900 group-[.toast]:dark:text-yellow-100",
        },
      }}
    />
  );
}
