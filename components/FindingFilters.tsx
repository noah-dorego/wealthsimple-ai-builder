"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Checkbox } from "@/components/ui/checkbox";
import type { Severity, SourceRegulator, ProductKey } from "@/lib/types";

const SEVERITIES: { value: Severity; label: string; color: string }[] = [
  { value: "critical", label: "Critical", color: "var(--severity-critical)" },
  { value: "high", label: "High", color: "var(--severity-high)" },
  { value: "medium", label: "Medium", color: "var(--severity-medium)" },
  { value: "low", label: "Low", color: "var(--severity-low)" },
];

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

const PRODUCTS: { value: ProductKey; label: string }[] = [
  { value: "RRSP", label: "RRSP" },
  { value: "TFSA", label: "TFSA" },
  { value: "FHSA", label: "FHSA" },
  { value: "TRADING", label: "Trading" },
  { value: "CRYPTO", label: "Crypto" },
  { value: "MANAGED_INVESTING", label: "Managed Investing" },
  { value: "AML_KYC", label: "AML / KYC" },
  { value: "TAX_FILING", label: "Tax Filing" },
  { value: "CREDIT_CARD", label: "Credit Card" },
  { value: "CHEQUING", label: "Chequing" },
];

export function FindingFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const activeSeverities = (searchParams.get("severity")?.split(",") ??
    []) as Severity[];
  const activeRegulator = searchParams.get("source_regulator") ?? "";
  const activeProduct = searchParams.get("product") ?? "";

  const hasFilters =
    activeSeverities.length > 0 || activeRegulator || activeProduct;

  function update(key: string, value: string | null) {
    const next = new URLSearchParams(searchParams.toString());
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    router.push("?" + next.toString());
  }

  function toggleSeverity(value: Severity) {
    const next = activeSeverities.includes(value)
      ? activeSeverities.filter((v) => v !== value)
      : [...activeSeverities, value];
    update("severity", next.length > 0 ? next.join(",") : null);
  }

  const selectStyle = {
    backgroundColor: "var(--bg-elevated)",
    borderColor: "var(--border-default)",
    color: "var(--text-primary)",
  };

  return (
    <div
      className="w-[200px] shrink-0 rounded-lg border p-4 space-y-5"
      style={{
        borderColor: "var(--border-subtle)",
        backgroundColor: "var(--bg-surface)",
      }}
    >
      <div className="flex items-center justify-between">
        <span
          className="text-xs font-semibold"
          style={{ color: "var(--text-secondary)" }}
        >
          Filters
        </span>
        {hasFilters && (
          <button
            onClick={() => router.push("/")}
            className="text-xs hover:underline"
            style={{ color: "var(--accent-blue)" }}
          >
            Clear
          </button>
        )}
      </div>

      <FilterSection label="Severity">
        {SEVERITIES.map(({ value, label, color }) => (
          <label
            key={value}
            className="flex items-center gap-2 cursor-pointer select-none"
          >
            <Checkbox
              checked={activeSeverities.includes(value)}
              onCheckedChange={() => toggleSeverity(value)}
            />
            <span
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ backgroundColor: color }}
            />
            <span
              className="text-xs"
              style={{ color: "var(--text-secondary)" }}
            >
              {label}
            </span>
          </label>
        ))}
      </FilterSection>

      <FilterSection label="Regulator">
        <select
          value={activeRegulator}
          onChange={(e) => update("source_regulator", e.target.value || null)}
          className="w-full rounded border px-2 py-1.5 text-xs"
          style={selectStyle}
        >
          <option value="">All regulators</option>
          {REGULATORS.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </FilterSection>

      <FilterSection label="Product">
        <select
          value={activeProduct}
          onChange={(e) => update("product", e.target.value || null)}
          className="w-full rounded border px-2 py-1.5 text-xs"
          style={selectStyle}
        >
          <option value="">All products</option>
          {PRODUCTS.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </FilterSection>
    </div>
  );
}

function FilterSection({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div
        className="text-xs font-medium"
        style={{ color: "var(--text-muted)" }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}
