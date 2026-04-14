import { Zap, Flame } from 'lucide-react';
import { useGamification } from '../hooks/useGamification';

export function XPBar() {
  const { state, getLevelName, getLevelProgress } = useGamification();
  const progress = getLevelProgress();

  return (
    <div className="flex items-center gap-3">
      {state.streak > 0 && (
        <span className="flex items-center gap-1 text-xs font-bold text-amber-500">
          <Flame size={14} /> {state.streak}
        </span>
      )}
      <div className="flex items-center gap-2">
        <Zap size={14} className="text-brand-500" />
        <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">{getLevelName()}</span>
        <div className="w-16 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div className="h-full bg-brand-500 rounded-full transition-all" style={{ width: progress + '%' }} />
        </div>
      </div>
    </div>
  );
}
