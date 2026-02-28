import Database from 'better-sqlite3'
import { v4 as uuidv4 } from 'uuid'
import type {
  RegulatoryDocument,
  RegulatoryChange,
  ChangeFilters,
  Severity,
  ReviewStatus,
  DashboardStats,
  ProductKey,
} from './types'

let db: Database.Database | null = null

export function getDb(): Database.Database {
  if (db) return db

  db = new Database('./db/regscope.db')
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  // Inline DDL — mirrors db/schema.sql
  db.exec(`
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
      affected_products TEXT NOT NULL DEFAULT '[]',
      recommended_actions TEXT NOT NULL DEFAULT '[]',
      key_quotes TEXT NOT NULL DEFAULT '[]',
      confidence_score REAL,
      review_status TEXT NOT NULL DEFAULT 'new'
        CHECK(review_status IN ('new', 'reviewed', 'action_planned', 'escalated', 'resolved')),
      reviewed_by TEXT,
      review_notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `)

  return db
}

// ---------------------------------------------------------------------------
// Row deserialization
// ---------------------------------------------------------------------------

type RawChangeRow = Omit<RegulatoryChange, 'affected_products' | 'recommended_actions' | 'key_quotes'> & {
  affected_products: string
  recommended_actions: string
  key_quotes: string
}

function deserializeChange(row: RawChangeRow): RegulatoryChange {
  return {
    ...row,
    affected_products: JSON.parse(row.affected_products) as ProductKey[],
    recommended_actions: JSON.parse(row.recommended_actions) as string[],
    key_quotes: JSON.parse(row.key_quotes) as string[],
  }
}

// ---------------------------------------------------------------------------
// Document helpers
// ---------------------------------------------------------------------------

export function getDocument(id: string): RegulatoryDocument | undefined {
  const db = getDb()
  return db
    .prepare('SELECT * FROM regulatory_documents WHERE id = ?')
    .get(id) as RegulatoryDocument | undefined
}

export function getAllDocuments(): RegulatoryDocument[] {
  const db = getDb()
  return db
    .prepare('SELECT * FROM regulatory_documents ORDER BY ingested_at DESC')
    .all() as RegulatoryDocument[]
}

export function insertDocument(
  doc: Omit<RegulatoryDocument, 'id' | 'ingested_at' | 'processing_status'>
): string {
  const db = getDb()
  const id = uuidv4()
  const ingested_at = new Date().toISOString()

  db.prepare(`
    INSERT INTO regulatory_documents (id, title, source_agency, source_url, publish_date, raw_text, ingested_at, processing_status)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
  `).run(id, doc.title, doc.source_agency, doc.source_url ?? null, doc.publish_date ?? null, doc.raw_text, ingested_at)

  return id
}

export function updateDocumentStatus(
  id: string,
  status: RegulatoryDocument['processing_status']
): void {
  const db = getDb()
  db.prepare('UPDATE regulatory_documents SET processing_status = ? WHERE id = ?').run(status, id)
}

// ---------------------------------------------------------------------------
// Change helpers
// ---------------------------------------------------------------------------

export function getChange(id: string): RegulatoryChange | undefined {
  const db = getDb()
  const row = db
    .prepare('SELECT * FROM regulatory_changes WHERE id = ?')
    .get(id) as RawChangeRow | undefined

  return row ? deserializeChange(row) : undefined
}

export function getChanges(filters?: ChangeFilters): RegulatoryChange[] {
  const db = getDb()

  const conditions: string[] = []
  const params: (string | number)[] = []

  if (filters?.severity?.length) {
    const placeholders = filters.severity.map(() => '?').join(', ')
    conditions.push(`rc.severity IN (${placeholders})`)
    params.push(...filters.severity)
  }

  if (filters?.status?.length) {
    const placeholders = filters.status.map(() => '?').join(', ')
    conditions.push(`rc.review_status IN (${placeholders})`)
    params.push(...filters.status)
  }

  if (filters?.source_agency) {
    conditions.push('rd.source_agency = ?')
    params.push(filters.source_agency)
  }

  if (filters?.product) {
    // Use JSON LIKE match for simplicity — works for well-formed ProductKey strings
    conditions.push(`rc.affected_products LIKE ?`)
    params.push(`%"${filters.product}"%`)
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  const query = `
    SELECT rc.*
    FROM regulatory_changes rc
    JOIN regulatory_documents rd ON rc.document_id = rd.id
    ${where}
    ORDER BY rc.created_at DESC
  `

  const rows = db.prepare(query).all(...params) as RawChangeRow[]
  return rows.map(deserializeChange)
}

export function insertChange(
  change: Omit<RegulatoryChange, 'id' | 'created_at' | 'updated_at' | 'review_status' | 'reviewed_by' | 'review_notes'>
): string {
  const db = getDb()
  const id = uuidv4()
  const now = new Date().toISOString()

  db.prepare(`
    INSERT INTO regulatory_changes (
      id, document_id, change_summary, effective_date, severity, severity_rationale,
      affected_products, recommended_actions, key_quotes, confidence_score,
      review_status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', ?, ?)
  `).run(
    id,
    change.document_id,
    change.change_summary,
    change.effective_date ?? null,
    change.severity,
    change.severity_rationale ?? null,
    JSON.stringify(change.affected_products),
    JSON.stringify(change.recommended_actions),
    JSON.stringify(change.key_quotes),
    change.confidence_score ?? null,
    now,
    now,
  )

  return id
}

export function updateChangeReview(
  id: string,
  status: ReviewStatus,
  reviewedBy?: string,
  notes?: string
): void {
  const db = getDb()
  const now = new Date().toISOString()

  db.prepare(`
    UPDATE regulatory_changes
    SET review_status = ?, reviewed_by = ?, review_notes = ?, updated_at = ?
    WHERE id = ?
  `).run(status, reviewedBy ?? null, notes ?? null, now, id)
}

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

export function getStats(): DashboardStats {
  const db = getDb()

  const totalDocs = (
    db.prepare('SELECT COUNT(*) as count FROM regulatory_documents').get() as { count: number }
  ).count

  const totalChanges = (
    db.prepare('SELECT COUNT(*) as count FROM regulatory_changes').get() as { count: number }
  ).count

  const severityRows = db
    .prepare('SELECT severity, COUNT(*) as count FROM regulatory_changes GROUP BY severity')
    .all() as { severity: Severity; count: number }[]

  const statusRows = db
    .prepare('SELECT review_status, COUNT(*) as count FROM regulatory_changes GROUP BY review_status')
    .all() as { review_status: ReviewStatus; count: number }[]

  const by_severity: Record<Severity, number> = { low: 0, medium: 0, high: 0, critical: 0 }
  for (const row of severityRows) {
    by_severity[row.severity] = row.count
  }

  const by_status: Record<ReviewStatus, number> = {
    new: 0,
    reviewed: 0,
    action_planned: 0,
    escalated: 0,
    resolved: 0,
  }
  for (const row of statusRows) {
    by_status[row.review_status] = row.count
  }

  return {
    total_documents: totalDocs,
    total_changes: totalChanges,
    by_severity,
    by_status,
  }
}
