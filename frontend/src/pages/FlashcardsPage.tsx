import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, RotateCcw, ChevronRight, Download } from 'lucide-react';
import { supermemo } from 'supermemo';
import { useSubject } from '../hooks/useSubjects';
import { useSummaries, useFlashcards } from '../hooks/useContent';
import { useGamification } from '../hooks/useGamification';
import { Header } from '../components/layout/Header';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { exportToAnki } from '../utils/ankiExport';

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

function QuantitySelector({ total, label, options, onSelect }: {
  total: number; label: string; options: number[]; onSelect: (n: number) => void;
}) {
  const filtered = options.filter(n => n <= total);
  return (
    <>
      <p className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-3">{label}</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {filtered.map(n => (
          <div key={n} onClick={() => onSelect(n)}
            className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 text-center cursor-pointer hover:border-brand-400 hover:bg-brand-50/50 dark:hover:border-brand-400 dark:hover:bg-brand-900/20 transition-all">
            <p className="text-2xl font-bold text-brand-500">{n}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">cards</p>
          </div>
        ))}
        {!filtered.includes(total) && (
          <div onClick={() => onSelect(total)}
            className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 text-center cursor-pointer hover:border-brand-400 hover:bg-brand-50/50 dark:hover:border-brand-400 dark:hover:bg-brand-900/20 transition-all">
            <p className="text-2xl font-bold text-brand-500">{total}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Todos</p>
          </div>
        )}
      </div>
    </>
  );
}

