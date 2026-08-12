'use client';

import { useTheme } from "next-themes";
import { Toaster as Sonner, ToasterProps } from "sonner";
import { CircleCheck, Info, AlertTriangle, XCircle, Loader2 } from "lucide-react";
import { cn } from "../utils/cn";

export function ToastContainer(props: ToasterProps) {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast: "group toast group-[.toaster]:bg-background/80 group-[.toaster]:backdrop-blur-xl group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-xl group-[.toaster]:rounded-xl px-4 py-3 border",
          description: "group-[.toast]:text-muted-foreground group-[.toast]:text-sm group-[.toast]:font-medium",
          actionButton: "group-[.toast]:bg-indigo-500 group-[.toast]:text-white font-semibold rounded-lg",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground font-semibold rounded-lg",
          success: "group-[.toaster]:border-emerald-500/20 group-[.toaster]:bg-emerald-500/5 dark:group-[.toaster]:bg-emerald-500/10",
          error: "group-[.toaster]:border-rose-500/20 group-[.toaster]:bg-rose-500/5 dark:group-[.toaster]:bg-rose-500/10",
          warning: "group-[.toaster]:border-amber-500/20 group-[.toaster]:bg-amber-500/5 dark:group-[.toaster]:bg-amber-500/10",
          info: "group-[.toaster]:border-indigo-500/20 group-[.toaster]:bg-indigo-500/5 dark:group-[.toaster]:bg-indigo-500/10",
        },
      }}
      icons={{
        success: <CircleCheck className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />,
        info: <Info className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />,
        warning: <AlertTriangle className="w-5 h-5 text-amber-500 dark:text-amber-400" />,
        error: <XCircle className="w-5 h-5 text-rose-500 dark:text-rose-400" />,
        loading: <Loader2 className="w-5 h-5 text-slate-500 animate-spin" />,
      }}
      {...props}
    />
  );
}
