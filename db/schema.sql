CREATE TABLE IF NOT EXISTS regulatory_documents (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  source_agency TEXT NOT NULL,
  source_url TEXT,
  publish_date TEXT,
  raw_text TEXT NOT NULL,
  ingested_at TEXT NOT NULL DEFAULT (datetime('now')),
  processing_status TEXT NOT NULL DEFAULT 'pending'
    CHECK(processing_status IN ('pending', 'processed', 'failed'))
);

CREATE TABLE IF NOT EXISTS regulatory_changes (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES regulatory_documents(id),
  change_summary TEXT NOT NULL,
  effective_date TEXT,
  severity TEXT NOT NULL CHECK(severity IN ('low', 'medium', 'high', 'critical')),
  severity_rationale TEXT,
  affected_products TEXT NOT NULL DEFAULT '[]',   -- JSON array of ProductKey
  recommended_actions TEXT NOT NULL DEFAULT '[]', -- JSON array of strings
  key_quotes TEXT NOT NULL DEFAULT '[]',          -- JSON array of strings
  confidence_score REAL,
  review_status TEXT NOT NULL DEFAULT 'new'
    CHECK(review_status IN ('new', 'reviewed', 'action_planned', 'escalated', 'resolved')),
  reviewed_by TEXT,
  review_notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
