"use client";

import * as React from "react";
import { format, isValid, parseISO } from "date-fns";
import { IconCalendar as CalendarIcon } from "@tabler/icons-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function DatePicker({
  id,
  value,
  onChange,
  placeholder = "Select date…",
  disabled,
  maxDate,
  minDate,
  "aria-invalid": ariaInvalid,
  className,
}: {
  id?: string;
  /** ISO date string, e.g. "2023-01-20" — matches the rest of the form's date fields. */
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  maxDate?: Date;
  minDate?: Date;
  "aria-invalid"?: boolean;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const selected = value ? parseISO(value) : undefined;
  const displayDate = selected && isValid(selected) ? selected : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          id={id}
          variant="secondary"
          disabled={disabled}
          aria-invalid={ariaInvalid}
          className={cn(
            "w-full justify-between border-border bg-surface-sunken px-3.5 font-normal text-foreground hover:border-ink-faint aria-invalid:border-brand",
            !displayDate && "text-ink-faint",
            className
          )}
        >
          {displayDate ? format(displayDate, "dd MMM yyyy") : placeholder}
          <CalendarIcon className="size-4 shrink-0 text-ink-faint" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={displayDate}
          defaultMonth={displayDate}
          onSelect={(date) => {
            onChange(date ? format(date, "yyyy-MM-dd") : "");
            setOpen(false);
          }}
          disabled={(date) => (maxDate && date > maxDate) || (minDate ? date < minDate : false)}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  );
}
