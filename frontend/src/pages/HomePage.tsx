import { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, GraduationCap, BookOpen, FileUp, Upload, X, Loader2, List } from 'lucide-react';
import { Header } from '../components/layout/Header';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { EmptyState } from '../components/ui/EmptyState';
import { useSubjects, useCreateSubject, useDeleteSubject, useCreateExamSubject } from '../hooks/useSubjects';
import { parseYoutubeUrls } from '../utils/youtube';
import { resolvePlaylist } from '../api/subjects';
import { formatDate } from '../utils/format';
import type { Subject } from '../types/subject';
import type { ContentOptions } from '../types/subject';

const statusConfig: Record<Subject['status'], { variant: 'success' | 'warning' | 'error' | 'default'; label: string }> = {
  completed: { variant: 'success', label: 'Concluído' },
  processing: { variant: 'warning', label: 'Processando' },
  error: { variant: 'error', label: 'Erro' },
  pending: { variant: 'default', label: 'Pendente' },
};

function formatFileSize(bytes: number) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

export function HomePage() {
  const navigate = useNavigate();
  const { data: subjects = [] } = useSubjects();
  const createSubject = useCreateSubject();
  const deleteSubject = useDeleteSubject();
  const createExamSubject = useCreateExamSubject();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExamModalOpen, setIsExamModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Subject | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [linksText, setLinksText] = useState('');

  // Exam modal state
  const [examTitle, setExamTitle] = useState('');
  const [examDescription, setExamDescription] = useState('');
  const [examText, setExamText] = useState('');
  const [examFiles, setExamFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loadingPlaylist, setLoadingPlaylist] = useState(false);
  const defaultContentOptions: ContentOptions = { studyContent: true, summary: true, examRadar: true, quiz: true };
  const [contentOptions, setContentOptions] = useState<ContentOptions>(defaultContentOptions);

  const validUrls = useMemo(() => parseYoutubeUrls(linksText), [linksText]);
  const playlistUrl = useMemo(() => {
    const pl = linksText.split('\n').map(l => l.trim()).find(l => l.includes('list='));
    return pl || null;
  }, [linksText]);

  function handleCardClick(subject: Subject) {
    if (subject.status === 'completed') navigate(`/subjects/${subject.id}`);
    else navigate(`/subjects/${subject.id}/processing`);
  }

  async function handleCreate() {
    if (!title.trim() || validUrls.length === 0) return;
    const result = await createSubject.mutateAsync({
      title: title.trim(),
      description: description.trim() || undefined,
      youtubeUrls: validUrls,
      contentOptions,
    });
    localStorage.setItem('studygen-options-' + result.id, JSON.stringify(contentOptions));
    setIsModalOpen(false);
    setTitle('');
    setDescription('');
    setLinksText('');
    setContentOptions(defaultContentOptions);
    navigate(`/subjects/${result.id}/processing`);
  }

  async function handleCreateExam() {
    if (!examTitle.trim() || (!examText.trim() && examFiles.length === 0)) return;
    const result = await createExamSubject.mutateAsync({
      title: examTitle.trim(),
      description: examDescription.trim() || undefined,
      text: examText.trim() || undefined,
      files: examFiles.length > 0 ? examFiles : undefined,
      contentOptions,
    });
    localStorage.setItem('studygen-options-' + result.id, JSON.stringify(contentOptions));
    setIsExamModalOpen(false);
    setExamTitle('');
    setExamDescription('');
    setExamText('');
    setExamFiles([]);
    setContentOptions(defaultContentOptions);
    navigate(`/subjects/${result.id}/processing`);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await deleteSubject.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  }

  async function handleExpandPlaylist() {
    if (!playlistUrl) return;
    setLoadingPlaylist(true);
    try {
      const videos = await resolvePlaylist(playlistUrl);
      setLinksText(videos.map(v => v.url).join('\n'));
    } catch { /* keep original text */ }
    finally { setLoadingPlaylist(false); }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length > 0) setExamFiles(prev => [...prev, ...files]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  const examValid = examTitle.trim() && (examText.trim() || examFiles.length > 0);

  const contentCheckboxes = (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">Conteúdo a gerar</label>
      <div className="grid grid-cols-2 gap-2">
        {([
          { key: 'studyContent' as const, label: 'Área de Estudo' },
          { key: 'summary' as const, label: 'Resumos' },
          { key: 'examRadar' as const, label: 'Radar de Prova' },
          { key: 'quiz' as const, label: 'Quiz' },
        ]).map(opt => (
          <label key={opt.key} className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            <input type="checkbox" checked={contentOptions[opt.key]} onChange={e => setContentOptions(prev => ({ ...prev, [opt.key]: e.target.checked }))}
              className="w-4 h-4 rounded border-slate-300 text-brand-500 focus:ring-brand-500" />
            <span className="text-sm text-slate-700 dark:text-slate-300">{opt.label}</span>
          </label>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Header />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Hero */}
        <div className="flex items-end justify-between mb-10">
          <div>
            <h2 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-brand-500 to-violet-500 bg-clip-text text-transparent">
              Suas Matérias
            </h2>
            <p className="text-slate-500 mt-1 dark:text-slate-400">Gerencie seus materiais de estudo</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="secondary" onClick={() => setIsExamModalOpen(true)}>
              <span className="flex items-center gap-2"><FileUp size={18} /> Estudar para Prova</span>
            </Button>
            <Button onClick={() => setIsModalOpen(true)}>
              <span className="flex items-center gap-2"><Plus size={18} /> Nova Matéria</span>
            </Button>
          </div>
        </div>

        {/* Content */}
        {subjects.length === 0 ? (
          <EmptyState
            icon={GraduationCap}
            title="Nenhuma matéria ainda"
            description="Comece adicionando links de aulas do YouTube ou material de prova"
            action={<Button onClick={() => setIsModalOpen(true)}><span className="flex items-center gap-2"><Plus size={18} /> Nova Matéria</span></Button>}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {subjects.map((subject, index) => {
              const { variant, label } = statusConfig[subject.status];
              return (
                <Card
                  key={subject.id}
                  onClick={() => handleCardClick(subject)}
                  className="relative animate-fade-in"
                >
                  <div style={{ animationDelay: `${index * 60}ms` }} className="contents" />
                  <button
                    className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                    onClick={(e) => { e.stopPropagation(); setDeleteTarget(subject); }}
                  >
                    <Trash2 size={16} />
                  </button>
                  <h3 className="font-bold text-slate-900 dark:text-white pr-10 text-lg">{subject.title}</h3>
                  {subject.description && (
                    <p className="text-slate-500 dark:text-slate-400 text-sm truncate mt-1">{subject.description}</p>
                  )}
                  <div className="mt-4 flex items-center gap-2">
                    <Badge variant={variant}>{label}</Badge>
                    {subject.sourceType === 'exam' && <Badge variant="accent">Prova</Badge>}
                  </div>
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 text-xs text-slate-400">
                    <span className="flex items-center gap-1.5"><BookOpen size={13} /> {subject.totalLessons} {subject.sourceType === 'exam' ? 'fontes' : 'aulas'}</span>
                    <span>{formatDate(subject.createdAt)}</span>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* YouTube Create Modal */}
        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Nova Matéria" size="lg">
          <div className="space-y-5">
            <Input label="Título" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Cálculo II" />
            <Textarea label="Descrição (opcional)" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex: Aulas do professor Silva" rows={2} />
            <Textarea label="Links do YouTube" value={linksText} onChange={(e) => setLinksText(e.target.value)} placeholder="Cole os links do YouTube, um por linha..." rows={6} />
            {linksText.trim() && (
              <p className="text-sm font-medium text-brand-600">{validUrls.length} links válidos detectados</p>
            )}
            {playlistUrl && validUrls.length <= 1 && (
              <button onClick={handleExpandPlaylist} disabled={loadingPlaylist}
                className="flex items-center gap-2 text-sm text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 font-medium transition-colors">
                {loadingPlaylist ? <Loader2 size={14} className="animate-spin" /> : <List size={14} />}
                {loadingPlaylist ? 'Buscando vídeos da playlist...' : 'Playlist detectada! Clique para expandir todos os vídeos'}
              </button>
            )}
            {contentCheckboxes}
            <Button onClick={handleCreate} loading={createSubject.isPending} disabled={!title.trim() || validUrls.length === 0} className="w-full">
              Criar e Processar
            </Button>
          </div>
        </Modal>

        {/* Exam Create Modal */}
        <Modal isOpen={isExamModalOpen} onClose={() => setIsExamModalOpen(false)} title="Estudar para Prova" size="lg">
          <div className="space-y-5">
            <p className="text-sm text-slate-500 dark:text-slate-400">Cole o texto da prova e/ou envie arquivos (PDF, Word, imagens)</p>
            <Input label="Título" value={examTitle} onChange={(e) => setExamTitle(e.target.value)} placeholder="Ex: P1 de Física" />
            <Textarea label="Descrição (opcional)" value={examDescription} onChange={(e) => setExamDescription(e.target.value)} placeholder="Ex: Prova do professor João" rows={2} />
            <Textarea label="Texto da prova (opcional se enviar arquivos)" value={examText} onChange={(e) => setExamText(e.target.value)} placeholder="Cole aqui o conteúdo da prova..." rows={5} />

            {/* File upload area */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Arquivos</label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center cursor-pointer transition-all hover:border-brand-400 hover:bg-brand-50/30 dark:border-slate-600 dark:hover:border-brand-400 dark:hover:bg-brand-900/20"
              >
                <Upload size={28} className="mx-auto text-slate-300 mb-2" />
                <p className="text-sm text-slate-500 dark:text-slate-400">Arraste arquivos ou clique para selecionar</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">PDF, Word, imagens</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.doc,.png,.jpg,.jpeg"
                multiple
                className="hidden"
                onChange={handleFileSelect}
              />
              {examFiles.length > 0 && (
                <div className="mt-3 space-y-2">
                  {examFiles.map((file, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm">
                      <span className="flex-1 truncate text-slate-700 dark:text-slate-200">{file.name}</span>
                      <span className="text-xs text-slate-400 dark:text-slate-500 whitespace-nowrap">{formatFileSize(file.size)}</span>
                      <button onClick={() => setExamFiles(f => f.filter((_, j) => j !== i))} className="p-1 rounded hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors">
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                  <p className="text-sm font-medium text-brand-600">{examFiles.length} arquivo{examFiles.length > 1 ? 's' : ''} selecionado{examFiles.length > 1 ? 's' : ''}</p>
                </div>
              )}
            </div>

            {contentCheckboxes}
            <Button onClick={handleCreateExam} loading={createExamSubject.isPending} disabled={!examValid} className="w-full">
              Criar e Estudar
            </Button>
          </div>
        </Modal>

        {/* Delete Modal */}
        <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Excluir Matéria" size="sm">
          <p className="text-slate-500 mb-6">
            Tem certeza que deseja excluir esta matéria? Todos os materiais gerados serão perdidos.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
            <Button variant="danger" onClick={handleDelete} loading={deleteSubject.isPending}>Excluir</Button>
          </div>
        </Modal>
      </main>
    </div>
  );
}
