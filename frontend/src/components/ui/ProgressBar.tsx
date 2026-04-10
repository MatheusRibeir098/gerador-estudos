interface ProgressBarProps {
  value: number;
  className?: string;
  showLabel?: boolean;
}

export function ProgressBar({ value, className = "", showLabel = false }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="bg-[#E2E8F0] rounded-full h-2 w-full">
        <div
          className="bg-[#3B82F6] rounded-full h-2 transition-all duration-500"
          style={{ width: `${clamped}%` }}
        />
      </div>
      {showLabel && <span className="text-sm text-[#64748B] whitespace-nowrap">{Math.round(clamped)}%</span>}
    </div>
  );
}
