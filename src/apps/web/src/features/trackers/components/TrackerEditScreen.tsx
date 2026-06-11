import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bot, Calendar, CalendarClock, Globe, MessageSquare, Sliders, Trash2 } from "lucide-react";
import { Badge } from "@/components/atoms/badge";
import { Button } from "@/components/atoms/button";
import { Card, CardContent } from "@/components/atoms/card";
import { Checkbox } from "@/components/atoms/checkbox";
import { InlineEdit } from "@/components/atoms/inline-edit";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/atoms/select";
import { Breadcrumb } from "@/components/molecules/Breadcrumb";
import { ConfirmDeleteDialog } from "@/components/molecules/ConfirmDeleteDialog";
import { ErrorPage } from "@/components/molecules/ErrorPage";
import { LoadingPage } from "@/components/molecules/LoadingPage";
import { SectionHeader } from "@/components/molecules/SectionHeader";
import { TRACKERS_COPY } from "@/content/trackers";
import { usePrompts } from "@/features/trackers/hooks/usePrompts";
import {
  useDeleteTracker,
  useRenameTracker,
  useTrackerSummary,
} from "@/features/trackers/hooks/useAllTrackers";
import {
  useConfigureTrackerSchedule,
  useTrackerScheduleSetup,
} from "@/features/trackers/hooks/useTrackerSchedule";
import {
  useTrackerLensesSetup,
  useUpdateTrackerLenses,
} from "@/features/trackers/hooks/useTrackerLenses";
import { cn } from "@/lib/utils";

interface TrackerEditScreenProps {
  brandId: string;
  trackerId: string;
}

const CADENCES = ["OnDemand", "Daily", "Weekly"] as const;
const CADENCE_LABELS = TRACKERS_COPY.schedule.cadence as Record<string, string>;

function browserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

const COMMON_TIMEZONES = [
  "UTC",
  "America/Los_Angeles",
  "America/Denver",
  "America/Chicago",
  "America/New_York",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
];

function buildTimezones(current: string): string[] {
  return [
    ...new Set<string>([browserTimezone(), current, ...COMMON_TIMEZONES].filter(Boolean)),
  ].sort();
}

/**
 * Tracker edit screen at /brands/$brandId/trackers/$trackerId/edit.
 * Currently scoped to the editable surface the backend supports:
 *
 *   Schedule (cadence + timezone + platforms) — fully editable inline,
 *   saves via useConfigureTrackerSchedule WITHOUT kicking off a scan
 *   (distinct from the create-flow TrackerScheduleScreen).
 *
 *   Prompts — read-only summary + link to the wizard prompt review.
 *   Lenses — editable checkbox picker backed by GET/PUT
 *   /api/trackers/{id}/lenses.
 *
 * Sticky "Save changes" bar appears when the schedule form is dirty.
 */
