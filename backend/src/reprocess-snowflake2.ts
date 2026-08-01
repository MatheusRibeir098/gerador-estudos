import { initDatabase } from './database';
import { setDb } from './db';
import { generateStudyContent, generateStudyPlan } from './services/openai';

async function main() {
  const db = initDatabase();
  setDb(db);

  const lesson = db.prepare('SELECT * FROM lessons WHERE id = 104').get() as any;
  if (!lesson?.transcript) { console.error('Sem transcrição'); process.exit(1); }

  const summary = db.prepare('SELECT content FROM summaries WHERE lesson_id = 104').get() as any;

  console.log('Gerando study content...');
  try {
    const studyContent = await generateStudyContent(lesson.transcript);
    db.prepare('INSERT INTO study_content (lesson_id, subject_id, content) VALUES (?, ?, ?)').run(104, 32, studyContent.content);
    console.log('✅ Study content OK');
  } catch (e) { console.error('❌ Erro study content:', e); }

  console.log('Gerando study plan...');
  try {
    const plan = await generateStudyPlan([{ title: 'Snowflake', content: summary?.content || '' }]);
    db.prepare('INSERT INTO study_plans (subject_id, content) VALUES (?, ?)').run(32, plan);
    console.log('✅ Study plan OK');
  } catch (e) { console.error('❌ Erro study plan:', e); }

  console.log('Reprocessamento finalizado!');
}

main().catch(console.error);
