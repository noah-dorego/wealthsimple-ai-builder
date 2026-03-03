"use client";

import { useRouter } from "next/navigation";
import { severityColor, formatDate } from "@/lib/utils";
import type { RegulatoryFinding, Severity } from "@/lib/types";

const SEVERITY_LABELS: Record<Severity, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
};

const SEVERITY_BORDER: Record<Severity, string> = {
  critical: "var(--severity-critical)",
  high: "var(--severity-high)",
  medium: "var(--severity-medium)",
  low: "var(--severity-low)",
};

export function FindingsTable({ findings }: { findings: RegulatoryFinding[] }) {
  const router = useRouter();

  if (findings.length === 0) {
    return (
      <div
        className="rounded-lg border px-4 py-12 text-center text-sm"
        style={{
          borderColor: "var(--border-subtle)",
          backgroundColor: "var(--bg-surface)",
          color: "var(--text-muted)",
        }}
      >
        No findings match the current filters.
      </div>
    );
  }

  return (
    <div
      className="rounded-lg border overflow-hidden"
      style={{
        borderColor: "var(--border-subtle)",
        backgroundColor: "var(--bg-surface)",
      }}
    >
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: "var(--border-subtle)" }}
      >
        <h2
          className="text-sm font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          Findings
        </h2>
        <span
          className="text-xs tabular-nums"
          style={{ color: "var(--text-muted)" }}
        >
          {findings.length}
        </span>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
            {["Summary", "Regulator", "Severity", "Products", "Effective"].map(
              (h) => (
                <th
                  key={h}
                  className="px-4 py-2 text-left text-xs font-medium"
                  style={{ color: "var(--text-muted)" }}
                >
                  {h}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody>
          {findings.map((finding) => (
            <tr
              key={finding.id}
              onClick={() => router.push(`/findings/${finding.id}`)}
              className="cursor-pointer hover:bg-(--bg-elevated) transition-colors"
              style={{
                borderBottom: "1px solid var(--border-subtle)",
                borderLeft: `3px solid ${SEVERITY_BORDER[finding.severity]}`,
              }}
            >
              {/* Summary */}
              <td
                className="px-4 py-3"
                style={{ color: "var(--text-primary)", maxWidth: 360 }}
              >
                <span className="line-clamp-1">{finding.finding_summary}</span>
              </td>

              {/* Regulator */}
              <td className="px-4 py-3 whitespace-nowrap">
                <span
                  className="text-xs font-mono px-1.5 py-0.5 rounded"
                  style={{
                    backgroundColor: "var(--bg-elevated)",
                    color: "var(--text-secondary)",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  {finding.source_regulator}
                </span>
              </td>

              {/* Severity */}
              <td className="px-4 py-3 whitespace-nowrap">
                <span
                  className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ${severityColor[finding.severity]}`}
                >
                  {SEVERITY_LABELS[finding.severity]}
                </span>
              </td>

              {/* Products */}
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1">
                  {finding.affected_products.slice(0, 2).map((p) => (
                    <span
                      key={p}
                      className="inline-flex items-center rounded px-1.5 py-0.5 text-xs"
                      style={{
                        backgroundColor: "var(--bg-elevated)",
                        color: "var(--text-secondary)",
                        border: "1px solid var(--border-subtle)",
                      }}
                    >
                      {p}
                    </span>
                  ))}
                  {finding.affected_products.length > 2 && (
                    <span
                      className="text-xs self-center"
                      style={{ color: "var(--text-muted)" }}
                    >
                      +{finding.affected_products.length - 2}
                    </span>
                  )}
                </div>
              </td>

              {/* Effective date */}
              <td
                className="px-4 py-3 text-xs tabular-nums whitespace-nowrap"
                style={{ color: "var(--text-muted)" }}
              >
                {finding.effective_date
                  ? formatDate(finding.effective_date)
                  : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
