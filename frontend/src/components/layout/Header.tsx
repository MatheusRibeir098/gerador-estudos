import { BookOpen, Moon, Sun } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../../hooks/useTheme";
import { XPBar } from "../XPBar";

export function Header() {
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/80 border-b border-slate-200/60 dark:bg-slate-900/80 dark:border-slate-700/60">
      <div className="max-w-7xl mx-auto flex items-center gap-3 px-6 py-4">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-violet-500 shadow-md shadow-brand-500/20">
          <BookOpen className="text-white" size={20} />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">StudyGen</h1>
          <p className="text-slate-500 text-xs tracking-wide dark:text-slate-400">Transforme aulas em material de estudo</p>
        </div>
        <button onClick={() => navigate('/dashboard')} className="hover:opacity-80 transition-opacity">
          <XPBar />
        </button>
        <button onClick={toggle} className="p-2 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" aria-label="Alternar tema">
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>
    </header>
  );
}
