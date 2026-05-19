import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const labelVariants = cva(
  "font-medium leading-none text-neutral-700 peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
  {
    variants: {
      labelSize: {
        sm: "text-xs",
        default: "text-sm",
        lg: "text-base",
      },
    },
    defaultVariants: { labelSize: "default" },
  }
);

export interface LabelProps
  extends React.LabelHTMLAttributes<HTMLLabelElement>,
    VariantProps<typeof labelVariants> {}

const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, labelSize, ...props }, ref) => (
    <label ref={ref} className={cn(labelVariants({ labelSize, className }))} {...props} />
  )
);
Label.displayName = "Label";

export { Label, labelVariants };
