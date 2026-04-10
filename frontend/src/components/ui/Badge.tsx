import type { ReactNode } from "react";

interface BadgeProps {
  variant?: "success" | "warning" | "error" | "accent" | "default";
  children: ReactNode;
  className?: string;
}

const variantStyles: Record<NonNullable<BadgeProps["variant"]>, string> = {
  success: "bg-[#10B981]/10 text-[#10B981]",
  warning: "bg-[#F59E0B]/10 text-[#F59E0B]",
  error: "bg-[#EF4444]/10 text-[#EF4444]",
  accent: "bg-[#8B5CF6]/10 text-[#8B5CF6]",
  default: "bg-[#64748B]/10 text-[#64748B]",
};

export function Badge({ variant = "default", children, className = "" }: BadgeProps) {
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium inline-flex items-center ${variantStyles[variant]} ${className}`}>
      {children}
    </span>
  );
}
