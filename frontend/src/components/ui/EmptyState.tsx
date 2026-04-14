import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
      <div className="flex items-center justify-center w-20 h-20 rounded-full bg-brand-50 mb-6 dark:bg-brand-900/30">
        <Icon size={36} className="text-brand-500" />
      </div>
      <h3 className="text-xl font-semibold text-slate-900 mb-2 dark:text-white">{title}</h3>
      <p className="text-slate-500 max-w-sm mb-6 dark:text-slate-400">{description}</p>
      {action}
    </div>
  );
}
