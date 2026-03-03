export const dynamic = "force-dynamic";

import Link from "next/link";
import { getAllDocuments } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { ProcessButton } from "@/components/ProcessButton";

const STATUS_CONFIG = {
  processed: { label: "Processed", color: "var(--severity-low)" },
  pending: { label: "Pending", color: "var(--text-muted)" },
  failed: { label: "Failed", color: "var(--severity-critical)" },
} as const;

export default function DocumentsPage() {
  const documents = getAllDocuments();

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-xl font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            Documents
          </h1>
          <p
            className="text-sm mt-0.5"
            style={{ color: "var(--text-secondary)" }}
          >
            {documents.length} ingested document
            {documents.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/documents/upload"
          className="inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium transition-opacity hover:opacity-80"
          style={{ backgroundColor: "var(--accent-blue)", color: "#fff" }}
        >
          + Upload Document
        </Link>
      </div>

      {documents.length === 0 ? (
        <div
          className="rounded-lg border px-6 py-12 text-center"
          style={{
            borderColor: "var(--border-subtle)",
            backgroundColor: "var(--bg-surface)",
          }}
        >
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            No documents ingested yet.{" "}
            <Link
              href="/documents/upload"
              style={{ color: "var(--accent-blue)" }}
              className="hover:underline"
            >
              Upload your first →
            </Link>
          </p>
        </div>
      ) : (
        <div
          className="rounded-lg border overflow-hidden"
          style={{
            borderColor: "var(--border-subtle)",
            backgroundColor: "var(--bg-surface)",
          }}
        >
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                {["Title", "Regulator", "Date", "Status", ""].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-2.5 text-left text-xs font-medium"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {documents.map((doc, i) => {
                const cfg = STATUS_CONFIG[doc.processing_status];
                return (
                  <tr
                    key={doc.id}
                    style={{
                      borderTop:
                        i > 0 ? "1px solid var(--border-subtle)" : undefined,
                    }}
                  >
                    <td
                      className="px-4 py-3"
                      style={{ color: "var(--text-primary)" }}
                    >
                      <span className="line-clamp-1">{doc.title}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="rounded px-1.5 py-0.5 text-xs font-mono"
                        style={{
                          backgroundColor: "var(--bg-elevated)",
                          color: "var(--text-secondary)",
                          border: "1px solid var(--border-subtle)",
                        }}
                      >
                        {doc.source_regulator}
                      </span>
                    </td>
                    <td
                      className="px-4 py-3 text-xs tabular-nums whitespace-nowrap"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {doc.publish_date ? formatDate(doc.publish_date) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="text-xs font-medium"
                        style={{ color: cfg.color }}
                      >
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {doc.processing_status === "processed" ? null : (
                        <ProcessButton
                          documentId={doc.id}
                          label={
                            doc.processing_status === "failed" ? "Retry" : "Run"
                          }
                        />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
