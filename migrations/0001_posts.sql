-- Migration 0001: create posts table
CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  author TEXT,
  description TEXT,
  photos TEXT NOT NULL,
  videos TEXT
);
CREATE INDEX IF NOT EXISTS idx_posts_date ON posts(date DESC);
