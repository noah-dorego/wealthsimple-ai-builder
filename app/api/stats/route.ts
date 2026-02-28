import { NextResponse } from 'next/server'

// TODO GET: Return aggregate dashboard statistics.
//   - Call getStats() from lib/db.ts
//   - Return 200 with DashboardStats JSON:
//     { total_documents, total_changes, by_severity: { low, medium, high, critical }, by_status: { new, reviewed, ... } }

export async function GET() {
  return NextResponse.json({ message: 'Not implemented' }, { status: 501 })
}
