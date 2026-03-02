import Database from "better-sqlite3";
import { mkdirSync } from "fs";
import { dirname } from "path";
import { v4 as uuidv4 } from "uuid";
import type {
  RegulatoryDocument,
  RegulatoryFinding,
  FindingFilters,
  Severity,
  DashboardStats,
  ProductKey,
  FeedSource,
  FeedSourceCategory,
  FeedItem,
  SourceAgency,
} from "./types";

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;

  const dbPath = process.env.DATABASE_PATH ?? "./db/regscope.db";
  mkdirSync(dirname(dbPath), { recursive: true });
  db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  // Inline DDL — mirrors db/schema.sql
  db.exec(`
    CREATE TABLE IF NOT EXISTS regulatory_documents (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      source_agency TEXT NOT NULL,
      source_url TEXT,
      publish_date TEXT,
      raw_text TEXT NOT NULL,
      content_type TEXT NOT NULL DEFAULT 'text'
        CHECK(content_type IN ('text', 'pdf')),
      ingested_at TEXT NOT NULL DEFAULT (datetime('now')),
      processing_status TEXT NOT NULL DEFAULT 'pending'
        CHECK(processing_status IN ('pending', 'processed', 'failed'))
    );

    CREATE TABLE IF NOT EXISTS regulatory_findings (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL REFERENCES regulatory_documents(id),
      finding_summary TEXT NOT NULL,
      effective_date TEXT,
      severity TEXT NOT NULL CHECK(severity IN ('low', 'medium', 'high', 'critical')),
      severity_rationale TEXT,
      affected_products TEXT NOT NULL DEFAULT '[]',
      recommended_actions TEXT NOT NULL DEFAULT '[]',
      key_quotes TEXT NOT NULL DEFAULT '[]',
      confidence_score REAL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS feed_sources (
      id             TEXT PRIMARY KEY,
      label          TEXT NOT NULL,
      url            TEXT NOT NULL UNIQUE,
      source_agency  TEXT NOT NULL,
      category       TEXT NOT NULL DEFAULT 'news'
                     CHECK(category IN ('news', 'publications', 'orders')),
      last_checked_at TEXT,
      created_at     TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS feed_items (
      id           TEXT PRIMARY KEY,
      source_id    TEXT NOT NULL REFERENCES feed_sources(id) ON DELETE CASCADE,
      item_url     TEXT NOT NULL UNIQUE,
      title        TEXT,
      detected_at  TEXT NOT NULL DEFAULT (datetime('now')),
      published_at TEXT,
      status       TEXT NOT NULL DEFAULT 'new'
                   CHECK(status IN ('new', 'dismissed', 'ingested')),
      document_id  TEXT REFERENCES regulatory_documents(id)
    );
  `);

  // Cleanup stale seed URLs from Day 4 + updated CRA URL
  const staleUrls = [
    'https://www.ciro.ca/news-and-publications',
    'https://www.osc.ca/en/news-events',
    'https://fintrac-canafe.gc.ca/new-neuf/1-eng',
    'https://www.osfi-bsif.gc.ca/en/news-events',
    'https://www.canada.ca/en/financial-consumer-agency/news.html',
    'https://www.payments.ca/news',
    'https://www.canada.ca/en/revenue-agency/news/newsroom.html',
  ]
  db.prepare(`DELETE FROM feed_sources WHERE url IN (${staleUrls.map(() => '?').join(',')})`).run(...staleUrls)

  // Seed agency publication sources (idempotent — UNIQUE constraint on url)
  const seedSources: { label: string; agency: string; url: string; category: FeedSourceCategory }[] = [
    { label: 'CRA Newsroom',             agency: 'CRA',             category: 'news',         url: 'https://www.canada.ca/en/news/advanced-news-search/news-results.html?typ=newsreleases&dprtmnt=revenueagency' },
    { label: 'CIRO News Releases',       agency: 'CIRO',            category: 'news',         url: 'https://www.ciro.ca/newsroom/news-releases' },
    { label: 'CIRO Publications',        agency: 'CIRO',            category: 'publications', url: 'https://www.ciro.ca/newsroom/publications' },
    { label: 'OSC Orders & Decisions',   agency: 'OSC',             category: 'orders',       url: 'https://www.osc.ca/en/securities-law/orders-rulings-decisions' },
    { label: 'CSA News',                 agency: 'CSA',             category: 'news',         url: 'https://www.securities-administrators.ca/news/' },
    { label: 'FINTRAC Orders',           agency: 'FINTRAC',         category: 'orders',       url: 'https://fintrac-canafe.canada.ca/pen/4-eng' },
    { label: 'OSFI News',                agency: 'OSFI',            category: 'news',         url: 'https://www.osfi-bsif.gc.ca/en/news' },
    { label: 'FCAC News',                agency: 'FCAC',            category: 'news',         url: 'https://www.canada.ca/en/news/advanced-news-search/news-results.html' },
    { label: 'Dept of Finance News',     agency: 'Dept-of-Finance', category: 'news',         url: 'https://www.canada.ca/en/department-finance/news.html' },
    { label: 'Payments Canada Newsroom', agency: 'Payments-Canada', category: 'news',         url: 'https://www.payments.ca/insights/newsroom' },
  ]
  const seedStmt = db.prepare(
    'INSERT OR IGNORE INTO feed_sources (id, label, url, source_agency, category, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  )
  for (const s of seedSources) {
    seedStmt.run(uuidv4(), s.label, s.url, s.agency, s.category, new Date().toISOString())
  }

  return db;
}

