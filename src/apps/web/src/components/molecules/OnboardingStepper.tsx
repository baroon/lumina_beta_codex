import { cn } from "@/lib/utils";

interface OnboardingStepperProps {
  /** 1-based index of the active step. */
  currentStep: number;
  totalSteps: number;
  ariaLabel?: string;
}

/**
 * Compact pill-dot progress indicator used across the first-tracker
 * onboarding flow (currently the prompt-generation + scan-progress
 * screens; future onboarding steps reuse the same shape). The active
 * step gets an elongated pill; reached steps are filled circles;
 * remaining steps are muted circles.
 */
export function OnboardingStepper({ currentStep, totalSteps, ariaLabel }: OnboardingStepperProps) {
  return (
    <ol
      className="flex items-center justify-center gap-2"
      aria-label={ariaLabel ?? `Step ${currentStep} of ${totalSteps}`}
    >
      {Array.from({ length: totalSteps }, (_, i) => {
        const stepIndex = i + 1;
        const active = stepIndex === currentStep;
        const reached = stepIndex < currentStep;
        return (
          <li
            key={stepIndex}
            className={cn(
              "h-2 rounded-full transition-all",
              active ? "w-8 bg-primary-500" : reached ? "w-2 bg-primary-400" : "w-2 bg-neutral-200",
            )}
            aria-current={active ? "step" : undefined}
          />
        );
      })}
    </ol>
  );
}
