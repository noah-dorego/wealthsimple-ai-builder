import { NextResponse } from 'next/server'

// TODO GET: Return a single regulatory change by id.
//   - Call getChange(id) from lib/db.ts
//   - Return 404 if not found
//   - Return 200 with RegulatoryChange JSON

export async function GET() {
  return NextResponse.json({ message: 'Not implemented' }, { status: 501 })
}
