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
  FeedSourceType,
  FeedItem,
  SourceRegulator,
} from "./types";

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;

  const dbPath = process.env.DATABASE_PATH ?? "./db/margin.db";
  mkdirSync(dirname(dbPath), { recursive: true });
  db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  // Inline DDL — mirrors db/schema.sql
  db.exec(`
    CREATE TABLE IF NOT EXISTS regulatory_documents (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      source_regulator TEXT NOT NULL,
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
      source_regulator  TEXT NOT NULL,
      category       TEXT NOT NULL DEFAULT 'news'
                     CHECK(category IN ('news', 'publications', 'orders')),
      feed_type      TEXT NOT NULL DEFAULT 'html'
                     CHECK(feed_type IN ('html', 'rss')),
      disabled       INTEGER NOT NULL DEFAULT 0,
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

  // Cleanup stale seed URLs
  const staleUrls = [
    "https://www.ciro.ca/news-and-publications",
    "https://www.osc.ca/en/news-events",
    "https://fintrac-canafe.gc.ca/new-neuf/1-eng",
    "https://www.osfi-bsif.gc.ca/en/news-events",
    "https://www.canada.ca/en/financial-consumer-regulator/news.html",
    "https://www.payments.ca/news",
    "https://www.canada.ca/en/revenue-regulator/news/newsroom.html",
    "https://www.canada.ca/en/news/advanced-news-search/news-results.html?typ=newsreleases&dprtmnt=revenueregulator",
  ];
  db.prepare(
    `DELETE FROM feed_sources WHERE url IN (${staleUrls.map(() => "?").join(",")})`,
  ).run(...staleUrls);

  // Seed regulator publication sources (idempotent — UNIQUE constraint on url)
  const seedSources: {
    label: string;
    regulator: string;
    url: string;
    category: FeedSourceCategory;
    feed_type: FeedSourceType;
    disabled: number;
  }[] = [
    {
      label: "CRA Newsroom",
      regulator: "CRA",
      category: "news",
      feed_type: "rss",
      disabled: 1,
      url: "https://www.canada.ca/content/dam/cra-arc/migration/cra-arc/esrvc-srvce/rss/mdrm-eng.xml",
    },
    {
      label: "CIRO News Releases",
      regulator: "CIRO",
      category: "news",
      feed_type: "html",
      disabled: 1,
      url: "https://www.ciro.ca/newsroom/news-releases",
    },
    {
      label: "CIRO Publications",
      regulator: "CIRO",
      category: "publications",
      feed_type: "html",
      disabled: 0,
      url: "https://www.ciro.ca/newsroom/publications",
    },
    {
      label: "OSC Orders & Decisions",
      regulator: "OSC",
      category: "orders",
      feed_type: "html",
      disabled: 0,
      url: "https://www.osc.ca/en/securities-law/orders-rulings-decisions",
    },
    {
      label: "CSA News",
      regulator: "CSA",
      category: "news",
      feed_type: "html",
      disabled: 0,
      url: "https://www.securities-administrators.ca/news/",
    },
    {
      label: "FINTRAC Orders",
      regulator: "FINTRAC",
      category: "orders",
      feed_type: "html",
      disabled: 0,
      url: "https://fintrac-canafe.canada.ca/pen/4-eng",
    },
    {
      label: "OSFI News",
      regulator: "OSFI",
      category: "news",
      feed_type: "html",
      disabled: 0,
      url: "https://www.osfi-bsif.gc.ca/en/news",
    },
    {
      label: "FCAC News",
      regulator: "FCAC",
      category: "news",
      feed_type: "html",
      disabled: 1,
      url: "https://www.canada.ca/en/news/advanced-news-search/news-results.html",
    },
    {
      label: "Dept of Finance News",
      regulator: "Dept-of-Finance",
      category: "news",
      feed_type: "html",
      disabled: 1,
      url: "https://www.canada.ca/en/department-finance/news.html",
    },
    {
      label: "Payments Canada Newsroom",
      regulator: "Payments-Canada",
      category: "news",
      feed_type: "html",
      disabled: 0,
      url: "https://www.payments.ca/insights/newsroom",
    },
  ];
  const seedStmt = db.prepare(
    "INSERT OR IGNORE INTO feed_sources (id, label, url, source_regulator, category, feed_type, disabled, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
  );
  for (const s of seedSources) {
    seedStmt.run(
      uuidv4(),
      s.label,
      s.url,
      s.regulator,
      s.category,
      s.feed_type,
      s.disabled,
      new Date().toISOString(),
    );
  }

  // ---------------------------------------------------------------------------
  // Seed demo documents + findings (hardcoded — no Claude API calls)
  // Idempotent: skips documents that already exist by title + source_regulator
  // ---------------------------------------------------------------------------
  const demoData: Array<{
    doc: {
      title: string;
      source_regulator: string;
      source_url: string;
      publish_date: string;
    };
    findings: Array<{
      finding_summary: string;
      effective_date: string | null;
      severity: string;
      severity_rationale: string;
      affected_products: string[];
      recommended_actions: string[];
      key_quotes: string[];
      confidence_score: number;
    }>;
  }> = [
    {
      doc: {
        title: "CIRO Margin Rule Amendment — High-Volatility Securities (MR-0125)",
        source_regulator: "CIRO",
        source_url: "https://www.ciro.ca/newsroom/publications",
        publish_date: "2025-01-15",
      },
      findings: [
        {
          finding_summary:
            "CIRO is raising the minimum margin rate for high-volatility equity securities (average daily price movement >5%) from 30% to 50%, effective April 1, 2025. Applies to both client and firm accounts.",
          effective_date: "2025-04-01",
          severity: "high",
          severity_rationale:
            "Direct operational impact: margin calculation engine must be updated and affected clients notified before the April deadline.",
          affected_products: ["TRADING"],
          recommended_actions: [
            "Update margin calculation engine to apply the 50% rate for qualifying Tier 1 high-volatility securities",
            "Identify all client accounts currently using sub-50% margin on affected securities",
            "Issue client communications no later than 30 days before effective date",
            "Update risk disclosures and margin agreement documentation",
          ],
          key_quotes: [
            "The minimum margin rate for Tier 1 high-volatility securities shall be increased to fifty percent (50%) effective April 1, 2025.",
            "Dealer Members must notify affected clients of any changes to their margin requirements no later than thirty (30) days prior to the effective date.",
          ],
          confidence_score: 0.94,
        },
      ],
    },
    {
      doc: {
        title: "CRA — 2025 TFSA Dollar Limit Announcement",
        source_regulator: "CRA",
        source_url: "https://www.canada.ca/content/dam/cra-arc/migration/cra-arc/esrvc-srvce/rss/mdrm-eng.xml",
        publish_date: "2024-11-18",
      },
      findings: [
        {
          finding_summary:
            "The CRA has confirmed the 2025 TFSA annual contribution limit is $7,000, unchanged from 2024. Cumulative lifetime room for eligible individuals who have never contributed and were 18 in 2009 is now $102,000.",
          effective_date: "2025-01-01",
          severity: "low",
          severity_rationale:
            "Limit is unchanged year-over-year; no system changes required beyond updating displayed contribution room values.",
          affected_products: ["TFSA"],
          recommended_actions: [
            "Update contribution room calculations and UI to reflect the $7,000 2025 annual limit",
            "Update cumulative lifetime room display to $102,000 for eligible clients",
            "Ensure in-app TFSA limit disclosure copy reflects the 2025 figure",
          ],
          key_quotes: [
            "The TFSA dollar limit for 2025 is $7,000.",
            "The cumulative TFSA room available in 2025 for an individual who has never contributed and has been eligible since inception is $102,000.",
          ],
          confidence_score: 0.99,
        },
      ],
    },
    {
      doc: {
        title: "FINTRAC — Updated Monetary Thresholds for Large Cash Transaction Reports (LCTR)",
        source_regulator: "FINTRAC",
        source_url: "https://fintrac-canafe.canada.ca/pen/4-eng",
        publish_date: "2025-02-03",
      },
      findings: [
        {
          finding_summary:
            "FINTRAC is clarifying that the $10,000 CAD threshold for Large Cash Transaction Reports applies to the aggregate of cash received in a single transaction or multiple transactions conducted by the same client within a 24-hour window, including crypto-to-fiat conversions at MSBs.",
          effective_date: "2025-03-01",
          severity: "critical",
          severity_rationale:
            "Expanded scope explicitly captures crypto-to-fiat conversions; failure to report is a federal offence with penalties up to $2M per violation.",
          affected_products: ["AML_KYC", "CRYPTO", "CHEQUING"],
          recommended_actions: [
            "Confirm transaction monitoring system aggregates cash-equivalent crypto-to-fiat conversions within 24-hour windows per client",
            "Update LCTR filing procedures to include crypto-to-fiat transactions above threshold",
            "Train compliance team on updated scope of 'cash' as defined in this guidance",
            "Review current LCTR filing rate against historical crypto withdrawal volume to assess gap",
          ],
          key_quotes: [
            "For the purposes of the Large Cash Transaction Report, 'cash' includes the proceeds of the conversion of virtual currency to fiat currency.",
            "Reporting entities must aggregate all cash amounts received from or on behalf of the same person or entity within a consecutive 24-hour period.",
          ],
          confidence_score: 0.91,
        },
      ],
    },
    {
      doc: {
        title: "OSC — Staff Notice 21-329: Crypto Asset Trading Platforms — Compliance Expectations",
        source_regulator: "OSC",
        source_url: "https://www.osc.ca/en/securities-law/orders-rulings-decisions",
        publish_date: "2025-01-28",
      },
      findings: [
        {
          finding_summary:
            "OSC Staff Notice 21-329 sets out compliance expectations for registered crypto asset trading platforms (CTPs), including enhanced KYC for accounts exceeding $30,000 CAD in annual volume, mandatory cold-storage requirements for ≥80% of client assets, and quarterly attestation filings.",
          effective_date: "2025-07-01",
          severity: "high",
          severity_rationale:
            "Multiple simultaneous requirements: KYC tier changes, custody architecture review, and new regulatory filing obligations all due by July 1.",
          affected_products: ["CRYPTO", "AML_KYC"],
          recommended_actions: [
            "Introduce enhanced KYC tier for accounts with projected annual volume >$30,000 CAD",
            "Audit current cold-storage ratio; implement controls to maintain ≥80% of client assets in cold storage",
            "Build quarterly attestation report and establish internal sign-off process",
            "Engage external auditor to verify cold-storage controls before July 1 deadline",
          ],
          key_quotes: [
            "CTPs are expected to apply enhanced KYC measures to clients whose annual trading volume on the platform exceeds $30,000 CAD.",
            "At least 80 percent of client crypto assets must be held in cold storage at all times.",
            "CTPs must file quarterly attestations confirming compliance with custody requirements commencing July 1, 2025.",
          ],
          confidence_score: 0.89,
        },
        {
          finding_summary:
            "The OSC requires CTPs to publish a daily proof-of-reserves report signed by a qualified auditor, confirming that client liabilities do not exceed custodied assets.",
          effective_date: "2025-07-01",
          severity: "medium",
          severity_rationale:
            "New disclosure obligation requiring auditor engagement and daily automated reporting pipeline.",
          affected_products: ["CRYPTO"],
          recommended_actions: [
            "Engage qualified auditor to design and deliver daily proof-of-reserves methodology",
            "Build automated daily reporting pipeline for public proof-of-reserves publication",
            "Publish proof-of-reserves methodology on company website before July 1",
          ],
          key_quotes: [
            "CTPs must publish a daily proof-of-reserves report, prepared and signed by a qualified auditor, demonstrating that custodied assets equal or exceed client liabilities.",
          ],
          confidence_score: 0.86,
        },
      ],
    },
    {
      doc: {
        title: "OSFI — Draft Guideline B-20 Amendment: Stress Testing Requirements for Federally Regulated Lenders",
        source_regulator: "OSFI",
        source_url: "https://www.osfi-bsif.gc.ca/en/news",
        publish_date: "2025-02-10",
      },
      findings: [
        {
          finding_summary:
            "OSFI is proposing to raise the minimum qualifying rate (MQR) for uninsured mortgages from the greater of the contract rate +2% or 5.25%, to the greater of the contract rate +3% or 6.00%. Public comment period closes April 15, 2025.",
          effective_date: null,
          severity: "medium",
          severity_rationale:
            "Proposal stage — no immediate action required, but product eligibility modelling and client communication strategy should begin now to prepare for potential implementation.",
          affected_products: ["CHEQUING", "CREDIT_CARD"],
          recommended_actions: [
            "Model impact of +3%/6.00% MQR on current mortgage applicant approval rates",
            "Prepare client-facing FAQ explaining potential qualification changes",
            "Submit formal comment to OSFI before April 15, 2025 consultation deadline",
            "Monitor OSFI announcement channel for final guideline publication date",
          ],
          key_quotes: [
            "OSFI is proposing to amend Guideline B-20 to increase the minimum qualifying rate for uninsured mortgages to the greater of the contract rate plus 300 basis points or 6.00 percent.",
            "Interested parties are invited to submit written comments by April 15, 2025.",
          ],
          confidence_score: 0.88,
        },
      ],
    },
  ];

  const insertDocStmt = db.prepare(`
    INSERT INTO regulatory_documents
      (id, title, source_regulator, source_url, publish_date, raw_text, content_type, ingested_at, processing_status)
    VALUES (?, ?, ?, ?, ?, ?, 'text', datetime('now'), 'processed')
  `);
  const insertFindingStmt = db.prepare(`
    INSERT INTO regulatory_findings
      (id, document_id, finding_summary, effective_date, severity, severity_rationale,
       affected_products, recommended_actions, key_quotes, confidence_score, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `);

  for (const { doc, findings } of demoData) {
    const existing = db
      .prepare(
        "SELECT id FROM regulatory_documents WHERE title = ? AND source_regulator = ?",
      )
      .get(doc.title, doc.source_regulator) as { id: string } | undefined;

    const docId = existing?.id ?? uuidv4();
    if (!existing) {
      insertDocStmt.run(
        docId,
        doc.title,
        doc.source_regulator,
        doc.source_url,
        doc.publish_date,
        `[Demo document — ${doc.title}]`,
      );
    }

    const hasFinding = db
      .prepare("SELECT 1 FROM regulatory_findings WHERE document_id = ? LIMIT 1")
      .get(docId);

    if (!hasFinding) {
      for (const f of findings) {
        insertFindingStmt.run(
          uuidv4(),
          docId,
          f.finding_summary,
          f.effective_date ?? null,
          f.severity,
          f.severity_rationale,
          JSON.stringify(f.affected_products),
          JSON.stringify(f.recommended_actions),
          JSON.stringify(f.key_quotes),
          f.confidence_score,
        );
      }
    }
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
    INSERT INTO regulatory_documents (id, title, source_regulator, source_url, publish_date, raw_text, content_type, ingested_at, processing_status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')
  `,
  ).run(
    id,
    doc.title,
    doc.source_regulator,
    doc.source_url ?? null,
    doc.publish_date ?? null,
    doc.raw_text,
    doc.content_type ?? "text",
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
    .prepare(
      `
      SELECT rf.*, rd.source_regulator
      FROM regulatory_findings rf
      JOIN regulatory_documents rd ON rf.document_id = rd.id
      WHERE rf.id = ?
    `,
    )
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

  if (filters?.source_regulator) {
    conditions.push("rd.source_regulator = ?");
    params.push(filters.source_regulator);
  }

  if (filters?.product) {
    // Use JSON LIKE match for simplicity — works for well-formed ProductKey strings
    conditions.push(`rf.affected_products LIKE ?`);
    params.push(`%"${filters.product}"%`);
  }

  const where =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const query = `
    SELECT rf.*, rd.source_regulator
    FROM regulatory_findings rf
    JOIN regulatory_documents rd ON rf.document_id = rd.id
    ${where}
    ORDER BY rf.created_at DESC
  `;

  const rows = db.prepare(query).all(...params) as RawFindingRow[];
  return rows.map(deserializeFinding);
}

export function insertFinding(
  finding: Omit<
    RegulatoryFinding,
    "id" | "created_at" | "updated_at" | "source_regulator"
  >,
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
  const db = getDb();
  return db
    .prepare("SELECT * FROM feed_sources ORDER BY created_at ASC")
    .all() as FeedSource[];
}

export function getFeedSource(id: string): FeedSource | undefined {
  const db = getDb();
  return db.prepare("SELECT * FROM feed_sources WHERE id = ?").get(id) as
    | FeedSource
    | undefined;
}

export function insertFeedSource(s: {
  label: string;
  url: string;
  source_regulator: SourceRegulator;
  category: FeedSourceCategory;
  feed_type?: FeedSourceType;
}): string {
  const db = getDb();
  const id = uuidv4();
  db.prepare(
    "INSERT INTO feed_sources (id, label, url, source_regulator, category, feed_type, disabled, created_at) VALUES (?, ?, ?, ?, ?, ?, 0, ?)",
  ).run(
    id,
    s.label,
    s.url,
    s.source_regulator,
    s.category,
    s.feed_type ?? "html",
    new Date().toISOString(),
  );
  return id;
}

export function deleteFeedSource(id: string): void {
  const db = getDb();
  db.prepare("DELETE FROM feed_sources WHERE id = ?").run(id);
}

export function updateFeedSourceCheckedAt(id: string, checkedAt: string): void {
  const db = getDb();
  db.prepare("UPDATE feed_sources SET last_checked_at = ? WHERE id = ?").run(
    checkedAt,
    id,
  );
}

// ---------------------------------------------------------------------------
// Feed item helpers
// ---------------------------------------------------------------------------

export function getFeedItems(status?: FeedItem["status"]): FeedItem[] {
  const db = getDb();
  if (status) {
    return db
      .prepare(
        "SELECT * FROM feed_items WHERE status = ? ORDER BY detected_at DESC",
      )
      .all(status) as FeedItem[];
  }
  return db
    .prepare("SELECT * FROM feed_items ORDER BY detected_at DESC")
    .all() as FeedItem[];
}

export function getFeedItem(id: string): FeedItem | undefined {
  const db = getDb();
  return db.prepare("SELECT * FROM feed_items WHERE id = ?").get(id) as
    | FeedItem
    | undefined;
}

export function upsertFeedItem(item: {
  source_id: string;
  item_url: string;
  title?: string;
  published_at?: string;
}): void {
  const db = getDb();
  const id = uuidv4();
  db.prepare(
    "INSERT OR IGNORE INTO feed_items (id, source_id, item_url, title, detected_at, published_at, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
  ).run(
    id,
    item.source_id,
    item.item_url,
    item.title ?? null,
    new Date().toISOString(),
    item.published_at ?? null,
    "new",
  );
}

export function updateFeedItemStatus(
  id: string,
  status: FeedItem["status"],
  document_id?: string,
): void {
  const db = getDb();
  db.prepare(
    "UPDATE feed_items SET status = ?, document_id = ? WHERE id = ?",
  ).run(status, document_id ?? null, id);
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
