import { initDatabase } from './src/database';
import { setDb } from './src/db';
import { generateSummary, generateQuizzes, generateFlashcards, generateStudyContent } from './src/services/openai';

const db = initDatabase();
setDb(db);

const SUBJECT_ID = 29;

async function main() {
  const lessons = db.prepare(`
    SELECT l.id, l.youtube_title, l.transcript,
      (SELECT COUNT(*) FROM summaries WHERE lesson_id = l.id) as has_summary,
      (SELECT COUNT(*) FROM quizzes WHERE lesson_id = l.id) as quiz_count,
      (SELECT COUNT(*) FROM flashcards WHERE lesson_id = l.id) as flashcard_count,
      (SELECT COUNT(*) FROM study_content WHERE lesson_id = l.id) as has_study_content
    FROM lessons l WHERE l.subject_id = ?
    ORDER BY l.order_index
  `).all(SUBJECT_ID) as any[];

  const gaps: { lessonId: number; title: string; transcript: string; missing: string[] }[] = [];
  for (const l of lessons) {
    const missing: string[] = [];
    if (!l.has_summary) missing.push('summary');
    if (l.quiz_count === 0) missing.push('quizzes');
    if (l.flashcard_count === 0) missing.push('flashcards');
    if (!l.has_study_content) missing.push('studyContent');
    if (missing.length > 0) gaps.push({ lessonId: l.id, title: l.youtube_title, transcript: l.transcript, missing });
  }

  if (gaps.length === 0) { console.log('Nada para reprocessar!'); process.exit(0); }

  console.log(`Encontradas ${gaps.length} lessons com falhas:`);
  gaps.forEach(g => console.log(`  - Lesson ${g.lessonId} (${g.title}): falta ${g.missing.join(', ')}`));

  for (const gap of gaps) {
    console.log(`\nReprocessando lesson ${gap.lessonId}: ${gap.title}`);

    for (const item of gap.missing) {
      try {
        switch (item) {
          case 'summary': {
            console.log('  Gerando resumo...');
            const s = await generateSummary(gap.transcript);
            db.prepare('INSERT INTO summaries (lesson_id, subject_id, content, key_topics) VALUES (?, ?, ?, ?)').run(gap.lessonId, SUBJECT_ID, s.content, JSON.stringify(s.keyTopics));
            console.log('  ✅ Resumo salvo');
            break;
          }
          case 'quizzes': {
            console.log('  Gerando quizzes...');
            const count = Math.min(20, Math.max(8, Math.ceil(gap.transcript.length / 2000)));
            const quizzes = await generateQuizzes(gap.transcript, count);
            const ins = db.prepare('INSERT INTO quizzes (subject_id, lesson_id, question, options, correct_index, explanation, difficulty) VALUES (?, ?, ?, ?, ?, ?, ?)');
            for (const q of quizzes) ins.run(SUBJECT_ID, gap.lessonId, q.question, JSON.stringify(q.options), q.correctIndex, q.explanation, q.difficulty);
            console.log(`  ✅ ${quizzes.length} quizzes salvos`);
            break;
          }
          case 'flashcards': {
            console.log('  Gerando flashcards...');
            const fcs = await generateFlashcards(gap.transcript, 10);
            const ins = db.prepare('INSERT INTO flashcards (subject_id, lesson_id, front, back, category) VALUES (?, ?, ?, ?, ?)');
            for (const fc of fcs) ins.run(SUBJECT_ID, gap.lessonId, fc.front, fc.back, fc.category);
            console.log(`  ✅ ${fcs.length} flashcards salvos`);
            break;
          }
          case 'studyContent': {
            console.log('  Gerando study content...');
            const sc = await generateStudyContent(gap.transcript);
            db.prepare('INSERT INTO study_content (lesson_id, subject_id, content) VALUES (?, ?, ?)').run(gap.lessonId, SUBJECT_ID, sc.content);
            console.log('  ✅ Study content salvo');
            break;
          }
        }
      } catch (e) {
        console.error(`  ❌ Falha ao gerar ${item}:`, e);
      }
    }
  }
  console.log('\n🎉 Reprocessamento concluído!');
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
