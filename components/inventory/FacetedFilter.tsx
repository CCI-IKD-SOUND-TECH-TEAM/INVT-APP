"use client";

import { IconChevronDown as ChevronDownIcon } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/**
 * A searchable-scale multi-select filter, anchored to its own trigger — the
 * shadcn/Linear/GitHub "faceted filter" pattern. Floats over the page (Radix
 * Popover: closes on outside click, Escape, carries the right ARIA state) and
 * clears itself independently of every other filter and of search.
 */
export default function FacetedFilter<T extends string>({
  label,
  options,
  selected,
  onToggle,
  onClear,
  className,
}: {
  label: string;
  options: readonly T[];
  selected: Set<T>;
  onToggle: (value: T) => void;
  onClear: () => void;
  className?: string;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="secondary"
          className={cn("relative", className)}
        >
          {label}
          {selected.size > 0 && (
            <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brand px-1.5 text-[0.6875rem] font-bold text-white">
              {selected.size}
            </span>
          )}
          <ChevronDownIcon className="size-3.5 text-ink-faint" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-0">
        <div className="max-h-64 overflow-y-auto p-2">
          {options.length === 0 ? (
            <p className="px-2 py-3 text-center text-[0.8125rem] text-ink-faint">
              Nothing to filter by yet.
            </p>
          ) : (
            options.map((opt) => (
              <label
                key={opt}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-[0.8125rem] text-foreground transition-colors duration-160 ease-out-quart hover:bg-secondary"
              >
                <Checkbox
                  checked={selected.has(opt)}
                  onCheckedChange={() => onToggle(opt)}
                />
                <span className="truncate">{opt}</span>
              </label>
            ))
          )}
        </div>
        {selected.size > 0 && (
          <div className="border-t border-line-subtle p-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={onClear}
            >
              Clear {label}
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