export function TrackerEditScreen({ brandId, trackerId }: TrackerEditScreenProps) {
  const summary = useTrackerSummary(trackerId);
  const setup = useTrackerScheduleSetup(trackerId);

  if (summary.isLoading || setup.isLoading) return <LoadingPage />;
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
  const data = setup.data;

  return (
    <div className="space-y-5 pb-24">
      <div className="space-y-2">
        <Breadcrumb
          items={[
            { label: "Brands", to: "/brands" },
            { label: tracker.brandName, to: "/brands/$brandId/profile", params: { brandId } },
            {
              label: tracker.name,
              to: "/brands/$brandId/trackers/$trackerId",
              params: { brandId, trackerId },
            },
            { label: "Edit" },
          ]}
        />
        <TrackerNameHeader trackerId={trackerId} trackerName={tracker.name} />
      </div>

      {data ? (
        <ScheduleSection trackerId={trackerId} setup={data} />
      ) : (
        <Card>
          <CardContent className="p-6 text-center text-sm text-neutral-500">
            Schedule data is loading…
          </CardContent>
        </Card>
      )}

      <PromptsSection trackerId={trackerId} brandId={brandId} />

      <LensesSection trackerId={trackerId} />

      <DangerZoneSection trackerId={trackerId} brandId={brandId} trackerName={tracker.name} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page title with inline-editable tracker name
// ---------------------------------------------------------------------------

function TrackerNameHeader({ trackerId, trackerName }: { trackerId: string; trackerName: string }) {
  const rename = useRenameTracker(trackerId);
  const errorMessage =
    rename.isError && rename.error instanceof Error
      ? rename.error.message
      : rename.isError
        ? "Rename failed — try again."
        : null;

  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight text-neutral-900">
        <InlineEdit
          value={trackerName}
          onChange={(next) => {
            // InlineEdit only fires onChange when the trimmed value
            // differs from the prior value, so the click-away no-op
            // path is handled there. The BE also short-circuits on
            // equal-name input, so double-coverage is fine.
            if (next.trim().length > 0) {
              rename.mutate({ name: next });
            }
          }}
          placeholder="Tracker name"
        />
      </h1>
      {errorMessage && (
        <p className="mt-1 text-xs text-semantic-error-600" role="alert">
          {errorMessage}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Danger zone — hard delete, type-to-confirm
// ---------------------------------------------------------------------------

function DangerZoneSection({
  trackerId,
  brandId,
  trackerName,
}: {
  trackerId: string;
  brandId: string;
  trackerName: string;
}) {
  const [open, setOpen] = useState(false);
  const del = useDeleteTracker(trackerId, brandId);

  return (
    <Card className="border-semantic-error-200">
      <CardContent className="space-y-3 p-4">
        <SectionHeader icon={Trash2} title="Danger zone" />
        <p className="text-xs text-neutral-600">
          Deleting this tracker permanently removes every scan run, prompt run, and recorded answer
          for it. The owning brand and its other trackers are not affected. This cannot be undone.
        </p>
        <div>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setOpen(true)}
            disabled={del.isPending}
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" aria-hidden />
            Delete tracker
          </Button>
        </div>
        <ConfirmDeleteDialog
          open={open}
          onOpenChange={setOpen}
          title="Delete tracker"
          description="This permanently deletes the tracker, every scan run, every prompt run, and every answer recorded for it. The owning brand and its other trackers are not affected."
          expectedConfirmText={trackerName}
          confirmLabel="Delete tracker"
          onConfirm={() => del.mutate()}
          isDeleting={del.isPending}
        />
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Schedule section — the only fully-editable surface for now
// ---------------------------------------------------------------------------

interface ScheduleSectionProps {
  trackerId: string;
  setup: NonNullable<ReturnType<typeof useTrackerScheduleSetup>["data"]>;
}

function ScheduleSection({ trackerId, setup }: ScheduleSectionProps) {
  const configure = useConfigureTrackerSchedule(trackerId);

  const [selected, setSelected] = useState<Set<string>>(() => new Set(setup.selectedPlatformIds));
  const [cadence, setCadence] = useState(setup.cadence);
  const [timezone, setTimezone] = useState(setup.timezone);

  // Reset local state when fresh setup data lands (e.g. after a save invalidates cache).
  useEffect(() => {
    setSelected(new Set(setup.selectedPlatformIds));
    setCadence(setup.cadence);
    setTimezone(setup.timezone);
  }, [setup.selectedPlatformIds, setup.cadence, setup.timezone]);

  const dirty = useMemo(() => {
    if (cadence !== setup.cadence) return true;
    if (timezone !== setup.timezone) return true;
    const original = new Set(setup.selectedPlatformIds);
    if (original.size !== selected.size) return true;
    for (const id of selected) if (!original.has(id)) return true;
    return false;
  }, [cadence, timezone, selected, setup]);

  const zones = buildTimezones(timezone);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleSave() {
    configure.mutate({ platformIds: [...selected], cadence, timezone });
  }

  function handleDiscard() {
    setSelected(new Set(setup.selectedPlatformIds));
    setCadence(setup.cadence);
    setTimezone(setup.timezone);
  }

  return (
    <>
      <Card>
        <CardContent className="space-y-5 p-4">
          <SectionHeader icon={Calendar} title="Schedule" />

          <div>
            <FieldLabel icon={Bot} label={TRACKERS_COPY.schedule.platformsLabel} />
            <div className="grid gap-2 sm:grid-cols-2">
              {setup.platforms.map((p) => {
                const isSelected = selected.has(p.id);
                const disabled = !p.configured;
                return (
                  <div
                    key={p.id}
                    onClick={disabled ? undefined : () => toggle(p.id)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg border p-3 transition-colors",
                      disabled
                        ? "cursor-not-allowed border-neutral-200 bg-neutral-50 opacity-60"
                        : isSelected
                          ? "cursor-pointer border-primary-500 bg-primary-50"
                          : "cursor-pointer border-neutral-200 hover:border-neutral-300",
                    )}
                  >
                    <Checkbox
                      checked={isSelected && !disabled}
                      disabled={disabled}
                      onCheckedChange={() => toggle(p.id)}
                      onClick={(e) => e.stopPropagation()}
                      aria-label={p.name}
                    />
                    <span className="flex-1 text-sm font-medium text-neutral-900">{p.name}</span>
                    {disabled && (
                      <span className="text-[11px] font-medium text-neutral-400">
                        {TRACKERS_COPY.schedule.platformNeedsKey}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel icon={CalendarClock} label={TRACKERS_COPY.schedule.cadenceLabel} />
              <Select value={cadence} onValueChange={setCadence}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CADENCES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {CADENCE_LABELS[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <FieldLabel icon={Globe} label={TRACKERS_COPY.schedule.timezoneLabel} />
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {zones.map((z) => (
                    <SelectItem key={z} value={z}>
                      {z}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {dirty && (
        <StickySaveBar
          onSave={handleSave}
          onDiscard={handleDiscard}
          isSaving={configure.isPending}
          isError={configure.isError}
          isSuccess={configure.isSuccess}
        />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Prompts section — read-only summary, defers actual edits
// ---------------------------------------------------------------------------

function PromptsSection({ trackerId, brandId }: { trackerId: string; brandId: string }) {
  const prompts = usePrompts(trackerId);
  const count = prompts.data?.count ?? 0;
  const allocation = prompts.data?.promptAllocation ?? null;
  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <SectionHeader
          icon={MessageSquare}
          title="Prompts"
          meta={
            <Badge variant="secondary" className="text-xs">
              {count}
              {allocation !== null && ` / ${allocation}`}
            </Badge>
          }
        />
        <p className="text-xs text-neutral-500">
          {count} active prompt{count === 1 ? "" : "s"} across this tracker. Add, remove, or
          regenerate prompts in the discovery wizard for now — inline prompt management lands with
          the workspace Prompts page.
        </p>
        <Link
          to="/brands/$brandId/discovery"
          params={{ brandId }}
          className="inline-flex items-center gap-1.5 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 shadow-sm hover:bg-neutral-50"
        >
          Manage prompts in discovery
        </Link>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Lenses — picker backed by GET/PUT /api/trackers/{id}/lenses
// ---------------------------------------------------------------------------

function LensesSection({ trackerId }: { trackerId: string }) {
  const setup = useTrackerLensesSetup(trackerId);
  const update = useUpdateTrackerLenses(trackerId);

  const data = setup.data;
  const [selected, setSelected] = useState<Set<string>>(() => new Set<string>());

  // Reset local state whenever fresh setup data lands (initial load or
  // post-save invalidation).
  useEffect(() => {
    if (data) setSelected(new Set(data.selectedLensIds));
  }, [data]);

  const dirty = useMemo(() => {
    if (!data) return false;
    const original = new Set(data.selectedLensIds);
    if (original.size !== selected.size) return true;
    for (const id of selected) if (!original.has(id)) return true;
    return false;
  }, [data, selected]);

  const isEmpty = selected.size === 0;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleSave() {
    if (isEmpty) return;
    update.mutate({ lensIds: [...selected] });
  }

  function handleDiscard() {
    if (data) setSelected(new Set(data.selectedLensIds));
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <SectionHeader icon={Sliders} title="Visibility Lenses" />

        {setup.isLoading ? (
          <p className="text-xs text-neutral-500">Loading lenses…</p>
        ) : setup.isError || !data ? (
          <p className="text-xs text-semantic-error-600">
            Could not load lens setup. Refresh the page to try again.
          </p>
        ) : (
          <>
            <p className="text-xs text-neutral-500">
              Pick which Visibility Lenses generate prompts for this tracker. At least one lens is
              required.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {data.lenses.map((lens) => {
                const isSelected = selected.has(lens.id);
                return (
                  <div
                    key={lens.id}
                    onClick={() => toggle(lens.id)}
                    className={cn(
                      "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors",
                      isSelected
                        ? "border-primary-500 bg-primary-50"
                        : "border-neutral-200 hover:border-neutral-300",
                    )}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggle(lens.id)}
                      onClick={(e) => e.stopPropagation()}
                      aria-label={lens.name}
                      className="mt-0.5"
                    />
                    <div className="flex-1 space-y-0.5">
                      <div className="text-sm font-medium text-neutral-900">{lens.name}</div>
                      {lens.description && (
                        <div className="text-[11px] text-neutral-500">{lens.description}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between border-t border-neutral-100 pt-3">
              <span className="text-[11px] text-neutral-500">
                {isEmpty ? (
                  <span className="text-semantic-error-600">
                    Select at least one lens before saving.
                  </span>
                ) : update.isError ? (
                  <span className="text-semantic-error-600">Save failed — try again.</span>
                ) : update.isSuccess && !dirty ? (
                  <span className="text-semantic-success-600">Saved.</span>
                ) : (
                  <>
                    {selected.size} of {data.lenses.length} lenses selected
                  </>
                )}
              </span>
              <div className="flex items-center gap-2">
                {dirty && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDiscard}
                    disabled={update.isPending}
                  >
                    Discard
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={!dirty || isEmpty || update.isPending}
                >
                  {update.isPending ? "Saving…" : "Save lenses"}
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Sticky save bar — appears only when the form is dirty
// ---------------------------------------------------------------------------

interface StickySaveBarProps {
  onSave: () => void;
  onDiscard: () => void;
  isSaving: boolean;
  isError: boolean;
  isSuccess: boolean;
}

function StickySaveBar({ onSave, onDiscard, isSaving, isError, isSuccess }: StickySaveBarProps) {
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-30 border-t border-neutral-200 bg-white/95 px-6 py-3 shadow-lg backdrop-blur"
      role="region"
      aria-label="Unsaved changes"
    >
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
        <span className="text-xs text-neutral-600">
          You have unsaved changes.
          {isError && (
            <span className="ml-2 text-semantic-error-600">Save failed — try again.</span>
          )}
          {isSuccess && <span className="ml-2 text-semantic-success-600">Saved.</span>}
        </span>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onDiscard} disabled={isSaving}>
            Discard
          </Button>
          <Button size="sm" onClick={onSave} disabled={isSaving}>
            {isSaving ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared tiny label
// ---------------------------------------------------------------------------

function FieldLabel({ icon: Icon, label }: { icon: typeof Bot; label: string }) {
  return (
    <div className="mb-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-neutral-400">
      <Icon className="h-3.5 w-3.5" />
      {label}
    </div>
  );
}
