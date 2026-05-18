import { Check, Circle, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const STEPS = [
  { label: "Crawling website", message: "Scanning pages and extracting content..." },
  { label: "Analyzing brand", message: "Identifying brand identity and positioning..." },
  { label: "Extracting entities", message: "Discovering products, audiences, and markets..." },
  { label: "Suggesting topics", message: "Generating discovery search categories..." },
  { label: "Finding competitors", message: "Identifying competitive landscape..." },
];

interface DiscoveryStepProgressProps {
  step: number;
  totalSteps: number;
  message: string;
}

export function DiscoveryStepProgress({ step, totalSteps, message }: DiscoveryStepProgressProps) {
  const percent = totalSteps > 0 ? Math.round((step / totalSteps) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Step list */}
      <div className="space-y-3">
        {STEPS.map((s, i) => {
          const stepNum = i + 1;
          const isCompleted = stepNum < step;
          const isActive = stepNum === step;

          return (
            <div key={stepNum} className="flex items-center gap-3">
              {/* Icon */}
              {isCompleted ? (
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-600">
                  <Check className="h-3.5 w-3.5" />
                </div>
              ) : isActive ? (
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-600">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                </div>
              ) : (
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-400">
                  <Circle className="h-3 w-3" />
                </div>
              )}

              {/* Label */}
              <span
                className={
                  isCompleted
                    ? "text-sm text-neutral-500 line-through"
                    : isActive
                      ? "text-sm font-medium text-neutral-900"
                      : "text-sm text-neutral-400"
                }
              >
                {s.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Active step message */}
      <p className="text-center text-sm text-neutral-500">{message}</p>

      {/* Overall progress bar */}
      <div className="space-y-2">
        <Progress value={percent} />
        <div className="flex justify-between text-xs text-neutral-500">
          <span>Step {step} of {totalSteps}</span>
          <span>{percent}%</span>
        </div>
      </div>
    </div>
  );
}
