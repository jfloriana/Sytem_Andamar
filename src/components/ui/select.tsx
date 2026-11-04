import * as React from "react";
import { cn } from "@/lib/utils";

const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        "flex min-h-11 w-full rounded border border-input bg-background px-3 text-base disabled:opacity-50 md:min-h-10 md:text-sm",
        className,
      )}
      {...props}
    />
  ),
);
Select.displayName = "Select";

export { Select };
