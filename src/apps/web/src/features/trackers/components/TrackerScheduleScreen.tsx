import { useEffect, useState } from "react";
import {
  ArrowRight,
  Radar,
  Bot,
  CalendarClock,
  Globe,
  ListChecks,
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
          <div>
            <SectionLabel icon={Bot} label={TRACKERS_COPY.schedule.platformsLabel} />
            <div className="grid gap-2 sm:grid-cols-2">
              {data.platforms.map((p) => {
                const isSelected = selected.has(p.id);
                return (
                  <div
                    key={p.id}
                    onClick={() => toggle(p.id)}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors",
                      isSelected
                        ? "border-primary-500 bg-primary-50"
                        : "border-neutral-200 hover:border-neutral-300",
                    )}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggle(p.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <span
                      className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
                        isSelected
                          ? "bg-primary-100 text-primary-700"
                          : "bg-neutral-100 text-neutral-500",
                      )}
                    >
                      <Bot className="h-4 w-4" />
                    </span>
                    <span className="text-sm font-medium text-neutral-900">{p.name}</span>
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
