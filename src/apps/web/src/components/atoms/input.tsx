import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const inputVariants = cva(
  "flex w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-neutral-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "",
        error: "border-semantic-error-500 focus-visible:ring-semantic-error-500",
      },
      inputSize: {
        sm: "h-8 text-xs",
        default: "h-10",
        lg: "h-12 text-base",
      },
    },
    defaultVariants: { variant: "default", inputSize: "default" },
  }
);

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size">,
    VariantProps<typeof inputVariants> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, variant, inputSize, ...props }, ref) => (
    <input
      type={type}
      className={cn(inputVariants({ variant, inputSize, className }))}
      ref={ref}
      {...props}
    />
  )
);
Input.displayName = "Input";

export { Input, inputVariants };
