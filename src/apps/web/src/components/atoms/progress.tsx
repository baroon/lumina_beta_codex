import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const progressTrackVariants = cva(
  "relative w-full overflow-hidden rounded-full bg-neutral-100",
  {
    variants: {
      progressSize: {
        sm: "h-2",
        default: "h-4",
        lg: "h-6",
      },
    },
    defaultVariants: { progressSize: "default" },
  }
);

const progressIndicatorVariants = cva("h-full transition-all", {
  variants: {
    variant: {
      default: "bg-primary-600",
      success: "bg-semantic-success-500",
      warning: "bg-semantic-warning-500",
      error: "bg-semantic-error-500",
    },
  },
  defaultVariants: { variant: "default" },
});

interface ProgressProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof progressTrackVariants>,
    VariantProps<typeof progressIndicatorVariants> {
  value?: number;
  max?: number;
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, max = 100, progressSize, variant, ...props }, ref) => (
    <div
      ref={ref}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      className={cn(progressTrackVariants({ progressSize, className }))}
      {...props}
    >
      <div
        className={cn(progressIndicatorVariants({ variant }))}
        style={{ width: `${Math.min(100, (value / max) * 100)}%` }}
      />
    </div>
  )
);
Progress.displayName = "Progress";

export { Progress, progressTrackVariants, progressIndicatorVariants };
export type { ProgressProps };
