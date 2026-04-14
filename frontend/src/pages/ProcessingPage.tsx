import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSubject, useProcessingStatus } from "../hooks/useSubjects";
import { Header } from "../components/layout/Header";
import { Card } from "../components/ui/Card";
import { ProgressBar } from "../components/ui/ProgressBar";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Loader2, CheckCircle, Clock, AlertCircle, ArrowLeft } from "lucide-react";

const statusIcon: Record<string, React.ReactNode> = {
  pending: <Clock size={20} className="text-slate-300" />,
  transcribing: <Loader2 size={20} className="text-brand-500 animate-spin" />,
  transcribed: <CheckCircle size={20} className="text-emerald-500 animate-scale-in" />,
  ai_done: <CheckCircle size={20} className="text-emerald-500 animate-scale-in" />,
  error: <AlertCircle size={20} className="text-red-500" />,
};

const statusBadge: Record<string, { variant: "default" | "accent" | "success" | "error"; label: string }> = {
  pending: { variant: "default", label: "Aguardando" },
  transcribing: { variant: "accent", label: "Transcrevendo" },
  transcribed: { variant: "accent", label: "Gerando IA..." },
  ai_done: { variant: "success", label: "Concluída" },
  error: { variant: "error", label: "Erro" },
};

export function ProcessingPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const subjectId = Number(id);
  const { data: subject } = useSubject(subjectId);
  const [completed, setCompleted] = useState(false);

  const shouldPoll = !completed;
  const { data: processing } = useProcessingStatus(subjectId, shouldPoll);

  const status = processing?.status ?? subject?.status;
  const totalLessons = processing?.totalLessons ?? subject?.totalLessons ?? 0;
  const processedLessons = processing?.processedLessons ?? subject?.processedLessons ?? 0;
  const percentage = totalLessons > 0 ? (processedLessons / totalLessons) * 100 : 0;

  const aiGeneratedCount = processing?.lessons.filter((l) => l.aiGenerated).length ?? 0;
  const allTranscribed = processing?.lessons.every((l) => l.status === 'transcribed' || l.status === 'error') ?? false;
  const progressValue = allTranscribed && totalLessons > 0
    ? (aiGeneratedCount / totalLessons) * 100
    : percentage;
  const isExam = subject?.sourceType === 'exam';
  const progressLabel = allTranscribed
    ? `Gerando conteúdo IA: ${aiGeneratedCount} de ${totalLessons} ${isExam ? 'fontes' : 'aulas'}`
    : isExam
      ? `Processando prova: ${processedLessons} de ${totalLessons} fontes`
      : `Transcrevendo: ${processedLessons} de ${totalLessons} aulas`;

  const estimatedTimeLeft = useMemo(() => {
    if (!subject?.createdAt || aiGeneratedCount === 0 || aiGeneratedCount >= totalLessons) return null;
    const elapsedMs = Date.now() - new Date(subject.createdAt + 'Z').getTime();
    const msLeft = (totalLessons - aiGeneratedCount) * (elapsedMs / aiGeneratedCount);
    const minLeft = Math.ceil(msLeft / 60000);
    if (minLeft <= 1) return 'menos de 1 minuto';
    if (minLeft < 60) return `cerca de ${minLeft} minutos`;
    const hours = Math.floor(minLeft / 60);
    const mins = minLeft % 60;
    return `cerca de ${hours}h${mins > 0 ? ` ${mins}min` : ''}`;
  }, [subject?.createdAt, aiGeneratedCount, totalLessons]);

  useEffect(() => {
    if ((processing?.status === "completed" || subject?.status === "completed") && !completed) {
      setCompleted(true);
      const timer = setTimeout(() => navigate(`/subjects/${subjectId}`), 1500);
      return () => clearTimeout(timer);
    }
  }, [processing?.status, subject?.status, completed, navigate, subjectId]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Header />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-6">
        {/* Back */}
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:hover:text-white dark:hover:bg-slate-800 rounded-lg px-3 py-1.5 -ml-3 transition-colors"
        >
          <ArrowLeft size={16} /> Voltar
        </button>

        {/* Title */}
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
          {subject?.title ?? "Carregando..."}
        </h2>

        {/* Progress section */}
        {completed ? (
          <Card className="flex items-center gap-3 animate-scale-in">
            <CheckCircle size={22} className="text-emerald-500 animate-scale-in" />
            <p className="text-emerald-600 font-medium">Processamento concluído! Redirecionando...</p>
          </Card>
        ) : status === "error" ? (
          <Card className="border-l-4 border-red-400 bg-red-50/50 dark:bg-red-900/20">
            <p className="text-red-600 font-medium mb-4">Ocorreu um erro no processamento.</p>
            <Button onClick={() => navigate("/")}>Voltar ao início</Button>
          </Card>
        ) : (
          <Card>
            {progressValue >= 100 && status === 'processing' ? (
              <div className="space-y-3">
                <p className="text-brand-600 font-medium flex items-center gap-2">
                  <Loader2 size={18} className="text-brand-500 animate-spin" />
                  Finalizando geração de conteúdo inteligente...
                </p>
                <ProgressBar value={100} showLabel />
                <p className="text-xs text-slate-400">Gerando quizzes, radar de prova e material de estudo</p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-slate-600 dark:text-slate-300 font-medium">{progressLabel}</p>
                <ProgressBar value={progressValue} showLabel />
                {estimatedTimeLeft ? (
                  <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-2">
                    <Clock size={12} /> Tempo estimado restante: {estimatedTimeLeft}
                  </p>
                ) : aiGeneratedCount === 0 && status === 'processing' && totalLessons > 1 ? (
                  <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-2">
                    <Clock size={12} /> Calculando estimativa de tempo...
                  </p>
                ) : null}
              </div>
            )}
          </Card>
        )}

        {/* Lessons list */}
        <div className="space-y-3">
          {processing?.lessons.map((lesson, i) => {
            const visualStatus = lesson.aiGenerated ? 'ai_done' : lesson.status;
            const badge = statusBadge[visualStatus] ?? statusBadge.pending;
            return (
              <div key={lesson.id} className="animate-fade-in" style={{ animationDelay: `${i * 50}ms` }}>
                <Card className="flex items-center gap-4">
                  {statusIcon[visualStatus] ?? statusIcon.pending}
                  <span className="flex-1 font-medium text-slate-900 dark:text-white truncate">
                    {lesson.youtubeTitle ?? `${isExam ? 'Fonte' : 'Aula'} ${i + 1}`}
                  </span>
                  <Badge variant={badge.variant}>{badge.label}</Badge>
                </Card>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
