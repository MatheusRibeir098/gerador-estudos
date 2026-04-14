import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, FileText, AlertTriangle, Download, Brain, MessageCircle, GraduationCap, ChevronLeft, ChevronRight, ArrowUp, Check, Volume2, Pause, Square, Layers, Trophy } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { useSubject } from '../hooks/useSubjects';
import { useStudyPlan, useSummaries, useExamRadar, useStudyContent } from '../hooks/useContent';
import { Header } from '../components/layout/Header';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import ChatTutor from '../components/ChatTutor';
import MermaidBlock from '../components/MermaidBlock';
import { useSpeech } from '../hooks/useSpeech';
import { useGamification } from '../hooks/useGamification';
import type { ContentOptions } from '../types/subject';

type Tab = 'study' | 'plan' | 'summaries' | 'radar' | 'chat';

const relevanceOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
const relevanceBorder: Record<string, string> = { high: 'border-l-4 border-red-400', medium: 'border-l-4 border-amber-400', low: 'border-l-4 border-slate-200' };
const relevanceBadge: Record<string, { variant: 'error' | 'warning' | 'default'; label: string }> = {
  high: { variant: 'error', label: 'Alta' },
  medium: { variant: 'warning', label: 'Média' },
  low: { variant: 'default', label: 'Baixa' },
};

const tabs: { key: Tab; label: string; icon: typeof BookOpen }[] = [
  { key: 'study', label: 'Área de Estudo', icon: GraduationCap },
  { key: 'plan', label: 'Plano de Estudos', icon: BookOpen },
  { key: 'summaries', label: 'Resumos', icon: FileText },
  { key: 'radar', label: 'Radar de Prova', icon: AlertTriangle },
  { key: 'chat', label: 'Chat Tutor', icon: MessageCircle },
];

const proseClasses = "prose prose-slate dark:prose-invert max-w-none prose-headings:font-bold prose-h2:text-xl prose-h2:mt-6 prose-h2:mb-3 prose-h2:pb-2 prose-h2:border-b prose-h2:border-slate-200 dark:prose-h2:border-slate-700 prose-h3:text-lg prose-p:leading-relaxed prose-table:border-collapse prose-th:bg-slate-100 dark:prose-th:bg-slate-800 prose-th:font-semibold prose-th:px-4 prose-th:py-2 prose-th:text-left prose-th:border prose-th:border-slate-200 dark:prose-th:border-slate-700 prose-td:px-4 prose-td:py-2 prose-td:border prose-td:border-slate-200 dark:prose-td:border-slate-700 prose-code:bg-slate-100 dark:prose-code:bg-slate-800 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-violet-600 dark:prose-code:text-violet-400 prose-code:text-sm prose-code:before:content-none prose-code:after:content-none prose-blockquote:border-l-4 prose-blockquote:border-blue-500 prose-blockquote:bg-blue-50 dark:prose-blockquote:bg-blue-900/20 prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:rounded-r-lg prose-blockquote:not-italic prose-pre:bg-slate-800 dark:prose-pre:bg-slate-950 prose-pre:rounded-xl prose-a:text-blue-500 prose-hr:border-slate-200 dark:prose-hr:border-slate-700";

const markdownComponents = {
  code({ className, children, ...props }: any) {
    if (/language-mermaid/.test(className || '')) {
      return <MermaidBlock chart={String(children).replace(/\n$/, '')} />;
    }
    return <code className={className} {...props}>{children}</code>;
  },
  pre({ children }: any) {
    const child = Array.isArray(children) ? children[0] : children;
    if (child?.type === MermaidBlock) return <>{children}</>;
    return <pre>{children}</pre>;
  },
};

