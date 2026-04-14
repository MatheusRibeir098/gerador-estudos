import { Router } from 'express';
import { getDb } from '../db';
import { quizAttemptSchema } from '../validators/quiz';
import { chatMessageSchema } from '../validators/chat';
import { chatWithTutor } from '../services/openai';

interface StudyPlanRow {
  id: number;
  subject_id: number;
  content: string;
  created_at: string;
}

interface SummaryRow {
  id: number;
  lesson_id: number;
  youtube_title: string;
  content: string;
  key_topics: string;
  created_at: string;
}

interface QuizRow {
  id: number;
  lesson_id: number | null;
  question: string;
  options: string;
  correct_index: number;
  explanation: string;
  difficulty: string;
}

interface ExamRadarRow {
  id: number;
  lesson_id: number | null;
  topic: string;
  relevance: string;
  professor_quote: string | null;
  reasoning: string;
}

interface QuizAttemptRow {
  id: number;
  subject_id: number;
  total_questions: number;
  correct_answers: number;
  created_at: string;
}

const router: ReturnType<typeof Router> = Router();

router.get('/subjects/:id/study-plan', (req, res) => {
  const row = getDb().prepare('SELECT * FROM study_plans WHERE subject_id = ?').get(req.params.id) as StudyPlanRow | undefined;
  if (!row) {
    res.status(404).json({ error: 'Plano de estudos não encontrado' });
    return;
  }
  res.json({ id: row.id, subjectId: row.subject_id, content: row.content, createdAt: row.created_at });
});

router.get('/subjects/:id/summaries', (req, res) => {
  const rows = getDb().prepare(
    'SELECT s.*, l.youtube_title FROM summaries s JOIN lessons l ON s.lesson_id = l.id WHERE s.subject_id = ? ORDER BY l.order_index'
  ).all(req.params.id) as SummaryRow[];

  res.json({
    data: rows.map((r) => ({
      id: r.id,
      lessonId: r.lesson_id,
      youtubeTitle: r.youtube_title,
      content: r.content,
      keyTopics: JSON.parse(r.key_topics) as string[],
      createdAt: r.created_at,
    })),
  });
});

router.get('/subjects/:id/quizzes', (req, res) => {
  const rows = getDb().prepare('SELECT * FROM quizzes WHERE subject_id = ? ORDER BY id').all(req.params.id) as QuizRow[];

  res.json({
    data: rows.map((r) => ({
      id: r.id,
      lessonId: r.lesson_id,
      question: r.question,
      options: JSON.parse(r.options) as string[],
      correctIndex: r.correct_index,
      explanation: r.explanation,
      difficulty: r.difficulty,
    })),
  });
});

router.get('/subjects/:id/exam-radar', (req, res) => {
  const rows = getDb().prepare(
    "SELECT * FROM exam_radar WHERE subject_id = ? ORDER BY CASE relevance WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 END"
  ).all(req.params.id) as ExamRadarRow[];

  res.json({
    data: rows.map((r) => ({
      id: r.id,
      lessonId: r.lesson_id,
      topic: r.topic,
      relevance: r.relevance,
      professorQuote: r.professor_quote,
      reasoning: r.reasoning,
    })),
  });
});

interface StudyContentRow {
  id: number;
  lesson_id: number;
  youtube_title: string;
  content: string;
  created_at: string;
}

router.get('/subjects/:id/study-content', (req, res) => {
  const rows = getDb()
    .prepare(
      'SELECT sc.*, l.youtube_title FROM study_content sc JOIN lessons l ON sc.lesson_id = l.id WHERE sc.subject_id = ? ORDER BY l.order_index'
    )
    .all(req.params.id) as StudyContentRow[];

  res.json({
    data: rows.map((r) => ({
      id: r.id,
      lessonId: r.lesson_id,
      youtubeTitle: r.youtube_title,
      content: r.content,
      createdAt: r.created_at,
    })),
  });
});

router.post('/subjects/:id/quiz-attempts', (req, res) => {
  const parsed = quizAttemptSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0].message });
    return;
  }

  const db = getDb();
  const subject = db.prepare('SELECT id FROM subjects WHERE id = ?').get(req.params.id) as { id: number } | undefined;
  if (!subject) {
    res.status(404).json({ error: 'Matéria não encontrada' });
    return;
  }

  const { totalQuestions, correctAnswers, answers } = parsed.data;
  const result = db.prepare(
    'INSERT INTO quiz_attempts (subject_id, total_questions, correct_answers, answers) VALUES (?, ?, ?, ?)'
  ).run(req.params.id, totalQuestions, correctAnswers, JSON.stringify(answers));

  const row = db.prepare('SELECT * FROM quiz_attempts WHERE id = ?').get(result.lastInsertRowid) as QuizAttemptRow;

  res.status(201).json({
    id: row.id,
    subjectId: row.subject_id,
    totalQuestions: row.total_questions,
    correctAnswers: row.correct_answers,
    percentage: Math.round((row.correct_answers / row.total_questions) * 100),
    createdAt: row.created_at,
  });
});

router.get('/subjects/:id/quiz-attempts', (req, res) => {
  const rows = getDb().prepare('SELECT * FROM quiz_attempts WHERE subject_id = ? ORDER BY created_at DESC').all(req.params.id) as QuizAttemptRow[];

  res.json({
    data: rows.map((r) => ({
      id: r.id,
      totalQuestions: r.total_questions,
      correctAnswers: r.correct_answers,
      percentage: Math.round((r.correct_answers / r.total_questions) * 100),
      createdAt: r.created_at,
    })),
  });
});

interface SummaryContentRow {
  content: string;
}

router.post('/content/:id/chat', async (req, res) => {
  const parsed = chatMessageSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0].message });
    return;
  }

  const row = getDb()
    .prepare('SELECT content FROM summaries WHERE lesson_id = ?')
    .get(req.params.id) as SummaryContentRow | undefined;

  if (!row) {
    res.status(404).json({ error: 'Resumo não encontrado para esta aula' });
    return;
  }

  try {
    const reply = await chatWithTutor({
      summary: row.content,
      history: parsed.data.history,
      message: parsed.data.message,
    });
    res.json({ reply });
  } catch (error) {
    console.error('Erro no chat com tutor:', error);
    res.status(500).json({ error: 'Erro ao processar resposta do tutor' });
  }
});

router.get('/subjects/:id/flashcards', (req, res) => {
  const rows = getDb().prepare('SELECT * FROM flashcards WHERE subject_id = ? ORDER BY id').all(req.params.id) as any[];
  res.json({ data: rows.map((r: any) => ({ id: r.id, lessonId: r.lesson_id, front: r.front, back: r.back, category: r.category })) });
});

export default router;
