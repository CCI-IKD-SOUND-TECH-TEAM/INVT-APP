"use client";

import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";

import { cn } from "@/lib/utils";

function Label({
  className,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(
        "mb-2 block text-[0.8125rem] font-bold text-muted-foreground select-none peer-disabled:cursor-not-allowed peer-disabled:opacity-40",
        className
      )}
      {...props}
    />
  );
}

export { Label };