// ---------------------------------------------------------------------------
// Row deserialization
// ---------------------------------------------------------------------------

type RawFindingRow = Omit<
  RegulatoryFinding,
  "affected_products" | "recommended_actions" | "key_quotes"
> & {
  affected_products: string;
  recommended_actions: string;
  key_quotes: string;
};

function deserializeFinding(row: RawFindingRow): RegulatoryFinding {
  return {
    ...row,
    affected_products: JSON.parse(row.affected_products) as ProductKey[],
    recommended_actions: JSON.parse(row.recommended_actions) as string[],
    key_quotes: JSON.parse(row.key_quotes) as string[],
  };
}

// ---------------------------------------------------------------------------
// Document helpers
// ---------------------------------------------------------------------------

export function getDocument(id: string): RegulatoryDocument | undefined {
  const db = getDb();
  return db
    .prepare("SELECT * FROM regulatory_documents WHERE id = ?")
    .get(id) as RegulatoryDocument | undefined;
}

export function getAllDocuments(): RegulatoryDocument[] {
  const db = getDb();
  return db
    .prepare("SELECT * FROM regulatory_documents ORDER BY ingested_at DESC")
    .all() as RegulatoryDocument[];
}

export function insertDocument(
  doc: Omit<RegulatoryDocument, "id" | "ingested_at" | "processing_status">,
): string {
  const db = getDb();
  const id = uuidv4();
  const ingested_at = new Date().toISOString();

  db.prepare(
    `
    INSERT INTO regulatory_documents (id, title, source_agency, source_url, publish_date, raw_text, content_type, ingested_at, processing_status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')
  `,
  ).run(
    id,
    doc.title,
    doc.source_agency,
    doc.source_url ?? null,
    doc.publish_date ?? null,
    doc.raw_text,
    doc.content_type ?? 'text',
    ingested_at,
  );

  return id;
}

export function updateDocumentStatus(
  id: string,
  status: RegulatoryDocument["processing_status"],
): void {
  const db = getDb();
  db.prepare(
    "UPDATE regulatory_documents SET processing_status = ? WHERE id = ?",
  ).run(status, id);
}

// ---------------------------------------------------------------------------
// Change helpers
// ---------------------------------------------------------------------------

export function getFinding(id: string): RegulatoryFinding | undefined {
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM regulatory_findings WHERE id = ?")
    .get(id) as RawFindingRow | undefined;

  return row ? deserializeFinding(row) : undefined;
}

export function getFindings(filters?: FindingFilters): RegulatoryFinding[] {
  const db = getDb();

  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (filters?.severity?.length) {
    const placeholders = filters.severity.map(() => "?").join(", ");
    conditions.push(`rf.severity IN (${placeholders})`);
    params.push(...filters.severity);
  }

  if (filters?.source_agency) {
    conditions.push("rd.source_agency = ?");
    params.push(filters.source_agency);
  }

  if (filters?.product) {
    // Use JSON LIKE match for simplicity — works for well-formed ProductKey strings
    conditions.push(`rf.affected_products LIKE ?`);
    params.push(`%"${filters.product}"%`);
  }

  const where =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const query = `
    SELECT rf.*
    FROM regulatory_findings rf
    JOIN regulatory_documents rd ON rf.document_id = rd.id
    ${where}
    ORDER BY rf.created_at DESC
  `;

  const rows = db.prepare(query).all(...params) as RawFindingRow[];
  return rows.map(deserializeFinding);
}

