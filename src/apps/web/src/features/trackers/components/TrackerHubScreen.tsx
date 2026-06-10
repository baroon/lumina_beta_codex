import { Link } from "@tanstack/react-router";
import {
  Activity,
  Calendar,
  Eye,
  MessageSquare,
  Play,
  Settings as SettingsIcon,
  Sliders,
} from "lucide-react";
import { Badge } from "@/components/atoms/badge";
import { Card, CardContent } from "@/components/atoms/card";
import { Breadcrumb } from "@/components/molecules/Breadcrumb";
import { ComingSoon } from "@/components/molecules/ComingSoon";
import { ErrorPage } from "@/components/molecules/ErrorPage";
import { LoadingPage } from "@/components/molecules/LoadingPage";
import { PageHeader } from "@/components/molecules/PageHeader";
import { Tabs, type TabItem } from "@/components/molecules/Tabs";
import { usePrompts } from "@/features/trackers/hooks/usePrompts";
import { useRunScan, useTrackerScans } from "@/features/trackers/hooks/useScans";
import { useTrackerSummary } from "@/features/trackers/hooks/useAllTrackers";
import { useTrackerScheduleSetup } from "@/features/trackers/hooks/useTrackerSchedule";
import type { PromptDto, ScanListItemDto, TrackerScheduleSetup } from "@/types/api";

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
 * Schedule, Prompts, and Scans tabs render real data. Overview and
 * Lenses ship as ComingSoon placeholders — Overview needs MetricCategoryLayout
 * scoped to one tracker (downstream of step 5's scope plumbing) and
 * Lenses needs a dedicated per-tracker lens endpoint.
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
      children: (
        <ComingSoon
          icon={Eye}
          title="Per-tracker dashboard"
          description="Categorized metrics scoped to this tracker — Visibility / Recommendation / Sentiment / Competitive / Citations."
        />
      ),
    },
    {
      id: "schedule",
      label: "Schedule",
      icon: Calendar,
      children: <ScheduleTab setup={schedule.data ?? null} />,
    },
    {
      id: "prompts",
      label: "Prompts",
      icon: MessageSquare,
      children: <PromptsTab trackerId={trackerId} />,
    },
    {
      id: "lenses",
      label: "Lenses",
      icon: Sliders,
      children: (
        <ComingSoon
          icon={Sliders}
          title="Visibility Lens selection"
          description="The six Visibility Lenses currently active for this tracker."
        />
      ),
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
  const runScan = useRunScan(trackerId);
  const disabled = runScan.isPending;
  return (
    <button
      type="button"
      onClick={() => runScan.mutate()}
      disabled={disabled}
      className="inline-flex items-center gap-1.5 rounded-md bg-primary-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <Play className="h-3.5 w-3.5" aria-hidden />
      {disabled ? "Starting…" : runScan.isSuccess ? "Scan started" : "Run scan now"}
    </button>
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
        <Field label="Active prompts">{setup.activePromptCount}</Field>
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
// Prompts tab — read-only summary
// ---------------------------------------------------------------------------

function PromptsTab({ trackerId }: { trackerId: string }) {
  const prompts = usePrompts(trackerId);
  if (prompts.isLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-sm text-neutral-500">
          Loading prompts…
        </CardContent>
      </Card>
    );
  }
  if (prompts.isError || !prompts.data) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-sm text-semantic-error-600">
          Failed to load prompts.
        </CardContent>
      </Card>
    );
  }
  const rows = prompts.data.prompts;
  return (
    <Card>
      <CardContent className="space-y-2 p-4">
        <div className="text-xs text-neutral-500">
          {rows.length} prompt{rows.length === 1 ? "" : "s"} · allocation{" "}
          {prompts.data.promptAllocation}
        </div>
        {rows.length === 0 ? (
          <p className="text-xs text-neutral-500">No prompts yet for this tracker.</p>
        ) : (
          <ul className="space-y-1.5">
            {rows.slice(0, 50).map((p) => (
              <PromptRow key={p.id} prompt={p} />
            ))}
            {rows.length > 50 && (
              <li className="text-xs text-neutral-500">
                Showing first 50 of {rows.length}. The full prompt-management surface lands in the
                workspace Prompts page.
              </li>
            )}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function PromptRow({ prompt }: { prompt: PromptDto }) {
  return (
    <li className="flex items-start justify-between gap-3 rounded-md border border-neutral-200 bg-neutral-50/40 p-2">
      <span className="flex-1 text-xs text-neutral-700">{prompt.text}</span>
      <div className="flex shrink-0 gap-1">
        <Badge variant="outline" className="text-[10px]">
          {prompt.lensName}
        </Badge>
        {prompt.topics.slice(0, 2).map((t) => (
          <Badge key={t} variant="secondary" className="text-[10px]">
            {t}
          </Badge>
        ))}
      </div>
    </li>
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
