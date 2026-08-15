"use client";

import { useMemo, useState, type ComponentProps, type ComponentType, type SVGProps } from "react";
import { useQuery } from "@tanstack/react-query";
import { reportsQuery } from "@/lib/queries";
import { useReference } from "@/lib/queries/use-reference";
import { todayIso } from "@/lib/checks";
import { isLowStock } from "@/lib/inventory";
import type { DefectWithItem, ItemListRow } from "@/lib/api-types";
import type { AuditEntry, Defect, DefectSeverity } from "@/lib/types";
import StatusBadge from "@/components/StatusBadge";
import SeverityLabel from "@/components/SeverityLabel";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { IconArchive as ArchiveBoxIcon, IconDownload as ArrowDownTrayIcon, IconTrendingDown as ArrowTrendingDownIcon, IconClock as ClockIcon, IconCube as CubeIcon, IconAlertTriangle as ExclamationTriangleIcon, IconPrinter as PrinterIcon, IconLayoutGrid as Squares2X2Icon, IconTool as WrenchScrewdriverIcon } from "@tabler/icons-react";

type HeroIcon = ComponentType<SVGProps<SVGSVGElement>>;
type StatusValue = ComponentProps<typeof StatusBadge>["status"];

type Column = { key: string; label: string; kind?: "status" | "num" | "severity" };
type Row = Record<string, string>;
type ReportResult = { columns: Column[]; rows: Row[] };

type DateField = { field: "dateAcquired" | "dateReported" | "timestamp"; label: string };

interface FilterState {
  category: string;
  from: string;
  to: string;
  includeRetired: boolean;
  severity: string;
  defectStatus: string;
  user: string;
  actionType: string;
}

interface ReportData {
  items: ItemListRow[];
  /** Carries item_name, so no id -> item lookup is needed. */
  defects: DefectWithItem[];
  activity: AuditEntry[];
  categories: string[];
  users: string[];
  categoryName: (id: string) => string;
}

interface ReportDef {
  id: string;
  name: string;
  description: string;
  icon: HeroIcon;
  unit: string;
  date?: DateField;
  filters: {
    category?: boolean;
    includeRetired?: boolean;
    severity?: boolean;
    defectStatus?: boolean;
    user?: boolean;
    actionType?: boolean;
  };
  run: (data: ReportData, f: FilterState) => ReportResult;
}

const DEFAULT_FILTERS: FilterState = {
  category: "all",
  from: "",
  to: "",
  includeRetired: false,
  severity: "all",
  defectStatus: "all",
  user: "all",
  actionType: "all",
};

const ACTION_TYPES = [
  "Create",
  "Edit",
  "Retire",
  "Reactivate",
  "Defect",
  "Repair Status Change",
  "Settings",
];
const DEFECT_STATUSES = ["Open", "Under Repair", "Resolved", "Not Repairable"];

function fmtDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function daysOpen(dateReported: string) {
  const diff = Date.now() - new Date(dateReported).getTime();
  return Math.max(0, Math.floor(diff / 86_400_000));
}

function inRange(d: string, from: string, to: string) {
  if (!d) return !(from || to);
  if (from && d < from) return false;
  if (to && d > to) return false;
  return true;
}

function isTerminal(status: Defect["status"]) {
  return status === "Resolved" || status === "Not Repairable";
}