export function insertFinding(
  finding: Omit<RegulatoryFinding, "id" | "created_at" | "updated_at">,
): string {
  const db = getDb();
  const id = uuidv4();
  const now = new Date().toISOString();

  db.prepare(
    `
    INSERT INTO regulatory_findings (
      id, document_id, finding_summary, effective_date, severity, severity_rationale,
      affected_products, recommended_actions, key_quotes, confidence_score,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,
  ).run(
    id,
    finding.document_id,
    finding.finding_summary,
    finding.effective_date ?? null,
    finding.severity,
    finding.severity_rationale ?? null,
    JSON.stringify(finding.affected_products),
    JSON.stringify(finding.recommended_actions),
    JSON.stringify(finding.key_quotes),
    finding.confidence_score ?? null,
    now,
    now,
  );

  return id;
}

// ---------------------------------------------------------------------------
// Feed source helpers
// ---------------------------------------------------------------------------

export function getFeedSources(): FeedSource[] {
  const db = getDb()
  return db
    .prepare('SELECT * FROM feed_sources ORDER BY created_at ASC')
    .all() as FeedSource[]
}

export function getFeedSource(id: string): FeedSource | undefined {
  const db = getDb()
  return db
    .prepare('SELECT * FROM feed_sources WHERE id = ?')
    .get(id) as FeedSource | undefined
}

export function insertFeedSource(s: {
  label: string
  url: string
  source_agency: SourceAgency
  category: FeedSourceCategory
}): string {
  const db = getDb()
  const id = uuidv4()
  db.prepare(
    'INSERT INTO feed_sources (id, label, url, source_agency, category, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, s.label, s.url, s.source_agency, s.category, new Date().toISOString())
  return id
}

export function deleteFeedSource(id: string): void {
  const db = getDb()
  db.prepare('DELETE FROM feed_sources WHERE id = ?').run(id)
}

export function updateFeedSourceCheckedAt(id: string, checkedAt: string): void {
  const db = getDb()
  db.prepare('UPDATE feed_sources SET last_checked_at = ? WHERE id = ?').run(checkedAt, id)
}

// ---------------------------------------------------------------------------
// Feed item helpers
// ---------------------------------------------------------------------------

export function getFeedItems(status?: FeedItem['status']): FeedItem[] {
  const db = getDb()
  if (status) {
    return db
      .prepare('SELECT * FROM feed_items WHERE status = ? ORDER BY detected_at DESC')
      .all(status) as FeedItem[]
  }
  return db
    .prepare('SELECT * FROM feed_items ORDER BY detected_at DESC')
    .all() as FeedItem[]
}

export function getFeedItem(id: string): FeedItem | undefined {
  const db = getDb()
  return db
    .prepare('SELECT * FROM feed_items WHERE id = ?')
    .get(id) as FeedItem | undefined
}

export function upsertFeedItem(item: {
  source_id: string
  item_url: string
  title?: string
  published_at?: string
}): void {
  const db = getDb()
  const id = uuidv4()
  db.prepare(
    'INSERT OR IGNORE INTO feed_items (id, source_id, item_url, title, detected_at, published_at, status) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(id, item.source_id, item.item_url, item.title ?? null, new Date().toISOString(), item.published_at ?? null, 'new')
}

export function updateFeedItemStatus(
  id: string,
  status: FeedItem['status'],
  document_id?: string
): void {
  const db = getDb()
  db.prepare(
    'UPDATE feed_items SET status = ?, document_id = ? WHERE id = ?'
  ).run(status, document_id ?? null, id)
}

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

export function getStats(): DashboardStats {
  const db = getDb();

  const totalDocs = (
    db.prepare("SELECT COUNT(*) as count FROM regulatory_documents").get() as {
      count: number;
    }
  ).count;

  const totalFindings = (
    db.prepare("SELECT COUNT(*) as count FROM regulatory_findings").get() as {
      count: number;
    }
  ).count;

  const severityRows = db
    .prepare(
      "SELECT severity, COUNT(*) as count FROM regulatory_findings GROUP BY severity",
    )
    .all() as { severity: Severity; count: number }[];

  const by_severity: Record<Severity, number> = {
    low: 0,
    medium: 0,
    high: 0,
    critical: 0,
  };
  for (const row of severityRows) {
    by_severity[row.severity] = row.count;
  }

  return {
    total_documents: totalDocs,
    total_findings: totalFindings,
    by_severity,
  };
}
