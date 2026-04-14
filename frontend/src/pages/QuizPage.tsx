import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSubject } from "../hooks/useSubjects";
import { useQuizzes, useSubmitQuizAttempt } from "../hooks/useContent";
import { Header } from "../components/layout/Header";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { ProgressBar } from "../components/ui/ProgressBar";
import { Badge } from "../components/ui/Badge";
import { ArrowLeft, CheckCircle, XCircle, RotateCcw, ArrowRight, Trophy } from "lucide-react";

import { useGamification } from '../hooks/useGamification';

const difficultyMap = {
  easy: { variant: "success" as const, label: "Fácil" },
  medium: { variant: "warning" as const, label: "Médio" },
  hard: { variant: "error" as const, label: "Difícil" },
};

export function QuizPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const subjectId = Number(id);
  const { data: subject } = useSubject(subjectId);
  const { data: quizzes } = useQuizzes(subjectId);
  const submitAttempt = useSubmitQuizAttempt();
  const { addXP } = useGamification();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [answers, setAnswers] = useState<{ quizId: number; selectedIndex: number; correct: boolean }[]>([]);
  const [finished, setFinished] = useState(false);
  const [shuffledQuizzes, setShuffledQuizzes] = useState<typeof quizzes | null>(null);

  const allTotal = quizzes?.length ?? 0;
  const total = shuffledQuizzes?.length ?? 0;
  const current = shuffledQuizzes?.[currentIndex];
  const correctCount = answers.filter((a) => a.correct).length;
  const percentage = total > 0 ? (correctCount / total) * 100 : 0;

  function handleConfirm() {
    if (selectedIndex === null || !current) return;
    const correct = selectedIndex === current.correctIndex;
    setAnswers((prev) => [...prev, { quizId: current.id, selectedIndex, correct }]);
    setShowAnswer(true);
  }

  function handleNext() {
    if (currentIndex < total - 1) {
      setCurrentIndex((i) => i + 1);
      setSelectedIndex(null);
      setShowAnswer(false);
    } else {
      const finalAnswers = [...answers];
      const finalCorrect = finalAnswers.filter((a) => a.correct).length;
      submitAttempt.mutate({ subjectId, input: { totalQuestions: total, correctAnswers: finalCorrect, answers: finalAnswers } });
      addXP(20, 'complete-quiz');
      if (finalCorrect === total) addXP(100, 'perfect-quiz');
      setFinished(true);
    }
  }

  function handleRetry() {
    setCurrentIndex(0);
    setSelectedIndex(null);
    setShowAnswer(false);
    setAnswers([]);
    setFinished(false);
    setShuffledQuizzes(null);
  }

  function getResultMessage() {
    if (percentage >= 90) return "Excelente!";
    if (percentage >= 70) return "Bom trabalho!";
    if (percentage >= 50) return "Continue estudando!";
    return "Revise o conteúdo";
  }

  function startQuiz(count: number) {
    const shuffled = [...(quizzes || [])].sort(() => Math.random() - 0.5).slice(0, count);
    setShuffledQuizzes(shuffled);
  }

  const quickOptions = [5, 10, 15, 20].filter(n => n <= allTotal);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Header />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <button
          onClick={() => navigate(`/subjects/${subjectId}`)}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:hover:text-white dark:hover:bg-slate-800 rounded-lg px-3 py-1.5 -ml-3 transition-colors mb-6"
        >
          <ArrowLeft size={16} /> Voltar
        </button>

        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-8">{subject?.title ?? "Carregando..."}</h2>

        {!shuffledQuizzes && quizzes && quizzes.length > 0 ? (
          <div className="animate-fade-in">
            <Card>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Configurar Quiz</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-6">{allTotal} perguntas disponíveis</p>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-3">Quantas perguntas?</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {quickOptions.map(n => (
                  <div key={n} onClick={() => startQuiz(n)}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 text-center cursor-pointer hover:border-brand-400 hover:bg-brand-50/50 dark:hover:border-brand-400 dark:hover:bg-brand-900/20 transition-all">
                    <p className="text-2xl font-bold text-brand-500">{n}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">perguntas</p>
                  </div>
                ))}
                <div onClick={() => startQuiz(allTotal)}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 text-center cursor-pointer hover:border-brand-400 hover:bg-brand-50/50 dark:hover:border-brand-400 dark:hover:bg-brand-900/20 transition-all">
                  <p className="text-2xl font-bold text-brand-500">{allTotal}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Todas</p>
                </div>
              </div>
            </Card>
          </div>
        ) : finished ? (
          <div className="flex flex-col items-center text-center animate-fade-in">
            <Trophy size={72} className={percentage >= 70 ? "text-amber-400" : "text-slate-400"} />
            <p className="text-5xl font-bold text-slate-900 dark:text-white mt-6">{Math.round(percentage)}%</p>
            <p className="text-lg text-slate-500 dark:text-slate-400 mt-1">{correctCount} de {total} corretas</p>
            <p className="text-xl font-semibold text-slate-900 dark:text-white mt-2">{getResultMessage()}</p>
            <ProgressBar value={percentage} className="w-full max-w-sm mt-6" />
            <div className="flex gap-3 mt-8">
              <Button variant="secondary" onClick={handleRetry} className="flex items-center gap-2">
                <RotateCcw size={16} /> Refazer Quiz
              </Button>
              <Button onClick={() => navigate(`/subjects/${subjectId}`)}>Voltar aos Resultados</Button>
            </div>
          </div>
        ) : current ? (
          <div className="animate-fade-in space-y-6">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Questão {currentIndex + 1} de {total}</span>
                <Badge variant={difficultyMap[current.difficulty].variant}>{difficultyMap[current.difficulty].label}</Badge>
              </div>
              <ProgressBar value={(currentIndex / total) * 100} />
            </div>

            <Card>
              <p className="text-lg font-semibold text-slate-900 dark:text-white">{current.question}</p>
            </Card>

            <div className="grid gap-3">
              {current.options.map((option, i) => {
                let style = "border border-slate-200 hover:border-brand-400 hover:bg-brand-50/50 cursor-pointer dark:border-slate-700 dark:hover:border-brand-400 dark:hover:bg-brand-900/20";
                if (showAnswer) {
                  if (i === current.correctIndex) style = "border border-emerald-400 bg-emerald-50 dark:border-emerald-500 dark:bg-emerald-900/20";
                  else if (i === selectedIndex) style = "border border-red-400 bg-red-50 dark:border-red-500 dark:bg-red-900/20";
                  else style = "border border-slate-200 opacity-50 dark:border-slate-700 dark:opacity-40";
                } else if (i === selectedIndex) {
                  style = "border border-brand-500 bg-brand-50 dark:bg-brand-900/30";
                }

                return (
                  <div
                    key={i}
                    onClick={() => !showAnswer && setSelectedIndex(i)}
                    className={`p-4 rounded-xl transition-all duration-200 flex items-center gap-3 ${style} ${showAnswer ? "cursor-default" : ""}`}
                  >
                    {showAnswer && i === current.correctIndex && <CheckCircle size={20} className="text-emerald-500 shrink-0 animate-scale-in" />}
                    {showAnswer && i === selectedIndex && i !== current.correctIndex && <XCircle size={20} className="text-red-500 shrink-0 animate-scale-in" />}
                    <span className="text-slate-900 dark:text-slate-200">{option}</span>
                  </div>
                );
              })}
            </div>

            {showAnswer && (
              <Card className="border-l-4 border-brand-400 bg-brand-50/30 dark:bg-brand-900/20 animate-fade-in">
                <p className="text-slate-700 dark:text-slate-300">{current.explanation}</p>
              </Card>
            )}

            {!showAnswer ? (
              <Button onClick={handleConfirm} disabled={selectedIndex === null} className="w-full sm:w-auto">Confirmar</Button>
            ) : (
              <Button onClick={handleNext} className="w-full sm:w-auto flex items-center gap-1.5">
                {currentIndex < total - 1 ? <><span>Próxima</span> <ArrowRight size={16} /></> : "Ver Resultado"}
              </Button>
            )}
          </div>
        ) : null}
      </main>
    </div>
  );
}
