import * as React from "react";

import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex min-h-24 w-full resize-y rounded-md border border-border bg-surface-sunken px-3.5 py-2.5 text-[0.9375rem] text-foreground transition-[border-color,box-shadow] duration-150 ease-out outline-none placeholder:text-ink-faint disabled:cursor-not-allowed disabled:opacity-40",
        "focus:border-brand focus:ring-3 focus:ring-ring/25",
        "aria-invalid:border-brand",
        className
      )}
      {...props}
    />
  );
}

export { Textarea };
