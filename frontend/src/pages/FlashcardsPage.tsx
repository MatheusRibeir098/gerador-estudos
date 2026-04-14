import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, RotateCcw, ChevronRight } from 'lucide-react';
import { supermemo } from 'supermemo';
import { useSubject } from '../hooks/useSubjects';
import { useSummaries, useFlashcards } from '../hooks/useContent';
import { useGamification } from '../hooks/useGamification';
import { Header } from '../components/layout/Header';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

interface FlashCard {
  front: string;
  back: string;
  interval: number;
  repetition: number;
  efactor: number;
  dueDate: string;
}

const today = () => new Date().toISOString().slice(0, 10);
const addDays = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

const gradeButtons = [
  { grade: 0, label: 'Não lembrei', color: 'bg-red-500 hover:bg-red-600' },
  { grade: 3, label: 'Difícil', color: 'bg-amber-500 hover:bg-amber-600' },
  { grade: 4, label: 'Bom', color: 'bg-blue-500 hover:bg-blue-600' },
  { grade: 5, label: 'Fácil', color: 'bg-emerald-500 hover:bg-emerald-600' },
];

export function FlashcardsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const subjectId = Number(id);
  const { data: subject } = useSubject(subjectId);
  const { data: summaries } = useSummaries(subjectId);
  const { data: backendFlashcards } = useFlashcards(subjectId);
  const { addXP } = useGamification();
  const storageKey = 'studygen-flashcards-' + subjectId;

  const [cards, setCards] = useState<FlashCard[]>([]);
  const [dueCards, setDueCards] = useState<FlashCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Load or generate cards
  useEffect(() => {
    if (initialized) return;
    // Wait for backend query to resolve
    if (backendFlashcards === undefined) return;

    const saved = localStorage.getItem(storageKey);
    if (saved) {
      const parsed: FlashCard[] = JSON.parse(saved);
      // If backend has more cards than saved (new generation), merge new ones
      if (backendFlashcards && backendFlashcards.length > 0) {
        const existingFronts = new Set(parsed.map(c => c.front));
        const newCards = backendFlashcards
          .filter(fc => !existingFronts.has(fc.front))
          .map(fc => ({ front: fc.front, back: fc.back, interval: 0, repetition: 0, efactor: 2.5, dueDate: today() }));
        if (newCards.length > 0) {
          const merged = [...parsed, ...newCards];
          setCards(merged);
          setDueCards(merged.filter(c => c.dueDate <= today()));
          localStorage.setItem(storageKey, JSON.stringify(merged));
          setInitialized(true);
          return;
        }
      }
      setCards(parsed);
      setDueCards(parsed.filter(c => c.dueDate <= today()));
    } else if (backendFlashcards && backendFlashcards.length > 0) {
      // Use backend flashcards
      const generated = backendFlashcards.map(fc => ({
        front: fc.front, back: fc.back, interval: 0, repetition: 0, efactor: 2.5, dueDate: today(),
      }));
      setCards(generated);
      setDueCards(generated);
      localStorage.setItem(storageKey, JSON.stringify(generated));
    } else if (summaries) {
      // Fallback: generate from keyTopics
      const generated: FlashCard[] = [];
      for (const summary of summaries) {
        for (const topic of summary.keyTopics) {
          const lines = summary.content.split('\n');
          const idx = lines.findIndex(l => l.toLowerCase().includes(topic.toLowerCase()));
          const snippet = idx >= 0
            ? lines.slice(idx, idx + 5).join('\n').replace(/#{1,6}\s/g, '').replace(/\*\*/g, '').trim()
            : summary.content.slice(0, 200).replace(/#{1,6}\s/g, '').replace(/\*\*/g, '').trim() + '...';
          generated.push({ front: topic, back: snippet, interval: 0, repetition: 0, efactor: 2.5, dueDate: today() });
        }
      }
      setCards(generated);
      setDueCards(generated);
      localStorage.setItem(storageKey, JSON.stringify(generated));
    } else {
      return; // Wait for summaries
    }
    setInitialized(true);
  }, [backendFlashcards, summaries, initialized, storageKey]);

  function handleGrade(grade: number) {
    const card = dueCards[currentIndex];
    const result = supermemo({ interval: card.interval, repetition: card.repetition, efactor: card.efactor }, grade as 0 | 1 | 2 | 3 | 4 | 5);
    addXP(5, 'review-flashcard');
    const updated: FlashCard = { ...card, ...result, dueDate: addDays(result.interval) };

    const newCards = cards.map(c => c.front === card.front ? updated : c);
    setCards(newCards);
    localStorage.setItem(storageKey, JSON.stringify(newCards));

    setFlipped(false);
    if (currentIndex < dueCards.length - 1) {
      setCurrentIndex(i => i + 1);
    } else {
      setDueCards([]);
    }
  }

  function handleReset() {
    const reset = cards.map(c => ({ ...c, interval: 0, repetition: 0, efactor: 2.5, dueDate: today() }));
    setCards(reset);
    setDueCards(reset);
    setCurrentIndex(0);
    setFlipped(false);
    localStorage.setItem(storageKey, JSON.stringify(reset));
  }

  const nextReviewDays = cards.length > 0
    ? Math.max(0, Math.ceil((new Date(cards.reduce((min, c) => c.dueDate < min ? c.dueDate : min, cards[0].dueDate)).getTime() - Date.now()) / 86400000))
    : 0;

  const current = dueCards[currentIndex];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Header />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <button onClick={() => navigate(`/subjects/${subjectId}`)}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:hover:text-white dark:hover:bg-slate-800 rounded-lg px-3 py-1.5 -ml-3 transition-colors mb-6">
          <ArrowLeft size={16} /> Voltar
        </button>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">{subject?.title} — Flashcards</h2>
            <p className="text-slate-500 dark:text-slate-400 mt-1">{cards.length} cards · {dueCards.length} para revisar</p>
          </div>
        </div>

        {current ? (
          <div className="animate-fade-in space-y-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Card {currentIndex + 1} de {dueCards.length}</span>
            </div>

            {/* Flip card */}
            <div className="flip-card cursor-pointer" style={{ minHeight: 280 }} onClick={() => setFlipped(f => !f)}>
              <div className={`flip-card-inner relative w-full ${flipped ? 'flipped' : ''}`} style={{ minHeight: 280 }}>
                <div className="flip-card-front absolute inset-0">
                  <Card className="h-full flex flex-col items-center justify-center text-center p-8 bg-brand-50 dark:bg-brand-900/30 border-brand-200 dark:border-brand-800">
                    <p className="text-xl font-bold text-slate-900 dark:text-white">{current.front}</p>
                    <p className="text-xs text-slate-400 mt-4">Clique para ver a resposta</p>
                  </Card>
                </div>
                <div className="flip-card-back absolute inset-0">
                  <Card className="h-full flex flex-col items-center justify-center text-center p-8">
                    <p className="text-base text-slate-700 dark:text-slate-300 whitespace-pre-line">{current.back}</p>
                  </Card>
                </div>
              </div>
            </div>

            {flipped && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-fade-in">
                {gradeButtons.map(({ grade, label, color }) => (
                  <button key={grade} onClick={() => handleGrade(grade)}
                    className={`${color} text-white font-medium py-3 px-4 rounded-xl transition-colors text-sm`}>
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : initialized ? (
          <div className="flex flex-col items-center text-center animate-fade-in py-12">
            <div className="text-6xl mb-4">🎉</div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">Revisão concluída!</p>
            <p className="text-slate-500 dark:text-slate-400 mt-2">
              {nextReviewDays === 0 ? 'Todos os cards estão em dia.' : `Próxima revisão em ${nextReviewDays} dia${nextReviewDays > 1 ? 's' : ''}.`}
            </p>
            <div className="flex gap-3 mt-8">
              <Button variant="secondary" onClick={handleReset} className="flex items-center gap-2">
                <RotateCcw size={16} /> Resetar Cards
              </Button>
              <Button onClick={() => navigate(`/subjects/${subjectId}`)} className="flex items-center gap-2">
                Voltar aos Resultados <ChevronRight size={16} />
              </Button>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
