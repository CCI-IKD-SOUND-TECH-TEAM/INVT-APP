import type { ComponentType } from "react";
import {
  IconLoader4 as ArrowPathIcon,
  IconCircleCheckFilled as CheckCircleIcon,
  IconAlertCircleFilled as ExclamationCircleIcon,
  IconCircleMinus as MinusCircleIcon,
  IconCircleDotFilled as PlayCircleIcon,
  IconCircleX as XCircleIcon,
} from "@tabler/icons-react";
import type { DefectStatus, ItemStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

type Status = ItemStatus | DefectStatus;
type Tone = "good" | "info" | "caution" | "critical" | "neutral";

const TONE_TEXT: Record<Tone, string> = {
  good: "text-status-good",
  info: "text-status-info",
  caution: "text-status-caution",
  critical: "text-status-critical",
  neutral: "text-status-neutral",
};

const CONFIG: Record<
  Status,
  { tone: Tone; icon: ComponentType<{ className?: string }>; spin?: boolean }
> = {
  Available: { tone: "good", icon: CheckCircleIcon },
  "In Use": { tone: "info", icon: PlayCircleIcon },
  Defective: { tone: "critical", icon: ExclamationCircleIcon },
  "Under Repair": { tone: "caution", icon: ArrowPathIcon, spin: true },
  Retired: { tone: "neutral", icon: MinusCircleIcon },
  Open: { tone: "critical", icon: ExclamationCircleIcon },
  Resolved: { tone: "good", icon: CheckCircleIcon },
  "Not Repairable": { tone: "neutral", icon: XCircleIcon },
};

export default function StatusBadge({
  status,
  className,
}: {
  status: Status;
  className?: string;
}) {
  const cfg =
    CONFIG[status] ?? { tone: "neutral" as Tone, icon: MinusCircleIcon };
  const Icon = cfg.icon;

  return (
    <span
      data-slot="status-badge"
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-transparent py-1 pl-1.5 pr-2.5 text-[0.8125rem] font-medium leading-none text-foreground",
        className
      )}
    >
      <Icon
        className={cn(
          "size-4 shrink-0",
          TONE_TEXT[cfg.tone],
        )}
      />
      {status}
    </span>
  );
}
