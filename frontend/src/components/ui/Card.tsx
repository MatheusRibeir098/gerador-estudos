import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export function Card({ children, className = "", onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6 transition-all duration-200 dark:bg-slate-800 dark:border-slate-700/60 ${
        onClick ? "cursor-pointer hover:shadow-lg hover:-translate-y-1 hover:border-slate-300 dark:hover:shadow-lg dark:hover:border-slate-600" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}
