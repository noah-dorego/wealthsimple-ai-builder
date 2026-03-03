import { getFeedSources, getFeedItems } from "@/lib/db";
import { FeedInbox } from "@/components/FeedInbox";
import { FeedSourceList } from "@/components/FeedSourceList";
import { CheckAllButton } from "@/components/CheckAllButton";

export default function FeedPage() {
  const sources = getFeedSources();
  const items = getFeedItems();

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-xl font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            Regulatory Feed
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
            Monitor regulator publication pages for new bulletins
          </p>
        </div>
        <CheckAllButton />
      </div>

      <details className="group">
        <summary
          className="text-xs font-medium uppercase tracking-wide cursor-pointer select-none list-none flex items-center gap-1.5"
          style={{ color: "var(--text-muted)" }}
        >
          <span className="transition-transform group-open:rotate-90">▶</span>
          Regulators ({sources.length})
        </summary>
        <div className="mt-2">
          <FeedSourceList sources={sources} />
        </div>
      </details>

      <FeedInbox items={items} sources={sources} />
    </div>
  );
}
