import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, GraduationCap, BookOpen } from 'lucide-react';
import { Header } from '../components/layout/Header';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { EmptyState } from '../components/ui/EmptyState';
import { useSubjects, useCreateSubject, useDeleteSubject } from '../hooks/useSubjects';
import { parseYoutubeUrls } from '../utils/youtube';
import { formatDate } from '../utils/format';
import type { Subject } from '../types/subject';

const statusConfig: Record<Subject['status'], { variant: 'success' | 'warning' | 'error' | 'default'; label: string }> = {
  completed: { variant: 'success', label: 'Concluído' },
  processing: { variant: 'warning', label: 'Processando' },
  error: { variant: 'error', label: 'Erro' },
  pending: { variant: 'default', label: 'Pendente' },
};

export function HomePage() {
  const navigate = useNavigate();
  const { data: subjects = [] } = useSubjects();
  const createSubject = useCreateSubject();
  const deleteSubject = useDeleteSubject();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Subject | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [linksText, setLinksText] = useState('');

  const validUrls = useMemo(() => parseYoutubeUrls(linksText), [linksText]);

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
    });
    setIsModalOpen(false);
    setTitle('');
    setDescription('');
    setLinksText('');
    navigate(`/subjects/${result.id}/processing`);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await deleteSubject.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  }

  const openModal = () => setIsModalOpen(true);

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Header />
      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-[#0F172A]">Suas Matérias</h2>
          <Button onClick={openModal}>
            <span className="flex items-center gap-2"><Plus size={18} /> Nova Matéria</span>
          </Button>
        </div>

        {subjects.length === 0 ? (
          <EmptyState
            icon={GraduationCap}
            title="Nenhuma matéria ainda"
            description="Comece adicionando links de aulas do YouTube"
            action={<Button onClick={openModal}><span className="flex items-center gap-2"><Plus size={18} /> Nova Matéria</span></Button>}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {subjects.map((subject) => {
              const { variant, label } = statusConfig[subject.status];
              return (
                <Card key={subject.id} onClick={() => handleCardClick(subject)} className="relative">
                  <div className="absolute top-3 right-3">
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); setDeleteTarget(subject); }}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                  <h3 className="font-semibold text-[#0F172A] pr-10">{subject.title}</h3>
                  {subject.description && (
                    <p className="text-[#64748B] text-sm truncate mt-1">{subject.description}</p>
                  )}
                  <div className="mt-3">
                    <Badge variant={variant}>{label}</Badge>
                  </div>
                  <div className="flex items-center justify-between mt-3 text-xs text-[#64748B]">
                    <span className="flex items-center gap-1"><BookOpen size={12} /> {subject.totalLessons} aulas</span>
                    <span>{formatDate(subject.createdAt)}</span>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Nova Matéria" size="lg">
          <div className="flex flex-col gap-4">
            <Input label="Título" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Cálculo II" />
            <Textarea label="Descrição (opcional)" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex: Aulas do professor Silva" rows={2} />
            <Textarea label="Links do YouTube" value={linksText} onChange={(e) => setLinksText(e.target.value)} placeholder="Cole os links do YouTube, um por linha..." rows={6} />
            {linksText.trim() && (
              <p className="text-sm text-[#64748B]">{validUrls.length} links válidos detectados</p>
            )}
            <Button onClick={handleCreate} loading={createSubject.isPending} disabled={!title.trim() || validUrls.length === 0}>
              Criar e Processar
            </Button>
          </div>
        </Modal>

        <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Excluir Matéria" size="sm">
          <p className="text-[#64748B] text-sm mb-4">
            Tem certeza que deseja excluir esta matéria? Todos os materiais gerados serão perdidos.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
            <Button variant="danger" onClick={handleDelete} loading={deleteSubject.isPending}>Excluir</Button>
          </div>
        </Modal>
      </main>
    </div>
  );
}
