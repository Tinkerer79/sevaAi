import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import { config } from './config.js';

fs.mkdirSync(config.dirs.data, { recursive: true });
fs.mkdirSync(config.dirs.uploads, { recursive: true });

export const db = new DatabaseSync(config.dirs.data + 'sevamanipur.db');
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'citizen',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS departments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  short_name TEXT
);
CREATE TABLE IF NOT EXISTS services (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  department_id INTEGER REFERENCES departments(id),
  description TEXT NOT NULL,
  eligibility TEXT NOT NULL,
  documents TEXT NOT NULL,        -- JSON array of {item, note}
  steps TEXT NOT NULL,            -- JSON array of strings
  official_link TEXT,
  keywords TEXT NOT NULL,         -- JSON array
  is_demo INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS schemes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  department_id INTEGER REFERENCES departments(id),
  benefits TEXT NOT NULL,
  eligibility TEXT NOT NULL,
  documents TEXT NOT NULL,        -- JSON array
  process TEXT NOT NULL,
  official_link TEXT,
  min_age INTEGER, max_age INTEGER,
  occupations TEXT NOT NULL,      -- JSON array: student|farmer|business|salaried|unemployed|homemaker|daily_wage|street_vendor|any
  area TEXT NOT NULL DEFAULT 'any',   -- rural|urban|any
  max_income INTEGER,             -- NULL = no income cap
  keywords TEXT NOT NULL,
  is_demo INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS contacts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  department TEXT NOT NULL,
  service TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  website TEXT,
  office TEXT NOT NULL,
  district TEXT NOT NULL,
  is_demo INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS complaints (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  complaint_id TEXT NOT NULL UNIQUE,
  user_id INTEGER REFERENCES users(id),
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  location TEXT NOT NULL,
  district TEXT NOT NULL,
  photo TEXT,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Submitted',
  priority TEXT NOT NULL DEFAULT 'Medium',
  department_id INTEGER REFERENCES departments(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS complaint_updates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  complaint_id INTEGER NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  note TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS conversations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL,             -- user | model
  content TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS saved_services (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, service_id)
);
CREATE TABLE IF NOT EXISTS saved_schemes (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scheme_id INTEGER NOT NULL REFERENCES schemes(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, scheme_id)
);
`);

export const q = {
  all: (sql, ...p) => db.prepare(sql).all(...p),
  get: (sql, ...p) => db.prepare(sql).get(...p),
  run: (sql, ...p) => db.prepare(sql).run(...p),
};
