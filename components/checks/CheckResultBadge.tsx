import type { ComponentType } from "react";
import {
  IconCircleCheckFilled as CheckCircleIcon,
  IconAlertCircleFilled as ExclamationCircleIcon,
  IconCircleX as XCircleIcon,
} from "@tabler/icons-react";
import type { CheckEntry, CheckResult } from "@/lib/types";
import { isShortfall } from "@/lib/checks";
import { cn } from "@/lib/utils";

/**
 * StatusBadge-style pill for a check entry's result. A `present` entry with a
 * partial count renders as the shortfall variant ("6 of 8", caution tone)
 * rather than a plain Present.
 */

const CONFIG: Record<
  CheckResult,
  { label: string; tone: string; icon: ComponentType<{ className?: string }> }
> = {
  present: { label: "Present", tone: "text-status-good", icon: CheckCircleIcon },
  missing: { label: "Missing", tone: "text-status-critical", icon: XCircleIcon },
  issue: { label: "Issue", tone: "text-status-caution", icon: ExclamationCircleIcon },
};

export default function CheckResultBadge({
  entry,
  className,
}: {
  entry: CheckEntry;
  className?: string;
}) {
  const shortfall = isShortfall(entry);
  const cfg = CONFIG[entry.result];
  const Icon = shortfall ? ExclamationCircleIcon : cfg.icon;
  const tone = shortfall ? "text-status-caution" : cfg.tone;
  const label = shortfall
    ? `${entry.quantity_seen} of ${entry.quantity_expected}`
    : cfg.label;

  return (
    <span
      data-slot="check-result-badge"
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-transparent py-1 pl-1.5 pr-2.5 text-[0.8125rem] font-medium leading-none text-foreground",
        className
      )}
    >
      <Icon className={cn("size-4 shrink-0", tone)} />
      {label}
    </span>
  );
}
