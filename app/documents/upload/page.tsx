"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Upload, Link2, FileText } from "lucide-react";
import type { SourceRegulator } from "@/lib/types";

const REGULATORS: SourceRegulator[] = [
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

type Tab = "file" | "link" | "manual";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "file", label: "File", icon: Upload },
  { id: "link", label: "Link", icon: Link2 },
  { id: "manual", label: "Manual", icon: FileText },
];

export default function UploadDocumentPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<Tab>("file");

  // Shared metadata fields
  const [title, setTitle] = useState("");
  const [regulator, setRegulator] = useState<SourceRegulator>("CRA");
  const [publishDate, setPublishDate] = useState("");

  // Content per tab
  const [rawText, setRawText] = useState(""); // manual
  const [linkUrl, setLinkUrl] = useState(""); // link

  // File tab state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<{
    raw: string;
    content_type: "text" | "pdf";
  } | null>(null);
  const [parseStatus, setParseStatus] = useState<
    "idle" | "parsing" | "ready" | "error"
  >("idle");
  const [isDragging, setIsDragging] = useState(false);

  const [status, setStatus] = useState<"idle" | "uploading" | "processing">(
    "idle",
  );
  const isLoading = status !== "idle";

  // -- File handling ----------------------------------------------------------

  async function processFile(file: File) {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["txt", "pdf"].includes(ext ?? "")) {
      toast.error("Only .txt and .pdf files are supported");
      return;
    }

    setSelectedFile(file);
    setFileContent(null);
    setParseStatus("parsing");

    // Auto-fill title from filename if blank
    if (!title.trim()) {
      setTitle(file.name.replace(/\.[^.]+$/, ""));
    }

    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/documents/parse-file", {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Parse failed");
      }
      const data = (await res.json()) as
        | { content_type: "text"; text: string }
        | { content_type: "pdf"; file_data: string };

      setFileContent({
        raw: data.content_type === "pdf" ? data.file_data : data.text,
        content_type: data.content_type,
      });
      setParseStatus("ready");
    } catch (err) {
      setParseStatus("error");
      toast.error(err instanceof Error ? err.message : "Failed to read file");
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [title],
  ); // eslint-disable-line react-hooks/exhaustive-deps

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave() {
    setIsDragging(false);
  }

  // -- Submit -----------------------------------------------------------------

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }

    const isFile = activeTab === "file";
    if (isFile && !fileContent) {
      toast.error("Select a file to upload");
      return;
    }
    if (!isFile && activeTab === "manual" && !rawText.trim()) {
      toast.error("Document text is required");
      return;
    }

    const raw_text = isFile ? fileContent!.raw : rawText.trim();
    const content_type = isFile ? fileContent!.content_type : "text";

    setStatus("uploading");
    try {
      const createRes = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          source_regulator: regulator,
          publish_date: publishDate || undefined,
          raw_text,
          content_type,
        }),
      });

      if (!createRes.ok) {
        const body = await createRes.json().catch(() => ({}));
        throw new Error(
          body.error ?? `Upload failed (HTTP ${createRes.status})`,
        );
      }

      const { id } = (await createRes.json()) as { id: string };

      setStatus("processing");
      const processRes = await fetch(`/api/documents/${id}/process`, {
        method: "POST",
      });

      if (!processRes.ok) {
        const body = await processRes.json().catch(() => ({}));
        toast.warning(
          body.error ??
            "Processing failed — you can retry from the documents list",
        );
        router.push("/documents");
        return;
      }

      const result = (await processRes.json()) as {
        findings_extracted: number;
      };
      toast.success(
        `Processed — ${result.findings_extracted} finding${result.findings_extracted !== 1 ? "s" : ""} extracted`,
      );
      router.push("/documents");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
      setStatus("idle");
    }
  }

  // -- Render -----------------------------------------------------------------

  const canSubmit =
    activeTab === "file"
      ? parseStatus === "ready"
      : activeTab === "manual"
        ? rawText.trim().length > 0
        : false;

  // extractedText used only for display — derive from fileContent
  const extractedText =
    fileContent?.content_type === "text" ? fileContent.raw : null;

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <Link
          href="/documents"
          className="inline-flex items-center gap-1 text-xs hover:underline mb-4 block"
          style={{ color: "var(--text-muted)" }}
        >
          ← Back to Documents
        </Link>
        <h1
          className="text-xl font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          Add Regulatory Document
        </h1>
        <p
          className="text-sm mt-0.5"
          style={{ color: "var(--text-secondary)" }}
        >
          Claude will extract and assess regulatory findings automatically.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Tabs */}
        <div
          className="flex rounded-lg overflow-hidden border"
          style={{
            borderColor: "var(--border-subtle)",
            backgroundColor: "var(--bg-surface)",
          }}
        >
          {TABS.map(({ id, label, icon: Icon }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors"
                style={{
                  color: isActive ? "var(--text-primary)" : "var(--text-muted)",
                  backgroundColor: isActive
                    ? "var(--bg-elevated)"
                    : "transparent",
                  borderBottom: isActive
                    ? "2px solid var(--accent-blue)"
                    : "2px solid transparent",
                }}
              >
                <Icon size={14} />
                {label}
              </button>
            );
          })}
        </div>

        {/* Panel */}
        <div
          className="rounded-lg border p-5 space-y-4"
          style={{
            borderColor: "var(--border-subtle)",
            backgroundColor: "var(--bg-surface)",
          }}
        >
          {/* Metadata (always shown) */}
          <Field label="Title" required>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. CRA TFSA Limit Update 2026"
              disabled={isLoading}
              className="w-full rounded px-3 py-2 text-sm outline-none focus:ring-1 disabled:opacity-50"
              style={{
                backgroundColor: "var(--bg-elevated)",
                color: "var(--text-primary)",
                border: "1px solid var(--border-default)",
              }}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Regulator" required>
              <select
                value={regulator}
                onChange={(e) =>
                  setRegulator(e.target.value as SourceRegulator)
                }
                disabled={isLoading}
                className="w-full rounded px-3 py-2 text-sm outline-none focus:ring-1 disabled:opacity-50"
                style={{
                  backgroundColor: "var(--bg-elevated)",
                  color: "var(--text-primary)",
                  border: "1px solid var(--border-default)",
                }}
              >
                {REGULATORS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Publish date" hint="optional">
              <input
                type="date"
                value={publishDate}
                onChange={(e) => setPublishDate(e.target.value)}
                disabled={isLoading}
                className="w-full rounded px-3 py-2 text-sm outline-none focus:ring-1 disabled:opacity-50"
                style={{
                  backgroundColor: "var(--bg-elevated)",
                  color: publishDate
                    ? "var(--text-primary)"
                    : "var(--text-muted)",
                  border: "1px solid var(--border-default)",
                  colorScheme: "dark",
                }}
              />
            </Field>
          </div>

          {/* Tab-specific content */}
          {activeTab === "file" && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.pdf"
                onChange={handleFileChange}
                className="hidden"
              />
              <div
                role="button"
                tabIndex={0}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(e) =>
                  e.key === "Enter" && fileInputRef.current?.click()
                }
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className="rounded-lg border-2 border-dashed px-6 py-10 text-center cursor-pointer transition-colors"
                style={{
                  borderColor: isDragging
                    ? "var(--accent-blue)"
                    : "var(--border-default)",
                  backgroundColor: isDragging
                    ? "var(--accent-blue-dim)"
                    : "var(--bg-elevated)",
                }}
              >
                {parseStatus === "idle" && (
                  <>
                    <Upload
                      size={20}
                      className="mx-auto mb-2"
                      style={{ color: "var(--text-muted)" }}
                    />
                    <p
                      className="text-sm"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Drag & drop a file, or{" "}
                      <span style={{ color: "var(--accent-blue)" }}>
                        browse
                      </span>
                    </p>
                    <p
                      className="text-xs mt-1"
                      style={{ color: "var(--text-muted)" }}
                    >
                      .txt, .pdf
                    </p>
                  </>
                )}
                {parseStatus === "parsing" && (
                  <div className="flex flex-col items-center gap-2">
                    <span
                      className="h-5 w-5 rounded-full border-2 border-transparent animate-spin"
                      style={{ borderTopColor: "var(--accent-blue)" }}
                    />
                    <p
                      className="text-sm"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Extracting text…
                    </p>
                  </div>
                )}
                {parseStatus === "ready" && selectedFile && (
                  <>
                    <FileText
                      size={20}
                      className="mx-auto mb-2"
                      style={{ color: "var(--severity-low)" }}
                    />
                    <p
                      className="text-sm font-medium"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {selectedFile.name}
                    </p>
                    <p
                      className="text-xs mt-0.5"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {(selectedFile.size / 1024).toFixed(1)} KB ·{" "}
                      {fileContent?.content_type === "pdf"
                        ? "parsed as PDF"
                        : "text extracted"}{" "}
                      ·{" "}
                      <span style={{ color: "var(--accent-blue)" }}>
                        replace
                      </span>
                    </p>
                  </>
                )}
                {parseStatus === "error" && (
                  <>
                    <p
                      className="text-sm"
                      style={{ color: "var(--severity-high)" }}
                    >
                      Failed to extract text.{" "}
                      <span style={{ color: "var(--accent-blue)" }}>
                        Try again
                      </span>
                    </p>
                  </>
                )}
              </div>
            </>
          )}

          {activeTab === "link" && (
            <div className="space-y-3">
              <Field label="URL">
                <input
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://www.canada.ca/…"
                  disabled
                  className="w-full rounded px-3 py-2 text-sm outline-none disabled:opacity-50"
                  style={{
                    backgroundColor: "var(--bg-elevated)",
                    color: "var(--text-primary)",
                    border: "1px solid var(--border-default)",
                  }}
                />
              </Field>
              <p
                className="text-xs rounded px-3 py-2"
                style={{
                  color: "var(--text-muted)",
                  backgroundColor: "var(--bg-elevated)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                Link extraction is coming soon. Use{" "}
                <button
                  type="button"
                  onClick={() => setActiveTab("manual")}
                  className="hover:underline"
                  style={{ color: "var(--accent-blue)" }}
                >
                  Manual
                </button>{" "}
                mode to paste the document text directly.
              </p>
            </div>
          )}

          {activeTab === "manual" && (
            <Field label="Document text" required>
              <textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="Paste regulatory document text here…"
                rows={12}
                disabled={isLoading}
                className="w-full rounded px-3 py-2 text-sm outline-none focus:ring-1 resize-y disabled:opacity-50 font-mono"
                style={{
                  backgroundColor: "var(--bg-elevated)",
                  color: "var(--text-primary)",
                  border: "1px solid var(--border-default)",
                }}
              />
            </Field>
          )}
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isLoading || activeTab === "link" || !canSubmit}
            className="inline-flex items-center gap-2 rounded px-4 py-2 text-sm font-medium transition-opacity disabled:opacity-50 hover:opacity-90"
            style={{ backgroundColor: "var(--accent-blue)", color: "#fff" }}
          >
            {isLoading ? (
              <>
                <span
                  className="h-3.5 w-3.5 rounded-full border-2 border-transparent animate-spin"
                  style={{ borderTopColor: "#fff" }}
                />
                {status === "uploading" ? "Uploading…" : "Processing…"}
              </>
            ) : (
              "Upload & Process →"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label
        className="text-xs font-medium flex items-center gap-1"
        style={{ color: "var(--text-muted)" }}
      >
        {label}
        {required && <span style={{ color: "var(--severity-high)" }}>*</span>}
        {hint && (
          <span className="font-normal" style={{ color: "var(--text-muted)" }}>
            — {hint}
          </span>
        )}
      </label>
      {children}
    </div>
  );
}
