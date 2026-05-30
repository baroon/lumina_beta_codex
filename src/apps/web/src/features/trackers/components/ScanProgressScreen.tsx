import { Link } from "@tanstack/react-router";
import { ArrowRight, BarChart3, Sparkles, Telescope } from "lucide-react";
import { Button } from "@/components/atoms/button";
import { OnboardingStepper } from "@/components/molecules/OnboardingStepper";
import { RotatingMessage } from "@/components/molecules/RotatingMessage";
import { TRACKERS_COPY } from "@/content/trackers";
import { cn } from "@/lib/utils";
import type { ScanPlatformProgress, ScanStatus, SentimentDistribution } from "@/types/api";
import { useLatestScan } from "../hooks/useScans";

interface ScanProgressScreenProps {
  trackerId: string;
}

const STEPS_TOTAL = 5;
const COPY = TRACKERS_COPY.scan;

/**
 * Post-onboarding scan-progress screen.
 *
 * - While the scan runs, polls `/api/trackers/{id}/scans/latest` every 2s
 *   for per-platform progress + live counters and renders the matching
 *   mid-state (stage row, platform tiles, live results, rotating
 *   product-awareness message).
 * - When the scan reaches a terminal state (Completed/Failed), renders the
 *   celebration state with final totals + a CTA to the workspace overview.
 *
 * The 5-dot stepper sits above both states because this screen is always
 * the last step of the first-tracker onboarding flow (Discovery → Confirm
 * → Tracker → Prompts → Schedule + Scan).
 */
