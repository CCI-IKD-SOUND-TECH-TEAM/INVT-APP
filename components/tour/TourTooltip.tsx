"use client";

import type { TooltipRenderProps } from "react-joyride";
import { Button } from "@/components/ui/button";

/** Joyride tooltip restyled as one of our dark cards. */
export default function TourTooltip({
  backProps,
  index,
  isLastStep,
  primaryProps,
  size,
  skipProps,
  step,
  tooltipProps,
}: TooltipRenderProps) {
  return (
    <div
      {...tooltipProps}
      className="w-[min(21rem,calc(100vw-2rem))] rounded-lg border border-line-subtle bg-card p-4"
    >
      {step.title ? (
        <h2 className="font-display text-lg tracking-wide">{step.title}</h2>
      ) : null}
      <div className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
        {step.content}
      </div>
      <div className="mt-4 flex items-center gap-2">
        <span className="text-xs text-ink-faint">
          {index + 1} of {size}
        </span>
        <span className="ml-auto" />
        {!isLastStep && (
          <Button type="button" variant="ghost" size="sm" {...skipProps}>
            Skip
          </Button>
        )}
        {index > 0 && (
          <Button type="button" variant="secondary" size="sm" {...backProps}>
            Back
          </Button>
        )}
        <Button type="button" size="sm" {...primaryProps}>
          {isLastStep ? "Finish" : "Next"}
        </Button>
      </div>
    </div>
  );
}
