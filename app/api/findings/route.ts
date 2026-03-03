import { NextRequest, NextResponse } from "next/server";
import { getFindings } from "@/lib/db";
import type {
  FindingFilters,
  Severity,
  SourceRegulator,
  ProductKey,
} from "@/lib/types";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const filters: FindingFilters = {};

  const severity = searchParams.get("severity");
  if (severity) filters.severity = severity.split(",") as Severity[];

  const source_regulator = searchParams.get("source_regulator");
  if (source_regulator)
    filters.source_regulator = source_regulator as SourceRegulator;

  const product = searchParams.get("product");
  if (product) filters.product = product as ProductKey;

  return NextResponse.json(getFindings(filters));
}
