import { Router } from 'express';
import { getDb } from '../db';
import { createSubjectSchema } from '../validators/subject';

interface SubjectRow {
  id: number;
  title: string;
  description: string | null;
  source_type: string;
  status: string;
  total_lessons: number;
  processed_lessons: number;
  content_options: string;
  created_at: string;
  updated_at: string;
}

interface LessonRow {
  id: number;
  subject_id: number;
  youtube_url: string;
  youtube_title: string | null;
  duration_seconds: number | null;
  transcript: string | null;
  transcript_method: string | null;
  status: string;
  error_message: string | null;
  order_index: number;
  created_at: string;
}

interface LessonStatusRow {
  id: number;
  status: string;
  youtube_title: string | null;
}

function mapSubject(row: SubjectRow) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    sourceType: row.source_type,
    status: row.status,
    totalLessons: row.total_lessons,
    processedLessons: row.processed_lessons,
    contentOptions: JSON.parse(row.content_options || '{"studyContent":true,"summary":true,"examRadar":true,"quiz":true}'),
    createdAt: row.created_at,
  };
}

function mapLesson(row: LessonRow) {
  return {
    id: row.id,
    youtubeUrl: row.youtube_url,
    youtubeTitle: row.youtube_title,
    durationSeconds: row.duration_seconds,
    status: row.status,
    transcriptMethod: row.transcript_method,
    orderIndex: row.order_index,
  };
}

const router: ReturnType<typeof Router> = Router();

router.post('/', (req, res) => {
  const parsed = createSubjectSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0].message });
    return;
  }

  const { title, description, youtubeUrls } = parsed.data;
  const contentOptions = req.body.contentOptions || { studyContent: true, summary: true, examRadar: true, quiz: true };
  const db = getDb();

  const result = db.prepare(
    'INSERT INTO subjects (title, description, source_type, status, total_lessons, content_options) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(title, description ?? null, 'youtube', 'processing', youtubeUrls.length, JSON.stringify(contentOptions));

  const subjectId = result.lastInsertRowid as number;
  const insertLesson = db.prepare(
    'INSERT INTO lessons (subject_id, youtube_url, order_index) VALUES (?, ?, ?)'
  );
  for (let i = 0; i < youtubeUrls.length; i++) {
    insertLesson.run(subjectId, youtubeUrls[i], i);
  }

  const subject = db.prepare('SELECT * FROM subjects WHERE id = ?').get(subjectId) as SubjectRow;

  import('../services/processor').then(({ processSubject }) => {
    processSubject(subjectId);
  });

  res.status(201).json(mapSubject(subject));
});

router.get('/', (_req, res) => {
  const rows = getDb().prepare('SELECT * FROM subjects ORDER BY created_at DESC').all() as SubjectRow[];
  res.json({ data: rows.map(mapSubject) });
});

router.get('/:id', (req, res) => {
  const db = getDb();
  const subject = db.prepare('SELECT * FROM subjects WHERE id = ?').get(req.params.id) as SubjectRow | undefined;
  if (!subject) {
    res.status(404).json({ error: 'Matéria não encontrada' });
    return;
  }

  const lessons = db.prepare('SELECT * FROM lessons WHERE subject_id = ? ORDER BY order_index').all(req.params.id) as LessonRow[];

  res.json({ ...mapSubject(subject), lessons: lessons.map(mapLesson) });
});

router.delete('/:id', (req, res) => {
  const db = getDb();
  const subject = db.prepare('SELECT id FROM subjects WHERE id = ?').get(req.params.id);
  if (!subject) {
    res.status(404).json({ error: 'Matéria não encontrada' });
    return;
  }
  db.prepare('DELETE FROM subjects WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

router.get('/:id/status', (req, res) => {
  const db = getDb();
  const subject = db.prepare('SELECT * FROM subjects WHERE id = ?').get(req.params.id) as SubjectRow | undefined;
  if (!subject) {
    res.status(404).json({ error: 'Matéria não encontrada' });
    return;
  }

  // IDs de lessons que já têm resumo gerado
  const summaryLessonIds = new Set(
    (db.prepare('SELECT lesson_id FROM summaries WHERE subject_id = ?').all(req.params.id) as { lesson_id: number }[])
      .map((r) => r.lesson_id)
  );

  if (subject.source_type === 'exam') {
    const examSources = db.prepare(
      'SELECT es.id, es.original_filename, es.order_index FROM exam_sources es WHERE es.subject_id = ? ORDER BY es.order_index'
    ).all(req.params.id) as { id: number; original_filename: string | null; order_index: number }[];

    const lessonsByOrder = new Map(
      (db.prepare('SELECT id, order_index, status FROM lessons WHERE subject_id = ? ORDER BY order_index').all(req.params.id) as { id: number; order_index: number; status: string }[])
        .map((l) => [l.order_index, l])
    );

    const lessonsOut = examSources.map((es) => {
      const lesson = lessonsByOrder.get(es.order_index);
      if (!lesson) return { id: es.id, status: 'pending' as const, youtubeTitle: es.original_filename, aiGenerated: false };
      return { id: es.id, status: 'transcribed' as const, youtubeTitle: es.original_filename, aiGenerated: summaryLessonIds.has(lesson.id) };
    });

    const hasPending = lessonsOut.some((l) => l.status === 'pending');
    const currentStep = hasPending ? 'pending' : 'completed';

    res.json({
      subjectId: subject.id,
      status: subject.status,
      sourceType: subject.source_type,
      totalLessons: subject.total_lessons,
      processedLessons: subject.processed_lessons,
      currentStep,
      lessons: lessonsOut,
    });
    return;
  }

  const lessons = db.prepare(
    'SELECT id, status, youtube_title FROM lessons WHERE subject_id = ? ORDER BY order_index'
  ).all(req.params.id) as LessonStatusRow[];

  const hasTranscribing = lessons.some((l) => l.status === 'transcribing');
  const hasPending = lessons.some((l) => l.status === 'pending');
  const currentStep = hasTranscribing ? 'transcribing' : hasPending ? 'pending' : 'completed';

  res.json({
    subjectId: subject.id,
    status: subject.status,
    sourceType: subject.source_type,
    totalLessons: subject.total_lessons,
    processedLessons: subject.processed_lessons,
    currentStep,
    lessons: lessons.map((l) => ({
      id: l.id,
      status: l.status,
      youtubeTitle: l.youtube_title,
      aiGenerated: summaryLessonIds.has(l.id),
    })),
  });
});

export default router;
