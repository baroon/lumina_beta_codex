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
import { Progress } from "@/components/ui/progress";

const STEPS = [
  {
    label: "Crawling website",
    icon: Globe,
    encouragement: "Reading your website so we don't have to ask you a hundred questions...",
  },
  {
    label: "Analyzing brand",
    icon: Sparkles,
    encouragement: "Our AI is studying your brand identity and market positioning...",
  },
  {
    label: "Extracting entities",
    icon: Package,
    encouragement: "Mapping out your products, audiences, and markets...",
  },
  {
    label: "Suggesting topics",
    icon: MessageSquareText,
    encouragement: "Figuring out what people search for when they need a brand like yours...",
  },
  {
    label: "Finding competitors",
    icon: Swords,
    encouragement: "Scouting the competitive landscape to see who you're up against...",
  },
];

interface DiscoveryStepProgressProps {
  step: number;
  totalSteps: number;
}

export function DiscoveryStepProgress({ step, totalSteps }: DiscoveryStepProgressProps) {
  // Progress is based on *completed* steps, not the active one
  const completedSteps = Math.max(0, step - 1);
  const percent = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

  // Get the encouragement message for the active step
  const activeStepDef = STEPS[step - 1];
  const encouragement = activeStepDef?.encouragement ?? "Working on it...";

  return (
    <div className="space-y-6">
      {/* Step list */}
      <div className="space-y-1">
        {STEPS.map((s, i) => {
          const stepNum = i + 1;
          const isCompleted = stepNum < step;
          const isActive = stepNum === step;
          const StepIcon = s.icon;

          return (
            <div
              key={stepNum}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${
                isActive ? "bg-primary-50" : ""
              }`}
            >
              {/* Status indicator */}
              {isCompleted ? (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-600">
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
                    ? "text-green-500"
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
                <span className="ml-auto text-xs text-green-600">Done</span>
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
          <span>Step {step} of {totalSteps}</span>
          <span>{percent}%</span>
        </div>
      </div>
    </div>
  );
}
