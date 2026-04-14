import { initDatabase } from './database';
import { setDb, getDb } from './db';
import { generateExamRadar, generateStudyPlan } from './services/openai';

const db = initDatabase();
setDb(db);

async function run() {
  const lesson = db.prepare('SELECT id, transcript, youtube_title FROM lessons WHERE subject_id = 3').get() as { id: number; transcript: string; youtube_title: string | null };
  const summary = db.prepare('SELECT content FROM summaries WHERE lesson_id = ?').get(lesson.id) as { content: string };

  console.log('Gerando exam radar para lesson', lesson.id, '...');
  try {
    const radarItems = await generateExamRadar(lesson.transcript);
    const insertRadar = db.prepare('INSERT INTO exam_radar (subject_id, lesson_id, topic, relevance, professor_quote, reasoning) VALUES (?, ?, ?, ?, ?, ?)');
    for (const item of radarItems) {
      insertRadar.run(3, lesson.id, item.topic, item.relevance, item.professorQuote, item.reasoning);
    }
    console.log('radar OK:', radarItems.length, 'itens');
  } catch (e) { console.error('radar ERRO:', e); }

  console.log('Gerando study plan...');
  try {
    const plan = await generateStudyPlan([{ title: lesson.youtube_title ?? 'Aula 1', content: summary.content }]);
    db.prepare('INSERT INTO study_plans (subject_id, content) VALUES (?, ?)').run(3, plan);
    console.log('study plan OK');
  } catch (e) { console.error('study plan ERRO:', e); }

  db.prepare("UPDATE subjects SET status='completed', updated_at=datetime('now') WHERE id=3").run();
  console.log('subject 3 → completed');
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
