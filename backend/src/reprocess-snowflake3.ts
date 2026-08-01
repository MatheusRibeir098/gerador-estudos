import { initDatabase } from './database';
import { setDb } from './db';
import { generateStudyContent } from './services/openai';

async function main() {
  const db = initDatabase();
  setDb(db);

  const lesson = db.prepare('SELECT * FROM lessons WHERE id = 104').get() as any;
  if (!lesson?.transcript) { console.error('Sem transcrição'); process.exit(1); }

  console.log('Gerando study content (via stdin fix)...');
  try {
    const studyContent = await generateStudyContent(lesson.transcript);
    db.prepare('INSERT INTO study_content (lesson_id, subject_id, content) VALUES (?, ?, ?)').run(104, 32, studyContent.content);
    console.log('✅ Study content OK');
  } catch (e) { console.error('❌ Erro study content:', e); }

  console.log('Finalizado!');
}

main().catch(console.error);
