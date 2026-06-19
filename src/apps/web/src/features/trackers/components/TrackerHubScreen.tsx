import { Fragment, useState } from "react";
import { Link } from "@tanstack/react-router";
import * as Dialog from "@radix-ui/react-dialog";
import {
  Activity,
  Calendar,
  ChevronDown,
  ChevronRight,
  Eye,
  MessageSquare,
  Play,
  Settings as SettingsIcon,
  Sliders,
  X,
} from "lucide-react";
import { Badge } from "@/components/atoms/badge";
import { Button } from "@/components/atoms/button";
import { Card, CardContent } from "@/components/atoms/card";
import { InlineEdit } from "@/components/atoms/inline-edit";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/atoms/select";
import { AiNarrativeSection } from "@/components/molecules/AiNarrativeSection";
import { Breadcrumb } from "@/components/molecules/Breadcrumb";
import { defaultDateRangeSelection } from "@/components/molecules/DateRangePicker";
import { EntityTrendDrillDown } from "@/components/molecules/EntityTrendDrillDown";
import { HeroRowCompact } from "@/components/molecules/HeroRowCompact";
import { ErrorPage } from "@/components/molecules/ErrorPage";
import { LoadingPage } from "@/components/molecules/LoadingPage";
import { PageHeader } from "@/components/molecules/PageHeader";
import { Tabs, type TabItem } from "@/components/molecules/Tabs";
import { ScanProgressPanel } from "@/features/trackers/components/ScanProgressPanel";
import {
  useAddCustomPrompt,
  usePrompts,
  useRemovePrompt,
  useUpdatePrompt,
} from "@/features/trackers/hooks/usePrompts";
import { useLatestScan, useRunScan, useTrackerScans } from "@/features/trackers/hooks/useScans";
import { useTrackerSummary } from "@/features/trackers/hooks/useAllTrackers";
import { useTrackerScheduleSetup } from "@/features/trackers/hooks/useTrackerSchedule";
import { useTrackerLensesSetup } from "@/features/trackers/hooks/useTrackerLenses";
import { useTrackerOverview } from "@/features/trackers/hooks/useTrackerOverview";
import { findEntityTrend } from "@/lib/entityTrend";
import { buildSignalHighlights } from "@/lib/signalHighlights";
import { cn } from "@/lib/utils";
import type {
  EntityTrendSeriesDto,
  PromptDto,
  ScanListItemDto,
  ScanStatus,
  TrackerScheduleSetup,
  WorkspaceTopEntityRowDto,
} from "@/types/api";

interface TrackerHubScreenProps {
  brandId: string;
  trackerId: string;
}

/**
 * Tabbed hub for a single Visibility Tracker. Per the locked plan
 * decision: this is the one "hub-with-tabs" survivor — other surfaces
 * are flattened into the sidebar. Tabs are mirrored to `?tab=` via the
 * Tabs molecule so refresh + shared links land on the same panel.
 *
 * All five tabs render real data. The Overview tab calls
 * `useWorkspaceOverview` scoped to this single tracker — a compact
 * summary; the deep workspace dashboard (with all filter controls) is
 * still at /overview filtered via the sidebar's tracker selector.
 */
