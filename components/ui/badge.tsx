import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[0.6875rem] font-bold uppercase tracking-wide [&>svg]:size-3",
  {
    variants: {
      tone: {
        good: "bg-status-good-bg text-status-good",
        info: "bg-status-info-bg text-status-info",
        caution: "bg-status-caution-bg text-status-caution",
        critical: "bg-status-critical-bg text-status-critical",
        neutral: "bg-status-neutral-bg text-status-neutral",
      },
    },
    defaultVariants: {
      tone: "neutral",
    },
  }
);

function Badge({
  className,
  tone,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span";

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ tone, className }))}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
