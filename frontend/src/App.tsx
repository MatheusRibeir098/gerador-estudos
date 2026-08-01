import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import { CheckCircle, X } from 'lucide-react';
import { HomePage } from './pages/HomePage';
import { ProcessingPage } from './pages/ProcessingPage';
import { ResultPage } from './pages/ResultPage';
import { QuizPage } from './pages/QuizPage';
import { FlashcardsPage } from './pages/FlashcardsPage';
import { DashboardPage } from './pages/DashboardPage';
import { useProcessingNotifications } from './hooks/useProcessingNotifications';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

function ProcessingToasts() {
  const { notifications, dismiss } = useProcessingNotifications();
  const navigate = useNavigate();

  useEffect(() => {
    if (notifications.length === 0) return;
    const timers = notifications.map(n =>
      setTimeout(() => dismiss(n.id), 8000)
    );
    return () => timers.forEach(clearTimeout);
  }, [notifications, dismiss]);

  if (notifications.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-6 z-50 flex flex-col gap-3">
      {notifications.map(n => (
        <div
          key={n.id}
          onClick={() => { dismiss(n.id); navigate(`/subjects/${n.id}`); }}
          className="flex items-center gap-3 bg-emerald-500 text-white px-4 py-3 rounded-xl shadow-lg cursor-pointer animate-slide-up hover:bg-emerald-600 transition-colors duration-150"
        >
          <CheckCircle size={20} className="shrink-0" />
          <span className="text-sm font-medium truncate max-w-[250px]">{n.title} — pronto!</span>
          <button
            onClick={(e) => { e.stopPropagation(); dismiss(n.id); }}
            className="shrink-0 p-0.5 hover:bg-white/20 rounded transition-colors"
            aria-label="Fechar notificação"
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="min-h-screen bg-[#F8FAFC]">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/subjects/:id" element={<ResultPage />} />
            <Route path="/subjects/:id/processing" element={<ProcessingPage />} />
            <Route path="/subjects/:id/quiz" element={<QuizPage />} />
            <Route path="/subjects/:id/flashcards" element={<FlashcardsPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <ProcessingToasts />
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
