import { getDb } from '../db';
import { getYoutubeTranscript, getVideoTitle } from './transcription';
import {
  generateSummary,
  generateStudyPlan,
  generateQuizzes,
  generateExamRadar,
  generateStudyContent,
} from './openai';

interface LessonRow {
  id: number;
  subject_id: number;
  youtube_url: string;
  youtube_title: string | null;
  transcript: string | null;
  transcript_method: string | null;
  status: string;
  error_message: string | null;
  order_index: number;
  created_at: string;
}

export async function processSubject(subjectId: number): Promise<void> {
  const db = getDb();

  try {
    const subject = db.prepare('SELECT * FROM subjects WHERE id = ?').get(subjectId) as any;
    const options = JSON.parse(subject?.content_options || '{"studyContent":true,"summary":true,"examRadar":true,"quiz":true}');

    const lessons = db
      .prepare('SELECT * FROM lessons WHERE subject_id = ? ORDER BY order_index')
      .all(subjectId) as LessonRow[];

    for (const lesson of lessons) {
      try {
        db.prepare('UPDATE lessons SET status = ? WHERE id = ?').run('transcribing', lesson.id);

        const title = await getVideoTitle(lesson.youtube_url);
        if (title) {
          db.prepare('UPDATE lessons SET youtube_title = ? WHERE id = ?').run(title, lesson.id);
        }

        const result = await getYoutubeTranscript(lesson.youtube_url);

        db.prepare(
          'UPDATE lessons SET transcript = ?, transcript_method = ?, status = ? WHERE id = ?'
        ).run(result.transcript, result.method, 'transcribed', lesson.id);

        db.prepare(
          "UPDATE subjects SET processed_lessons = processed_lessons + 1, updated_at = datetime('now') WHERE id = ?"
        ).run(subjectId);

        console.log(`Lesson ${lesson.id} transcrita via ${result.method}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        db.prepare('UPDATE lessons SET status = ?, error_message = ? WHERE id = ?').run(
          'error',
          errorMessage,
          lesson.id
        );
        console.error(`Erro na lesson ${lesson.id}:`, errorMessage);
      }
    }

    const transcribedLessons = db
      .prepare("SELECT * FROM lessons WHERE subject_id = ? AND status = 'transcribed'")
      .all(subjectId) as LessonRow[];

    if (transcribedLessons.length === 0) {
      db.prepare(
        "UPDATE subjects SET status = 'error', updated_at = datetime('now') WHERE id = ?"
      ).run(subjectId);
      console.error(`Nenhuma lesson transcrita para subject ${subjectId}`);
      return;
    }

    const summariesData: { title: string; content: string }[] = [];
    const allPreviousTopics: string[] = [];

    for (const lesson of transcribedLessons) {
      try {
        console.log(`Gerando conteúdo IA para lesson ${lesson.id}...`);

        const quizCount = Math.min(20, Math.max(8, Math.ceil(lesson.transcript!.length / 2000)));

        // Sequential calls — kiro-cli doesn't handle concurrent invocations reliably
        try {
          const summary = await generateSummary(lesson.transcript!);
          db.prepare('INSERT INTO summaries (lesson_id, subject_id, content, key_topics) VALUES (?, ?, ?, ?)').run(lesson.id, subjectId, summary.content, JSON.stringify(summary.keyTopics));
          summariesData.push({ title: lesson.youtube_title || `Aula ${lesson.order_index + 1}`, content: summary.content });
          allPreviousTopics.push(...summary.keyTopics);
        } catch (e) { console.error(`Erro ao gerar resumo para lesson ${lesson.id}:`, e); }

        if (options.quiz) {
        try {
          const quizzes = await generateQuizzes(lesson.transcript!, quizCount);
          const insertQuiz = db.prepare('INSERT INTO quizzes (subject_id, lesson_id, question, options, correct_index, explanation, difficulty) VALUES (?, ?, ?, ?, ?, ?, ?)');
          for (const quiz of quizzes) insertQuiz.run(subjectId, lesson.id, quiz.question, JSON.stringify(quiz.options), quiz.correctIndex, quiz.explanation, quiz.difficulty);
        } catch (e) { console.error(`Erro ao gerar quizzes para lesson ${lesson.id}:`, e); }
        }

        if (options.examRadar) {
        try {
          const radar = await generateExamRadar(lesson.transcript!);
          const insertRadar = db.prepare('INSERT INTO exam_radar (subject_id, lesson_id, topic, relevance, professor_quote, reasoning) VALUES (?, ?, ?, ?, ?, ?)');
          for (const item of radar) insertRadar.run(subjectId, lesson.id, item.topic, item.relevance, item.professorQuote, item.reasoning);
        } catch (e) { console.error(`Erro ao gerar radar para lesson ${lesson.id}:`, e); }
        }

        if (options.studyContent) {
        try {
          const studyContent = await generateStudyContent(lesson.transcript!, [...allPreviousTopics]);
          db.prepare('INSERT INTO study_content (lesson_id, subject_id, content) VALUES (?, ?, ?)').run(lesson.id, subjectId, studyContent.content);
        } catch (e) { console.error(`Erro ao gerar study content para lesson ${lesson.id}:`, e); }
        }
      } catch (error) {
        console.error(`Erro ao gerar conteúdo para lesson ${lesson.id}:`, error);
      }
    }

    const studyPlan = await generateStudyPlan(summariesData);
    db.prepare('INSERT INTO study_plans (subject_id, content) VALUES (?, ?)').run(
      subjectId,
      studyPlan
    );

    db.prepare(
      "UPDATE subjects SET status = 'completed', updated_at = datetime('now') WHERE id = ?"
    ).run(subjectId);

    console.log(`Subject ${subjectId} processado com sucesso`);
  } catch (error) {
    console.error(`Erro geral ao processar subject ${subjectId}:`, error);
    db.prepare(
      "UPDATE subjects SET status = 'error', updated_at = datetime('now') WHERE id = ?"
    ).run(subjectId);
  }
}

export async function processExamSubject(subjectId: number): Promise<void> {
  const db = getDb();
  try {
    const subject = db.prepare('SELECT * FROM subjects WHERE id = ?').get(subjectId) as any;
    const options = JSON.parse(subject?.content_options || '{"studyContent":true,"summary":true,"examRadar":true,"quiz":true}');

    const sources = db.prepare('SELECT * FROM exam_sources WHERE subject_id = ? ORDER BY order_index').all(subjectId) as any[];

    if (sources.length === 0) {
      db.prepare("UPDATE subjects SET status = 'error', updated_at = datetime('now') WHERE id = ?").run(subjectId);
      return;
    }

    const summariesData: { title: string; content: string }[] = [];
    const allPreviousTopics: string[] = [];

    for (let i = 0; i < sources.length; i++) {
      const source = sources[i];
      const sourceTitle = source.original_filename || `Texto colado ${i + 1}`;
      const transcript = source.extracted_text;

      try {
        const lessonResult = db.prepare(
          'INSERT INTO lessons (subject_id, youtube_url, youtube_title, transcript, transcript_method, status, order_index) VALUES (?, ?, ?, ?, ?, ?, ?)'
        ).run(subjectId, 'exam://' + (source.original_filename || 'text'), sourceTitle, transcript, 'youtube', 'transcribed', i);
        const lessonId = lessonResult.lastInsertRowid as number;

        const quizCount = Math.min(20, Math.max(8, Math.ceil(transcript.length / 2000)));

        // Sequential calls — kiro-cli doesn't handle concurrent invocations reliably
        try {
          const summary = await generateSummary(transcript);
          db.prepare('INSERT INTO summaries (lesson_id, subject_id, content, key_topics) VALUES (?, ?, ?, ?)').run(lessonId, subjectId, summary.content, JSON.stringify(summary.keyTopics));
          summariesData.push({ title: sourceTitle, content: summary.content });
          allPreviousTopics.push(...summary.keyTopics);
        } catch (e) { console.error(`Erro ao gerar resumo para source ${i + 1}:`, e); }

        if (options.quiz) {
        try {
          const quizzes = await generateQuizzes(transcript, quizCount);
          const insertQuiz = db.prepare('INSERT INTO quizzes (subject_id, lesson_id, question, options, correct_index, explanation, difficulty) VALUES (?, ?, ?, ?, ?, ?, ?)');
          for (const quiz of quizzes) insertQuiz.run(subjectId, lessonId, quiz.question, JSON.stringify(quiz.options), quiz.correctIndex, quiz.explanation, quiz.difficulty);
        } catch (e) { console.error(`Erro ao gerar quizzes para source ${i + 1}:`, e); }
        }

        if (options.examRadar) {
        try {
          const radar = await generateExamRadar(transcript);
          const insertRadar = db.prepare('INSERT INTO exam_radar (subject_id, lesson_id, topic, relevance, professor_quote, reasoning) VALUES (?, ?, ?, ?, ?, ?)');
          for (const item of radar) insertRadar.run(subjectId, lessonId, item.topic, item.relevance, item.professorQuote, item.reasoning);
        } catch (e) { console.error(`Erro ao gerar radar para source ${i + 1}:`, e); }
        }

        if (options.studyContent) {
        try {
          const studyContent = await generateStudyContent(transcript, [...allPreviousTopics]);
          db.prepare('INSERT INTO study_content (lesson_id, subject_id, content) VALUES (?, ?, ?)').run(lessonId, subjectId, studyContent.content);
        } catch (e) { console.error(`Erro ao gerar study content para source ${i + 1}:`, e); }
        }

        db.prepare("UPDATE subjects SET processed_lessons = processed_lessons + 1, updated_at = datetime('now') WHERE id = ?").run(subjectId);
        console.log(`Exam source ${i + 1} processada: ${sourceTitle}`);
      } catch (error) {
        console.error(`Erro ao criar lesson para exam source ${i + 1}:`, error);
      }
    }

    if (summariesData.length > 0) {
      const studyPlan = await generateStudyPlan(summariesData);
      db.prepare('INSERT INTO study_plans (subject_id, content) VALUES (?, ?)').run(subjectId, studyPlan);
    }

    db.prepare("UPDATE subjects SET status = 'completed', updated_at = datetime('now') WHERE id = ?").run(subjectId);
    console.log(`Exam subject ${subjectId} processado com sucesso`);
  } catch (error) {
    console.error(`Erro geral ao processar exam subject ${subjectId}:`, error);
    db.prepare("UPDATE subjects SET status = 'error', updated_at = datetime('now') WHERE id = ?").run(subjectId);
  }
}
