import { useMemo, useState } from "react";
import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/atoms/badge";
import { Card, CardContent } from "@/components/atoms/card";
import { Input } from "@/components/atoms/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/atoms/select";
import { ErrorPage } from "@/components/molecules/ErrorPage";
import { LoadingPage } from "@/components/molecules/LoadingPage";
import { PageHeader } from "@/components/molecules/PageHeader";
import { SectionHeader } from "@/components/molecules/SectionHeader";
import { SourceTypeDropdown } from "@/components/molecules/SourceTypeDropdown";
import { defaultDateRangeSelection } from "@/components/molecules/DateRangePicker";
import { useTrackerScope } from "@/hooks/useTrackerScope";
import { useSourceTypes } from "@/features/reports/hooks/useSourceTypes";
import {
  useUpdateWorkspaceSourceClassification,
  useWorkspaceBrandsForClassification,
} from "@/features/reports/hooks/useUpdateWorkspaceSourceClassification";
import { useWorkspaceUrls } from "@/features/reports/hooks/useWorkspaceUrls";
import { cn } from "@/lib/utils";
import type { SourceTypeReferenceDto, WorkspaceUrlRowDto } from "@/types/api";

/**
 * Workspace-wide URL-level citation source view at /sources/urls.
 * v1: per-URL table with citation count, scans count, source type,
 * and last seen. Same shape as DomainsScreen but at URL granularity —
 * mentioned-source citations without a URL only appear on the domains
 * page. Source-type editing mutates the underlying Source (not the
 * URL), so multiple URL rows sharing a Source flip together after
 * the cache invalidates.
 */
