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
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Icon size={64} className="text-[#E2E8F0] mb-4" />
      <h3 className="text-lg font-semibold text-[#0F172A] mb-1">{title}</h3>
      <p className="text-[#64748B] mb-4">{description}</p>
      {action}
    </div>
  );
}
