import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const checkboxVariants = cva(
  "shrink-0 rounded border border-neutral-300 ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 accent-primary-700",
  {
    variants: {
      checkboxSize: {
        sm: "h-3.5 w-3.5",
        default: "h-4 w-4",
        lg: "h-5 w-5",
      },
    },
    defaultVariants: { checkboxSize: "default" },
  }
);

interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "size">,
    VariantProps<typeof checkboxVariants> {
  onCheckedChange?: (checked: boolean) => void;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, onCheckedChange, onChange, checkboxSize, ...props }, ref) => (
    <input
      type="checkbox"
      ref={ref}
      className={cn(checkboxVariants({ checkboxSize, className }))}
      onChange={(e) => {
        onChange?.(e);
        onCheckedChange?.(e.target.checked);
      }}
      {...props}
    />
  )
);
Checkbox.displayName = "Checkbox";

export { Checkbox, checkboxVariants };
