import { NextRequest, NextResponse } from "next/server";
import { getAllDocuments, insertDocument } from "@/lib/db";
import type { SourceRegulator } from "@/lib/types";

const VALID_SOURCE_REGULATORS: SourceRegulator[] = [
  "CRA",
  "CIRO",
  "OSC",
  "CSA",
  "FINTRAC",
  "OSFI",
  "FCAC",
  "Dept-of-Finance",
  "Payments-Canada",
];

export async function GET() {
  return NextResponse.json(getAllDocuments());
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    title,
    source_regulator,
    source_url,
    publish_date,
    raw_text,
    content_type,
  } = body;

  if (!title || !source_regulator || !raw_text) {
    return NextResponse.json(
      { error: "title, source_regulator, and raw_text are required" },
      { status: 400 },
    );
  }

  if (!VALID_SOURCE_REGULATORS.includes(source_regulator)) {
    return NextResponse.json(
      {
        error: `source_regulator must be one of: ${VALID_SOURCE_REGULATORS.join(", ")}`,
      },
      { status: 400 },
    );
  }

  const id = insertDocument({
    title,
    source_regulator,
    source_url,
    publish_date,
    raw_text,
    content_type: content_type ?? "text",
  });
  return NextResponse.json({ id }, { status: 201 });
}
