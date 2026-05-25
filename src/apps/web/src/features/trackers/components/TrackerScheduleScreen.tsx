import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/atoms/button";
import { Checkbox } from "@/components/atoms/checkbox";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/atoms/select";
import { PageHeader } from "@/components/molecules/PageHeader";
import { LoadingPage } from "@/components/molecules/LoadingPage";
import { TRACKERS_COPY } from "@/content/trackers";
import { useTrackerScheduleSetup, useConfigureTrackerSchedule } from "../hooks/useTrackerSchedule";
import { useRunScan } from "../hooks/useScans";
import { ScanProgressScreen } from "./ScanProgressScreen";

interface TrackerScheduleScreenProps {
  trackerId: string;
}

const CADENCES = ["OnDemand", "Daily", "Weekly"] as const;
const CADENCE_LABELS = TRACKERS_COPY.schedule.cadence as Record<string, string>;

export function TrackerScheduleScreen({ trackerId }: TrackerScheduleScreenProps) {
  const setup = useTrackerScheduleSetup(trackerId);
  const configure = useConfigureTrackerSchedule(trackerId);
  const runScan = useRunScan(trackerId);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [cadence, setCadence] = useState("Daily");
  const [scanStarted, setScanStarted] = useState(false);

  const data = setup.data;
  useEffect(() => {
    if (!data) return;
    setSelected(new Set(data.selectedPlatformIds));
    setCadence(data.cadence);
  }, [data]);

  if (setup.isLoading) return <LoadingPage />;
  if (!data) return null;

  // Activate runs the first scan immediately; hand off to the live progress view.
  if (scanStarted) {
    return <ScanProgressScreen trackerId={trackerId} />;
  }

  const scanChecks = data.activePromptCount * selected.size;
  const busy = configure.isPending || runScan.isPending;

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
      {
        platformIds: [...selected],
        cadence,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      { onSuccess: () => runScan.mutate(undefined, { onSuccess: () => setScanStarted(true) }) },
    );
  }

  return (
    <div className="mx-auto max-w-xl p-4">
      <PageHeader
        title={TRACKERS_COPY.schedule.title}
        description={TRACKERS_COPY.schedule.description.replace("{brandName}", data.trackerName)}
      />

      <div className="mt-5 space-y-5">
        <div>
          <div className="mb-2 text-[11px] font-medium uppercase tracking-wide text-neutral-400">
            {TRACKERS_COPY.schedule.platformsLabel}
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {data.platforms.map((p) => (
              <div
                key={p.id}
                onClick={() => toggle(p.id)}
                className="flex cursor-pointer items-center gap-3 rounded-lg border border-neutral-200 p-3 transition-colors hover:border-neutral-300"
              >
                <Checkbox
                  checked={selected.has(p.id)}
                  onCheckedChange={() => toggle(p.id)}
                  onClick={(e) => e.stopPropagation()}
                />
                <span className="text-sm font-medium text-neutral-900">{p.name}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-2 text-[11px] font-medium uppercase tracking-wide text-neutral-400">
            {TRACKERS_COPY.schedule.cadenceLabel}
          </div>
          <Select value={cadence} onValueChange={setCadence}>
            <SelectTrigger className="w-full sm:w-56">
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

        <div className="rounded-lg bg-surface-page px-4 py-3 text-sm text-neutral-600">
          {selected.size === 0
            ? TRACKERS_COPY.schedule.noPlatforms
            : TRACKERS_COPY.schedule.estimate
                .replace("{prompts}", String(data.activePromptCount))
                .replace("{platforms}", String(selected.size))
                .replace("{checks}", String(scanChecks))}
        </div>

        <Button
          onClick={handleActivate}
          disabled={selected.size === 0 || busy}
          className="w-full gap-2"
          size="lg"
        >
          {busy ? TRACKERS_COPY.schedule.activating : TRACKERS_COPY.schedule.activate}
          {!busy && <ArrowRight className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
