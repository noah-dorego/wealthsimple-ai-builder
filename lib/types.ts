/** Regulatory source regulators */
export type SourceRegulator =
  | "CRA"
  | "CIRO"
  | "OSC"
  | "CSA"
  | "FINTRAC"
  | "OSFI"
  | "FCAC"
  | "Dept-of-Finance"
  | "Payments-Canada";

/** Severity level of a regulatory finding */
export type Severity = "low" | "medium" | "high" | "critical";

/** Category of regulatory finding */
export type FindingCategory =
  | "new_rule"
  | "amendment"
  | "guidance"
  | "enforcement"
  | "consultation"
  | "deadline"
  | "threshold_change";

/** Wealthsimple product keys */
export type ProductKey =
  | "RRSP"
  | "TFSA"
  | "FHSA"
  | "TRADING"
  | "CRYPTO"
  | "MANAGED_INVESTING"
  | "AML_KYC"
  | "TAX_FILING"
  | "CREDIT_CARD"
  | "CHEQUING";

/** A regulatory document ingested into the system */
export interface RegulatoryDocument {
  id: string;
  title: string;
  source_regulator: SourceRegulator;
  source_url?: string;
  publish_date?: string;
  raw_text: string;
  content_type: "text" | "pdf";
  ingested_at: string;
  processing_status: "pending" | "processed" | "failed";
}

/** A discrete regulatory finding extracted from a document */
export interface RegulatoryFinding {
  id: string;
  document_id: string;
  source_regulator: SourceRegulator;
  finding_summary: string;
  effective_date?: string;
  severity: Severity;
  severity_rationale?: string;
  affected_products: ProductKey[];
  recommended_actions: string[];
  key_quotes: string[];
  confidence_score?: number;
  created_at: string;
  updated_at: string;
}

/** Result returned by the extraction AI step */
export interface ExtractionResult {
  findings: ExtractedFinding[];
}

/** A single finding as extracted by the AI (pre-assessment) */
export interface ExtractedFinding {
  finding_summary: string;
  effective_date?: string | null;
  key_quotes: string[];
  category?: FindingCategory | null;
  regulatory_references: string[];
  affected_keywords: string[];
}

/** Result returned by the assessment AI step */
export interface AssessmentResult {
  affected_products: ProductKey[];
  severity: Severity;
  severity_rationale: string;
  recommended_actions: string[];
  confidence_score: number;
}

/** Aggregate statistics for the dashboard */
export interface DashboardStats {
  total_documents: number;
  total_findings: number;
  by_severity: Record<Severity, number>;
}

/** Filter options for querying regulatory findings */
export interface FindingFilters {
  severity?: Severity[];
  source_regulator?: SourceRegulator;
  product?: ProductKey;
}

/** A configured regulatory regulator publication page to monitor */
export type FeedSourceCategory = "news" | "publications" | "orders";
export type FeedSourceType = "html" | "rss";

export interface FeedSource {
  id: string;
  label: string;
  url: string;
  source_regulator: SourceRegulator;
  category: FeedSourceCategory;
  feed_type: FeedSourceType;
  disabled: boolean;
  last_checked_at?: string;
  created_at: string;
}

/** A discovered link from a feed source */
export interface FeedItem {
  id: string;
  source_id: string;
  item_url: string;
  title?: string;
  detected_at: string;
  published_at?: string | null;
  status: "new" | "dismissed" | "ingested";
  document_id?: string;
}
