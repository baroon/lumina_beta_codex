import { ArrowRight, ClipboardList, ListChecks, Sparkles } from "lucide-react";
import { OnboardingStepper } from "@/components/molecules/OnboardingStepper";
import { RotatingMessage } from "@/components/molecules/RotatingMessage";
import { TRACKERS_COPY } from "@/content/trackers";
import { cn } from "@/lib/utils";

interface PromptGenerationProgressProps {
  /** Tracked brand name; shows in the title. Empty string falls back. */
  brandName?: string;
}

/** Onboarding step the prompt-review screen sits on (4 of 5). */
const STEP_INDEX = 4;
const STEPS_TOTAL = 5;
const COPY = TRACKERS_COPY.generationProgress;

/**
 * Wait-screen rendered while the LLM is crafting the initial prompt
 * set on PromptReviewScreen. The actual generation is a single batched
 * call, so we can't show real per-prompt progress — instead we mirror
 * the visual language of the scan-progress screen (stepper, animated
 * stage row, rotating product-awareness messages) so the wait reads as
 * "the system is working" rather than "the system is stuck".
 */
export function PromptGenerationProgress({ brandName = "" }: PromptGenerationProgressProps) {
  const title = brandName ? COPY.title.replace("{brand}", brandName) : COPY.titleFallback;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <OnboardingStepper currentStep={STEP_INDEX} totalSteps={STEPS_TOTAL} />
      <div className="mt-4 space-y-5 text-center">
        <StageRow />
        <div className="space-y-1.5">
          <h2 className="text-lg font-semibold text-neutral-900">{title}</h2>
          <p className="text-sm text-neutral-500">{COPY.subtext}</p>
        </div>
        <RotatingMessage messages={COPY.awarenessMessages} />
      </div>
    </div>
  );
}

/**
 * 3-stage icon row: read the discovery → craft the questions → ready
 * to review. Middle stage pulses because that's the step the user is
 * waiting on (same convention as the scan-progress StageRow).
 */
function StageRow() {
  return (
    <div aria-hidden className="flex items-center justify-center gap-3">
      <StageIcon icon={ClipboardList} />
      <StageArrow />
      <StageIcon icon={Sparkles} active />
      <StageArrow />
      <StageIcon icon={ListChecks} />
    </div>
  );
}

interface StageIconProps {
  icon: React.ComponentType<{ className?: string }>;
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