export function FlashcardsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const subjectId = Number(id);
  const { data: subject } = useSubject(subjectId);
  const { data: summaries } = useSummaries(subjectId);
  const { data: backendFlashcards } = useFlashcards(subjectId);
  const { addXP } = useGamification();
  const storageKey = 'studygen-flashcards-' + subjectId;

  const [allCards, setAllCards] = useState<FlashCard[]>([]);
  const [sessionCards, setSessionCards] = useState<FlashCard[] | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showExportPicker, setShowExportPicker] = useState(false);

  // Load or generate cards
  useEffect(() => {
    if (initialized) return;
    if (backendFlashcards === undefined) return;

    const saved = localStorage.getItem(storageKey);
    if (saved) {
      const parsed: FlashCard[] = JSON.parse(saved);
      if (backendFlashcards && backendFlashcards.length > 0) {
        const existingFronts = new Set(parsed.map(c => c.front));
        const newCards = backendFlashcards
          .filter(fc => !existingFronts.has(fc.front))
          .map(fc => ({ front: fc.front, back: fc.back, interval: 0, repetition: 0, efactor: 2.5, dueDate: today() }));
        if (newCards.length > 0) {
          const merged = [...parsed, ...newCards];
          setAllCards(merged);
          localStorage.setItem(storageKey, JSON.stringify(merged));
          setInitialized(true);
          return;
        }
      }
      setAllCards(parsed);
    } else if (backendFlashcards && backendFlashcards.length > 0) {
      const generated = backendFlashcards.map(fc => ({
        front: fc.front, back: fc.back, interval: 0, repetition: 0, efactor: 2.5, dueDate: today(),
      }));
      setAllCards(generated);
      localStorage.setItem(storageKey, JSON.stringify(generated));
    } else if (summaries) {
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
      setAllCards(generated);
      localStorage.setItem(storageKey, JSON.stringify(generated));
    } else {
      return;
    }
    setInitialized(true);
  }, [backendFlashcards, summaries, initialized, storageKey]);

  const dueCards = allCards.filter(c => c.dueDate <= today());

  function startReview(count: number) {
    const shuffled = [...dueCards].sort(() => Math.random() - 0.5).slice(0, count);
    setSessionCards(shuffled);
    setCurrentIndex(0);
    setFlipped(false);
  }

  function handleGrade(grade: number) {
    if (!sessionCards) return;
    const card = sessionCards[currentIndex];
    const result = supermemo({ interval: card.interval, repetition: card.repetition, efactor: card.efactor }, grade as 0 | 1 | 2 | 3 | 4 | 5);
    addXP(5, 'review-flashcard');
    const updated: FlashCard = { ...card, ...result, dueDate: addDays(result.interval) };

    const newAll = allCards.map(c => c.front === card.front ? updated : c);
    setAllCards(newAll);
    localStorage.setItem(storageKey, JSON.stringify(newAll));

    setFlipped(false);
    if (currentIndex < sessionCards.length - 1) {
      setCurrentIndex(i => i + 1);
    } else {
      setSessionCards([]); // empty = finished
    }
  }

  function handleReset() {
    const reset = allCards.map(c => ({ ...c, interval: 0, repetition: 0, efactor: 2.5, dueDate: today() }));
    setAllCards(reset);
    setSessionCards(null);
    setCurrentIndex(0);
    setFlipped(false);
    localStorage.setItem(storageKey, JSON.stringify(reset));
  }

  async function handleExport(count: number) {
    setShowExportPicker(false);
    setExporting(true);
    try {
      const toExport = [...allCards].sort(() => Math.random() - 0.5).slice(0, count);
      await exportToAnki(
        subject?.title ? `StudyGen - ${subject.title}` : 'StudyGen Flashcards',
        toExport.map(c => ({ front: c.front, back: c.back })),
      );
    } catch (e) {
      console.error('Erro ao exportar:', e);
    } finally {
      setExporting(false);
    }
  }

  const nextReviewDays = allCards.length > 0 && dueCards.length === 0
    ? Math.max(0, Math.ceil((new Date(allCards.reduce((min, c) => c.dueDate < min ? c.dueDate : min, allCards[0].dueDate)).getTime() - Date.now()) / 86400000))
    : 0;

  const current = sessionCards?.[currentIndex];
  const sessionFinished = sessionCards !== null && sessionCards.length === 0;
  const inSession = sessionCards !== null && sessionCards.length > 0;
  const quickOptions = [5, 10, 15, 20];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Header />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <button onClick={() => navigate(`/subjects/${subjectId}`)}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:hover:text-white dark:hover:bg-slate-800 rounded-lg px-3 py-1.5 -ml-3 transition-colors mb-6">
          <ArrowLeft size={16} /> Voltar
        </button>

        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-2">{subject?.title} — Flashcards</h2>
        <p className="text-slate-500 dark:text-slate-400 mb-8">{allCards.length} cards · {dueCards.length} para revisar</p>

        {/* Config screen — choose quantity */}
        {initialized && !sessionCards && !showExportPicker && (
          <div className="animate-fade-in space-y-6">
            {dueCards.length > 0 ? (
              <Card>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Revisar Flashcards</h3>
                <p className="text-slate-500 dark:text-slate-400 mb-6">{dueCards.length} cards pendentes de revisão</p>
                <QuantitySelector total={dueCards.length} label="Quantos cards revisar?" options={quickOptions} onSelect={startReview} />
              </Card>
            ) : allCards.length > 0 ? (
              <Card className="text-center py-8">
                <div className="text-5xl mb-4">✅</div>
                <p className="text-xl font-bold text-slate-900 dark:text-white">Tudo em dia!</p>
                <p className="text-slate-500 dark:text-slate-400 mt-2">
                  {nextReviewDays === 0 ? 'Nenhum card pendente.' : `Próxima revisão em ${nextReviewDays} dia${nextReviewDays > 1 ? 's' : ''}.`}
                </p>
                <Button variant="secondary" onClick={handleReset} className="mt-6 flex items-center gap-2 mx-auto">
                  <RotateCcw size={16} /> Resetar e revisar tudo
                </Button>
              </Card>
            ) : null}

            {allCards.length > 0 && (
              <Card>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Exportar para Anki</h3>
                <p className="text-slate-500 dark:text-slate-400 mb-4">Baixe um arquivo .apkg para importar no Anki</p>
                <Button
                  variant="secondary"
                  onClick={() => setShowExportPicker(true)}
                  loading={exporting}
                  className="flex items-center gap-2"
                >
                  <Download size={16} /> Escolher cards para exportar
                </Button>
              </Card>
            )}
          </div>
        )}

        {/* Export picker */}
        {showExportPicker && (
          <div className="animate-fade-in">
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Exportar para Anki</h3>
                <button onClick={() => setShowExportPicker(false)} className="text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white">Cancelar</button>
              </div>
              <p className="text-slate-500 dark:text-slate-400 mb-6">{allCards.length} cards disponíveis</p>
              <QuantitySelector total={allCards.length} label="Quantos cards exportar?" options={quickOptions} onSelect={handleExport} />
            </Card>
          </div>
        )}

        {/* Review session */}
        {inSession && current && (
          <div className="animate-fade-in space-y-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Card {currentIndex + 1} de {sessionCards.length}</span>
            </div>

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
        )}

        {/* Session finished */}
        {sessionFinished && (
          <div className="flex flex-col items-center text-center animate-fade-in py-12">
            <div className="text-6xl mb-4">🎉</div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">Revisão concluída!</p>
            <p className="text-slate-500 dark:text-slate-400 mt-2">
              {dueCards.length > 0
                ? `Ainda tem ${dueCards.length} card${dueCards.length > 1 ? 's' : ''} pendente${dueCards.length > 1 ? 's' : ''}.`
                : 'Todos os cards estão em dia!'}
            </p>
            <div className="flex gap-3 mt-8">
              <Button variant="secondary" onClick={() => setSessionCards(null)} className="flex items-center gap-2">
                <ArrowLeft size={16} /> Voltar
              </Button>
              <Button onClick={() => navigate(`/subjects/${subjectId}`)} className="flex items-center gap-2">
                Resultados <ChevronRight size={16} />
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
