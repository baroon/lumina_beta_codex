import { useEffect, useState } from "react";
import {
  ArrowRight,
  Radar,
  Bot,
  CalendarClock,
  FileText,
  Globe,
  ListChecks,
  Mail,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/atoms/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/atoms/card";
import { Checkbox } from "@/components/atoms/checkbox";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/atoms/select";
import { LoadingPage } from "@/components/molecules/LoadingPage";
import { cn } from "@/lib/utils";
import { TRACKERS_COPY } from "@/content/trackers";
import { useTrackerScheduleSetup, useConfigureTrackerSchedule } from "../hooks/useTrackerSchedule";
import { useRunScan } from "../hooks/useScans";
import { ScanProgressScreen } from "./ScanProgressScreen";

interface TrackerScheduleScreenProps {
  trackerId: string;
}

const CADENCES = ["OnDemand", "Daily", "Weekly"] as const;
const CADENCE_LABELS = TRACKERS_COPY.schedule.cadence as Record<string, string>;

function browserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

// Curated common zones; the user's detected/selected zone is always merged in.
const COMMON_TIMEZONES = [
  "UTC",
  "America/Los_Angeles",
  "America/Denver",
  "America/Chicago",
  "America/New_York",
  "America/Sao_Paulo",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Madrid",
  "Europe/Moscow",
  "Africa/Lagos",
  "Africa/Cairo",
  "Africa/Johannesburg",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Shanghai",
  "Asia/Tokyo",
  "Asia/Seoul",
  "Australia/Sydney",
  "Pacific/Auckland",
];

function buildTimezones(current: string): string[] {
  return [
    ...new Set<string>([browserTimezone(), current, ...COMMON_TIMEZONES].filter(Boolean)),
  ].sort();
}

function SectionLabel({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <div className="mb-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-neutral-400">
      <Icon className="h-3.5 w-3.5" />
      {label}
    </div>
  );
}

export function TrackerScheduleScreen({ trackerId }: TrackerScheduleScreenProps) {
  const setup = useTrackerScheduleSetup(trackerId);
  const configure = useConfigureTrackerSchedule(trackerId);
  const runScan = useRunScan(trackerId);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [cadence, setCadence] = useState("Daily");
  const [timezone, setTimezone] = useState("UTC");
  const [scanStarted, setScanStarted] = useState(false);
  const [reportPrepared, setReportPrepared] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const data = setup.data;
  useEffect(() => {
    if (!data) return;
    setSelected(new Set(data.selectedPlatformIds));
    setCadence(data.cadence);
    // Default to the user's browser zone unless they've already chosen one.
    setTimezone(data.timezone === "UTC" ? browserTimezone() : data.timezone);
  }, [data]);

  if (setup.isLoading) return <LoadingPage />;
  if (!data) return null;

  // Activate runs the first scan immediately; hand off to the live progress view.
  if (scanStarted) {
    return <ScanProgressScreen trackerId={trackerId} />;
  }

  const scanChecks = data.activePromptCount * selected.size;
  const hasPlatforms = selected.size > 0;
  const busy = configure.isPending || runScan.isPending;
  const zones = buildTimezones(timezone);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleActivate() {
    configure.mutate(
      { platformIds: [...selected], cadence, timezone },
      { onSuccess: () => runScan.mutate(undefined, { onSuccess: () => setScanStarted(true) }) },
    );
  }

  function prepareReportDefaults() {
    setReportPrepared(true);
    setNotice(
      TRACKERS_COPY.schedule.reportNotice.replace("{cadence}", CADENCE_LABELS[cadence] ?? cadence),
    );
  }

  return (
    <div className="mx-auto max-w-xl p-4">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary-50 text-primary-600">
              <Radar className="h-5 w-5" />
            </div>
            <CardTitle>{TRACKERS_COPY.schedule.title}</CardTitle>
          </div>
          <CardDescription>
            {TRACKERS_COPY.schedule.description.replace("{brandName}", data.trackerName)}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {notice && (
            <div className="rounded-md border border-primary-200 bg-primary-50 px-3 py-2 text-sm text-primary-800">
              {notice}
            </div>
          )}

          <div>
            <SectionLabel icon={Bot} label={TRACKERS_COPY.schedule.platformsLabel} />
            <div className="grid gap-2 sm:grid-cols-2">
              {data.platforms.map((p) => {
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
                    />
                    <span
                      className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
                        disabled
                          ? "bg-neutral-100 text-neutral-300"
                          : isSelected
                            ? "bg-primary-100 text-primary-700"
                            : "bg-neutral-100 text-neutral-500",
                      )}
                    >
                      <Bot className="h-4 w-4" />
                    </span>
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
              <SectionLabel icon={CalendarClock} label={TRACKERS_COPY.schedule.cadenceLabel} />
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
              <SectionLabel icon={Globe} label={TRACKERS_COPY.schedule.timezoneLabel} />
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

          <div className="rounded-lg border border-neutral-200 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <SectionLabel icon={FileText} label={TRACKERS_COPY.schedule.reportDefaultsLabel} />
                <p className="text-sm text-neutral-600">
                  {TRACKERS_COPY.schedule.reportDefaultsDescription}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={reportPrepared}
                onClick={prepareReportDefaults}
              >
                {reportPrepared
                  ? TRACKERS_COPY.schedule.reportPrepared
                  : TRACKERS_COPY.schedule.prepareReport}
              </Button>
            </div>
            <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
              <ReportDefaultItem
                label={TRACKERS_COPY.schedule.reportFormatLabel}
                value={TRACKERS_COPY.schedule.reportFormat}
              />
              <ReportDefaultItem
                label={TRACKERS_COPY.schedule.reportCadenceLabel}
                value={CADENCE_LABELS[cadence] ?? cadence}
              />
              <ReportDefaultItem
                label={TRACKERS_COPY.schedule.reportRecipientsLabel}
                value={TRACKERS_COPY.schedule.reportRecipients}
                icon={Mail}
              />
            </div>
          </div>

          <div
            className={cn(
              "flex items-center gap-3 rounded-lg border px-4 py-3",
              hasPlatforms
                ? "border-primary-100 bg-primary-50"
                : "border-neutral-200 bg-surface-page",
            )}
          >
            <span
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-md",
                hasPlatforms ? "bg-white text-primary-600" : "bg-neutral-100 text-neutral-400",
              )}
            >
              <ListChecks className="h-5 w-5" />
            </span>
            <span className="text-sm text-neutral-600">
              {hasPlatforms
                ? TRACKERS_COPY.schedule.estimate
                    .replace("{prompts}", String(data.activePromptCount))
                    .replace("{platforms}", String(selected.size))
                    .replace("{checks}", String(scanChecks))
                : TRACKERS_COPY.schedule.noPlatforms}
            </span>
          </div>

          <Button
            onClick={handleActivate}
            disabled={!hasPlatforms || busy}
            className="w-full gap-2"
            size="lg"
          >
            {busy ? TRACKERS_COPY.schedule.activating : TRACKERS_COPY.schedule.activate}
            {!busy && <ArrowRight className="h-4 w-4" />}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function ReportDefaultItem({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon?: LucideIcon;
}) {
  return (
    <div className="rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2">
      <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-neutral-500">
        {Icon && <Icon className="h-3.5 w-3.5" aria-hidden="true" />}
        {label}
      </div>
      <div className="mt-1 text-sm font-medium text-neutral-900">{value}</div>
    </div>
  );
}
