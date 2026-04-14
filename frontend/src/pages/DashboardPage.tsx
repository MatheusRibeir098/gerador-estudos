import { ArrowLeft, Zap, Flame, Trophy, Lock, BookOpen, Brain, Target, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useGamification } from '../hooks/useGamification';
import { useSubjects } from '../hooks/useSubjects';
import { useQuizAttempts } from '../hooks/useContent';
import { Header } from '../components/layout/Header';
import { Card } from '../components/ui/Card';

const ACHIEVEMENTS = [
  { id: 'first-subject', name: 'Primeira Matéria', desc: 'Criou sua primeira matéria', icon: BookOpen },
  { id: 'first-quiz', name: 'Primeiro Quiz', desc: 'Completou seu primeiro quiz', icon: Brain },
  { id: 'perfect-quiz', name: 'Perfeição', desc: 'Quiz com 100% de acerto', icon: Target },
  { id: 'streak-3', name: 'Consistente', desc: '3 dias seguidos estudando', icon: Flame },
  { id: 'streak-7', name: 'Dedicado', desc: '7 dias seguidos', icon: Flame },
  { id: 'streak-30', name: 'Imparável', desc: '30 dias seguidos', icon: Flame },
  { id: 'xp-100', name: 'Centenário', desc: 'Atingiu 100 XP', icon: Zap },
  { id: 'xp-500', name: 'Meio Milhar', desc: 'Atingiu 500 XP', icon: Zap },
  { id: 'xp-1000', name: 'Mestre', desc: 'Atingiu 1000 XP', icon: Star },
  { id: 'all-slides', name: 'Leitor Completo', desc: 'Leu todos os slides de uma matéria', icon: BookOpen },
  { id: 'flashcard-master', name: 'Memória Viva', desc: 'Revisou 50 flashcards', icon: Brain },
];

export function DashboardPage() {
  const navigate = useNavigate();
  const { state, getLevelName, getLevelProgress } = useGamification();
  const { data: subjects = [] } = useSubjects();
  const completedSubjects = subjects.filter(s => s.status === 'completed');

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Header />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <button onClick={() => navigate('/')}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:hover:text-white dark:hover:bg-slate-800 rounded-lg px-3 py-1.5 -ml-3 transition-colors mb-6">
          <ArrowLeft size={16} /> Voltar
        </button>

        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-8">Meu Desempenho</h2>

        {/* Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <Card>
            <div className="flex items-center gap-2 mb-2">
              <Zap size={18} className="text-brand-500" />
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">XP Total</span>
            </div>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">{state.xp}</p>
            <p className="text-sm text-brand-500 font-medium mt-1">{getLevelName()}</p>
            <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mt-2 overflow-hidden">
              <div className="h-full bg-brand-500 rounded-full transition-all" style={{ width: getLevelProgress() + '%' }} />
            </div>
          </Card>
          <Card>
            <div className="flex items-center gap-2 mb-2">
              <Flame size={18} className="text-amber-500" />
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Streak</span>
            </div>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">{state.streak}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">dias seguidos</p>
          </Card>
          <Card>
            <div className="flex items-center gap-2 mb-2">
              <BookOpen size={18} className="text-blue-500" />
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Matérias</span>
            </div>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">{subjects.length}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{completedSubjects.length} concluídas</p>
          </Card>
          <Card>
            <div className="flex items-center gap-2 mb-2">
              <Trophy size={18} className="text-amber-500" />
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Conquistas</span>
            </div>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">{state.achievements.length}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">de {ACHIEVEMENTS.length}</p>
          </Card>
        </div>

        {/* Quiz History */}
        {completedSubjects.length > 0 && (
          <div className="mb-10">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Histórico de Quizzes</h3>
            <div className="space-y-3">
              {completedSubjects.map(s => (
                <QuizHistoryRow key={s.id} subjectId={s.id} title={s.title} />
              ))}
            </div>
          </div>
        )}

        {/* Achievements */}
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Conquistas</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {ACHIEVEMENTS.map(a => {
            const unlocked = state.achievements.includes(a.id);
            const Icon = unlocked ? a.icon : Lock;
            return (
              <Card key={a.id} className={unlocked ? '' : 'opacity-50'}>
                <div className="flex items-center gap-3">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-xl shrink-0 ${unlocked ? 'bg-amber-50 dark:bg-amber-900/30' : 'bg-slate-100 dark:bg-slate-800'}`}>
                    <Icon size={20} className={unlocked ? 'text-amber-500' : 'text-slate-400'} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-slate-900 dark:text-white truncate">{a.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{a.desc}</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </main>
    </div>
  );
}

function QuizHistoryRow({ subjectId, title }: { subjectId: number; title: string }) {
  const { data: attempts } = useQuizAttempts(subjectId);
  if (!attempts || attempts.length === 0) return null;
  const best = Math.max(...attempts.map(a => a.percentage));
  const last = attempts[attempts.length - 1].percentage;
  return (
    <Card className="flex items-center gap-4">
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-slate-900 dark:text-white truncate">{title}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">{attempts.length} tentativa{attempts.length > 1 ? 's' : ''}</p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-bold text-slate-900 dark:text-white">{Math.round(last)}%</p>
        <p className="text-xs text-slate-400">melhor: {Math.round(best)}%</p>
      </div>
    </Card>
  );
}
