export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { getFinding, getDocument } from "@/lib/db";
import { severityColor, formatDate } from "@/lib/utils";
import type { Severity } from "@/lib/types";

const SEVERITY_LABELS: Record<Severity, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
};

interface Props {
  params: Promise<{ id: string }>;
}

export default async function FindingDetailPage({ params }: Props) {
  const { id } = await params;
  const finding = getFinding(id);
  if (!finding) notFound();

  const doc = getDocument(finding.document_id);
  const score = finding.confidence_score;

  return (
    <div className="p-6 max-w-3xl space-y-6">
      {/* Back */}
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-xs hover:underline"
        style={{ color: "var(--text-muted)" }}
      >
        ← Back to Dashboard
      </Link>

      {/* Header */}
      <div className="space-y-2">
        <span
          className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold ${severityColor[finding.severity]}`}
        >
          {SEVERITY_LABELS[finding.severity]}
        </span>
        <h1
          className="text-lg font-semibold leading-snug"
          style={{ color: "var(--text-primary)" }}
        >
          {finding.finding_summary}
        </h1>
      </div>

      {/* Low confidence banner */}
      {score != null && score < 0.7 && (
        <div
          className="rounded-lg border px-4 py-3 text-sm"
          style={{
            backgroundColor:
              "color-mix(in srgb, var(--severity-medium) 12%, transparent)",
            borderColor: "var(--severity-medium)",
            color: "var(--severity-medium)",
          }}
        >
          ⚠ Low confidence ({score.toFixed(2)}) — human review recommended
          before acting on this assessment.
        </div>
      )}

      {/* Metadata */}
      <div
        className="rounded-lg border p-4 grid grid-cols-2 gap-x-8 gap-y-3"
        style={{
          borderColor: "var(--border-subtle)",
          backgroundColor: "var(--bg-surface)",
        }}
      >
        <MetaRow label="Effective date">
          {finding.effective_date
            ? formatDate(finding.effective_date)
            : "Not specified"}
        </MetaRow>
        <MetaRow label="Confidence">
          {score != null ? (
            <div className="flex items-center gap-2">
              <div
                className="w-20 h-1.5 rounded-full overflow-hidden"
                style={{ backgroundColor: "var(--bg-elevated)" }}
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${(score * 100).toFixed(0)}%`,
                    backgroundColor:
                      score >= 0.85
                        ? "var(--severity-low)"
                        : score >= 0.7
                          ? "var(--severity-medium)"
                          : "var(--severity-high)",
                  }}
                />
              </div>
              <span
                className="text-xs tabular-nums"
                style={{ color: "var(--text-secondary)" }}
              >
                {score.toFixed(2)}
              </span>
            </div>
          ) : (
            "—"
          )}
        </MetaRow>
        <MetaRow label="Products">
          <div className="flex flex-wrap gap-1">
            {finding.affected_products.length > 0
              ? finding.affected_products.map((p) => (
                  <span
                    key={p}
                    className="rounded px-1.5 py-0.5 text-xs"
                    style={{
                      backgroundColor: "var(--bg-elevated)",
                      color: "var(--text-secondary)",
                      border: "1px solid var(--border-subtle)",
                    }}
                  >
                    {p}
                  </span>
                ))
              : "—"}
          </div>
        </MetaRow>
        <MetaRow label="Regulator">{doc?.source_regulator ?? "—"}</MetaRow>
        {doc && (
          <MetaRow label="Document" className="col-span-2">
            <span style={{ color: "var(--text-secondary)" }}>{doc.title}</span>
          </MetaRow>
        )}
      </div>

      {/* Key Quotes */}
      {finding.key_quotes.length > 0 && (
        <Section title="Key Quotes">
          <div className="space-y-3">
            {finding.key_quotes.map((quote, i) => (
              <blockquote
                key={i}
                className="border-l-2 pl-4 text-sm italic"
                style={{
                  borderColor: "var(--border-default)",
                  color: "var(--text-secondary)",
                }}
              >
                {quote}
              </blockquote>
            ))}
          </div>
        </Section>
      )}

      {/* Recommended Actions */}
      {finding.recommended_actions.length > 0 && (
        <Section title="Recommended Actions">
          <ul className="space-y-2">
            {finding.recommended_actions.map((action, i) => (
              <li
                key={i}
                className="flex gap-2 text-sm"
                style={{ color: "var(--text-secondary)" }}
              >
                <span
                  className="flex-shrink-0"
                  style={{ color: "var(--accent-blue)" }}
                >
                  →
                </span>
                {action}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Severity Rationale */}
      {finding.severity_rationale && (
        <Section title="Severity Rationale">
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            {finding.severity_rationale}
          </p>
        </Section>
      )}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <h2
        className="text-xs font-semibold uppercase tracking-wider"
        style={{ color: "var(--text-muted)" }}
      >
        {title}
      </h2>
      {children}
    </div>
  );
}

function MetaRow({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>
        {label}
      </div>
      <div className="text-sm" style={{ color: "var(--text-primary)" }}>
        {children}
      </div>
    </div>
  );
}