const REPORTS: ReportDef[] = [
  {
    id: "total-inventory",
    name: "Total Inventory",
    description: "Every asset on record, active and retired.",
    icon: ArchiveBoxIcon,
    unit: "items",
    date: { field: "dateAcquired", label: "Date Acquired" },
    filters: { category: true, includeRetired: true },
    run: (data, f) => ({
      columns: [
        { key: "name", label: "Item Name" },
        { key: "category", label: "Category" },
        { key: "status", label: "Status", kind: "status" },
        { key: "quantity", label: "Quantity", kind: "num" },
        { key: "location", label: "Location" },
      ],
      rows: data.items
        .filter((it) => f.includeRetired || it.status !== "Retired")
        .filter(
          (it) =>
            f.category === "all" || data.categoryName(it.category_id) === f.category
        )
        .filter((it) => inRange(it.date_acquired ?? "", f.from, f.to))
        .map((it) => ({
          name: it.item_name,
          category: data.categoryName(it.category_id),
          status: it.status,
          quantity: String(it.quantity),
          location: it.location ?? "—",
        })),
    }),
  },
  {
    id: "active-inventory",
    name: "Active Inventory",
    description: "Everything currently in service — retired items excluded.",
    icon: CubeIcon,
    unit: "items",
    date: { field: "dateAcquired", label: "Date Acquired" },
    filters: { category: true },
    run: (data, f) => ({
      columns: [
        { key: "name", label: "Item Name" },
        { key: "category", label: "Category" },
        { key: "quantity", label: "Quantity", kind: "num" },
        { key: "location", label: "Location" },
      ],
      rows: data.items
        .filter((it) => it.status !== "Retired")
        .filter(
          (it) =>
            f.category === "all" || data.categoryName(it.category_id) === f.category
        )
        .filter((it) => inRange(it.date_acquired ?? "", f.from, f.to))
        .map((it) => ({
          name: it.item_name,
          category: data.categoryName(it.category_id),
          quantity: String(it.quantity),
          location: it.location ?? "—",
        })),
    }),
  },
  {
    id: "defective-inventory",
    name: "Defective Inventory",
    description: "Logged defects with severity and how long they've been open.",
    icon: ExclamationTriangleIcon,
    unit: "defects",
    date: { field: "dateReported", label: "Date Reported" },
    filters: { severity: true },
    run: (data, f) => ({
      columns: [
        { key: "name", label: "Item Name" },
        { key: "description", label: "Defect Description" },
        { key: "severity", label: "Severity", kind: "severity" },
        { key: "status", label: "Status", kind: "status" },
        { key: "days", label: "Days Open", kind: "num" },
      ],
      rows: data.defects
        .filter((d) => f.severity === "all" || d.severity === f.severity)
        .filter((d) => inRange(d.date_reported, f.from, f.to))
        .map((d) => ({
          name: d.item_name,
          description: d.description,
          severity: d.severity,
          status: d.status,
          days: isTerminal(d.status) ? "—" : String(daysOpen(d.date_reported)),
        })),
    }),
  },
  {
    id: "low-stock",
    name: "Low Stock",
    description: "Items at or below their minimum stock threshold.",
    icon: ArrowTrendingDownIcon,
    unit: "items",
    filters: { category: true },
    run: (data, f) => ({
      columns: [
        { key: "name", label: "Item Name" },
        { key: "quantity", label: "Quantity", kind: "num" },
        { key: "threshold", label: "Threshold", kind: "num" },
        { key: "category", label: "Category" },
      ],
      rows: data.items
        .filter((it) => it.status !== "Retired" && isLowStock(it))
        .filter(
          (it) =>
            f.category === "all" || data.categoryName(it.category_id) === f.category
        )
        .map((it) => ({
          name: it.item_name,
          quantity: String(it.quantity),
          threshold: String(it.minimum_stock_threshold),
          category: data.categoryName(it.category_id),
        })),
    }),
  },
  {
    id: "repair-history",
    name: "Repair History",
    description: "Every defect that entered repair, and how it resolved.",
    icon: WrenchScrewdriverIcon,
    unit: "repairs",
    date: { field: "dateReported", label: "Date Reported" },
    filters: { defectStatus: true },
    run: (data, f) => ({
      columns: [
        { key: "name", label: "Item Name" },
        { key: "defect", label: "Defect" },
        { key: "start", label: "Repair Started" },
        { key: "party", label: "Performing Party" },
        { key: "resolved", label: "Resolution Date" },
        { key: "outcome", label: "Outcome", kind: "status" },
      ],
      rows: data.defects
        .filter((d) => Boolean(d.repair_start_date) || isTerminal(d.status))
        .filter((d) => f.defectStatus === "all" || d.status === f.defectStatus)
        .filter((d) => inRange(d.date_reported, f.from, f.to))
        .map((d) => {
          const terminal = d.history.find((e) => isTerminal(e.status));
          return {
            name: d.item_name,
            defect: d.description,
            start: fmtDate(d.repair_start_date ?? undefined),
            party: d.performing_party ?? "—",
            resolved: terminal ? fmtDate(terminal.timestamp) : "—",
            outcome: d.status,
          };
        }),
    }),
  },
  {
    id: "by-category",
    name: "Inventory by Category",
    description: "Item and quantity totals rolled up per category.",
    icon: Squares2X2Icon,
    unit: "categories",
    filters: {},
    run: (data) => ({
      columns: [
        { key: "category", label: "Category" },
        { key: "count", label: "Item Count", kind: "num" },
        { key: "quantity", label: "Total Quantity", kind: "num" },
        { key: "low", label: "Low-Stock Items", kind: "num" },
      ],
      rows: data.categories
        .map((cat) => {
          const inCat = data.items.filter(
            (it) =>
              data.categoryName(it.category_id) === cat &&
              it.status !== "Retired"
          );
          const low = inCat.filter(
            (it) =>
              typeof it.minimum_stock_threshold === "number" &&
              it.quantity <= it.minimum_stock_threshold
          ).length;
          return {
            category: cat,
            count: String(inCat.length),
            quantity: String(inCat.reduce((s, it) => s + it.quantity, 0)),
            low: String(low),
          };
        })
        .filter((r) => r.count !== "0"),
    }),
  },
  {
    id: "recent-activity",
    name: "Recent Activities",
    description: "The audit trail — who changed what, and when.",
    icon: ClockIcon,
    unit: "entries",
    date: { field: "timestamp", label: "Date" },
    filters: { user: true, actionType: true },
    run: (data, f) => ({
      columns: [
        { key: "timestamp", label: "Timestamp" },
        { key: "user", label: "User" },
        { key: "action", label: "Action Type" },
        { key: "record", label: "Record Affected" },
        { key: "detail", label: "Detail" },
      ],
      rows: data.activity
        .filter((a) => f.user === "all" || a.user === f.user)
        .filter((a) => f.actionType === "all" || a.actionType === f.actionType)
        .filter((a) => inRange(a.timestamp.slice(0, 10), f.from, f.to))
        .map((a) => ({
          timestamp: fmtDateTime(a.timestamp),
          user: a.user,
          action: a.actionType,
          record: a.recordLabel,
          detail: a.detail,
        })),
    }),
  },
];

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function toCsv({ columns, rows }: ReportResult) {
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const head = columns.map((c) => esc(c.label)).join(",");
  const body = rows
    .map((r) => columns.map((c) => esc(r[c.key] ?? "")).join(","))
    .join("\n");
  return `${head}\n${body}`;
}

