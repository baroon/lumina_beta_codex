import { useMemo, useState } from "react";
import { Badge } from "@/components/atoms/badge";
import { Card, CardContent } from "@/components/atoms/card";
import { Input } from "@/components/atoms/input";
import { ErrorPage } from "@/components/molecules/ErrorPage";
import { LoadingPage } from "@/components/molecules/LoadingPage";
import { PageHeader } from "@/components/molecules/PageHeader";
import { SectionHeader } from "@/components/molecules/SectionHeader";
import { defaultDateRangeSelection } from "@/components/molecules/DateRangePicker";
import { useTrackerScope } from "@/hooks/useTrackerScope";
import { useWorkspaceDomains } from "@/features/reports/hooks/useWorkspaceDomains";
import { cn } from "@/lib/utils";
import type { WorkspaceDomainRowDto } from "@/types/api";

/**
 * Workspace-wide domain-level citation source view at /sources/domains.
 * v1: per-domain table with retrieved-in-scans, citation count, last
 * seen, and source-type classification. Right-rail source-type donut +
 * trend chart land in follow-up polish.
 */
export function DomainsScreen() {
  const { scope } = useTrackerScope();
  const trackerIds = scope === "all" ? [] : scope;
  const domains = useWorkspaceDomains(defaultDateRangeSelection(), trackerIds);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string | null>(null);

  const allRows = domains.data?.domains ?? [];
  const typeCounts = useMemo(() => countByType(allRows), [allRows]);
  const filteredRows = useMemo(
    () => filterDomains(allRows, query, typeFilter),
    [allRows, query, typeFilter],
  );

  if (domains.isLoading) return <LoadingPage />;
  if (domains.isError) {
    return (
      <ErrorPage
        error={domains.error instanceof Error ? domains.error : undefined}
        onReset={() => void domains.refetch()}
      />
    );
  }
  if (!domains.data) return null;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Source domains"
        description="Domain-level citation aggregates across the selected trackers — which sources AI answers pulled from in window."
      />

      <Card>
        <CardContent className="space-y-3 p-4">
          <SectionHeader
            title="Cited domains"
            meta={
              <span className="text-xs text-neutral-500">
                {filteredRows.length} of {allRows.length} sources
              </span>
            }
          />
          <div className="flex flex-wrap items-center gap-2">
            <Input
              inputSize="sm"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter by source name or domain…"
              aria-label="Filter sources"
              className="max-w-sm"
            />
            <TypeFilterPills
              counts={typeCounts}
              selected={typeFilter}
              onSelect={(t) => setTypeFilter((current) => (current === t ? null : t))}
            />
          </div>

          {filteredRows.length === 0 ? (
            <p className="text-xs text-neutral-500">
              {allRows.length === 0
                ? "No cited sources in scope yet. Once scans complete with citations, this page populates automatically."
                : "No sources match your filter."}
            </p>
          ) : (
            <DomainsTable rows={filteredRows} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Filtering + counting — pure helpers, exported for testing
// ---------------------------------------------------------------------------

/** Case-insensitive name / domain filter + optional sourceType filter. */
export function filterDomains(
  rows: readonly WorkspaceDomainRowDto[],
  query: string,
  typeFilter: string | null,
): WorkspaceDomainRowDto[] {
  const q = query.trim().toLowerCase();
  return rows.filter((r) => {
    if (typeFilter && r.sourceType !== typeFilter) return false;
    if (q === "") return true;
    if (r.sourceName.toLowerCase().includes(q)) return true;
    if (r.normalizedDomain && r.normalizedDomain.toLowerCase().includes(q)) return true;
    return false;
  });
}

/** Counts per SourceType across the unfiltered row set (drives the pill chips). */
export function countByType(rows: readonly WorkspaceDomainRowDto[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of rows) {
    out[r.sourceType] = (out[r.sourceType] ?? 0) + 1;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Type filter pills
// ---------------------------------------------------------------------------

function TypeFilterPills({
  counts,
  selected,
  onSelect,
}: {
  counts: Record<string, number>;
  selected: string | null;
  onSelect: (t: string) => void;
}) {
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1">
      {entries.map(([type, count]) => {
        const isSelected = selected === type;
        return (
          <button
            key={type}
            type="button"
            onClick={() => onSelect(type)}
            aria-pressed={isSelected}
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium transition",
              isSelected
                ? "border-primary-600 bg-primary-100 text-primary-700"
                : "border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50",
            )}
          >
            <span>{type}</span>
            <span className="tabular-nums text-neutral-400">{count}</span>
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

function DomainsTable({ rows }: { rows: readonly WorkspaceDomainRowDto[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead className="bg-neutral-50 uppercase tracking-wide text-neutral-500">
          <tr>
            <Th>Source</Th>
            <Th>Type</Th>
            <Th className="text-right">Citations</Th>
            <Th className="text-right">Scans</Th>
            <Th className="text-right">Authority</Th>
            <Th>Last seen</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {rows.map((row) => (
            <tr key={row.sourceId}>
              <Td>
                <div className="flex flex-col">
                  <span className="text-neutral-900">{row.sourceName}</span>
                  {row.normalizedDomain && (
                    <span className="text-[10px] text-neutral-500">{row.normalizedDomain}</span>
                  )}
                </div>
              </Td>
              <Td>
                <Badge variant="secondary" className="text-[10px]">
                  {row.sourceType}
                </Badge>
              </Td>
              <Td className="text-right tabular-nums">{row.citationCount}</Td>
              <Td className="text-right tabular-nums">{row.retrievedInScans}</Td>
              <Td className="text-right tabular-nums">
                {row.authorityScore == null ? (
                  <span className="text-neutral-400">—</span>
                ) : (
                  <span className="text-neutral-700">{Math.round(row.authorityScore)}</span>
                )}
              </Td>
              <Td>
                {row.lastSeenAt ? (
                  formatRelativeDate(row.lastSeenAt)
                ) : (
                  <span className="text-neutral-400">never</span>
                )}
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th scope="col" className={cn("px-3 py-2 text-left text-[10px] font-medium", className)}>
      {children}
    </th>
  );
}

function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={cn("px-3 py-2 align-top text-neutral-700", className)}>{children}</td>;
}

function formatRelativeDate(iso: string): string {
  try {
    const diffMs = Date.now() - new Date(iso).getTime();
    if (diffMs < 0) return "in future";
    const minutes = Math.round(diffMs / 60_000);
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.round(hours / 24);
    if (days < 30) return `${days}d ago`;
    const months = Math.round(days / 30);
    return `${months}mo ago`;
  } catch {
    return iso;
  }
}
