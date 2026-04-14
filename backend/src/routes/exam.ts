import { Router } from 'express';
import multer from 'multer';
import { getDb } from '../db';
import { extractText } from '../services/extractor';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024, files: 10 } });
const router: ReturnType<typeof Router> = Router();

router.post('/from-exam', upload.array('files', 10), async (req, res) => {
  try {
    const title = req.body.title?.trim();
    const description = req.body.description?.trim() || null;
    const pastedText = req.body.text?.trim() || '';
    const files = (req.files as Express.Multer.File[]) || [];

    if (!title) { res.status(400).json({ error: 'Título obrigatório' }); return; }
    if (!pastedText && files.length === 0) { res.status(400).json({ error: 'Envie texto ou pelo menos um arquivo' }); return; }

    const contentOptions = req.body.contentOptions ? JSON.parse(req.body.contentOptions) : { studyContent: true, summary: true, examRadar: true, quiz: true };
    const db = getDb();
    const sources: { text: string; fileType: string; filename: string | null }[] = [];

    if (pastedText) {
      sources.push({ text: pastedText, fileType: 'text', filename: null });
    }

    for (const file of files) {
      const result = await extractText(file.buffer, file.mimetype, file.originalname);
      sources.push({ text: result.text, fileType: result.fileType, filename: file.originalname });
    }

    const result = db.prepare(
      'INSERT INTO subjects (title, description, source_type, status, total_lessons, content_options) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(title, description, 'exam', 'processing', sources.length, JSON.stringify(contentOptions));
    const subjectId = result.lastInsertRowid as number;

    const insertSource = db.prepare(
      'INSERT INTO exam_sources (subject_id, original_filename, file_type, extracted_text, order_index) VALUES (?, ?, ?, ?, ?)'
    );
    for (let i = 0; i < sources.length; i++) {
      insertSource.run(subjectId, sources[i].filename, sources[i].fileType, sources[i].text, i);
    }

    import('../services/processor').then(({ processExamSubject }) => {
      processExamSubject(subjectId);
    });

    const subject = db.prepare('SELECT * FROM subjects WHERE id = ?').get(subjectId) as any;
    res.status(201).json({
      id: subject.id,
      title: subject.title,
      description: subject.description,
      sourceType: subject.source_type,
      status: subject.status,
      totalLessons: subject.total_lessons,
      processedLessons: subject.processed_lessons,
      createdAt: subject.created_at,
    });
  } catch (error) {
    console.error('Erro ao criar subject de prova:', error);
    res.status(500).json({ error: 'Erro ao processar arquivos' });
  }
});

export default router;
