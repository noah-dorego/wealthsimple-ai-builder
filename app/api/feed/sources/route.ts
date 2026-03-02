import { NextRequest, NextResponse } from 'next/server'
import { getFeedSources, insertFeedSource } from '@/lib/db'
import type { SourceAgency, FeedSourceCategory } from '@/lib/types'

export async function GET() {
  return NextResponse.json(getFeedSources())
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { label, url, source_agency, category } = body

  if (!label || !url || !source_agency || !category) {
    return NextResponse.json(
      { error: 'label, url, source_agency, and category are required' },
      { status: 400 }
    )
  }

  const id = insertFeedSource({
    label,
    url,
    source_agency: source_agency as SourceAgency,
    category: category as FeedSourceCategory,
  })
  return NextResponse.json({ id }, { status: 201 })
}