function downloadCsv(name: string, result: ReportResult) {
  const blob = new Blob([toCsv(result)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${slug(name)}-${todayIso()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// Print via a hidden iframe → the browser's "Save as PDF" destination.
function printReport(name: string, { columns, rows }: ReportResult) {
  const esc = (v: string) =>
    v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const thead = columns.map((c) => `<th>${esc(c.label)}</th>`).join("");
  const tbody = rows
    .map(
      (r) =>
        `<tr>${columns
          .map(
            (c) =>
              `<td class="${c.kind === "num" ? "num" : ""}">${esc(r[c.key] ?? "")}</td>`
          )
          .join("")}</tr>`
    )
    .join("");
  const generated = new Date().toLocaleString("en-GB");
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(name)}</title>
    <style>
      *{font-family:Arial,Helvetica,sans-serif;color:#111}
      body{margin:28px}
      h1{font-size:20px;margin:0 0 2px}
      .meta{color:#666;font-size:12px;margin-bottom:16px}
      table{width:100%;border-collapse:collapse;font-size:12px}
      th,td{border:1px solid #ccc;padding:6px 8px;text-align:left;vertical-align:top}
      th{background:#f3f3f3}
      td.num{text-align:right;font-variant-numeric:tabular-nums}
      tr:nth-child(even) td{background:#fafafa}
    </style></head><body>
    <h1>${esc(name)} Report</h1>
    <div class="meta">CCI Ikorodu Inventory · ${rows.length} row${rows.length === 1 ? "" : "s"} · Generated ${esc(generated)}</div>
    <table><thead><tr>${thead}</tr></thead><tbody>${tbody}</tbody></table>
    </body></html>`;

  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
  document.body.appendChild(iframe);
  const doc = iframe.contentWindow?.document;
  if (!doc) return;
  doc.open();
  doc.write(html);
  doc.close();
  iframe.contentWindow?.focus();
  iframe.contentWindow?.print();
  window.setTimeout(() => document.body.removeChild(iframe), 1000);
}

export default function ReportsClient() {
  const { categories, users, categoryName } = useReference();
  const { data: dataset, isPending } = useQuery(reportsQuery());

  const data: ReportData = useMemo(
    () => ({
      items: dataset?.items ?? [],
      defects: dataset?.defects ?? [],
      activity: dataset?.activity ?? [],
      categories,
      users,
      categoryName,
    }),
    [dataset, categories, users, categoryName]
  );

  const [openId, setOpenId] = useState<string | null>(null);
  const openReport = REPORTS.find((r) => r.id === openId) ?? null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="h-headline">Reports</h1>
        <p className="mt-1.5 text-muted-foreground">
          {isPending
            ? "Loading report data…"
            : "Generate a filtered preview, then export to Excel (CSV) or PDF."}
        </p>
      </div>

      {/* A report that silently described 1,000 of 1,200 items as the whole
          inventory would be worse than no report. PostgREST's max_rows caps the
          response; say so rather than exporting a subset as if it were total. */}
      {dataset?.truncated && (
        <p className="rounded-lg border border-status-caution bg-status-caution-bg px-4 py-3 text-[0.8125rem] font-bold text-status-caution">
          Showing {dataset.items.length} of {dataset.totalItems} items — the
          data layer capped this response, so exports below are incomplete.
          Raise <code>max_rows</code> in supabase/config.toml.
        </p>
      )}

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        {REPORTS.map((r) => {
          const count = r.run(data, DEFAULT_FILTERS).rows.length;
          const tone =
            (r.id === "low-stock" || r.id === "defective-inventory") && count > 0
              ? "text-status-caution"
              : "text-ink-muted";
          const Icon = r.icon;
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => setOpenId(r.id)}
              className="group flex w-full items-center gap-4 px-4 py-3.5 text-left transition-colors hover:bg-popover focus-visible:bg-popover focus-visible:outline-none [&:not(:last-child)]:border-b [&:not(:last-child)]:border-border"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-sm border border-border bg-popover text-muted-foreground group-hover:text-foreground">
                <Icon className="size-[17px]" />
              </span>

              <div className="min-w-0 flex-1">
                <div className="text-[0.9375rem] font-medium">{r.name}</div>
                <div className="truncate text-[0.8125rem] text-muted-foreground">
                  {r.description}
                </div>
              </div>

              <div className="min-w-[5.5rem] shrink-0 text-right tabular-nums">
                <span className={`text-[0.9375rem] font-bold ${tone}`}>
                  {count}
                </span>{" "}
                <span className="text-[0.8125rem] text-ink-faint">{r.unit}</span>
              </div>

              <span className="ml-1 hidden shrink-0 items-center rounded-md border border-border px-2.5 py-1 text-[0.8125rem] text-muted-foreground transition-colors group-hover:border-ink-faint group-hover:text-foreground sm:inline-flex">
                Generate
              </span>
            </button>
          );
        })}
      </div>

      {openReport && (
        <ReportDialog
          report={openReport}
          data={data}
          onClose={() => setOpenId(null)}
        />
      )}
    </div>
  );
}

function ReportDialog({
  report,
  data,
  onClose,
}: {
  report: ReportDef;
  data: ReportData;
  onClose: () => void;
}) {
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const result = useMemo(
    () => report.run(data, filters),
    [report, data, filters]
  );

  function set<K extends keyof FilterState>(key: K, value: FilterState[K]) {
    setFilters((f) => ({ ...f, [key]: value }));
  }

  const hasFilters =
    Boolean(report.date) || Object.values(report.filters).some(Boolean);
  const empty = result.rows.length === 0;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-3xl md:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{report.name}</DialogTitle>
        </DialogHeader>
        <div className="flex w-full flex-col gap-4">
        {hasFilters && (
          <div className="grid grid-cols-1 gap-3 rounded-md border border-border bg-card p-4 sm:grid-cols-2">
            {report.filters.category && (
              <FilterField label="Category">
                <Select
                  value={filters.category}
                  onValueChange={(v) => set("category", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All categories</SelectItem>
                    {data.categories.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FilterField>
            )}

            {report.filters.severity && (
              <FilterField label="Severity">
                <Select
                  value={filters.severity}
                  onValueChange={(v) => set("severity", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All severities</SelectItem>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                  </SelectContent>
                </Select>
              </FilterField>
            )}

            {report.filters.defectStatus && (
              <FilterField label="Defect Status">
                <Select
                  value={filters.defectStatus}
                  onValueChange={(v) => set("defectStatus", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    {DEFECT_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FilterField>
            )}

            {report.filters.user && (
              <FilterField label="User">
                <Select value={filters.user} onValueChange={(v) => set("user", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All users</SelectItem>
                    {data.users.map((u) => (
                      <SelectItem key={u} value={u}>
                        {u}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FilterField>
            )}

            {report.filters.actionType && (
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
            )}

            {report.date && (
              <>
                <FilterField label={`${report.date.label} — From`}>
                  <DatePicker
                    value={filters.from}
                    maxDate={new Date()}
                    onChange={(v) => set("from", v)}
                  />
                </FilterField>
                <FilterField label={`${report.date.label} — To`}>
                  <DatePicker
                    value={filters.to}
                    maxDate={new Date()}
                    onChange={(v) => set("to", v)}
                  />
                </FilterField>
              </>
            )}

            {report.filters.includeRetired && (
              <label className="flex cursor-pointer items-center gap-2.5 self-end py-2 text-sm text-muted-foreground">
                <Checkbox
                  checked={filters.includeRetired}
                  onCheckedChange={(c) => set("includeRetired", c === true)}
                />
                Include retired items
              </label>
            )}
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          <span className="text-[0.8125rem] text-ink-faint tabular-nums">
            {result.rows.length} row{result.rows.length === 1 ? "" : "s"}
          </span>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={empty}
              onClick={() => downloadCsv(report.name, result)}
            >
              <ArrowDownTrayIcon className="size-3.5" /> Excel
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={empty}
              title="Opens your browser's print dialog — choose “Save as PDF”"
              onClick={() => printReport(report.name, result)}
            >
              <PrinterIcon className="size-3.5" /> PDF
            </Button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-border">
          {empty ? (
            <div className="px-4 py-16 text-center text-muted-foreground">
              No rows match these filters.
            </div>
          ) : (
            <Table className="min-w-[640px]">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  {result.columns.map((c) => (
                    <TableHead
                      key={c.key}
                      className={c.kind === "num" ? "text-right" : undefined}
                    >
                      {c.label}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.rows.map((r, i) => (
                  <TableRow key={i} className="hover:bg-transparent">
                    {result.columns.map((c) => (
                      <TableCell
                        key={c.key}
                        className={
                          c.kind === "num"
                            ? "text-right tabular-nums text-muted-foreground"
                            : "text-muted-foreground"
                        }
                      >
                        {c.kind === "status" ? (
                          <StatusBadge status={r[c.key] as StatusValue} />
                        ) : c.kind === "severity" ? (
                          <SeverityLabel severity={r[c.key] as DefectSeverity} />
                        ) : (
                          r[c.key]
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
        </div>
      </DialogContent>
    </Dialog>
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
