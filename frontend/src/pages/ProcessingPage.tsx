import { useEffect, useState, useMemo, useRef } from "react";
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
  transcribed: <Loader2 size={20} className="text-brand-500 animate-spin" />,
  ai_done: <CheckCircle size={20} className="text-emerald-500 animate-scale-in" />,
  error: <AlertCircle size={20} className="text-red-500" />,
};

const aiStepLabels: Record<string, string> = {
  summary: 'Gerando resumo...',
  quiz: 'Gerando quiz...',
  exam_radar: 'Analisando radar de prova...',
  study_content: 'Gerando material de estudo...',
  flashcards: 'Gerando flashcards...',
  study_plan: 'Gerando plano de estudos...',
  completed: 'Concluído',
  error: 'Erro na geração',
};

function getLessonBadge(lesson: { status: string; aiGenerated: boolean; aiStep: string | null }): { variant: "default" | "accent" | "success" | "error"; label: string } {
  if (lesson.aiStep === 'error') return { variant: 'error', label: 'Erro parcial na geração' };
  if (lesson.aiGenerated || lesson.aiStep === 'completed') return { variant: 'success', label: 'Concluída' };
  if (lesson.status === 'transcribed' && lesson.aiStep) return { variant: 'accent', label: aiStepLabels[lesson.aiStep] ?? 'Gerando IA...' };
  if (lesson.status === 'transcribed') return { variant: 'accent', label: 'Gerando IA...' };
  if (lesson.status === 'transcribing') return { variant: 'accent', label: 'Transcrevendo' };
  if (lesson.status === 'error') return { variant: 'error', label: 'Erro' };
  return { variant: 'default', label: 'Aguardando' };
}

