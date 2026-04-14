import Database from 'better-sqlite3';
import { mkdirSync } from 'fs';
import { dirname } from 'path';

export type { Database } from 'better-sqlite3';

export function initDatabase(): Database.Database {
  const dbPath = 'data/studygen.db';
  mkdirSync(dirname(dbPath), { recursive: true });

  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS subjects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      source_type TEXT NOT NULL DEFAULT 'youtube' CHECK(source_type IN ('youtube','exam')),
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','processing','completed','error')),
      total_lessons INTEGER NOT NULL DEFAULT 0,
      processed_lessons INTEGER NOT NULL DEFAULT 0,
      content_options TEXT NOT NULL DEFAULT '{"studyContent":true,"summary":true,"examRadar":true,"quiz":true}',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS lessons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
      youtube_url TEXT NOT NULL DEFAULT '',
      youtube_title TEXT,
      duration_seconds INTEGER,
      transcript TEXT,
      transcript_method TEXT CHECK(transcript_method IN ('youtube','whisper')),
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','transcribing','transcribed','error')),
      error_message TEXT,
      order_index INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS study_plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subject_id INTEGER NOT NULL UNIQUE REFERENCES subjects(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS summaries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lesson_id INTEGER NOT NULL UNIQUE REFERENCES lessons(id) ON DELETE CASCADE,
      subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      key_topics TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS quizzes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
      lesson_id INTEGER REFERENCES lessons(id) ON DELETE CASCADE,
      question TEXT NOT NULL,
      options TEXT NOT NULL,
      correct_index INTEGER NOT NULL,
      explanation TEXT NOT NULL,
      difficulty TEXT NOT NULL DEFAULT 'medium' CHECK(difficulty IN ('easy','medium','hard')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS exam_radar (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
      lesson_id INTEGER REFERENCES lessons(id) ON DELETE CASCADE,
      topic TEXT NOT NULL,
      relevance TEXT NOT NULL CHECK(relevance IN ('high','medium','low')),
      professor_quote TEXT,
      reasoning TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS quiz_attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
      total_questions INTEGER NOT NULL,
      correct_answers INTEGER NOT NULL,
      answers TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS study_content (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lesson_id INTEGER NOT NULL UNIQUE REFERENCES lessons(id) ON DELETE CASCADE,
      subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS exam_sources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
      original_filename TEXT,
      file_type TEXT NOT NULL CHECK(file_type IN ('text','pdf','docx','image')),
      extracted_text TEXT NOT NULL,
      order_index INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS flashcards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
      lesson_id INTEGER REFERENCES lessons(id) ON DELETE CASCADE,
      front TEXT NOT NULL,
      back TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'concept',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Migrations para bancos existentes
  const columns = db.prepare("PRAGMA table_info(subjects)").all() as { name: string }[];
  if (!columns.some(c => c.name === 'source_type')) {
    db.exec("ALTER TABLE subjects ADD COLUMN source_type TEXT NOT NULL DEFAULT 'youtube' CHECK(source_type IN ('youtube','exam'))");
  }
  if (!columns.some(c => c.name === 'content_options')) {
    db.exec("ALTER TABLE subjects ADD COLUMN content_options TEXT NOT NULL DEFAULT '{\"studyContent\":true,\"summary\":true,\"examRadar\":true,\"quiz\":true}'");
  }

  return db;
}