export function TrackerHubScreen({ brandId, trackerId }: TrackerHubScreenProps) {
  const summary = useTrackerSummary(trackerId);
  const schedule = useTrackerScheduleSetup(trackerId);

  if (summary.isLoading) return <LoadingPage />;
  if (summary.isError) {
    return <ErrorPage error={summary.error instanceof Error ? summary.error : undefined} />;
  }
  if (!summary.tracker) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-sm text-neutral-600">
          Tracker not found.
        </CardContent>
      </Card>
    );
  }

  const tracker = summary.tracker;
  const cadence = schedule.data?.cadence;
  const platformCount = schedule.data?.selectedPlatformIds.length ?? 0;

  const tabs: TabItem[] = [
    {
      id: "overview",
      label: "Overview",
      icon: Eye,
      children: <OverviewTab trackerId={trackerId} />,
    },
    {
      id: "schedule",
      label: "Schedule",
      icon: Calendar,
      children: <ScheduleTab setup={schedule.data ?? null} />,
    },
    {
      id: "prompts",
      label: "AI Questions",
      icon: MessageSquare,
      children: <PromptsTab trackerId={trackerId} />,
    },
    {
      id: "lenses",
      label: "Lenses",
      icon: Sliders,
      children: <LensesTab trackerId={trackerId} brandId={brandId} />,
    },
    {
      id: "scans",
      label: "Scans",
      icon: Activity,
      children: <ScansTab trackerId={trackerId} />,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Breadcrumb
          items={[
            { label: "Brands", to: "/brands" },
            {
              label: tracker.brandName,
              to: "/brands/$brandId/profile",
              params: { brandId },
            },
            { label: tracker.name },
          ]}
        />
        <PageHeader title={tracker.name}>
          <div className="flex flex-wrap items-center gap-2">
            {cadence && (
              <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
                {cadence}
              </Badge>
            )}
            {platformCount > 0 && (
              <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                {platformCount} platform{platformCount === 1 ? "" : "s"}
              </Badge>
            )}
            <RunScanButton trackerId={trackerId} />
            <Link
              to="/brands/$brandId/trackers/$trackerId/edit"
              params={{ brandId, trackerId }}
              className="inline-flex items-center gap-1.5 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 shadow-sm hover:bg-neutral-50"
            >
              <SettingsIcon className="h-3.5 w-3.5" aria-hidden />
              Edit
            </Link>
          </div>
        </PageHeader>
      </div>

      <Tabs tabs={tabs} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Run scan now — v1: button + inline status. Drawer with live progress
// (per the locked decision) is a polish step on top of this.
// ---------------------------------------------------------------------------

function RunScanButton({ trackerId }: { trackerId: string }) {
  const [open, setOpen] = useState(false);
  const runScan = useRunScan(trackerId);
  const latest = useLatestScan(trackerId, open && (runScan.isPending || runScan.isSuccess));
  const disabled = runScan.isPending;
  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          runScan.mutate();
        }}
        disabled={disabled}
        className="inline-flex items-center gap-1.5 rounded-md bg-primary-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Play className="h-3.5 w-3.5" aria-hidden />
        {disabled ? "Starting…" : runScan.isSuccess ? "Scan started" : "Run scan now"}
      </button>
      <ScanProgressDrawer
        open={open}
        onOpenChange={setOpen}
        scan={latest.data}
        isStarting={runScan.isPending}
        isError={runScan.isError || latest.isError}
      />
    </>
  );
}