export function ProcessingPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const subjectId = Number(id);
  const { data: subject } = useSubject(subjectId);
  const [completed, setCompleted] = useState(false);
  const [logs, setLogs] = useState<{ time: string; message: string; done: boolean }[]>([]);
  const prevStepsRef = useRef<Record<number, string>>({});
  const logContainerRef = useRef<HTMLDivElement>(null);

  const shouldPoll = !completed;
  const { data: processing } = useProcessingStatus(subjectId, shouldPoll);

  const status = processing?.status ?? subject?.status;
  const totalLessons = processing?.totalLessons ?? subject?.totalLessons ?? 0;
  const processedLessons = processing?.processedLessons ?? subject?.processedLessons ?? 0;
  const percentage = totalLessons > 0 ? (processedLessons / totalLessons) * 100 : 0;

  const aiCompletedCount = processing?.lessons.filter((l) => l.aiStep === 'completed').length ?? 0;
  const allTranscribed = processing?.lessons.every((l) => l.status === 'transcribed' || l.status === 'error') ?? false;
  const progressValue = allTranscribed && totalLessons > 0
    ? (aiCompletedCount / totalLessons) * 100
    : percentage;
  const isExam = subject?.sourceType === 'exam';
  const progressLabel = allTranscribed
    ? aiCompletedCount > 0
      ? `Gerando conteúdo: ${aiCompletedCount} de ${totalLessons} ${isExam ? 'fontes' : 'aulas'}`
      : 'Iniciando geração de conteúdo...'
    : isExam
      ? `Processando prova: ${processedLessons} de ${totalLessons} fontes`
      : `Transcrevendo: ${processedLessons} de ${totalLessons} aulas`;

  const estimatedTimeLeft = useMemo(() => {
    if (!subject?.createdAt || aiCompletedCount === 0 || aiCompletedCount >= totalLessons) return null;
    const elapsedMs = Date.now() - new Date(subject.createdAt + 'Z').getTime();
    const msLeft = (totalLessons - aiCompletedCount) * (elapsedMs / aiCompletedCount);
    const minLeft = Math.ceil(msLeft / 60000);
    if (minLeft <= 1) return 'menos de 1 minuto';
    if (minLeft < 60) return `cerca de ${minLeft} minutos`;
    const hours = Math.floor(minLeft / 60);
    const mins = minLeft % 60;
    return `cerca de ${hours}h${mins > 0 ? ` ${mins}min` : ''}`;
  }, [subject?.createdAt, aiCompletedCount, totalLessons]);

  useEffect(() => {
    if ((processing?.status === "completed" || subject?.status === "completed") && !completed) {
      setCompleted(true);
      const timer = setTimeout(() => navigate(`/subjects/${subjectId}`), 1500);
      return () => clearTimeout(timer);
    }
  }, [processing?.status, subject?.status, completed, navigate, subjectId]);

  const stepMessages: Record<string, string> = {
    transcribing: 'Buscando conteúdo...',
    transcribed: 'Conteúdo obtido ✓',
    summary: 'Gerando resumo...',
    quiz: 'Gerando quiz...',
    exam_radar: 'Analisando radar de prova...',
    study_content: 'Gerando material de estudo...',
    flashcards: 'Gerando flashcards...',
    study_plan: 'Gerando plano de estudos...',
    completed: 'Tudo pronto! ✓',
    error: 'Erro na geração ✗',
  };

  useEffect(() => {
    if (!processing?.lessons) return;
    const multiLesson = processing.lessons.length > 1;
    const newEntries: { time: string; message: string; done: boolean }[] = [];
    const now = new Date().toLocaleTimeString('pt-BR');

    for (const lesson of processing.lessons) {
      const prev = prevStepsRef.current[lesson.id];
      const prefix = multiLesson && lesson.youtubeTitle ? `[${lesson.youtubeTitle}] ` : '';

      const currentKey = lesson.aiStep ?? lesson.status;
      if (currentKey !== prev) {
        if (lesson.status === 'transcribing' && prev === undefined) {
          newEntries.push({ time: now, message: prefix + stepMessages.transcribing, done: false });
        } else if (lesson.status === 'transcribed' && prev === 'transcribing') {
          newEntries.push({ time: now, message: prefix + stepMessages.transcribed, done: false });
        } else if (lesson.aiStep && stepMessages[lesson.aiStep]) {
          newEntries.push({
            time: now,
            message: prefix + stepMessages[lesson.aiStep],
            done: lesson.aiStep === 'completed' || lesson.aiStep === 'error',
          });
        }
        prevStepsRef.current[lesson.id] = currentKey;
      }
    }

    if (newEntries.length > 0) {
      setLogs(prev => [...prev, ...newEntries]);
    }
  }, [processing?.lessons]);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

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
            <div className="space-y-3">
              <p className="text-slate-600 dark:text-slate-300 font-medium">{progressLabel}</p>
              <ProgressBar value={progressValue} showLabel />
              {estimatedTimeLeft ? (
                <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-2">
                  <Clock size={12} /> Tempo estimado restante: {estimatedTimeLeft}
                </p>
              ) : aiCompletedCount === 0 && status === 'processing' && totalLessons > 1 ? (
                <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-2">
                  <Clock size={12} /> Calculando estimativa de tempo...
                </p>
              ) : null}
            </div>
          </Card>
        )}

        {/* Event log */}
        {logs.length > 0 && (
          <Card className="!p-4">
            <div ref={logContainerRef} className="font-mono text-xs space-y-1 max-h-48 overflow-y-auto">
              {logs.map((log, i) => (
                <div key={i} className="flex items-start gap-3 text-slate-500 dark:text-slate-400">
                  <span className="shrink-0 text-slate-400">{log.time}</span>
                  <span className={log.done ? 'text-emerald-500' : ''}>{log.message}</span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Lessons list */}
        <div className="space-y-3">
          {processing?.lessons.map((lesson, i) => {
            const visualStatus = lesson.aiStep === 'completed' || lesson.aiGenerated ? 'ai_done' : lesson.status;
            const badge = getLessonBadge(lesson);
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
