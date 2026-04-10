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

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [answers, setAnswers] = useState<{ quizId: number; selectedIndex: number; correct: boolean }[]>([]);
  const [finished, setFinished] = useState(false);

  const total = quizzes?.length ?? 0;
  const current = quizzes?.[currentIndex];
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
      setFinished(true);
    }
  }

  function handleRetry() {
    setCurrentIndex(0);
    setSelectedIndex(null);
    setShowAnswer(false);
    setAnswers([]);
    setFinished(false);
  }

  function getResultMessage() {
    if (percentage >= 90) return "Excelente!";
    if (percentage >= 70) return "Bom trabalho!";
    if (percentage >= 50) return "Continue estudando!";
    return "Revise o conteúdo";
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Header />
      <div className="max-w-3xl mx-auto px-6 py-8">
        <Button variant="secondary" size="sm" onClick={() => navigate(`/subjects/${subjectId}`)} className="mb-6 flex items-center gap-1">
          <ArrowLeft size={16} /> Voltar
        </Button>

        <h2 className="text-2xl font-bold text-[#0F172A] mb-6">{subject?.title ?? "Carregando..."}</h2>

        {finished ? (
          <div className="flex flex-col items-center text-center animate-fade-in">
            <Trophy size={64} className={percentage >= 70 ? "text-[#F59E0B]" : "text-[#64748B]"} />
            <p className="text-4xl font-bold text-[#0F172A] mt-4">{correctCount} de {total}</p>
            <p className="text-2xl text-[#64748B] mt-1">{Math.round(percentage)}%</p>
            <p className="text-lg font-medium text-[#0F172A] mt-2">{getResultMessage()}</p>
            <ProgressBar value={percentage} className="w-full max-w-sm mt-4" />
            <div className="flex gap-3 mt-6">
              <Button variant="secondary" onClick={handleRetry} className="flex items-center gap-1">
                <RotateCcw size={16} /> Refazer Quiz
              </Button>
              <Button onClick={() => navigate(`/subjects/${subjectId}`)}>Voltar aos Resultados</Button>
            </div>
          </div>
        ) : current ? (
          <div className="animate-fade-in">
            <ProgressBar value={(currentIndex / total) * 100} showLabel className="mb-4" />
            <div className="flex items-center justify-between mb-4">
              <span className="text-[#64748B]">Questão {currentIndex + 1} de {total}</span>
              <Badge variant={difficultyMap[current.difficulty].variant}>{difficultyMap[current.difficulty].label}</Badge>
            </div>

            <Card className="mb-6">
              <p className="text-lg font-medium text-[#0F172A]">{current.question}</p>
            </Card>

            <div className="grid gap-3 mb-6">
              {current.options.map((option, i) => {
                let style = "border border-[#E2E8F0] hover:border-[#3B82F6] cursor-pointer";
                if (showAnswer) {
                  if (i === current.correctIndex) style = "border border-[#10B981] bg-[#10B981]/5";
                  else if (i === selectedIndex) style = "border border-[#EF4444] bg-[#EF4444]/5";
                  else style = "border border-[#E2E8F0] opacity-50";
                } else if (i === selectedIndex) {
                  style = "border border-[#3B82F6] bg-[#3B82F6]/5";
                }

                return (
                  <div
                    key={i}
                    onClick={() => !showAnswer && setSelectedIndex(i)}
                    className={`p-4 rounded-lg transition-all duration-200 flex items-center gap-3 ${style} ${showAnswer ? "cursor-default" : ""}`}
                  >
                    {showAnswer && i === current.correctIndex && <CheckCircle size={20} className="text-[#10B981] shrink-0" />}
                    {showAnswer && i === selectedIndex && i !== current.correctIndex && <XCircle size={20} className="text-[#EF4444] shrink-0" />}
                    <span className="text-[#0F172A]">{option}</span>
                  </div>
                );
              })}
            </div>

            {showAnswer && (
              <Card className="bg-[#F8FAFC] border-l-4 border-[#3B82F6] mb-6 animate-fade-in">
                <p className="text-[#0F172A]">{current.explanation}</p>
              </Card>
            )}

            {!showAnswer ? (
              <Button onClick={handleConfirm} disabled={selectedIndex === null}>Confirmar</Button>
            ) : (
              <Button onClick={handleNext} className="flex items-center gap-1">
                {currentIndex < total - 1 ? <><span>Próxima</span> <ArrowRight size={16} /></> : "Ver Resultado"}
              </Button>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
