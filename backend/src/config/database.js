const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../data/kontakte.db');

// Ensure data directory exists
const fs = require('fs');
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(DB_PATH);

// Enable foreign keys and WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Initialize schema
function initializeSchema() {
  db.exec(`
    -- Contacts table
    CREATE TABLE IF NOT EXISTS contacts (
      id TEXT PRIMARY KEY,
      first_name TEXT,
      last_name TEXT,
      gender TEXT,
      email TEXT,
      phone TEXT,
      mobile TEXT,
      company TEXT,
      street TEXT,
      city TEXT,
      zip TEXT,
      country TEXT,
      notes TEXT,
      tags TEXT DEFAULT '[]',
      custom_fields TEXT DEFAULT '{}',
      archived INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Groups table
    CREATE TABLE IF NOT EXISTS groups (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      color TEXT DEFAULT 'blue',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Events table
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      event_date TEXT,
      location TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Contact-Group many-to-many relationship
    CREATE TABLE IF NOT EXISTS contact_groups (
      contact_id TEXT NOT NULL,
      group_id TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (contact_id, group_id),
      FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE,
      FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE
    );

    -- Event-Group many-to-many relationship
    CREATE TABLE IF NOT EXISTS event_groups (
      event_id TEXT NOT NULL,
      group_id TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (event_id, group_id),
      FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
      FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE
    );

    -- Event-Contact many-to-many relationship
    CREATE TABLE IF NOT EXISTS event_contacts (
      event_id TEXT NOT NULL,
      contact_id TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (event_id, contact_id),
      FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
      FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE
    );

    -- Settings table (key-value store)
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Create indexes for better query performance
    CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
    CREATE INDEX IF NOT EXISTS idx_contacts_name ON contacts(last_name, first_name);
    CREATE INDEX IF NOT EXISTS idx_events_date ON events(event_date);
    CREATE INDEX IF NOT EXISTS idx_contact_groups_contact ON contact_groups(contact_id);
    CREATE INDEX IF NOT EXISTS idx_contact_groups_group ON contact_groups(group_id);
    CREATE INDEX IF NOT EXISTS idx_event_groups_event ON event_groups(event_id);
    CREATE INDEX IF NOT EXISTS idx_event_contacts_event ON event_contacts(event_id);
  `);

  console.log('Database schema initialized');
}

// Initialize on module load
initializeSchema();

module.exports = db;
