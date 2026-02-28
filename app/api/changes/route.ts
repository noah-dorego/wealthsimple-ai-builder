import { NextResponse } from 'next/server'

// TODO GET: Return regulatory changes with optional filters from query params.
//   - Parse query params: severity (comma-separated), status (comma-separated), source_agency, product
//   - Build ChangeFilters object from query params
//   - Call getChanges(filters) from lib/db.ts
//   - Return 200 with JSON array of RegulatoryChange

export async function GET() {
  return NextResponse.json({ message: 'Not implemented' }, { status: 501 })
}