function preprocessMarkdown(markdown: string): string {
  const mermaidKeywords = /^(graph|flowchart|mindmap|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|gitgraph|journey)\b/;
  const boxChars = /[┌┐└┘├┤┬┴┼─│╔╗╚╝╠╣╦╩╬═║]/;
  const lines = markdown.split('\n');
  const result: string[] = [];
  let inAsciiBlock = false;
  let inCodeBlock = false;
  let inMermaidBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('```')) {
      if (inMermaidBlock) { inMermaidBlock = false; inCodeBlock = true; }
      else { inCodeBlock = !inCodeBlock; }
      result.push(line);
      continue;
    }
    if (inCodeBlock) { result.push(line); continue; }

    // Detect unfenced mermaid: line is exactly 'mermaid' and next line starts with a mermaid keyword
    if (!inMermaidBlock && line.trim() === 'mermaid' && i + 1 < lines.length && mermaidKeywords.test(lines[i + 1].trim())) {
      if (inAsciiBlock) { result.push('```'); inAsciiBlock = false; }
      result.push('```mermaid');
      inMermaidBlock = true;
      continue;
    }

    // End unfenced mermaid block
    if (inMermaidBlock) {
      const nextLine = i + 1 < lines.length ? lines[i + 1] : '';
      const isEnd = line.startsWith('## ') || line.startsWith('### ')
        || (line.trim() === '' && i + 1 < lines.length && nextLine.trim() === '')
        || (line.trim() === '' && i + 1 < lines.length && !mermaidKeywords.test(nextLine.trim()) && !nextLine.startsWith(' ') && nextLine.trim() !== '' && !nextLine.includes('-->') && !nextLine.includes('---') && !nextLine.trim().startsWith('subgraph') && !nextLine.trim().startsWith('end'));
      if (isEnd) {
        result.push('```');
        inMermaidBlock = false;
      }
      result.push(line);
      continue;
    }

    const hasBox = boxChars.test(line);
    if (hasBox && !inAsciiBlock) {
      result.push('```');
      inAsciiBlock = true;
    } else if (!hasBox && inAsciiBlock && line.trim() !== '') {
      result.push('```');
      inAsciiBlock = false;
    }
    result.push(line);
  }
  if (inAsciiBlock) result.push('```');
  if (inMermaidBlock) result.push('```');
  return result.join('\n');
}

function cleanTitle(title: string | null, index: number, firstTopic?: string): string {
  if (firstTopic) return firstTopic;
  if (!title) return 'Aula ' + (index + 1);
  const cleaned = title.replace(/\.pdf$/i, '').replace(/\.docx?$/i, '').replace(/_/g, ' ');
  const match = cleaned.match(/\[([^\]]+)\]/g);
  if (match && match.length >= 2) {
    const parts = match.map(m => m.replace(/[\[\]]/g, ''));
    return parts[parts.length - 1] + ' (Slide ' + (index + 1) + ')';
  }
  return cleaned;
}

