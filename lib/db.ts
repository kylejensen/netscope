import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dbPath = process.env.DATABASE_PATH || './data/netscope.db';
const dbDir = path.dirname(dbPath);

// Ensure data directory exists
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');

export function initializeDatabase() {
  // Events table
  db.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      start_date TEXT NOT NULL,
      end_date TEXT,
      location TEXT,
      format TEXT, -- in-person, virtual, hybrid
      type TEXT, -- conference, seminar, webinar, meetup, workshop
      topics TEXT, -- JSON array
      cost TEXT, -- free, paid
      price REAL,
      url TEXT,
      source TEXT, -- eventbrite, meetup, luma, manual
      image_url TEXT,
      status TEXT DEFAULT 'active', -- active, saved, dismissed
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Clubs table
  db.exec(`
    CREATE TABLE IF NOT EXISTS clubs (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT, -- social, professional, tech, coworking
      description TEXT,
      location TEXT,
      address TEXT,
      website TEXT,
      cost_info TEXT,
      membership_info TEXT,
      vibe TEXT,
      tags TEXT, -- JSON array
      status TEXT DEFAULT 'active', -- active, interested, applied, member, dismissed
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // User preferences
  db.exec(`
    CREATE TABLE IF NOT EXISTS preferences (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_events_start_date ON events(start_date);
    CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
    CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);
    CREATE INDEX IF NOT EXISTS idx_clubs_status ON clubs(status);
    CREATE INDEX IF NOT EXISTS idx_clubs_type ON clubs(type);
  `);
}

export default db;
