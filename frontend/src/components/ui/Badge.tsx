import type { ReactNode } from "react";

interface BadgeProps {
  variant?: "success" | "warning" | "error" | "accent" | "default";
  children: ReactNode;
  className?: string;
}

const variantStyles: Record<NonNullable<BadgeProps["variant"]>, string> = {
  success: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400",
  warning: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
  error: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
  accent: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400",
  default: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
};

export function Badge({ variant = "default", children, className = "" }: BadgeProps) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold inline-flex items-center ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