function splitByH2(markdown: string): { title: string; content: string }[] {
  const lines = markdown.split('\n');
  const sections: { title: string; content: string }[] = [];
  let currentTitle = '';
  let currentLines: string[] = [];
  for (const line of lines) {
    if (line.startsWith('## ')) {
      if (currentTitle || currentLines.length > 0) {
        sections.push({ title: currentTitle, content: currentLines.join('\n').trim() });
      }
      currentTitle = line.replace(/^## /, '').replace(/^[^\w]*\s*/, '');
      currentLines = [];
    } else {
      currentLines.push(line);
    }
  }
  if (currentTitle || currentLines.length > 0) {
    sections.push({ title: currentTitle, content: currentLines.join('\n').trim() });
  }
  return sections;
}

export function ResultPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const subjectId = Number(id);
  const [activeTab, setActiveTab] = useState<Tab>('study');
  const contentRef = useRef<HTMLDivElement>(null);
  const [chatLessonIndex, setChatLessonIndex] = useState(0);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [expandedItem, setExpandedItem] = useState<number | null>(null);
  const [expandedSummary, setExpandedSummary] = useState<number | null>(null);
  const [expandedRadar, setExpandedRadar] = useState<string | null>(null);
  const storageKey = 'studygen-progress-' + subjectId;
  const [readSections, setReadSections] = useState<Set<string>>(() => {
    try { const saved = localStorage.getItem(storageKey); return saved ? new Set(JSON.parse(saved)) : new Set(); }
    catch { return new Set(); }
  });
  const [currentSlides, setCurrentSlides] = useState<Record<number, number>>(() => {
    try { const saved = localStorage.getItem('studygen-slides-' + subjectId); return saved ? JSON.parse(saved) : {}; }
    catch { return {}; }
  });
  const [contentOptions] = useState<ContentOptions>(() => {
    try { const saved = localStorage.getItem('studygen-options-' + subjectId); return saved ? JSON.parse(saved) : { studyContent: true, summary: true, examRadar: true, quiz: true, studyPlan: true }; }
    catch { return { studyContent: true, summary: true, examRadar: true, quiz: true, studyPlan: true }; }
  });

  const { data: subject } = useSubject(subjectId);
  const { data: studyPlan } = useStudyPlan(subjectId);
  const { data: summaries } = useSummaries(subjectId);
  const { data: examRadar } = useExamRadar(subjectId);
  const { data: studyContent } = useStudyContent(subjectId);
  const { speaking, paused, speak, pause, resume, stop } = useSpeech();
  const { addXP, toast } = useGamification();

  const sortedRadar = examRadar?.slice().sort((a, b) => relevanceOrder[a.relevance] - relevanceOrder[b.relevance]);

  const visibleTabs = tabs.filter(t => {
    if (t.key === 'study') return contentOptions.studyContent;
    if (t.key === 'summaries') return contentOptions.summary;
    if (t.key === 'radar') return contentOptions.examRadar;
    if (t.key === 'plan') return contentOptions.studyPlan !== false;
    return true;
  });

  useEffect(() => {
    if (!visibleTabs.some(t => t.key === activeTab)) {
      setActiveTab(visibleTabs[0]?.key || 'study');
    }
  }, [visibleTabs, activeTab]);

  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 400);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (readSections.size > 0) localStorage.setItem(storageKey, JSON.stringify([...readSections]));
  }, [readSections, storageKey]);

  useEffect(() => {
    localStorage.setItem('studygen-slides-' + subjectId, JSON.stringify(currentSlides));
  }, [currentSlides, subjectId]);

  function toggleRead(key: string) {
    setReadSections(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else { next.add(key); addXP(10, 'read-slide'); }
      return next;
    });
  }

  function goToSlide(itemId: number, index: number, totalSlides: number) {
    stop();
    const currentIdx = currentSlides[itemId] || 0;
    const currentKey = itemId + '-' + currentIdx;
    if (!readSections.has(currentKey)) {
      setReadSections(prev => {
        const next = new Set(prev);
        next.add(currentKey);
        return next;
      });
    }
    setCurrentSlides(prev => ({ ...prev, [itemId]: Math.max(0, Math.min(index, totalSlides - 1)) }));
  }

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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Header />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="p-2 -ml-2 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">{subject?.title}</h2>
          </div>
          <div className="flex items-center gap-3">
            {contentOptions.quiz && (
              <Button onClick={() => navigate(`/subjects/${subjectId}/quiz`)} className="flex items-center gap-2">
                <Brain size={16} /> Quiz
              </Button>
            )}
            <Button variant="secondary" onClick={() => navigate(`/subjects/${subjectId}/flashcards`)} className="flex items-center gap-2">
              <Layers size={16} /> Flashcards
            </Button>
            <Button variant="secondary" onClick={handleExportPdf} className="flex items-center gap-2">
              <Download size={16} /> Exportar PDF
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl w-fit mb-8 overflow-x-auto">
          {visibleTabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                activeTab === key
                  ? 'bg-brand-500 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/60 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-700/60'
              }`}
            >
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div ref={contentRef}>
          {activeTab === 'study' && (
            <div className="space-y-3">
              {studyContent?.map((item, i) => {
                const sections = splitByH2(item.content);
                const readCount = sections.filter((_, j) => readSections.has(item.id + '-' + j)).length;
                const slideIndex = currentSlides[item.id] || 0;

                // Single section: always show as simple card
                if (sections.length <= 1) {
                  if (expandedItem !== null) return null;
                  return (
                    <div key={item.id} className="animate-fade-in" style={{ animationDelay: `${i * 60}ms` }}>
                      <Card>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                          <GraduationCap size={22} className="text-brand-500" /> {cleanTitle(item.youtubeTitle, i, sections[0]?.title)}
                        </h3>
                        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} className={proseClasses} components={markdownComponents}>{preprocessMarkdown(item.content)}</ReactMarkdown>
                      </Card>
                    </div>
                  );
                }

                // Multi-section expanded: focus mode
                if (expandedItem === item.id) {
                  return (
                    <div key={item.id} className="animate-fade-in">
                      <button onClick={() => { stop(); setExpandedItem(null); }}
                        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg px-3 py-1.5 -ml-3 mb-4 transition-colors">
                        <ChevronLeft size={16} /> Voltar à lista
                      </button>
                      <Card className="p-0 overflow-hidden">
                        <div className="p-6" style={{ height: 'calc(100vh - 220px)' }}>
                          <div className="flex flex-col h-full">
                            <div className="shrink-0 mb-4">
                              <div className="flex items-center justify-between mb-3">
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                  <GraduationCap size={22} className="text-brand-500" /> {cleanTitle(item.youtubeTitle, i, sections[0]?.title)}
                                </h3>
                                {readCount === sections.length && <span className="text-xs font-semibold text-emerald-500 flex items-center gap-1"><Check size={14} /> Concluído</span>}
                              </div>
                              <div className="flex gap-1 mb-4">
                                {sections.map((_, j) => (
                                  <button key={j} onClick={() => goToSlide(item.id, j, sections.length)}
                                    className={`h-1.5 rounded-full flex-1 transition-all duration-200 ${
                                      j === slideIndex ? 'bg-brand-500' : readSections.has(item.id + '-' + j) ? 'bg-emerald-400' : 'bg-slate-200 dark:bg-slate-700'
                                    }`} />
                                ))}
                              </div>
                              <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-700">
                                <div>
                                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Seção {slideIndex + 1} de {sections.length}</p>
                                  <h4 className="text-lg font-semibold text-slate-900 dark:text-white mt-0.5">{sections[slideIndex].title}</h4>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="text-xs font-medium text-slate-400">{readCount}/{sections.length} lidas</span>
                                  {!speaking ? (
                                    <button onClick={() => speak(sections[slideIndex].content)}
                                      className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-500 hover:text-brand-500 transition-colors"
                                      aria-label="Ouvir conteúdo">
                                      <Volume2 size={14} /> Ouvir
                                    </button>
                                  ) : (
                                    <>
                                      <button onClick={paused ? resume : pause}
                                        className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-brand-50 dark:bg-brand-900/30 text-brand-600 transition-colors">
                                        <Pause size={14} /> {paused ? 'Continuar' : 'Pausar'}
                                      </button>
                                      <button onClick={stop}
                                        className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-500 hover:text-red-500 transition-colors">
                                        <Square size={14} /> Parar
                                      </button>
                                    </>
                                  )}
                                  <button onClick={() => toggleRead(item.id + '-' + slideIndex)}
                                    className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                                      readSections.has(item.id + '-' + slideIndex) ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30' : 'bg-slate-100 text-slate-500 hover:text-brand-500 dark:bg-slate-700 dark:text-slate-400'
                                    }`}>
                                    <Check size={14} />
                                    {readSections.has(item.id + '-' + slideIndex) ? 'Lida' : 'Marcar como lida'}
                                  </button>
                                </div>
                              </div>
                            </div>
                            <div className="flex-1 overflow-y-auto overscroll-contain min-h-0 pr-2" key={slideIndex}>
                              <div className="animate-fade-in">
                                <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} className={proseClasses} components={markdownComponents}>{preprocessMarkdown(sections[slideIndex].content)}</ReactMarkdown>
                              </div>
                            </div>
                            <div className="shrink-0 pt-4 border-t border-slate-200 dark:border-slate-700 mt-4 flex items-center justify-between">
                              <button onClick={() => goToSlide(item.id, slideIndex - 1, sections.length)}
                                disabled={slideIndex === 0}
                                className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-brand-500 dark:text-slate-400 dark:hover:text-brand-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                                <ChevronLeft size={18} /> Anterior
                              </button>
                              <div className="flex gap-1.5">
                                {sections.map((_, j) => (
                                  <button key={j} onClick={() => goToSlide(item.id, j, sections.length)}
                                    className={`w-2 h-2 rounded-full transition-all duration-200 ${j === slideIndex ? 'bg-brand-500 scale-125' : 'bg-slate-300 hover:bg-slate-400 dark:bg-slate-600'}`} />
                                ))}
                              </div>
                              <button onClick={() => {
                                if (slideIndex === sections.length - 1) {
                                  const key = item.id + '-' + slideIndex;
                                  if (!readSections.has(key)) toggleRead(key);
                                  // Check if all sections now read
                                  const allRead = sections.every((_, j) => j === slideIndex || readSections.has(item.id + '-' + j));
                                  if (allRead) addXP(50, 'complete-chunk');
                                } else {
                                  goToSlide(item.id, slideIndex + 1, sections.length);
                                }
                              }}
                                className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-brand-500 dark:text-slate-400 dark:hover:text-brand-400 transition-colors">
                                {slideIndex === sections.length - 1 ? 'Concluir' : 'Próximo'} <ChevronRight size={18} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </Card>
                    </div>
                  );
                }

                // Multi-section minimized: show only when no item is expanded
                if (expandedItem !== null) return null;
                return (
                  <div key={item.id} className="animate-fade-in" style={{ animationDelay: `${i * 60}ms` }}>
                    <Card onClick={() => setExpandedItem(item.id)} className="flex items-center gap-4 cursor-pointer hover:shadow-md transition-all">
                      <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-900/30 shrink-0">
                        <GraduationCap size={20} className="text-brand-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-slate-900 dark:text-white truncate">{cleanTitle(item.youtubeTitle, i, sections[0]?.title)}</h3>
                        <div className="flex gap-1 mt-2">
                          {sections.map((_, j) => (
                            <div key={j} className={'h-1 rounded-full flex-1 ' + (readSections.has(item.id + '-' + j) ? 'bg-emerald-400' : 'bg-slate-200 dark:bg-slate-700')} />
                          ))}
                        </div>
                      </div>
                      <div className="shrink-0 flex items-center gap-2">
                        {readCount === sections.length ? (
                          <span className="text-xs font-semibold text-emerald-500 flex items-center gap-1"><Check size={14} /> Concluído</span>
                        ) : (
                          <span className="text-xs text-slate-400">{readCount}/{sections.length}</span>
                        )}
                        <ChevronRight size={18} className="text-slate-400" />
                      </div>
                    </Card>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'plan' && studyPlan && (
            <div className="animate-fade-in">
              <Card>
                <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} className={proseClasses} components={markdownComponents}>{preprocessMarkdown(studyPlan.content)}</ReactMarkdown>
              </Card>
            </div>
          )}

          {activeTab === 'summaries' && (
            <div className="space-y-3">
              {summaries?.map((summary, i) => {
                if (expandedSummary !== null && expandedSummary !== summary.id) return null;

                if (expandedSummary === summary.id) {
                  return (
                    <div key={summary.id} className="animate-fade-in">
                      <button onClick={() => setExpandedSummary(null)}
                        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg px-3 py-1.5 -ml-3 mb-4 transition-colors">
                        <ChevronLeft size={16} /> Voltar à lista
                      </button>
                      <Card>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3">{summary.keyTopics?.[0] || cleanTitle(summary.youtubeTitle, i)}</h3>
                        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} className={proseClasses} components={markdownComponents}>{preprocessMarkdown(summary.content)}</ReactMarkdown>
                        {summary.keyTopics.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-4">
                            {summary.keyTopics.map((topic) => (
                              <Badge key={topic} variant="accent">{topic}</Badge>
                            ))}
                          </div>
                        )}
                      </Card>
                    </div>
                  );
                }

                return (
                  <div key={summary.id} className="animate-fade-in" style={{ animationDelay: `${i * 60}ms` }}>
                    <Card onClick={() => setExpandedSummary(summary.id)} className="flex items-center gap-4 cursor-pointer hover:shadow-md transition-all">
                      <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 shrink-0">
                        <FileText size={20} className="text-blue-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-slate-900 dark:text-white truncate">{summary.keyTopics?.[0] || cleanTitle(summary.youtubeTitle, i)}</h3>
                        {summary.keyTopics.length > 0 && (
                          <p className="text-xs text-slate-400 mt-1">{summary.keyTopics.length} tópicos</p>
                        )}
                      </div>
                      <ChevronRight size={18} className="text-slate-400 shrink-0" />
                    </Card>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'radar' && (() => {
            const groups = (['high', 'medium', 'low'] as const).map(rel => ({
              relevance: rel,
              items: sortedRadar?.filter(r => r.relevance === rel) || [],
            })).filter(g => g.items.length > 0);

            return (
              <div className="space-y-3">
                {groups.map(group => {
                  const { variant, label } = relevanceBadge[group.relevance];
                  if (expandedRadar !== null && expandedRadar !== group.relevance) return null;

                  if (expandedRadar === group.relevance) {
                    return (
                      <div key={group.relevance} className="animate-fade-in">
                        <button onClick={() => setExpandedRadar(null)}
                          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg px-3 py-1.5 -ml-3 mb-4 transition-colors">
                          <ChevronLeft size={16} /> Voltar à lista
                        </button>
                        <div className="space-y-4">
                          {group.items.map((item, j) => (
                            <div key={item.id} className="animate-fade-in" style={{ animationDelay: `${j * 50}ms` }}>
                              <Card className={relevanceBorder[item.relevance]}>
                                <div className="flex items-center gap-3 mb-3">
                                  <Badge variant={variant}>{label}</Badge>
                                  <span className="font-bold text-slate-900 dark:text-white">{item.topic}</span>
                                </div>
                                {item.professorQuote && (
                                  <blockquote className="border-l-2 border-slate-300 pl-3 italic text-slate-500 dark:text-slate-400 mb-3 text-sm">
                                    "{item.professorQuote}"
                                  </blockquote>
                                )}
                                <p className="text-sm text-slate-500 dark:text-slate-400">{item.reasoning}</p>
                              </Card>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={group.relevance} className="animate-fade-in">
                      <Card onClick={() => setExpandedRadar(group.relevance)} className="flex items-center gap-4 cursor-pointer hover:shadow-md transition-all">
                        <div className="shrink-0">
                          <Badge variant={variant}>{label}</Badge>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-slate-900 dark:text-white">Relevância {label}</h3>
                          <p className="text-xs text-slate-400 mt-1">{group.items.length} tópico{group.items.length > 1 ? 's' : ''}</p>
                        </div>
                        <ChevronRight size={18} className="text-slate-400 shrink-0" />
                      </Card>
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {activeTab === 'chat' && summaries && summaries.length > 0 && (
            <Card className="p-0 overflow-hidden">
              {summaries.length > 1 && (
                <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 mr-3">Aula:</label>
                  <select
                    value={chatLessonIndex}
                    onChange={e => setChatLessonIndex(Number(e.target.value))}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                  >
                    <option value={-1}>Todas as aulas</option>
                    {summaries.map((s, i) => (
                      <option key={s.id} value={i}>{s.youtubeTitle || `Aula ${i + 1}`}</option>
                    ))}
                  </select>
                </div>
              )}
              <ChatTutor
                key={chatLessonIndex === -1 ? 'all' : summaries[chatLessonIndex].lessonId}
                lessonId={summaries[chatLessonIndex === -1 ? 0 : chatLessonIndex].lessonId}
                summaryContent={chatLessonIndex === -1
                  ? summaries.map(s => '## ' + s.youtubeTitle + '\n' + s.content).join('\n\n---\n\n')
                  : summaries[chatLessonIndex].content}
              />
            </Card>
          )}
          {activeTab === 'chat' && (!summaries || summaries.length === 0) && (
            <Card>
              <p className="text-slate-500 text-center py-8">Nenhum resumo disponível para o chat tutor.</p>
            </Card>
          )}
        </div>
      </main>
      {toast && (
        <div className="fixed bottom-20 right-6 z-50 bg-amber-500 text-white px-4 py-3 rounded-xl shadow-lg animate-slide-up flex items-center gap-2">
          <Trophy size={20} /> Nova conquista: {toast}!
        </div>
      )}
      {showScrollTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-6 right-6 z-50 p-3 bg-brand-500 text-white rounded-full shadow-lg shadow-brand-500/25 hover:bg-brand-600 transition-all duration-200 animate-fade-in"
          aria-label="Voltar ao topo"
        >
          <ArrowUp size={20} />
        </button>
      )}
    </div>
  );
}
