/** Regulatory source agencies */
export type SourceAgency = 'CRA' | 'CIRO' | 'OSC' | 'CSA' | 'FINTRAC' | 'OSFI' | 'FCAC' | 'Dept of Finance' | 'Payments Canada'

/** Severity level of a regulatory change */
export type Severity = 'low' | 'medium' | 'high' | 'critical'

/** Review workflow status */
export type ReviewStatus = 'new' | 'reviewed' | 'action_planned' | 'escalated' | 'resolved'

/** Category of regulatory change */
export type ChangeCategory = 'new_rule' | 'amendment' | 'guidance' | 'enforcement' | 'consultation'

/** Wealthsimple product keys */
export type ProductKey =
  | 'RRSP'
  | 'TFSA'
  | 'FHSA'
  | 'TRADING'
  | 'CRYPTO'
  | 'MANAGED_INVESTING'
  | 'AML_KYC'
  | 'TAX_FILING'
  | 'CREDIT_CARD'
  | 'CHEQUING'

/** A regulatory document ingested into the system */
export interface RegulatoryDocument {
  id: string
  title: string
  source_agency: SourceAgency
  source_url?: string
  publish_date?: string
  raw_text: string
  ingested_at: string
  processing_status: 'pending' | 'processed' | 'failed'
}

/** A discrete regulatory change extracted from a document */
export interface RegulatoryChange {
  id: string
  document_id: string
  change_summary: string
  effective_date?: string
  severity: Severity
  severity_rationale?: string
  affected_products: ProductKey[]
  recommended_actions: string[]
  key_quotes: string[]
  confidence_score?: number
  review_status: ReviewStatus
  reviewed_by?: string
  review_notes?: string
  created_at: string
  updated_at: string
}

/** Result returned by the extraction AI step */
export interface ExtractionResult {
  changes: ExtractedChange[]
  document_summary: string
}

/** A single change as extracted by the AI (pre-assessment) */
export interface ExtractedChange {
  change_summary: string
  effective_date?: string
  key_quotes: string[]
  category?: ChangeCategory
}

/** Result returned by the assessment AI step */
export interface AssessmentResult {
  affected_products: ProductKey[]
  severity: Severity
  severity_rationale: string
  recommended_actions: string[]
  confidence_score: number
}

/** Aggregate statistics for the dashboard */
export interface DashboardStats {
  total_documents: number
  total_changes: number
  by_severity: Record<Severity, number>
  by_status: Record<ReviewStatus, number>
}

/** Filter options for querying regulatory changes */
export interface ChangeFilters {
  severity?: Severity[]
  status?: ReviewStatus[]
  source_agency?: SourceAgency
  product?: ProductKey
}
