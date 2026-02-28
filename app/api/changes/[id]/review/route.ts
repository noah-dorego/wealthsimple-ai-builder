import { NextResponse } from 'next/server'

// TODO PATCH: Update the review fields of a regulatory change.
//   - Parse body: { review_status, reviewed_by?, review_notes? }
//   - Validate review_status is a valid ReviewStatus value
//   - Call getChange(id) from lib/db.ts; return 404 if not found
//   - Call updateChangeReview(id, status, reviewedBy, notes) from lib/db.ts
//   - Return 200 with updated RegulatoryChange

export async function PATCH() {
  return NextResponse.json({ message: 'Not implemented' }, { status: 501 })
}
