import { useState } from "react";
import { Badge } from "@/components/atoms/badge";
import { Card, CardContent } from "@/components/atoms/card";
import { Input } from "@/components/atoms/input";
import { ErrorPage } from "@/components/molecules/ErrorPage";
import { LoadingPage } from "@/components/molecules/LoadingPage";
import { PageHeader } from "@/components/molecules/PageHeader";
import { SectionHeader } from "@/components/molecules/SectionHeader";
import { defaultDateRangeSelection } from "@/components/molecules/DateRangePicker";
import { useTrackerScope } from "@/hooks/useTrackerScope";
import { useWorkspacePrompts } from "@/features/reports/hooks/useWorkspacePrompts";
import { cn } from "@/lib/utils";
import type { WorkspacePromptRowDto } from "@/types/api";

/**
 * Workspace-wide prompt inventory at /prompts. v1: lists every active
 * prompt across selected trackers with scan-count + last-scan + platform
 * coverage. Search filters by prompt text + lens name + topic name.
 * Analytical columns (visibility / sentiment / position / mention count)
 * land when the BE adds the heavier per-prompt aggregations.
 */
export function PromptsScreen() {
  const { scope } = useTrackerScope();
  const trackerIds = scope === "all" ? [] : scope;
  const prompts = useWorkspacePrompts(defaultDateRangeSelection(), trackerIds);
  const [query, setQuery] = useState("");

  if (prompts.isLoading) return <LoadingPage />;
  if (prompts.isError) {
    return (
      <ErrorPage
        error={prompts.error instanceof Error ? prompts.error : undefined}
        onReset={() => void prompts.refetch()}
      />
    );
  }
  if (!prompts.data) return null;

  const rows = filterRows(prompts.data.prompts, query);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Prompts"
        description="Active prompts across the selected trackers, with scan activity and platform coverage."
      />

      <Card>
        <CardContent className="space-y-3 p-4">
          <SectionHeader
            title="Prompt inventory"
            meta={
              <span className="text-xs text-neutral-500">
                {rows.length} of {prompts.data.prompts.length} prompts
              </span>
            }
          />
          <Input
            inputSize="sm"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter by prompt, lens, or topic…"
            aria-label="Filter prompts"
          />
          {rows.length === 0 ? (
            <p className="text-xs text-neutral-500">
              {prompts.data.prompts.length === 0
                ? "No active prompts in scope yet. Trackers populate this page once their prompts are confirmed."
                : `No prompts match "${query}".`}
            </p>
          ) : (
            <PromptsTable rows={rows} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Search filter — pure + exported for testing
// ---------------------------------------------------------------------------

export function filterRows(
  rows: readonly WorkspacePromptRowDto[],
  query: string,
): WorkspacePromptRowDto[] {
  const q = query.trim().toLowerCase();
  if (q === "") return [...rows];
  return rows.filter((r) => {
    if (r.text.toLowerCase().includes(q)) return true;
    if (r.lensName.toLowerCase().includes(q)) return true;
    if (r.topics.some((t) => t.toLowerCase().includes(q))) return true;
    if (r.trackerName.toLowerCase().includes(q)) return true;
    if (r.brandName.toLowerCase().includes(q)) return true;
    return false;
  });
}

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

function PromptsTable({ rows }: { rows: readonly WorkspacePromptRowDto[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead className="bg-neutral-50 uppercase tracking-wide text-neutral-500">
          <tr>
            <Th>Prompt</Th>
            <Th>Lens · Topics</Th>
            <Th>Tracker</Th>
            <Th className="text-right">Scans</Th>
            <Th>Platforms</Th>
            <Th>Last scan</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {rows.map((row) => (
            <PromptRow key={row.promptId} row={row} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PromptRow({ row }: { row: WorkspacePromptRowDto }) {
  return (
    <tr>
      <Td>
        <span className="text-neutral-900">{row.text}</span>
      </Td>
      <Td>
        <div className="flex flex-wrap items-center gap-1">
          <Badge variant="secondary" className="text-[10px]">
            {row.lensName}
          </Badge>
          {row.topics.slice(0, 3).map((t) => (
            <Badge key={t} variant="outline" className="text-[10px]">
              {t}
            </Badge>
          ))}
          {row.topics.length > 3 && (
            <span className="text-[10px] text-neutral-400">+{row.topics.length - 3}</span>
          )}
        </div>
      </Td>
      <Td>
        <div className="flex flex-col">
          <span className="text-neutral-900">{row.brandName}</span>
          <span className="text-[10px] text-neutral-500">{row.trackerName}</span>
        </div>
      </Td>
      <Td className="text-right tabular-nums">{row.scanCount}</Td>
      <Td>
        <div className="flex flex-wrap gap-1">
          {row.platformCodes.length === 0 ? (
            <span className="text-neutral-400">—</span>
          ) : (
            row.platformCodes.map((p) => (
              <Badge key={p} variant="outline" className="text-[10px] lowercase">
                {p}
              </Badge>
            ))
          )}
        </div>
      </Td>
      <Td>
        {row.lastScanAt ? (
          formatRelativeDate(row.lastScanAt)
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

/** Compact "2d ago" / "3h ago" / "just now" string for a recent timestamp. */
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