function ScanProgressDrawer({
  open,
  onOpenChange,
  scan,
  isStarting,
  isError,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scan: ScanStatus | undefined;
  isStarting: boolean;
  isError: boolean;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/20" />
        <Dialog.Content className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-neutral-200 bg-white shadow-xl">
          <div className="flex items-start justify-between gap-4 border-b border-neutral-200 p-5">
            <div>
              <Dialog.Title className="text-sm font-semibold text-neutral-900">
                Scan progress
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-xs text-neutral-500">
                {scan
                  ? `${scan.brandName} - ${scan.status}`
                  : isStarting
                    ? "Starting the scan and preparing platform checks."
                    : "Waiting for scan status."}
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                className="rounded-md p-1 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
                aria-label="Close scan progress"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </Dialog.Close>
          </div>
          <div className="flex-1 overflow-y-auto p-5">
            <ScanProgressPanel scan={scan} isStarting={isStarting} isError={isError} />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ---------------------------------------------------------------------------
// Overview tab — hero KPIs + top-entities ranking scoped to this tracker
// via `useWorkspaceOverview([trackerId])`. The full filter-laden workspace
// dashboard at /overview is still the deep-dive surface; this tab is the
// compact summary a user lands on when they open the tracker hub.
// ---------------------------------------------------------------------------

function OverviewTab({ trackerId }: { trackerId: string }) {
  const selection = defaultDateRangeSelection();
  const overview = useTrackerOverview(selection, trackerId);

  if (overview.isLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-sm text-neutral-500">
          Loading overview…
        </CardContent>
      </Card>
    );
  }
  if (overview.isError || !overview.data) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-sm text-semantic-error-600">
          Failed to load overview.
        </CardContent>
      </Card>
    );
  }

  const data = overview.data;
  // The tracker has never been scanned (or no scans in the default 30-day
  // window). Show a soft prompt rather than a wall of zeros so a brand
  // new tracker reads as "ready" instead of "broken".
  if (data.scanCount === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-sm text-neutral-500">
          No scans in the last 30 days yet. Click{" "}
          <span className="font-medium text-neutral-700">Run scan now</span> above to populate the
          overview.
        </CardContent>
      </Card>
    );
  }

  const rankedEntities = [...data.topEntities]
    .sort((a, b) => (b.visibility ?? -1) - (a.visibility ?? -1))
    .slice(0, 6);
  const highlights = buildSignalHighlights(data);

  return (
    <div className="space-y-3">
      <HeroRowCompact hero={data.hero} previousHero={data.previousHero} />
      {highlights.length > 0 && (
        <Card>
          <CardContent className="space-y-2 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              Signal highlights
            </p>
            <ul className="space-y-1 border-l-2 border-neutral-200 pl-3 text-sm text-neutral-700">
              {highlights.map((h) => (
                <li key={h.id}>{h.text}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
      <TopEntitiesCard rows={rankedEntities} series={data.series} />
      <Card>
        <CardContent className="p-4">
          <AiNarrativeSection
            selection={selection}
            trackerIds={[trackerId]}
            hasData={data.scanCount > 0}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function TopEntitiesCard({
  rows,
  series,
}: {
  rows: readonly WorkspaceTopEntityRowDto[];
  series: readonly EntityTrendSeriesDto[];
}) {
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  if (rows.length === 0) {
    return (
      <Card>
        <CardContent className="p-4 text-center text-xs text-neutral-500">
          No entities ranked yet for this tracker.
        </CardContent>
      </Card>
    );
  }
  return (
    <Card>
      <CardContent className="space-y-2 p-4">
        <div className="text-xs font-medium uppercase tracking-wide text-neutral-500">
          Top entities by visibility
        </div>
        <table className="w-full text-xs">
          <thead className="bg-neutral-50 uppercase tracking-wide text-neutral-500">
            <tr>
              <th scope="col" className="w-6 px-2 py-1.5 text-[10px]"></th>
              <th scope="col" className="w-8 px-2 py-1.5 text-right text-[10px]">
                #
              </th>
              <th scope="col" className="px-2 py-1.5 text-left text-[10px]">
                Entity
              </th>
              <th scope="col" className="px-2 py-1.5 text-right text-[10px]">
                Visibility
              </th>
              <th scope="col" className="px-2 py-1.5 text-right text-[10px]">
                Share of voice
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {rows.map((row, index) => {
              const key = `${row.entityType}:${row.entityId}`;
              const isExpanded = expandedKey === key;
              const trend = findEntityTrend(series, row.entityType, row.entityId);
              return (
                <Fragment key={key}>
                  <tr
                    className={cn(
                      "cursor-pointer transition hover:bg-neutral-50",
                      row.isTrackedBrand && "bg-primary-50/40",
                      isExpanded && "bg-neutral-50",
                    )}
                    onClick={() => setExpandedKey(isExpanded ? null : key)}
                    aria-expanded={isExpanded}
                    aria-controls={`tracker-drill-${key}`}
                  >
                    <td className="w-6 px-2 py-1.5 text-neutral-400">
                      {isExpanded ? (
                        <ChevronDown className="h-3.5 w-3.5" aria-hidden />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                      )}
                    </td>
                    <td className="w-8 px-2 py-1.5 text-right text-neutral-500 tabular-nums">
                      {index + 1}
                    </td>
                    <td className="px-2 py-1.5">
                      <span className="font-medium text-neutral-900">{row.name}</span>
                      {row.isTrackedBrand && (
                        <Badge variant="secondary" className="ml-2 text-[10px]">
                          You
                        </Badge>
                      )}
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums">
                      {row.visibility == null ? (
                        <span className="text-neutral-400">—</span>
                      ) : (
                        `${Math.round(row.visibility * 100)}%`
                      )}
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums">
                      {row.shareOfVoice == null ? (
                        <span className="text-neutral-400">—</span>
                      ) : (
                        `${Math.round(row.shareOfVoice * 100)}%`
                      )}
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr id={`tracker-drill-${key}`}>
                      <td colSpan={5} className="bg-neutral-50 p-4">
                        <EntityTrendDrillDown name={row.name} trend={trend} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Schedule tab
// ---------------------------------------------------------------------------

function ScheduleTab({ setup }: { setup: TrackerScheduleSetup | null }) {
  if (!setup) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-sm text-neutral-500">
          Schedule data is loading…
        </CardContent>
      </Card>
    );
  }
  return (
    <Card>
      <CardContent className="grid gap-4 p-4 sm:grid-cols-2">
        <Field label="Cadence">{setup.cadence}</Field>
        <Field label="Timezone">{setup.timezone}</Field>
        <Field label="Active AI Questions">{setup.activePromptCount}</Field>
        <Field label="Platforms">
          <div className="flex flex-wrap gap-1">
            {setup.platforms
              .filter((p) => setup.selectedPlatformIds.includes(p.id))
              .map((p) => (
                <Badge key={p.id} variant="secondary" className="text-xs">
                  {p.name}
                </Badge>
              ))}
            {setup.selectedPlatformIds.length === 0 && (
              <span className="text-xs text-neutral-500">No platforms selected.</span>
            )}
          </div>
        </Field>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Prompts tab — inline edit + add + remove
// ---------------------------------------------------------------------------

function PromptsTab({ trackerId }: { trackerId: string }) {
  const prompts = usePrompts(trackerId);
  const lenses = useTrackerLensesSetup(trackerId);

  if (prompts.isLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-sm text-neutral-500">
          Loading AI Questions…
        </CardContent>
      </Card>
    );
  }
  if (prompts.isError || !prompts.data) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-sm text-semantic-error-600">
          Failed to load AI Questions.
        </CardContent>
      </Card>
    );
  }

  const rows = prompts.data.prompts;
  const allocation = prompts.data.promptAllocation ?? rows.length;
  const atCap = rows.length >= allocation;
  const availableLenses = lenses.data?.lenses ?? [];

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="text-xs text-neutral-500">
          {rows.length} AI Question{rows.length === 1 ? "" : "s"} · allocation {allocation}
          {atCap && <span className="ml-2 text-semantic-warning-600">(at cap)</span>}
        </div>
        {rows.length === 0 ? (
          <p className="text-xs text-neutral-500">No AI Questions yet for this tracker.</p>
        ) : (
          <ul className="space-y-1.5">
            {rows.slice(0, 50).map((p) => (
              <PromptRow key={p.id} trackerId={trackerId} prompt={p} />
            ))}
            {rows.length > 50 && (
              <li className="text-xs text-neutral-500">Showing first 50 of {rows.length}.</li>
            )}
          </ul>
        )}
        <AddPromptForm trackerId={trackerId} lenses={availableLenses} disabled={atCap} />
      </CardContent>
    </Card>
  );
}

function PromptRow({ trackerId, prompt }: { trackerId: string; prompt: PromptDto }) {
  const update = useUpdatePrompt(trackerId);
  const remove = useRemovePrompt(trackerId);

  return (
    <li className="flex items-start justify-between gap-3 rounded-md border border-neutral-200 bg-neutral-50/40 p-2">
      <div className="min-w-0 flex-1 text-xs text-neutral-700">
        <InlineEdit
          value={prompt.text}
          onChange={(next) => {
            if (next.trim().length > 0 && next !== prompt.text) {
              update.mutate({ promptId: prompt.id, text: next });
            }
          }}
          multiline
          placeholder="AI Question text"
        />
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Badge variant="outline" className="text-[10px]">
          {prompt.lensName}
        </Badge>
        {prompt.topics.slice(0, 2).map((t) => (
          <Badge key={t} variant="secondary" className="text-[10px]">
            {t}
          </Badge>
        ))}
        <button
          type="button"
          onClick={() => remove.mutate(prompt.id)}
          disabled={remove.isPending}
          aria-label={`Remove AI Question ${prompt.text}`}
          className="rounded-sm p-0.5 text-neutral-500 hover:bg-neutral-200 hover:text-neutral-700 disabled:opacity-50"
        >
          <X className="h-3 w-3" aria-hidden />
        </button>
      </div>
    </li>
  );
}

function AddPromptForm({
  trackerId,
  lenses,
  disabled,
}: {
  trackerId: string;
  lenses: readonly { id: string; name: string }[];
  disabled: boolean;
}) {
  const add = useAddCustomPrompt(trackerId);
  const [text, setText] = useState("");
  const [lensId, setLensId] = useState<string>("");
  const errorMessage =
    add.isError && add.error instanceof Error
      ? add.error.message
      : add.isError
        ? "Add failed — try again."
        : null;

  function submit() {
    const trimmed = text.trim();
    if (!trimmed || !lensId) return;
    add.mutate(
      { text: trimmed, lensId, primaryTopicId: null },
      {
        onSuccess: () => setText(""),
      },
    );
  }

  if (lenses.length === 0) return null;
  if (lensId === "" && lenses[0]) {
    // Default the lens select to the first lens once the data lands —
    // running this in render is fine, the next setState triggers a
    // single re-render rather than an effect chain.
    setLensId(lenses[0].id);
  }

  return (
    <div className="space-y-2 border-t border-neutral-100 pt-3">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={2}
        placeholder={
          disabled ? "Allocation reached — remove an AI Question first" : "Add an AI Question…"
        }
        aria-label="Add an AI Question"
        disabled={disabled || add.isPending}
        className={cn(
          "w-full resize-y rounded-md border border-neutral-300 bg-white px-3 py-2 text-xs text-neutral-900 placeholder:text-neutral-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500",
          (disabled || add.isPending) && "cursor-not-allowed opacity-60",
        )}
      />
      <div className="flex items-center gap-2">
        <Select value={lensId} onValueChange={setLensId} disabled={disabled || add.isPending}>
          <SelectTrigger className="w-48 text-xs">
            <SelectValue placeholder="Lens" />
          </SelectTrigger>
          <SelectContent>
            {lenses.map((l) => (
              <SelectItem key={l.id} value={l.id}>
                {l.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          onClick={submit}
          disabled={disabled || add.isPending || text.trim() === "" || !lensId}
        >
          {add.isPending ? "Adding…" : "Add AI Question"}
        </Button>
        {errorMessage && <span className="text-xs text-semantic-error-600">{errorMessage}</span>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Scans tab — list filtered to this tracker
// ---------------------------------------------------------------------------

function ScansTab({ trackerId }: { trackerId: string }) {
  const { scans, isLoading, isError } = useTrackerScans(trackerId);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-sm text-neutral-500">
          Loading scans…
        </CardContent>
      </Card>
    );
  }
  if (isError) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-sm text-semantic-error-600">
          Failed to load scans.
        </CardContent>
      </Card>
    );
  }
  if (scans.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-sm text-neutral-500">
          No scans yet. Click <span className="font-medium">Run scan now</span> above to start the
          first scan.
        </CardContent>
      </Card>
    );
  }
  return (
    <Card>
      <CardContent className="space-y-1 p-2">
        <ul className="space-y-1">
          {scans.map((s) => (
            <ScanRow key={s.scanRunId} scan={s} />
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function ScanRow({ scan }: { scan: ScanListItemDto }) {
  return (
    <li>
      <Link
        to="/scans/$scanRunId/results"
        params={{ scanRunId: scan.scanRunId }}
        className="flex items-center justify-between gap-3 rounded-md border border-neutral-200 bg-white p-3 transition hover:border-neutral-300 hover:bg-neutral-50"
      >
        <div className="flex flex-col">
          <span className="text-xs text-neutral-700">
            Started {new Date(scan.startedAt).toLocaleString()}
          </span>
          <span className="text-[10px] uppercase tracking-wide text-neutral-500">
            {scan.completedCount}/{scan.scanCheckCount} checks
            {scan.failedCount > 0 && ` · ${scan.failedCount} failed`}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Badge variant={scanStatusVariant(scan.scanStatus)} className="text-[10px] uppercase">
            {scan.scanStatus}
          </Badge>
          {scan.analysisStatus && (
            <Badge variant="outline" className="text-[10px] uppercase">
              {scan.analysisStatus}
            </Badge>
          )}
        </div>
      </Link>
    </li>
  );
}

function scanStatusVariant(
  status: string,
): "default" | "secondary" | "outline" | "success" | "warning" | "destructive" {
  if (status === "Completed") return "success";
  if (status === "Failed") return "destructive";
  if (status === "Cancelled") return "outline";
  return "secondary";
}

// ---------------------------------------------------------------------------
// Lenses tab — read-only view, edit lives on TrackerEditScreen
// ---------------------------------------------------------------------------

function LensesTab({ trackerId, brandId }: { trackerId: string; brandId: string }) {
  const setup = useTrackerLensesSetup(trackerId);

  if (setup.isLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-sm text-neutral-500">
          Loading lenses…
        </CardContent>
      </Card>
    );
  }
  if (setup.isError || !setup.data) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-sm text-semantic-error-600">
          Failed to load lenses.
        </CardContent>
      </Card>
    );
  }

  const selected = new Set(setup.data.selectedLensIds);
  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-neutral-500">
            {selected.size} of {setup.data.lenses.length} Visibility Lenses active
          </span>
          <Link
            to="/brands/$brandId/trackers/$trackerId/edit"
            params={{ brandId, trackerId }}
            search={{ tab: "lenses" } as never}
            className="inline-flex items-center gap-1.5 rounded-md border border-neutral-300 bg-white px-2.5 py-1 text-[11px] font-medium text-neutral-700 hover:bg-neutral-50"
          >
            <SettingsIcon className="h-3 w-3" aria-hidden />
            Edit lenses
          </Link>
        </div>
        <ul className="grid gap-2 sm:grid-cols-2">
          {setup.data.lenses.map((lens) => {
            const isActive = selected.has(lens.id);
            return (
              <li
                key={lens.id}
                className={
                  isActive
                    ? "rounded-lg border border-primary-200 bg-primary-50/40 p-3"
                    : "rounded-lg border border-neutral-200 bg-neutral-50/40 p-3 opacity-70"
                }
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-neutral-900">{lens.name}</span>
                  <Badge variant={isActive ? "secondary" : "outline"} className="text-[10px]">
                    {isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
                {lens.description && (
                  <p className="mt-1 text-[11px] text-neutral-500">{lens.description}</p>
                )}
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Tiny shared field row
// ---------------------------------------------------------------------------

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-neutral-500">
        {label}
      </div>
      <div className="text-sm text-neutral-900">{children}</div>
    </div>
  );
}
