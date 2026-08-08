import type { DefectSeverity } from "@/lib/types";
import { cn } from "@/lib/utils";

/* Low is the resting-normal severity and gets no hue — a green word competing
   with amber and red made every defect row a three-colour ramp. Only the two
   severities that ask for action carry colour. */
const TONE: Record<DefectSeverity, string> = {
  Low: "text-ink-faint",
  Medium: "text-status-caution",
  High: "text-status-critical",
};

export default function SeverityLabel({
  severity,
  className,
}: {
  severity: DefectSeverity;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "text-[0.6875rem] font-bold uppercase tracking-wide",
        TONE[severity],
        className
      )}
    >
      {severity}
    </span>
  );
}
