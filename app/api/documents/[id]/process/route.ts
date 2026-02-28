import { NextResponse } from 'next/server'

// TODO POST: Trigger the full extraction + assessment pipeline for a document.
//   - Fetch the document by id using getDocument() from lib/db.ts; return 404 if not found
//   - Update document status to 'processing' (add status if needed) then call updateDocumentStatus()
//   - Call buildExtractionPrompt() from lib/prompts.ts, then callClaude() from lib/claude.ts
//   - Parse result with parseAIResponse<ExtractionResult>()
//   - For each ExtractedChange, call buildAssessmentPrompt(), then callClaude(), then parseAIResponse<AssessmentResult>()
//   - Call insertChange() for each assessed change
//   - Update document status to 'processed' (or 'failed' on error)
//   - Return 200 with { document_id, changes_extracted: number }

export async function POST() {
  return NextResponse.json({ message: 'Not implemented' }, { status: 501 })
}
