import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSubject, useProcessingStatus } from "../hooks/useSubjects";
import { Header } from "../components/layout/Header";
import { Card } from "../components/ui/Card";
import { ProgressBar } from "../components/ui/ProgressBar";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Loader2, CheckCircle, Clock, AlertCircle, ArrowLeft } from "lucide-react";

const statusIcon: Record<string, React.ReactNode> = {
  pending: <Clock size={20} className="text-[#64748B]" />,
  transcribing: <Loader2 size={20} className="text-[#3B82F6] animate-spin" />,
  transcribed: <CheckCircle size={20} className="text-[#10B981]" />,
  error: <AlertCircle size={20} className="text-[#EF4444]" />,
};

const statusBadge: Record<string, { variant: "default" | "accent" | "success" | "error"; label: string }> = {
  pending: { variant: "default", label: "Aguardando" },
  transcribing: { variant: "accent", label: "Transcrevendo" },
  transcribed: { variant: "success", label: "Concluída" },
  error: { variant: "error", label: "Erro" },
};

export function ProcessingPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const subjectId = Number(id);
  const { data: subject } = useSubject(subjectId);
  const [completed, setCompleted] = useState(false);

  const isProcessing = subject?.status !== "completed" && subject?.status !== "error";
  const { data: processing } = useProcessingStatus(subjectId, isProcessing && !completed);

  const status = processing?.status ?? subject?.status;
  const totalLessons = processing?.totalLessons ?? subject?.totalLessons ?? 0;
  const processedLessons = processing?.processedLessons ?? subject?.processedLessons ?? 0;
  const percentage = totalLessons > 0 ? (processedLessons / totalLessons) * 100 : 0;

  useEffect(() => {
    if (status === "completed" && !completed) {
      setCompleted(true);
      const timer = setTimeout(() => navigate(`/subjects/${subjectId}`), 1500);
      return () => clearTimeout(timer);
    }
  }, [status, completed, navigate, subjectId]);

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Header />
      <div className="max-w-3xl mx-auto px-6 py-8">
        <Button variant="secondary" size="sm" onClick={() => navigate("/")} className="mb-6 flex items-center gap-1">
          <ArrowLeft size={16} /> Voltar
        </Button>

        <h2 className="text-2xl font-bold text-[#0F172A] mb-2">{subject?.title ?? "Carregando..."}</h2>

        {completed ? (
          <p className="text-[#10B981] font-medium mb-6 animate-fade-in">Processamento concluído! Redirecionando...</p>
        ) : status === "error" ? (
          <div className="mb-6">
            <p className="text-[#EF4444] font-medium mb-3">Ocorreu um erro no processamento.</p>
            <Button onClick={() => navigate("/")}>Voltar ao início</Button>
          </div>
        ) : (
          <>
            <p className="text-[#64748B] mb-4">Processando aula {processedLessons} de {totalLessons}...</p>
            <ProgressBar value={percentage} showLabel className="mb-8" />
          </>
        )}

        <div className="flex flex-col gap-3">
          {processing?.lessons.map((lesson, i) => {
            const badge = statusBadge[lesson.status] ?? statusBadge.pending;
            return (
              <Card key={lesson.id} className="flex items-center gap-3">
                {statusIcon[lesson.status] ?? statusIcon.pending}
                <span className="flex-1 text-[#0F172A] font-medium">{lesson.youtubeTitle ?? `Aula ${i + 1}`}</span>
                <Badge variant={badge.variant}>{badge.label}</Badge>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