export function ScanProgressScreen({ trackerId }: ScanProgressScreenProps) {
  const scan = useLatestScan(trackerId, true);
  const data = scan.data;
  const isComplete = data?.status === "Completed" || data?.status === "Failed";

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <OnboardingStepper currentStep={STEPS_TOTAL} totalSteps={STEPS_TOTAL} />
      {isComplete && data ? <CompleteState data={data} /> : <ProgressState data={data ?? null} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mid-scan progress state
// ---------------------------------------------------------------------------

function ProgressState({ data }: { data: ScanStatus | null }) {
  const total = data?.scanCheckCount ?? 0;
  const done = data ? data.completedCount + data.failedCount : 0;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const platforms = data?.platforms ?? [];
  const counters = data?.liveCounters;
  const brandName = data?.brandName ?? "";

  const platformLabel = formatPlatformList(platforms.map((p) => p.name));
  const title = platformLabel
    ? COPY.progressTitleTemplate
        .replace("{platforms}", platformLabel)
        .replace("{brand}", brandName || "your brand")
    : COPY.progressTitleFallback.replace("{brand}", brandName || "your brand");

  return (
    <div className="mt-4 space-y-5 text-center">
      <StageRow />
      <h2 className="text-lg font-semibold text-neutral-900">{title}</h2>

      <div className="space-y-1.5">
        <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100">
          <div
            className="h-full rounded-full bg-primary-500 transition-all"
            style={{ width: `${pct}%` }}
            aria-hidden
          />
        </div>
        <p className="text-xs text-neutral-500" aria-live="polite">
          {COPY.progressSubtext.replace("{done}", String(done)).replace("{total}", String(total))}
        </p>
      </div>

      <PlatformTiles platforms={platforms} />

      {counters && <LiveResultsPanel counters={counters} />}

      <RotatingMessage messages={COPY.awarenessMessages} />
    </div>
  );
}

/**
 * Animated 3-stage icon row hinting at the data flow (look up info → AI
 * digests it → results appear). The middle icon — the AI analysis stage
 * — pulses softly during the scan because that's the step the user is
 * waiting on.
 */
function StageRow() {
  return (
    <div aria-hidden className="flex items-center justify-center gap-3">
      <StageIcon icon={Telescope} tone="primary" />
      <StageArrow />
      <StageIcon icon={Sparkles} tone="primary" active />
      <StageArrow />
      <StageIcon icon={BarChart3} tone="primary" />
    </div>
  );
}

interface StageIconProps {
  icon: React.ComponentType<{ className?: string }>;
  tone: "primary";
  /** When true, the icon pulses softly to signal "we're working on this". */
  active?: boolean;
}
function StageIcon({ icon: Icon, active }: StageIconProps) {
  return (
    <span
      className={cn(
        "flex h-11 w-11 items-center justify-center rounded-xl bg-primary-50 text-primary-600 shadow-sm ring-1 ring-primary-100",
        active && "animate-pulse",
      )}
    >
      <Icon className="h-5 w-5" />
    </span>
  );
}

function StageArrow() {
  return <ArrowRight className="h-4 w-4 shrink-0 text-neutral-300" aria-hidden />;
}

function PlatformTiles({ platforms }: { platforms: readonly ScanPlatformProgress[] }) {
  if (platforms.length === 0) return null;
  // Center the row regardless of count; each tile is bounded so 1 tile
  // doesn't fill the whole bar and 4 still fit comfortably on a 2xl page.
  return (
    <ul className="flex flex-wrap justify-center gap-3" role="list" aria-label="Platform progress">
      {platforms.map((p) => (
        <PlatformTile key={p.platformId} platform={p} />
      ))}
    </ul>
  );
}

function PlatformTile({ platform }: { platform: ScanPlatformProgress }) {
  const tone = statusTone(platform.status);
  return (
    <li className="w-44 rounded-lg border border-neutral-200 bg-white px-4 py-3 text-left shadow-sm">
      <p className={cn("text-sm font-semibold", tone.title)}>{platform.name}</p>
      <p className="mt-1 inline-flex items-center gap-1.5 text-xs">
        <span className={cn("h-1.5 w-1.5 rounded-full", tone.dot)} aria-hidden />
        <span className={tone.label}>
          {COPY.platformStatus[platform.status] ?? platform.status}
        </span>
      </p>
    </li>
  );
}

function statusTone(status: string): { title: string; dot: string; label: string } {
  switch (status) {
    case "Done":
      return {
        title: "text-semantic-success-700",
        dot: "bg-semantic-success-500",
        label: "text-semantic-success-700",
      };
    case "Failed":
      return {
        title: "text-semantic-error-700",
        dot: "bg-semantic-error-500",
        label: "text-semantic-error-700",
      };
    case "Running":
      return {
        title: "text-primary-700",
        dot: "bg-primary-500 animate-pulse",
        label: "text-primary-700",
      };
    default:
      return {
        title: "text-neutral-700",
        dot: "bg-neutral-300",
        label: "text-neutral-500",
      };
  }
}

function LiveResultsPanel({ counters }: { counters: ScanStatus["liveCounters"] }) {
  const net = sentimentNet(counters.sentiment);
  const dominant = dominantSentiment(counters.sentiment);
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
      <p className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
        {COPY.liveResultsTitle}
      </p>
      <div className="grid grid-cols-4 gap-2">
        <BigStat value={counters.mentions} label={COPY.mentions} tone="primary" />
        <BigStat value={counters.citations} label={COPY.citations} tone="primary" />
        <BigStat value={counters.recommended} label={COPY.recommended} tone="success" />
        <BigStat value={formatSigned(net)} label={dominant} tone={net >= 0 ? "success" : "error"} />
      </div>
    </div>
  );
}

interface BigStatProps {
  value: number | string;
  label: string;
  tone: "primary" | "success" | "error" | "neutral";
}
function BigStat({ value, label, tone }: BigStatProps) {
  const valueClass = {
    primary: "text-primary-600",
    success: "text-semantic-success-600",
    error: "text-semantic-error-600",
    neutral: "text-neutral-700",
  }[tone];
  return (
    <div>
      <p className={cn("text-3xl font-bold tabular-nums", valueClass)}>{value}</p>
      <p className="mt-1 text-xs text-neutral-500">{label}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Complete celebration state
// ---------------------------------------------------------------------------

function CompleteState({ data }: { data: ScanStatus }) {
  const counters = data.liveCounters;
  const net = sentimentNet(counters.sentiment);
  const dominant = dominantSentiment(counters.sentiment);
  const queries = data.scanCheckCount;
  const brandName = data.brandName ?? "";
  const subtitle = brandName
    ? COPY.completeSubtitle.replace("{brand}", brandName).replace("{queries}", String(queries))
    : COPY.completeSubtitleFallback.replace("{queries}", String(queries));

  return (
    <div className="mt-4 space-y-5 text-center">
      <div
        className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary-50 text-4xl"
        aria-hidden
      >
        🎉
      </div>
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-neutral-900">{COPY.completeTitle}</h2>
        <p className="text-sm text-neutral-600">{subtitle}</p>
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
        <p className="mb-5 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
          {COPY.whatWeFoundTitle}
        </p>
        <div className="grid grid-cols-4 gap-2">
          <BigStat value={counters.mentions} label={COPY.mentions} tone="primary" />
          <BigStat value={counters.citations} label={COPY.citations} tone="primary" />
          <BigStat value={counters.recommended} label={COPY.recommended} tone="success" />
          <BigStat
            value={formatSigned(net)}
            label={dominant}
            tone={net >= 0 ? "success" : "error"}
          />
        </div>
      </div>

      <p className="text-sm text-neutral-600">{COPY.completeBody}</p>

      <Button asChild size="lg">
        <Link
          to="/scans/$scanRunId/results"
          params={{ scanRunId: data.scanRunId }}
          className="inline-flex items-center gap-2"
        >
          {COPY.viewScanResults}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function formatPlatformList(names: readonly string[]): string {
  if (names.length === 0) return "";
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}

function sentimentNet(s: SentimentDistribution): number {
  return s.positive - s.negative;
}

/** Picks the highest-count sentiment label; ties favor Positive → Neutral → Negative. */
function dominantSentiment(s: SentimentDistribution): string {
  const entries: Array<[string, number]> = [
    ["Positive", s.positive],
    ["Neutral", s.neutral],
    ["Negative", s.negative],
    ["Mixed", s.mixed],
  ];
  let bestLabel = "Unknown";
  let bestCount = -1;
  for (const [label, count] of entries) {
    if (count > bestCount) {
      bestLabel = label;
      bestCount = count;
    }
  }
  return COPY.sentimentLabels[bestLabel] ?? bestLabel;
}

function formatSigned(n: number): string {
  if (n > 0) return `+${n}`;
  return String(n);
}
