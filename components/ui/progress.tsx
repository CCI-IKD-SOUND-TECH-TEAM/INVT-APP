import { cn } from "@/lib/utils";

/**
 * Minimal determinate progress bar — a track div with a translated fill, no
 * Radix dependency. `value` is clamped to 0–100.
 */
function Progress({
  value,
  className,
  ...props
}: React.ComponentProps<"div"> & { value: number }) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div
      data-slot="progress"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped)}
      className={cn(
        "h-1.5 w-full overflow-hidden rounded-full bg-popover",
        className
      )}
      {...props}
    >
      <div
        data-slot="progress-indicator"
        className="h-full rounded-full bg-brand transition-[width] duration-300"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

export { Progress };
