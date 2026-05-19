import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border border-neutral-200 px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary-700 text-white hover:bg-primary-700/80",
        secondary: "border-transparent bg-neutral-100 text-neutral-900 hover:bg-neutral-100/80",
        destructive:
          "border-transparent bg-semantic-error-500 text-white hover:bg-semantic-error-500/80",
        outline: "text-neutral-900",
        success: "border-transparent bg-semantic-success-100 text-semantic-success-800",
        warning: "border-transparent bg-semantic-warning-100 text-semantic-warning-800",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
