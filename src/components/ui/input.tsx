import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      ref={ref}
      className={cn(
        "flex min-h-11 w-full rounded border border-input bg-background px-3 text-base placeholder:text-muted-foreground disabled:opacity-50 aria-[invalid=true]:border-destructive md:min-h-10 md:text-sm",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export { Input };
