import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, FileText, AlertTriangle, Download, Brain } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useSubject } from '../hooks/useSubjects';
import { useStudyPlan, useSummaries, useExamRadar } from '../hooks/useContent';
import { Header } from '../components/layout/Header';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';

type Tab = 'plan' | 'summaries' | 'radar';

function markdownToHtml(md: string): string {
  return md
    .replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold text-[#0F172A] mt-6 mb-2">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold text-[#0F172A] mt-8 mb-3">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold text-[#0F172A] mt-8 mb-4">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc text-[#64748B]">$1</li>')
    .replace(/\n\n/g, '</p><p class="text-[#64748B] leading-relaxed mb-3">')
    .replace(/^/, '<p class="text-[#64748B] leading-relaxed mb-3">')
    .replace(/$/, '</p>');
}

const relevanceOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
const relevanceBorder: Record<string, string> = { high: 'border-l-4 border-[#EF4444]', medium: 'border-l-4 border-[#F59E0B]', low: 'border-l-4 border-[#E2E8F0]' };
const relevanceBadge: Record<string, { variant: 'error' | 'warning' | 'default'; label: string }> = {
  high: { variant: 'error', label: 'Alta' },
  medium: { variant: 'warning', label: 'Média' },
  low: { variant: 'default', label: 'Baixa' },
};

const tabs: { key: Tab; label: string; icon: typeof BookOpen }[] = [
  { key: 'plan', label: 'Plano de Estudos', icon: BookOpen },
  { key: 'summaries', label: 'Resumos', icon: FileText },
  { key: 'radar', label: 'Radar de Prova', icon: AlertTriangle },
];

export function ResultPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const subjectId = Number(id);
  const [activeTab, setActiveTab] = useState<Tab>('plan');
  const contentRef = useRef<HTMLDivElement>(null);

  const { data: subject } = useSubject(subjectId);
  const { data: studyPlan } = useStudyPlan(subjectId);
  const { data: summaries } = useSummaries(subjectId);
  const { data: examRadar } = useExamRadar(subjectId);

  const sortedRadar = examRadar?.slice().sort((a, b) => relevanceOrder[a.relevance] - relevanceOrder[b.relevance]);

  async function handleExportPdf() {
    if (!contentRef.current || !subject) return;
    const canvas = await html2canvas(contentRef.current);
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const imgHeight = (canvas.height * pageWidth) / canvas.width;
    pdf.addImage(imgData, 'PNG', 0, 0, pageWidth, imgHeight);
    pdf.save(`studygen-${subject.title.toLowerCase().replace(/\s+/g, '-')}.pdf`);
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Header />
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/')} className="text-[#64748B] hover:text-[#0F172A] transition-colors">
              <ArrowLeft size={20} />
            </button>
            <h2 className="text-2xl font-bold text-[#0F172A]">{subject?.title}</h2>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={() => navigate(`/subjects/${subjectId}/quiz`)} className="flex items-center gap-2">
              <Brain size={16} /> Quiz
            </Button>
            <Button variant="secondary" onClick={handleExportPdf} className="flex items-center gap-2">
              <Download size={16} /> Exportar PDF
            </Button>
          </div>
        </div>

        <div className="flex gap-6 border-b border-[#E2E8F0] mb-6">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 pb-3 px-1 transition-colors ${
                activeTab === key
                  ? 'border-b-2 border-[#3B82F6] text-[#3B82F6] font-medium'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              <Icon size={16} /> {label}
            </button>
          ))}
        </div>

        <div ref={contentRef}>
          {activeTab === 'plan' && studyPlan && (
            <Card>
              <div dangerouslySetInnerHTML={{ __html: markdownToHtml(studyPlan.content) }} />
            </Card>
          )}

          {activeTab === 'summaries' && summaries?.map((summary) => (
            <Card key={summary.id} className="mb-4">
              <h3 className="text-lg font-semibold text-[#0F172A] mb-2">{summary.youtubeTitle}</h3>
              <div dangerouslySetInnerHTML={{ __html: markdownToHtml(summary.content) }} />
              {summary.keyTopics.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {summary.keyTopics.map((topic) => (
                    <Badge key={topic} variant="accent">{topic}</Badge>
                  ))}
                </div>
              )}
            </Card>
          ))}

          {activeTab === 'radar' && sortedRadar?.map((item) => (
            <Card key={item.id} className={`mb-4 ${relevanceBorder[item.relevance]}`}>
              <div className="flex items-center gap-3 mb-2">
                <Badge variant={relevanceBadge[item.relevance].variant}>
                  {relevanceBadge[item.relevance].label}
                </Badge>
                <span className="font-semibold text-[#0F172A]">{item.topic}</span>
              </div>
              {item.professorQuote && (
                <p className="italic text-[#64748B] mb-2">"{item.professorQuote}"</p>
              )}
              <p className="text-sm text-[#64748B]">{item.reasoning}</p>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
