"use client";

import { useState } from "react";
import { IconPlayerPlay as PlayIcon } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CHECK_TYPE_LABEL } from "@/lib/checks";
import type { CheckSlot } from "@/lib/queries/use-week-check-slots";
import { useStartCheck, slotKey } from "@/components/dashboard/use-start-check";

/**
 * The dashboard's primary action: start one of this week's outstanding checks.
 *
 * With one slot left there is nothing to choose, so the button starts it
 * directly. With several it opens a short list — the same single-tap start the
 * WeeklyCheckCard grid offers, reachable without hunting for the right cell.
 *
 * Renders nothing when every check is started. That absence is the point: the
 * header stops offering work that doesn't exist.
 */
export default function StartCheckMenu({
  slots,
  size = "default",
  variant = "default",
}: {
  slots: CheckSlot[];
  size?: "default" | "sm";
  variant?: "default" | "secondary";
}) {
  const { start, pendingKey, error } = useStartCheck();
  const [open, setOpen] = useState(false);

  if (slots.length === 0) return null;

  if (slots.length === 1) {
    const slot = slots[0];
    return (
      <Button
        size={size}
        variant={variant}
        loading={pendingKey === slotKey(slot)}
        onClick={() => start(slot)}
        aria-label={`Start the ${slot.deptName} ${CHECK_TYPE_LABEL[slot.type]} check`}
      >
        {pendingKey === slotKey(slot) ? null : (
          <PlayIcon className="size-4" aria-hidden />
        )}
        Start check
      </Button>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size={size} variant={variant}>
          <PlayIcon className="size-4" aria-hidden />
          Start check
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-2">
        <p className="h-label px-2 pb-1.5 pt-1">Not started this week</p>
        <ul className="flex flex-col">
          {slots.map((slot) => {
            const pending = pendingKey === slotKey(slot);
            return (
              <li key={slotKey(slot)}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  loading={pending}
                  // One at a time: a second start while the first is mid-flight
                  // would race two navigations.
                  disabled={pendingKey !== null && !pending}
                  onClick={() => start(slot)}
                >
                  {slot.deptName} · {CHECK_TYPE_LABEL[slot.type]}
                </Button>
              </li>
            );
          })}
        </ul>
        {error && <p className="px-2 pt-1.5 text-xs text-brand">{error}</p>}
      </PopoverContent>
    </Popover>
  );
}
