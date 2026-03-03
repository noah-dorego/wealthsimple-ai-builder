import { NextRequest, NextResponse } from "next/server";
import { getFeedSources, insertFeedSource } from "@/lib/db";
import type {
  SourceRegulator,
  FeedSourceCategory,
  FeedSourceType,
} from "@/lib/types";

export async function GET() {
  return NextResponse.json(getFeedSources());
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { label, url, source_regulator, category, feed_type } = body;

  if (!label || !url || !source_regulator || !category) {
    return NextResponse.json(
      { error: "label, url, source_regulator, and category are required" },
      { status: 400 },
    );
  }

  const id = insertFeedSource({
    label,
    url,
    source_regulator: source_regulator as SourceRegulator,
    category: category as FeedSourceCategory,
    feed_type: (feed_type ?? "html") as FeedSourceType,
  });
  return NextResponse.json({ id }, { status: 201 });
}
