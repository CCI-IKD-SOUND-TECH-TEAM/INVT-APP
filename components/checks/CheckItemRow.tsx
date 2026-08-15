"use client";

import Link from "next/link";
import { useState } from "react";
import {
  IconAlertCircle as ExclamationCircleIcon,
  IconBan as BanIcon,
  IconCheck as CheckIcon,
  IconMinus as MinusIcon,
  IconPlus as PlusIcon,
  IconX as XMarkIcon,
} from "@tabler/icons-react";
import type { CheckEntry, CheckResult, } from "@/lib/types";
import { isShortfall } from "@/lib/checks";
import type { ItemListRow } from "@/lib/api-types";
import { formatUnit } from "@/lib/inventory";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * One item in the walkthrough list. Mobile-first: four fat tap targets
 * (Present / Missing / Issue / N/A), an inline count stepper for quantity
 * items marked present, and — during set-down — an annotation of what the
 * setup check recorded for the same item.
 */
export default function CheckItemRow({
  item,
  entry,
  setupEntry,
  showSetupDiff,
  onRecord,
}: {
  item: ItemListRow;
  entry?: CheckEntry;
  /** This week's setup entry for the same item (set-down sessions only). */
  setupEntry?: CheckEntry;
  showSetupDiff: boolean;
  onRecord: (result: CheckResult, quantitySeen?: number) => Promise<void>;
}) {
  const [pending, setPending] = useState(false);

  const record = async (result: CheckResult, quantitySeen?: number) => {
    setPending(true);
    try {
      await onRecord(result, quantitySeen);
    } finally {
      setPending(false);
    }
  };

  // "Was present at setup, now marked missing" is the headline of the
  // set-down diff — the item left the venue mid-week.
  const lostSinceSetup =
    showSetupDiff && setupEntry?.result === "present" && entry?.result === "missing";

  const setupNote = !showSetupDiff
    ? null
    : !setupEntry
      ? "not checked at setup"
      : setupEntry.result === "missing"
        ? "missing at setup"
        : setupEntry.result === "not_applicable"
          ? "n/a at setup"
          : isShortfall(setupEntry)
            ? `${setupEntry.quantity_seen} of ${setupEntry.quantity_expected} at setup`
            : setupEntry.result === "issue"
              ? "issue at setup"
              : "present at setup";

  const stepperMax = item.quantity;
  const seen = entry?.quantity_seen ?? item.quantity;

  return (
    <div
      className={cn(
        "flex flex-col gap-2.5 border-b border-line-subtle px-3 py-3 last:border-b-0",
        lostSinceSetup && "border-l-2 border-l-status-critical bg-brand-tint/40"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-[0.9375rem] font-bold leading-snug">
            {item.item_name}
          </span>
          <span className="text-xs text-ink-faint">
            {item.quantity} {formatUnit(item.unit_of_measure, item.quantity)}
            {item.location ? ` · ${item.location}` : ""}
            {setupNote ? (
              <span
                className={cn(
                  lostSinceSetup
                    ? "text-status-critical"
                    : setupNote === "present at setup"
                      ? "text-ink-faint"
                      : "text-status-caution"
                )}
              >
                {" "}
                · {setupNote}
              </span>
            ) : null}
          </span>
        </div>

        <div className="flex shrink-0 gap-1.5">
          <Button
            size="sm"
            variant={entry?.result === "present" ? "default" : "outline"}
            disabled={pending}
            aria-pressed={entry?.result === "present"}
            onClick={() => record("present")}
          >
            <CheckIcon className="size-4" />
            <span className="hidden sm:inline">Present</span>
          </Button>
          <Button
            size="sm"
            variant={entry?.result === "missing" ? "destructive" : "outline"}
            disabled={pending}
            aria-pressed={entry?.result === "missing"}
            onClick={() => record("missing")}
          >
            <XMarkIcon className="size-4" />
            <span className="hidden sm:inline">Missing</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            className={cn(
              entry?.result === "issue" &&
                "border-status-caution text-status-caution"
            )}
            disabled={pending}
            aria-pressed={entry?.result === "issue"}
            onClick={() => record("issue")}
          >
            <ExclamationCircleIcon className="size-4" />
            <span className="hidden sm:inline">Issue</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            className={cn(
              entry?.result === "not_applicable" &&
                "border-status-neutral text-status-neutral"
            )}
            disabled={pending}
            aria-pressed={entry?.result === "not_applicable"}
            aria-label="Not applicable"
            onClick={() => record("not_applicable")}
          >
            <BanIcon className="size-4" />
            <span className="hidden sm:inline">N/A</span>
          </Button>
        </div>
      </div>

      {entry?.result === "present" && item.quantity > 1 && (
        <div className="flex items-center gap-2 self-end text-sm">
          <span
            className={cn(
              "text-xs",
              isShortfall(entry) ? "text-status-caution" : "text-ink-faint"
            )}
          >
            Saw {entry.quantity_seen} of {entry.quantity_expected}
          </span>
          <Button
            size="icon-sm"
            variant="outline"
            aria-label="One fewer seen"
            disabled={pending || seen <= 0}
            onClick={() => record("present", seen - 1)}
          >
            <MinusIcon className="size-3.5" />
          </Button>
          <Button
            size="icon-sm"
            variant="outline"
            aria-label="One more seen"
            disabled={pending || seen >= stepperMax}
            onClick={() => record("present", seen + 1)}
          >
            <PlusIcon className="size-3.5" />
          </Button>
        </div>
      )}

      {entry?.result === "issue" && (
        <Link
          href={`/defects?log=1&item=${item.id}`}
          className="self-end text-sm font-bold text-brand underline-offset-4 hover:underline"
        >
          Log defect →
        </Link>
      )}
    </div>
  );
}
