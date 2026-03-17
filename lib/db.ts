import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import path from 'path';
import fs from 'fs';

const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'netscope.db');
const dbDir = path.dirname(dbPath);

let db: SqlJsDatabase | null = null;

function saveDb() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  }
}

export async function getDb(): Promise<SqlJsDatabase> {
  if (db) return db;

  const SQL = await initSqlJs();

  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  return db;
}

export function initializeDatabase(database: SqlJsDatabase) {
  database.run(`
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      start_date TEXT NOT NULL,
      end_date TEXT,
      location TEXT,
      format TEXT,
      type TEXT,
      topics TEXT,
      cost TEXT,
      price REAL,
      url TEXT,
      source TEXT,
      image_url TEXT,
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  database.run(`
    CREATE TABLE IF NOT EXISTS clubs (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT,
      description TEXT,
      location TEXT,
      address TEXT,
      website TEXT,
      cost_info TEXT,
      membership_info TEXT,
      vibe TEXT,
      tags TEXT,
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  database.run(`
    CREATE TABLE IF NOT EXISTS preferences (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  database.run(`CREATE INDEX IF NOT EXISTS idx_events_start_date ON events(start_date)`);
  database.run(`CREATE INDEX IF NOT EXISTS idx_events_status ON events(status)`);
  database.run(`CREATE INDEX IF NOT EXISTS idx_events_type ON events(type)`);
  database.run(`CREATE INDEX IF NOT EXISTS idx_clubs_status ON clubs(status)`);
  database.run(`CREATE INDEX IF NOT EXISTS idx_clubs_type ON clubs(type)`);
}

export { saveDb };
export default getDb;
