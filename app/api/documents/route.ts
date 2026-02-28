import { NextResponse } from 'next/server'

// TODO GET: Return all regulatory documents ordered by ingested_at DESC.
//   - Call getAllDocuments() from lib/db.ts
//   - Return 200 with JSON array of RegulatoryDocument

// TODO POST: Accept { title, source_agency, source_url?, publish_date?, raw_text } in request body.
//   - Validate required fields (title, source_agency, raw_text)
//   - Validate source_agency is a known SourceAgency value
//   - Call insertDocument() to persist
//   - Return 201 with { id }

export async function GET() {
  return NextResponse.json({ message: 'Not implemented' }, { status: 501 })
}

export async function POST() {
  return NextResponse.json({ message: 'Not implemented' }, { status: 501 })
}
