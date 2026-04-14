interface ProgressBarProps {
  value: number;
  className?: string;
  showLabel?: boolean;
}

export function ProgressBar({ value, className = "", showLabel = false }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="bg-slate-100 rounded-full h-3 w-full overflow-hidden dark:bg-slate-700">
        <div
          className="h-full rounded-full bg-gradient-to-r from-brand-500 to-violet-500 transition-all duration-500 animate-shimmer"
          style={{
            width: `${clamped}%`,
            backgroundSize: "200% 100%",
          }}
        />
      </div>
      {showLabel && (
        <span className="text-sm font-medium text-slate-600 tabular-nums whitespace-nowrap dark:text-slate-300">
          {Math.round(clamped)}%
        </span>
      )}
    </div>
  );
}
