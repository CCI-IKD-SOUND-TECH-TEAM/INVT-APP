import type { DefectSeverity } from "@/lib/types";
import { cn } from "@/lib/utils";

const TONE: Record<DefectSeverity, string> = {
  Low: "text-status-good",
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
