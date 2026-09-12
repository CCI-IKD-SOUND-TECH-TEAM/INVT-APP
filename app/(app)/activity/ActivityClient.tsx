"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  IconArchive as ArchiveBoxIcon,
  IconAlertTriangle as ExclamationTriangleIcon,
  IconDownload as ArrowDownTrayIcon,
  IconPrinter as PrinterIcon,
  IconTool as WrenchScrewdriverIcon,
} from "@tabler/icons-react";
import { activityQuery } from "@/lib/queries";
import { useReference } from "@/lib/queries/use-reference";
import { downloadCsv, printReport, type ReportResult } from "@/lib/reports/export";
import type { AuditEntry } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

const ACTION_TYPES = [
  "Create",
  "Edit",
  "Retire",
  "Reactivate",
  "Defect",
  "Repair Status Change",
  "Settings",
  "Check",
];

interface FilterState {
  user: string;
  actionType: string;
  from: string;
  to: string;
}

const DEFAULT_FILTERS: FilterState = {
  user: "all",
  actionType: "all",
  from: "",
  to: "",
};

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function inRange(d: string, from: string, to: string) {
  if (!d) return !(from || to);
  if (from && d < from) return false;
  if (to && d > to) return false;
  return true;
}

function applyFilters(activity: AuditEntry[], f: FilterState): AuditEntry[] {
  return activity
    .filter((a) => f.user === "all" || a.user === f.user)
    .filter((a) => f.actionType === "all" || a.actionType === f.actionType)
    .filter((a) => inRange(a.timestamp.slice(0, 10), f.from, f.to));
}

function toResult(activity: AuditEntry[]): ReportResult {
  return {
    columns: [
      { key: "timestamp", label: "Timestamp" },
      { key: "user", label: "User" },
      { key: "action", label: "Action Type" },
      { key: "record", label: "Record Affected" },
      { key: "detail", label: "Detail" },
    ],
    rows: activity.map((a) => ({
      timestamp: fmtDateTime(a.timestamp),
      user: a.user,
      action: a.actionType,
      record: a.recordLabel,
      detail: a.detail,
    })),
  };
}

function ActivityIcon({ type }: { type: AuditEntry["actionType"] }) {
  const Icon =
    type === "Defect" || type === "Repair Status Change"
      ? WrenchScrewdriverIcon
      : type === "Retire"
        ? ExclamationTriangleIcon
        : ArchiveBoxIcon;
  return (
    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-popover text-muted-foreground">
      <Icon className="size-3.5" />
    </span>
  );
}

function FilterField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

export default function ActivityClient({ limit }: { limit: number }) {
  const { data: activity = [], isPending } = useQuery(activityQuery(limit));
  const { users } = useReference();
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);

  function set<K extends keyof FilterState>(key: K, value: FilterState[K]) {
    setFilters((f) => ({ ...f, [key]: value }));
  }

  const filtered = useMemo(
    () => applyFilters(activity, filters),
    [activity, filters]
  );
  const result = useMemo(() => toResult(filtered), [filtered]);
  const empty = filtered.length === 0;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="h-headline">Activity</h1>
        <p className="mt-1.5 text-muted-foreground">
          {isPending
            ? "Loading the audit trail…"
            : "The audit trail — who changed what, and when."}
        </p>
      </div>

      {activity.length >= limit && (
        <p className="rounded-lg border border-status-caution bg-status-caution-bg px-4 py-3 text-[0.8125rem] font-bold text-status-caution">
          Showing the most recent {limit} entries — older activity isn&apos;t
          loaded here.
        </p>
      )}

      <Card className="gap-4 p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <FilterField label="User">
            <Select value={filters.user} onValueChange={(v) => set("user", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All users</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u} value={u}>
                    {u}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>

          <FilterField label="Action Type">
            <Select
              value={filters.actionType}
              onValueChange={(v) => set("actionType", v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All actions</SelectItem>
                {ACTION_TYPES.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>

          <FilterField label="Date — From">
            <DatePicker
              value={filters.from}
              maxDate={new Date()}
              onChange={(v) => set("from", v)}
            />
          </FilterField>

          <FilterField label="Date — To">
            <DatePicker
              value={filters.to}
              maxDate={new Date()}
              onChange={(v) => set("to", v)}
            />
          </FilterField>
        </div>

        <div className="flex items-center justify-between gap-3">
          <span className="text-[0.8125rem] text-ink-faint tabular-nums">
            {result.rows.length} entr{result.rows.length === 1 ? "y" : "ies"}
          </span>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={empty}
              onClick={() => downloadCsv("Activity", result)}
            >
              <ArrowDownTrayIcon className="size-3.5" /> Excel
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={empty}
              title="Opens your browser's print dialog — choose “Save as PDF”"
              onClick={() => printReport("Activity", result)}
            >
              <PrinterIcon className="size-3.5" /> PDF
            </Button>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-border">
          {empty ? (
            <div className="px-4 py-16 text-center text-muted-foreground">
              No activity matches these filters.
            </div>
          ) : (
            <Table className="min-w-[640px]">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-8" />
                  {result.columns.map((c) => (
                    <TableHead key={c.key}>{c.label}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((a, idx) => (
                  <TableRow
                    key={a.id}
                    className={cn(idx % 2 === 1 && "bg-popover/40")}
                  >
                    <TableCell>
                      <ActivityIcon type={a.actionType} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {fmtDateTime(a.timestamp)}
                    </TableCell>
                    <TableCell>{a.user}</TableCell>
                    <TableCell>{a.actionType}</TableCell>
                    <TableCell>{a.recordLabel}</TableCell>
                    <TableCell className="max-w-[24rem] truncate">
                      {a.detail}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </Card>
    </div>
  );
}
