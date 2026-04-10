import type { Database } from 'better-sqlite3';

let db: Database;

export function setDb(instance: Database): void {
  db = instance;
}

export function getDb(): Database {
  if (!db) throw new Error('Database não inicializado');
  return db;
}
