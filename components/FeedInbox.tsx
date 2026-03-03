"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";
import type { FeedItem, FeedSource, FeedSourceCategory } from "@/lib/types";

const DEFAULT_VISIBLE = 5;

const CATEGORIES: { value: FeedSourceCategory; label: string }[] = [
  { value: "news", label: "News" },
  { value: "publications", label: "Publications" },
  { value: "orders", label: "Orders" },
];

interface Props {
  items: FeedItem[];
  sources: FeedSource[];
}

function sourceForItem(
  item: FeedItem,
  sources: FeedSource[],
): FeedSource | undefined {
  return sources.find((s) => s.id === item.source_id);
}

function ItemRow({
  item,
  sources,
  onRefresh,
}: {
  item: FeedItem;
  sources: FeedSource[];
  onRefresh: () => void;
}) {
  const [ingesting, setIngesting] = useState(false);
  const [dismissing, setDismissing] = useState(false);
  const source = sourceForItem(item, sources);

  async function handleIngest() {
    setIngesting(true);
    try {
      const res = await fetch(`/api/feed/items/${item.id}/ingest`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Ingest failed");
      toast.success(`Ingested — ${data.findings_extracted} findings extracted`);
      onRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ingest failed");
    } finally {
      setIngesting(false);
    }
  }

  async function handleDismiss() {
    setDismissing(true);
    try {
      const res = await fetch(`/api/feed/items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "dismissed" }),
      });
      if (!res.ok) throw new Error("Dismiss failed");
      onRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Dismiss failed");
    } finally {
      setDismissing(false);
    }
  }

  return (
    <div
      className="rounded-md p-3 flex flex-col gap-1.5"
      style={{ backgroundColor: "var(--bg-elevated)" }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <a
            href={item.item_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium truncate block hover:underline"
            style={{ color: "var(--text-primary)" }}
            title={item.title ?? item.item_url}
          >
            {item.title || item.item_url}
          </a>
          <div className="flex items-center gap-2 mt-0.5">
            <span
              className="text-xs font-mono px-1.5 py-0.5 rounded"
              style={{
                backgroundColor: "var(--bg-surface)",
                color: "var(--text-secondary)",
              }}
            >
              {source?.source_regulator ?? "—"}
            </span>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              {formatDate(item.published_at ?? item.detected_at)}
            </span>
          </div>
        </div>
        {item.status === "new" && (
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={handleIngest}
              disabled={ingesting}
              className="text-xs px-2.5 py-1 rounded font-medium transition-colors"
              style={{ backgroundColor: "var(--accent-blue)", color: "#fff" }}
            >
              {ingesting ? "Processing…" : "Process →"}
            </button>
            <button
              onClick={handleDismiss}
              disabled={dismissing}
              className="text-xs px-2 py-1 rounded transition-colors"
              style={{
                color: "var(--text-muted)",
                backgroundColor: "var(--bg-surface)",
              }}
            >
              Dismiss
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function FeedInbox({ items, sources }: Props) {
  const router = useRouter();
  const [activeCategory, setActiveCategory] =
    useState<FeedSourceCategory | null>(null);
  const [activeSourceIds, setActiveSourceIds] = useState<Set<string>>(
    new Set(),
  );
  const [showAll, setShowAll] = useState(false);

  const newItems = items.filter((i) => i.status === "new");
  const ingestedItems = items.filter((i) => i.status === "ingested");

  // Filter by category and/or source
  const filteredNew = newItems.filter((i) => {
    const source = sources.find((s) => s.id === i.source_id);
    if (activeCategory && source?.category !== activeCategory) return false;
    if (activeSourceIds.size > 0 && !activeSourceIds.has(i.source_id))
      return false;
    return true;
  });

  const visibleNew = showAll
    ? filteredNew
    : filteredNew.slice(0, DEFAULT_VISIBLE);
  const hiddenCount = filteredNew.length - visibleNew.length;

  function toggleCategory(cat: FeedSourceCategory) {
    setActiveCategory((prev) => (prev === cat ? null : cat));
    setActiveSourceIds(new Set());
    setShowAll(false);
  }

  function toggleSource(id: string) {
    setActiveSourceIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setShowAll(false);
  }

  function clearFilters() {
    setActiveCategory(null);
    setActiveSourceIds(new Set());
    setShowAll(false);
  }

  if (items.length === 0) {
    return (
      <div
        className="rounded-md p-8 text-center"
        style={{
          backgroundColor: "var(--bg-elevated)",
          color: "var(--text-muted)",
        }}
      >
        <p className="text-sm">
          No items yet — check a source to discover new bulletins.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Filters */}
      {sources.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {/* Category chips */}
          <p
            className="text-xs font-medium uppercase tracking-wide"
            style={{ color: "var(--text-muted)" }}
          >
            Category
          </p>
          <div
            className="flex gap-1.5"
            style={{ overflowX: "auto", whiteSpace: "nowrap" }}
          >
            <button
              onClick={clearFilters}
              className="text-xs px-2.5 py-1 rounded-full shrink-0 transition-colors border"
              style={{
                borderColor:
                  !activeCategory && activeSourceIds.size === 0
                    ? "var(--accent-blue)"
                    : "var(--border-subtle)",
                backgroundColor:
                  !activeCategory && activeSourceIds.size === 0
                    ? "color-mix(in srgb, var(--accent-blue) 12%, transparent)"
                    : "var(--bg-elevated)",
                color:
                  !activeCategory && activeSourceIds.size === 0
                    ? "var(--accent-blue)"
                    : "var(--text-secondary)",
              }}
            >
              All
            </button>
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                onClick={() => toggleCategory(cat.value)}
                className="text-xs px-2.5 py-1 rounded-full shrink-0 transition-colors border"
                style={{
                  borderColor:
                    activeCategory === cat.value
                      ? "var(--accent-blue)"
                      : "var(--border-subtle)",
                  backgroundColor:
                    activeCategory === cat.value
                      ? "color-mix(in srgb, var(--accent-blue) 12%, transparent)"
                      : "var(--bg-elevated)",
                  color:
                    activeCategory === cat.value
                      ? "var(--accent-blue)"
                      : "var(--text-secondary)",
                }}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <hr
            className="my-2"
            style={{ borderColor: "var(--border-subtle)" }}
          />

          {/* Source chips */}
          <p
            className="text-xs font-medium uppercase tracking-wide"
            style={{ color: "var(--text-muted)" }}
          >
            Source
          </p>
          <div
            className="flex gap-1.5"
            style={{ overflowX: "auto", whiteSpace: "nowrap" }}
          >
            {sources.map((source) => {
              const isActive = activeSourceIds.has(source.id);
              return (
                <button
                  key={source.id}
                  onClick={() => toggleSource(source.id)}
                  className="text-xs px-2.5 py-1 rounded-full shrink-0 transition-colors border"
                  style={{
                    borderColor: isActive
                      ? "var(--accent-blue)"
                      : "var(--border-subtle)",
                    backgroundColor: isActive
                      ? "color-mix(in srgb, var(--accent-blue) 12%, transparent)"
                      : "var(--bg-elevated)",
                    color: isActive
                      ? "var(--accent-blue)"
                      : "var(--text-secondary)",
                  }}
                >
                  {source.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* New items */}
      {newItems.length > 0 && (
        <div className="flex flex-col gap-2">
          <p
            className="text-xs font-medium uppercase tracking-wide"
            style={{ color: "var(--text-muted)" }}
          >
            New ({filteredNew.length}
            {activeSourceIds.size > 0 ? ` filtered` : ""})
          </p>
          {filteredNew.length === 0 ? (
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              No new items from selected sources.
            </p>
          ) : (
            <>
              {visibleNew.map((item) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  sources={sources}
                  onRefresh={() => router.refresh()}
                />
              ))}
              {hiddenCount > 0 && (
                <button
                  onClick={() => setShowAll(true)}
                  className="text-xs py-1.5 rounded text-center transition-colors"
                  style={{
                    color: "var(--accent-blue)",
                    backgroundColor: "var(--bg-elevated)",
                  }}
                >
                  Show {hiddenCount} more
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* Ingested items */}
      {ingestedItems.length > 0 && (
        <>
          {newItems.length > 0 && (
            <div
              className="my-1 border-t"
              style={{ borderColor: "var(--border-subtle)" }}
            />
          )}
          <div className="flex flex-col gap-2">
            <p
              className="text-xs font-medium uppercase tracking-wide"
              style={{ color: "var(--text-muted)" }}
            >
              Ingested ({ingestedItems.length})
            </p>
            {ingestedItems.map((item) => {
              const source = sourceForItem(item, sources);
              return (
                <div
                  key={item.id}
                  className="rounded-md p-3 flex flex-col gap-1"
                  style={{
                    backgroundColor: "var(--bg-elevated)",
                    opacity: 0.7,
                  }}
                >
                  <div className="flex items-center gap-2">
                    <p
                      className="text-sm truncate flex-1"
                      style={{ color: "var(--text-secondary)" }}
                      title={item.title ?? item.item_url}
                    >
                      {item.title || item.item_url}
                    </p>
                    <span
                      className="text-xs font-mono px-1.5 py-0.5 rounded shrink-0"
                      style={{
                        backgroundColor: "var(--bg-surface)",
                        color: "var(--text-muted)",
                      }}
                    >
                      {source?.source_regulator ?? "—"}
                    </span>
                  </div>
                  {item.document_id && (
                    <a
                      href="/"
                      className="text-xs"
                      style={{ color: "var(--accent-blue)" }}
                    >
                      → View findings on dashboard
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