export function SourceUrlsScreen() {
  const { scope } = useTrackerScope();
  const trackerIds = scope === "all" ? [] : scope;
  const urlsQuery = useWorkspaceUrls(defaultDateRangeSelection(), trackerIds);
  const brands = useWorkspaceBrandsForClassification();
  const sourceTypes = useSourceTypes();
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [classifyingBrandId, setClassifyingBrandId] = useState<string | null>(null);

  const brandsList = brands.data ?? [];
  const effectiveClassifyingBrandId =
    classifyingBrandId ?? (brandsList.length > 0 ? brandsList[0].id : null);

  const allRows = urlsQuery.data?.urls ?? [];
  const typeCounts = useMemo(() => countByType(allRows), [allRows]);
  const filteredRows = useMemo(
    () => filterUrls(allRows, query, typeFilter),
    [allRows, query, typeFilter],
  );

  if (urlsQuery.isLoading) return <LoadingPage />;
  if (urlsQuery.isError) {
    return (
      <ErrorPage
        error={urlsQuery.error instanceof Error ? urlsQuery.error : undefined}
        onReset={() => void urlsQuery.refetch()}
      />
    );
  }
  if (!urlsQuery.data) return null;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Source URLs"
        description="URL-level citation aggregates across the selected trackers — which specific pages AI answers pulled from."
      />

      <Card>
        <CardContent className="space-y-3 p-4">
          <SectionHeader
            title="Cited URLs"
            meta={
              <span className="text-xs text-neutral-500">
                {filteredRows.length} of {allRows.length} URLs
              </span>
            }
          />
          <div className="flex flex-wrap items-center gap-2">
            <Input
              inputSize="sm"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter by URL, title, or domain…"
              aria-label="Filter URLs"
              className="max-w-sm"
            />
            <TypeFilterPills
              counts={typeCounts}
              selected={typeFilter}
              onSelect={(t) => setTypeFilter((current) => (current === t ? null : t))}
            />
            {brandsList.length > 1 && (
              <ClassifyingBrandPicker
                brands={brandsList.map((b) => ({ id: b.id, name: b.name }))}
                value={effectiveClassifyingBrandId}
                onChange={setClassifyingBrandId}
              />
            )}
          </div>

          {filteredRows.length === 0 ? (
            <p className="text-xs text-neutral-500">
              {allRows.length === 0
                ? "No cited URLs in scope yet. Mentioned-source citations without a URL still appear on the Domains page."
                : "No URLs match your filter."}
            </p>
          ) : (
            <UrlsTable
              rows={filteredRows}
              classifyingBrandId={effectiveClassifyingBrandId}
              sourceTypes={sourceTypes.data ?? []}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pure helpers — exported for unit testing
// ---------------------------------------------------------------------------

export function filterUrls(
  rows: readonly WorkspaceUrlRowDto[],
  query: string,
  typeFilter: string | null,
): WorkspaceUrlRowDto[] {
  const q = query.trim().toLowerCase();
  return rows.filter((r) => {
    if (typeFilter && r.sourceType !== typeFilter) return false;
    if (q === "") return true;
    if (r.url.toLowerCase().includes(q)) return true;
    if (r.title && r.title.toLowerCase().includes(q)) return true;
    if (r.normalizedDomain && r.normalizedDomain.toLowerCase().includes(q)) return true;
    if (r.sourceName.toLowerCase().includes(q)) return true;
    return false;
  });
}

export function countByType(rows: readonly WorkspaceUrlRowDto[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of rows) {
    out[r.sourceType] = (out[r.sourceType] ?? 0) + 1;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ClassifyingBrandPicker({
  brands,
  value,
  onChange,
}: {
  brands: readonly { id: string; name: string }[];
  value: string | null;
  onChange: (id: string) => void;
}) {
  return (
    <div className="ml-auto flex items-center gap-2">
      <span className="text-[10px] uppercase tracking-wide text-neutral-500">Classifying for</span>
      <Select value={value ?? undefined} onValueChange={onChange}>
        <SelectTrigger selectSize="sm" className="w-[160px]" aria-label="Classifying for brand">
          <SelectValue placeholder="Pick a brand" />
        </SelectTrigger>
        <SelectContent>
          {brands.map((b) => (
            <SelectItem key={b.id} value={b.id}>
              {b.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

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

function UrlsTable({
  rows,
  classifyingBrandId,
  sourceTypes,
}: {
  rows: readonly WorkspaceUrlRowDto[];
  classifyingBrandId: string | null;
  sourceTypes: readonly SourceTypeReferenceDto[];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead className="bg-neutral-50 uppercase tracking-wide text-neutral-500">
          <tr>
            <Th>URL</Th>
            <Th>Domain · Type</Th>
            <Th className="text-right">Citations</Th>
            <Th className="text-right">Scans</Th>
            <Th>Last seen</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {rows.map((row) => (
            <UrlRow
              key={row.sourceUrlId}
              row={row}
              classifyingBrandId={classifyingBrandId}
              sourceTypes={sourceTypes}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function UrlRow({
  row,
  classifyingBrandId,
  sourceTypes,
}: {
  row: WorkspaceUrlRowDto;
  classifyingBrandId: string | null;
  sourceTypes: readonly SourceTypeReferenceDto[];
}) {
  const update = useUpdateWorkspaceSourceClassification(classifyingBrandId);
  // Match by sourceId — multiple URL rows share a Source. The error
  // surfaces on every URL row backed by the failing Source, which is
  // correct: the user knows the Source-level mutation failed.
  const errorMessage =
    update.isError && update.variables?.sourceId === row.sourceId
      ? update.error instanceof Error
        ? update.error.message
        : "Save failed — try again."
      : null;

  const canEdit = classifyingBrandId != null && sourceTypes.length > 0;

  return (
    <tr>
      <Td>
        <div className="flex flex-col">
          {row.title && <span className="text-neutral-900">{row.title}</span>}
          <a
            href={row.url}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-1 text-[10px] text-primary-600 hover:underline"
            title={row.url}
          >
            <span className="max-w-[400px] truncate">{row.normalizedUrl || row.url}</span>
            <ExternalLink className="h-2.5 w-2.5 shrink-0" aria-hidden />
          </a>
        </div>
      </Td>
      <Td>
        <div className="flex flex-col gap-1">
          <span className="text-neutral-900">{row.normalizedDomain ?? row.sourceName}</span>
          {canEdit ? (
            <SourceTypeDropdown
              value={row.sourceType}
              onChange={(next) => update.mutate({ sourceId: row.sourceId, sourceType: next })}
              sourceTypes={sourceTypes}
              disabled={update.isPending}
              ariaLabel={`Source type for ${row.sourceName}`}
            />
          ) : (
            <Badge variant="secondary" className="self-start text-[10px]">
              {row.sourceType}
            </Badge>
          )}
          {errorMessage && (
            <p className="text-[10px] text-semantic-error-600" role="alert">
              {errorMessage}
            </p>
          )}
        </div>
      </Td>
      <Td className="text-right tabular-nums">{row.citationCount}</Td>
      <Td className="text-right tabular-nums">{row.retrievedInScans}</Td>
      <Td>
        {row.lastSeenAt ? (
          formatRelativeDate(row.lastSeenAt)
        ) : (
          <span className="text-neutral-400">never</span>
        )}
      </Td>
    </tr>
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
