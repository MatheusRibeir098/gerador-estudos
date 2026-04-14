import { initDatabase } from './database';
import { setDb } from './db';
import { processSubject } from './services/processor';

const db = initDatabase();
setDb(db);

db.prepare("UPDATE subjects SET status='pending', processed_lessons=0 WHERE id=2").run();
db.prepare('DELETE FROM summaries WHERE subject_id=2').run();
db.prepare('DELETE FROM quizzes WHERE subject_id=2').run();
db.prepare('DELETE FROM exam_radar WHERE subject_id=2').run();
db.prepare('DELETE FROM study_plans WHERE subject_id=2').run();
console.log('reset OK, processando 12 aulas com chunking...');

processSubject(2)
  .then(() => { console.log('CONCLUÍDO'); process.exit(0); })
  .catch(e => { console.error('ERRO:', e); process.exit(1); });
