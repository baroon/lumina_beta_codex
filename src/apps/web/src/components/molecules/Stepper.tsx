import { Check } from "lucide-react";
import { Button } from "@/components/atoms/button";
import { cn } from "@/lib/utils";
import { APP_COPY } from "@/content/app";

export interface StepperStep {
  label: string;
}

interface StepperProps {
  steps: readonly StepperStep[];
  currentStep: number;
  onNext?: () => void;
  onBack?: () => void;
  isNextDisabled?: boolean;
  isNextLoading?: boolean;
  nextLabel?: string;
  backLabel?: string;
  children?: React.ReactNode;
}

export function Stepper({
  steps,
  currentStep,
  onNext,
  onBack,
  isNextDisabled,
  isNextLoading,
  nextLabel = APP_COPY.stepper.next,
  backLabel = APP_COPY.stepper.back,
  children,
}: StepperProps) {
  return (
    <div className="space-y-6">
      {/* Progress header */}
      <nav aria-label={APP_COPY.stepper.progressLabel} className="px-4">
        <ol className="flex items-center">
          {steps.map((step, index) => {
            const isCompleted = index < currentStep;
            const isActive = index === currentStep;
            const isLast = index === steps.length - 1;

            return (
              <li key={step.label} className={cn("flex items-center", !isLast && "flex-1")}>
                <div className="flex flex-col items-center gap-1">
                  <div
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-medium transition-colors",
                      isCompleted && "border-primary-600 bg-primary-600 text-white",
                      isActive && "border-primary-600 bg-white text-primary-600",
                      !isCompleted && !isActive && "border-neutral-300 bg-white text-neutral-400",
                    )}
                  >
                    {isCompleted ? <Check className="h-4 w-4" /> : index + 1}
                  </div>
                  <span
                    className={cn(
                      "text-xs whitespace-nowrap",
                      isActive
                        ? "font-medium text-primary-600"
                        : isCompleted
                          ? "text-neutral-600"
                          : "text-neutral-400",
                    )}
                  >
                    {step.label}
                  </span>
                </div>
                {!isLast && (
                  <div
                    className={cn(
                      "mx-2 mt-[-1rem] h-0.5 flex-1",
                      isCompleted ? "bg-primary-600" : "bg-neutral-200",
                    )}
                  />
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Step content */}
      <div>{children}</div>

      {/* Navigation */}
      <div className="flex justify-between">
        <div>
          {currentStep > 0 && onBack && (
            <Button variant="outline" onClick={onBack}>
              {backLabel}
            </Button>
          )}
        </div>
        <div>
          {onNext && (
            <Button onClick={onNext} disabled={isNextDisabled || isNextLoading}>
              {isNextLoading ? APP_COPY.stepper.loading : nextLabel}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
