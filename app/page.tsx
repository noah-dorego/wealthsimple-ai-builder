import { Suspense } from "react";
import { getStats, getFindings } from "@/lib/db";
import { FindingFilters } from "@/components/FindingFilters";
import { FindingsTable } from "@/components/FindingsTable";
import type { Severity, SourceRegulator, ProductKey } from "@/lib/types";

const SEVERITY_LABELS: Record<Severity, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
};

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

function str(val: string | string[] | undefined): string | undefined {
  return typeof val === "string" ? val : undefined;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;

  const severityParam = str(params.severity);
  const regulatorParam = str(params.source_regulator);
  const productParam = str(params.product);

  const filters: {
    severity?: Severity[];
    source_regulator?: SourceRegulator;
    product?: ProductKey;
  } = {};
  if (severityParam) filters.severity = severityParam.split(",") as Severity[];
  if (regulatorParam)
    filters.source_regulator = regulatorParam as SourceRegulator;
  if (productParam) filters.product = productParam as ProductKey;

  const stats = getStats();
  const findings = getFindings(filters);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1
          className="text-xl font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          Dashboard
        </h1>
        <p
          className="text-sm mt-0.5"
          style={{ color: "var(--text-secondary)" }}
        >
          Regulatory finding impact overview
        </p>
      </div>

      {/* Stats summary bar */}
      <div
        className="flex items-center gap-5 rounded-lg border px-5 py-3"
        style={{
          borderColor: "var(--border-subtle)",
          backgroundColor: "var(--bg-surface)",
        }}
      >
        {(["critical", "high", "medium", "low"] as Severity[]).map((s) => (
          <div key={s} className="flex items-center gap-1.5">
            <span
              className="text-xl font-semibold tabular-nums"
              style={{ color: `var(--severity-${s})` }}
            >
              {stats.by_severity[s] ?? 0}
            </span>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              {SEVERITY_LABELS[s].toLowerCase()}
            </span>
          </div>
        ))}
        <div
          className="mx-1 h-4 w-px flex-shrink-0"
          style={{ backgroundColor: "var(--border-subtle)" }}
        />
        <span
          className="text-xs tabular-nums"
          style={{ color: "var(--text-muted)" }}
        >
          <span style={{ color: "var(--text-secondary)" }}>
            {stats.total_findings}
          </span>{" "}
          total findings
        </span>
        <span
          className="text-xs tabular-nums"
          style={{ color: "var(--text-muted)" }}
        >
          <span style={{ color: "var(--text-secondary)" }}>
            {stats.total_documents}
          </span>{" "}
          documents
        </span>
      </div>

      {/* Filter sidebar + findings table */}
      <div className="flex gap-5 items-start">
        <Suspense fallback={<div className="w-[200px] shrink-0" />}>
          <FindingFilters />
        </Suspense>
        <div className="flex-1 min-w-0">
          <FindingsTable findings={findings} />
        </div>
      </div>
    </div>
  );
}
