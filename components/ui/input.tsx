import * as React from "react";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-11 w-full min-w-0 rounded-md border border-border bg-surface-sunken px-3.5 text-[0.9375rem] text-foreground transition-[border-color,box-shadow] duration-150 ease-out outline-none placeholder:text-ink-faint disabled:cursor-not-allowed disabled:opacity-40",
        "focus:border-brand focus:ring-3 focus:ring-ring/25",
        "aria-invalid:border-brand",
        "file:inline-flex file:h-full file:border-0 file:bg-transparent file:text-sm file:font-medium",
        className
      )}
      {...props}
    />
  );
}

export { Input };
