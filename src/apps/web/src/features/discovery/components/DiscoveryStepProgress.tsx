import {
  Check,
  Circle,
  Loader2,
  Globe,
  Sparkles,
  Package,
  MessageSquareText,
  Swords,
} from "lucide-react";
import { Progress } from "@/components/atoms/progress";
import { DISCOVERY_COPY } from "@/content/discovery";

const STEP_ICONS = [Globe, Sparkles, Package, MessageSquareText, Swords];

interface DiscoveryStepProgressProps {
  step: number;
  totalSteps: number;
}

export function DiscoveryStepProgress({ step, totalSteps }: DiscoveryStepProgressProps) {
  // Progress is based on *completed* steps, not the active one
  const completedSteps = Math.max(0, step - 1);
  const percent = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

  // Get the encouragement message for the active step
  const activeStepDef = DISCOVERY_COPY.steps[step - 1];
  const encouragement = activeStepDef?.encouragement ?? DISCOVERY_COPY.progress.defaultEncouragement;

  return (
    <div className="space-y-6">
      {/* Step list */}
      <div className="space-y-1">
        {DISCOVERY_COPY.steps.map((s, i) => {
          const stepNum = i + 1;
          const isCompleted = stepNum < step;
          const isActive = stepNum === step;
          const StepIcon = STEP_ICONS[i];

          return (
            <div
              key={stepNum}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${
                isActive ? "bg-primary-50" : ""
              }`}
            >
              {/* Status indicator */}
              {isCompleted ? (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-semantic-success-100 text-semantic-success-600">
                  <Check className="h-4 w-4" strokeWidth={2.5} />
                </div>
              ) : isActive ? (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-600">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-300">
                  <Circle className="h-3 w-3" />
                </div>
              )}

              {/* Step icon + label */}
              <StepIcon
                className={`h-4 w-4 shrink-0 ${
                  isCompleted
                    ? "text-semantic-success-500"
                    : isActive
                      ? "text-primary-600"
                      : "text-neutral-300"
                }`}
              />
              <span
                className={
                  isCompleted
                    ? "text-sm text-neutral-400"
                    : isActive
                      ? "text-sm font-medium text-neutral-900"
                      : "text-sm text-neutral-400"
                }
              >
                {s.label}
              </span>

              {/* Completed badge */}
              {isCompleted && (
                <span className="ml-auto text-xs text-semantic-success-600">{DISCOVERY_COPY.progress.done}</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Encouragement message */}
      <p className="text-center text-sm italic text-neutral-500">
        {encouragement}
      </p>

      {/* Overall progress bar */}
      <div className="space-y-1.5">
        <Progress value={percent} className="h-2" />
        <div className="flex justify-between text-xs text-neutral-400">
          <span>{DISCOVERY_COPY.progress.stepLabel} {step} {DISCOVERY_COPY.progress.ofLabel} {totalSteps}</span>
          <span>{percent}%</span>
        </div>
      </div>
    </div>
  );
}
