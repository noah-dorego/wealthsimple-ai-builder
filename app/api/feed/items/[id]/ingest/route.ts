import { NextRequest, NextResponse } from "next/server";
import {
  getFeedItem,
  getFeedSource,
  insertDocument,
  updateFeedItemStatus,
} from "@/lib/db";
import { runPipeline } from "@/lib/pipeline";
import { parse } from "node-html-parser";
import type { SourceRegulator } from "@/lib/types";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const item = getFeedItem(id);
  if (!item) {
    return NextResponse.json({ error: "Feed item not found" }, { status: 404 });
  }

  const source = getFeedSource(item.source_id);
  if (!source) {
    return NextResponse.json(
      { error: "Feed source not found" },
      { status: 404 },
    );
  }

  // Fetch the item URL
  let html: string;
  try {
    const res = await fetch(item.item_url, {
      headers: { "User-Agent": "Margin/1.0" },
    });
    html = await res.text();
  } catch (err) {
    return NextResponse.json(
      {
        error: `Failed to fetch item URL: ${err instanceof Error ? err.message : String(err)}`,
      },
      { status: 502 },
    );
  }

  // Parse and clean HTML
  const root = parse(html);
  for (const tag of ["script", "style", "nav", "footer", "header"]) {
    root.querySelectorAll(tag).forEach((el) => el.remove());
  }
  const raw_text = root.structuredText.trim();

  const title =
    item.title || root.querySelector("title")?.text?.trim() || item.item_url;

  // Insert document
  const documentId = insertDocument({
    title,
    source_regulator: source.source_regulator as SourceRegulator,
    source_url: item.item_url,
    raw_text,
    content_type: "text",
  });

  // Run extraction + assessment pipeline
  let findings_extracted = 0;
  try {
    const result = await runPipeline(documentId);
    findings_extracted = result.findings_extracted;
  } catch (err) {
    return NextResponse.json(
      {
        error: `Pipeline failed: ${err instanceof Error ? err.message : String(err)}`,
      },
      { status: 500 },
    );
  }

  // Mark feed item as ingested
  updateFeedItemStatus(item.id, "ingested", documentId);

  return NextResponse.json({ document_id: documentId, findings_extracted });
}
