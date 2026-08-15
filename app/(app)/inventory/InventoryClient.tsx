"use client";

import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { keepPreviousData, useQueries, useQuery } from "@tanstack/react-query";
import { itemStatusCountsQuery, itemsQuery } from "@/lib/queries";
import { useReference } from "@/lib/queries/use-reference";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  useCreateItem,
  useReactivateItem,
  useRetireItem,
} from "@/lib/mutations/items";
import { formatUnit } from "@/lib/inventory";
import type { ItemListRow } from "@/lib/api-types";
import type { InventoryItem, ItemStatus, NewItemInput } from "@/lib/types";
import { categoryIcon } from "@/lib/category-icons";
import { itemImage } from "@/lib/category-images";
import StatusBadge from "@/components/StatusBadge";
import Modal from "@/components/Modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { IconArchive as ArchiveBoxArrowDownIcon, IconDownload as ArrowDownTrayIcon, IconUpload as ArrowUpTrayIcon, IconCheck as CheckIcon, IconChevronDown as ChevronDownIcon, IconAlertTriangle as ExclamationTriangleIcon, IconFilter as FunnelIcon, IconList as ListBulletIcon, IconSearch as MagnifyingGlassIcon, IconPencil as PencilSquareIcon, IconPlus as PlusIcon, IconLayoutGrid as Squares2X2Icon } from "@tabler/icons-react";
import ItemCardList, { StatusChips } from "@/components/inventory/ItemCardList";
import { cn } from "@/lib/utils";

type ViewMode = "table" | "grid";

type SortKey = "name" | "category" | "status" | "quantity" | "dateAcquired";

function SortHead({
  label,
  sortKeyName,
  activeSortKey,
  sortDir,
  onSort,
}: {
  label: string;
  sortKeyName: SortKey;
  activeSortKey: SortKey;
  sortDir: "asc" | "desc";
  onSort: (key: SortKey) => void;
}) {
  return (
    <TableHead
      className="cursor-pointer select-none hover:text-muted-foreground"
      onClick={() => onSort(sortKeyName)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {activeSortKey === sortKeyName && (
          <ChevronDownIcon className={cn("size-3", sortDir === "desc" && "rotate-180")} />
        )}
      </span>
    </TableHead>
  );
}

function InventoryCard({
  item,
  categoryLabel,
  lastChecked,
  highlighted,
  reactivating,
  onRetire,
  onReactivate,
}: {
  item: ItemListRow;
  categoryLabel: string;
  /** Human-readable "last checked" from the weekly presence checks. */
  lastChecked: string | null;
  highlighted: boolean;
  reactivating: boolean;
  onRetire: () => void;
  onReactivate: () => void;
}) {
  const lowStock = item.is_low_stock;

  return (
    <div
      className={cn(
        "group flex flex-col overflow-hidden rounded-lg border border-border bg-card transition-colors duration-150 hover:border-brand/40",
        highlighted && "animate-[row-flash_2.4s_ease-out]"
      )}
    >
      <div className="relative aspect-4/3 w-full shrink-0 overflow-hidden bg-popover">
        <Image
          src={item.first_image_url ?? itemImage(categoryLabel, item.id)}
          alt=""
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 260px"
          className="object-cover transition-transform duration-200 ease-out group-hover:scale-[1.03]"
        />
        <div className="absolute inset-x-0 top-0 h-16 bg-linear-to-b from-black/55 to-transparent" />
        <div className="absolute top-2 right-2">
          <StatusBadge status={item.status} />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2.5 p-4">
        <div className="flex min-w-0 flex-col gap-0.5">
          <strong className="truncate text-[0.9375rem] font-bold">{item.item_name}</strong>
          <span className="text-xs text-ink-faint">
            {categoryLabel}
            {lastChecked ? ` · checked ${lastChecked}` : ""}
          </span>
        </div>

        {item.defective_unit_count > 0 && (
          <span className="inline-flex w-fit items-center gap-1 text-xs font-bold text-status-critical">
            <ExclamationTriangleIcon className="size-[11px]" />
            {item.defective_unit_count} of {item.unit_count} defective
          </span>
        )}

        {lowStock && (
          <span className="inline-flex w-fit items-center gap-1 text-xs font-bold text-status-caution">
            <ExclamationTriangleIcon className="size-[11px]" /> Low stock
          </span>
        )}

        <div className="mt-auto flex items-center justify-between gap-2 border-t border-line-subtle pt-2.5">
          <span className="text-[0.8125rem] tabular-nums text-muted-foreground">
            {item.quantity} {formatUnit(item.unit_of_measure, item.quantity)}
          </span>
          <div className="flex gap-1">
            <Button asChild variant="ghost" size="icon-sm" className="text-ink-faint hover:text-foreground">
              <Link href={`/inventory/new?id=${item.id}`} aria-label={`Edit ${item.item_name}`}>
                <PencilSquareIcon className="size-4" />
              </Link>
            </Button>
            {item.status === "Retired" ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="text-ink-faint hover:text-foreground"
                aria-label={`Reactivate ${item.item_name}`}
                loading={reactivating}
                onClick={onReactivate}
              >
                <CheckIcon className="size-4" />
              </Button>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="text-ink-faint hover:bg-brand-tint hover:text-brand"
                aria-label={`Retire ${item.item_name}`}
                disabled={item.status === "Defective" || item.status === "Under Repair"}
                onClick={onRetire}
                title={
                  item.status === "Defective" || item.status === "Under Repair"
                    ? "Resolve the open defect before retiring"
                    : "Retire item"
                }
              >
                <ArchiveBoxArrowDownIcon className="size-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const ALL_STATUSES: ItemStatus[] = [
  "Available",
  "In Use",
  "Defective",
  "Under Repair",
  "Retired",
];

const PAGE_SIZE = 25;

function Pager({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number | ((p: number) => number)) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-[0.8125rem] text-ink-faint">
        Page {page} of {totalPages}
      </span>
      <div className="flex gap-1">
        <button
          type="button"
          className="flex h-8 min-w-8 items-center justify-center rounded-sm text-[0.8125rem] font-bold text-muted-foreground transition-colors duration-150 hover:bg-popover hover:text-foreground disabled:pointer-events-none disabled:opacity-35"
          disabled={page === 1}
          onClick={() => onChange((p) => p - 1)}
        >
          ‹
        </button>
        {Array.from({ length: totalPages }, (_, i) => i + 1)
          .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
          .map((p, idx, arr) => (
            <span key={p} className="flex">
              {idx > 0 && arr[idx - 1] !== p - 1 && (
                <span className="flex h-8 min-w-8 items-center justify-center text-[0.8125rem] text-muted-foreground">
                  …
                </span>
              )}
              <button
                type="button"
                className={cn(
                  "flex h-8 min-w-8 items-center justify-center rounded-sm text-[0.8125rem] font-bold text-muted-foreground transition-colors duration-150 hover:bg-popover hover:text-foreground",
                  p === page && "bg-brand text-white hover:bg-brand hover:text-white"
                )}
                onClick={() => onChange(p)}
              >
                {p}
              </button>
            </span>
          ))}
        <button
          type="button"
          className="flex h-8 min-w-8 items-center justify-center rounded-sm text-[0.8125rem] font-bold text-muted-foreground transition-colors duration-150 hover:bg-popover hover:text-foreground disabled:pointer-events-none disabled:opacity-35"
          disabled={page === totalPages}
          onClick={() => onChange((p) => p + 1)}
        >
          ›
        </button>
      </div>
    </div>
  );
}

/** Debounces a value so a fast typist produces one request, not ten. */
function useDebounced<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

const TEMPLATE_HEADERS = [
  "Item Name",
  "Serial Number",
  "Description",
  "Category",
  "Quantity",
  "Unit of Measure",
  "Department",
  "Asset Type",
  "Minimum Stock Threshold",
  "Location",
  "Date Acquired",
  "Remarks",
];

export default function InventoryClient() {
  return (
    <Suspense fallback={null}>
      <InventoryContent />
    </Suspense>
  );
}

function InventoryContent() {
  const searchParams = useSearchParams();
  const { categories, departments, categoryIdByName, departmentIdByName } =
    useReference();

  const retire = useRetireItem();
  const reactivate = useReactivateItem();
  const createItem = useCreateItem();

  // "3 days ago" from the weekly presence checks; null when never checked.
  // Joined onto each row by getItemsPage for the visible page only.
  const lastCheckedLabel = (item: ItemListRow): string | null =>
    item.last_confirmed_at
      ? formatDistanceToNow(new Date(item.last_confirmed_at), {
          addSuffix: true,
        })
      : null;

  const initialStatus = searchParams.get("status");
  const initialCategory = searchParams.get("category");
  const initialDepartment = searchParams.get("department");
  const initialLowStock = searchParams.get("lowStock") === "1";
  const highlightId = searchParams.get("highlight");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<Set<ItemStatus>>(
    () => new Set((initialStatus?.split(",") as ItemStatus[]) ?? [])
  );
  const [categoryFilter, setCategoryFilter] = useState<Set<string>>(
    () => new Set(initialCategory ? [initialCategory] : [])
  );
  const [departmentFilter, setDepartmentFilter] = useState<Set<string>>(
    () => new Set(initialDepartment ? [initialDepartment] : [])
  );
  const [includeRetired, setIncludeRetired] = useState(false);
  const [lowStockOnly, setLowStockOnly] = useState(initialLowStock);
  const [filterOpen, setFilterOpen] = useState(false);
  const [view, setView] = useState<ViewMode>("table");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [retireTarget, setRetireTarget] = useState<ItemListRow | null>(null);

  // Typing must not fire a request per keystroke — the query key only moves
  // once the user pauses.
  const debouncedSearch = useDebounced(search, 300);

  const reactivatingId = reactivate.isPending
    ? (reactivate.variables as string)
    : null;

  async function handleReactivate(id: string) {
    if (reactivate.isPending) return;
    await reactivate.mutateAsync(id).catch(() => {});
  }

  async function handleRetireConfirm() {
    if (!retireTarget) return;
    await retire.mutateAsync(retireTarget.id).catch(() => {});
    setRetireTarget(null);
  }

  const activeFilterCount =
    statusFilter.size +
    categoryFilter.size +
    departmentFilter.size +
    (lowStockOnly ? 1 : 0);

  // Filters travel to Postgres. The panel holds category and department as
  // display names; the query wants ids.
  const filters = useMemo(
    () => ({
      page,
      q: debouncedSearch,
      statuses: [...statusFilter],
      categoryIds: [...categoryFilter]
        .map(categoryIdByName)
        .filter((id): id is string => Boolean(id)),
      departmentIds: [...departmentFilter]
        .map(departmentIdByName)
        .filter((id): id is string => Boolean(id)),
      lowStockOnly,
      includeRetired,
      sort: sortKey,
      dir: sortDir,
    }),
    [
      page,
      debouncedSearch,
      statusFilter,
      categoryFilter,
      departmentFilter,
      lowStockOnly,
      includeRetired,
      sortKey,
      sortDir,
      categoryIdByName,
      departmentIdByName,
    ]
  );

  const { data: pageData, isPending } = useQuery({
    ...itemsQuery(filters),
    // Paging keeps the previous rows on screen instead of flashing empty.
    placeholderData: keepPreviousData,
  });
  const { data: statusCounts } = useQuery(itemStatusCountsQuery());

  const pageItems = pageData?.rows ?? [];
  const matchCount = pageData?.total ?? 0;
  const totalItems = statusCounts?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(matchCount / PAGE_SIZE));
  const clampedPage = Math.min(page, totalPages);

  // Mobile "Load more" renders pages 1..N as one list. Rather than mirroring
  // fetched pages into state, read the same per-page cache entries the desktop
  // pager populates — no effects, no duplicate source of truth. Gated on the
  // viewport so the desktop pager jumping to page 5 does not fetch 1 through 4.
  const isMobile = useIsMobile();
  const mobilePages = useQueries({
    queries: Array.from({ length: isMobile ? page : 0 }, (_, i) =>
      itemsQuery({ ...filters, page: i + 1 })
    ),
  });
  const mobileItems = mobilePages.flatMap((q) => q.data?.rows ?? []);

  function toggleSort(key: typeof sortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(1);
  }

  function toggleSetValue<T>(set: Set<T>, setter: (s: Set<T>) => void, value: T) {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    setter(next);
    setPage(1);
  }

  function clearFilters() {
    setSearch("");
    setStatusFilter(new Set());
    setCategoryFilter(new Set());
    setDepartmentFilter(new Set());
    setLowStockOnly(false);
    setIncludeRetired(false);
    setPage(1);
  }

  function downloadTemplate() {
    const csv = TEMPLATE_HEADERS.join(",") + "\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "inventory-bulk-import-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="h-headline">Inventory</h1>
          <p className="mt-1.5 text-muted-foreground">
            {isPending
              ? "Loading…"
              : matchCount === 0
                ? `0 of ${totalItems} items shown.`
                : `Showing ${(clampedPage - 1) * PAGE_SIZE + 1}–${Math.min(
                    clampedPage * PAGE_SIZE,
                    matchCount
                  )} of ${matchCount} items` +
                  (matchCount !== totalItems
                    ? ` (filtered from ${totalItems}).`
                    : ".")}
          </p>
        </div>
        <div className="flex gap-2">
          {/* Bulk import is a desk task — it needs a file picker and a wide
              results table, so it stays off the phone. */}
          <Button
            type="button"
            variant="secondary"
            className="hidden md:inline-flex"
            onClick={() => setBulkOpen(true)}
          >
            <ArrowUpTrayIcon className="size-4" /> Bulk Import
          </Button>
          <Button asChild>
            <Link href="/inventory/new" data-tour="add-item">
              <PlusIcon className="size-4" /> Add Item
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-faint" />
          <Input
            className="pl-10"
            placeholder="Search by item name…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <Button type="button" variant="secondary" className="relative" onClick={() => setFilterOpen((v) => !v)}>
          <FunnelIcon className="size-4" /> Filters
          {activeFilterCount > 0 && (
            <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brand px-1.5 text-[0.6875rem] font-bold text-white">
              {activeFilterCount}
            </span>
          )}
          <ChevronDownIcon className="size-3.5" />
        </Button>
        <label className="ml-1 hidden items-center gap-2 text-[0.8125rem] text-muted-foreground md:flex">
          <Checkbox
            checked={includeRetired}
            onCheckedChange={(v) => {
              setIncludeRetired(v === true);
              setPage(1);
            }}
          />
          Include Retired Items
        </label>

        <div className="ml-auto hidden shrink-0 gap-0.5 rounded-md border border-border bg-surface-sunken p-0.5 md:flex">
          <button
            type="button"
            aria-label="Table view"
            aria-pressed={view === "table"}
            onClick={() => setView("table")}
            className={cn(
              "flex size-8 items-center justify-center rounded-sm text-ink-faint transition-colors duration-150",
              view === "table" ? "bg-card text-foreground" : "hover:text-foreground"
            )}
          >
            <ListBulletIcon className="size-4" />
          </button>
          <button
            type="button"
            aria-label="Grid view"
            aria-pressed={view === "grid"}
            onClick={() => setView("grid")}
            className={cn(
              "flex size-8 items-center justify-center rounded-sm text-ink-faint transition-colors duration-150",
              view === "grid" ? "bg-card text-foreground" : "hover:text-foreground"
            )}
          >
            <Squares2X2Icon className="size-4" />
          </button>
        </div>
      </div>

      {filterOpen && (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-6 rounded-lg border border-border bg-card p-6">
          <div className="flex flex-col gap-2">
            <span className="h-label">Category</span>
            {categories.map((cat) => (
              <label key={cat} className="flex cursor-pointer items-center gap-2 text-[0.8125rem] text-muted-foreground">
                <Checkbox
                  checked={categoryFilter.has(cat)}
                  onCheckedChange={() => toggleSetValue(categoryFilter, setCategoryFilter, cat)}
                />
                {cat}
              </label>
            ))}
          </div>
          <div className="flex flex-col gap-2">
            <span className="h-label">Department</span>
            {departments.map((dept) => (
              <label key={dept} className="flex cursor-pointer items-center gap-2 text-[0.8125rem] text-muted-foreground">
                <Checkbox
                  checked={departmentFilter.has(dept)}
                  onCheckedChange={() => toggleSetValue(departmentFilter, setDepartmentFilter, dept)}
                />
                {dept}
              </label>
            ))}
          </div>
          <div className="flex flex-col gap-2">
            <span className="h-label">Status</span>
            {ALL_STATUSES.map((s) => (
              <label key={s} className="flex cursor-pointer items-center gap-2 text-[0.8125rem] text-muted-foreground">
                <Checkbox
                  checked={statusFilter.has(s)}
                  onCheckedChange={() => toggleSetValue(statusFilter, setStatusFilter, s)}
                />
                {s}
              </label>
            ))}
          </div>
          <div className="flex flex-col gap-2">
            <span className="h-label">Stock</span>
            <label className="flex cursor-pointer items-center gap-2 text-[0.8125rem] text-muted-foreground">
              <Checkbox
                checked={lowStockOnly}
                onCheckedChange={(v) => {
                  setLowStockOnly(v === true);
                  setPage(1);
                }}
              />
              Low stock only
            </label>
          </div>
          <div className="col-span-full flex items-center justify-between border-t border-line-subtle pt-2">
            <Button type="button" variant="ghost" size="sm" onClick={clearFilters}>
              Clear Filters
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={() => setFilterOpen(false)}>
              Done
            </Button>
          </div>
        </div>
      )}

      {/* Single-select status chips stand in for the filter panel on mobile.
          They drive the same statusFilter set the panel does. */}
      <StatusChips
        className="md:hidden"
        counts={statusCounts}
        statusFilter={statusFilter}
        onSelect={(status) => {
          setStatusFilter(status === null ? new Set() : new Set([status]));
          if (status === "Retired") setIncludeRetired(true);
          setPage(1);
        }}
      />

      {totalPages > 1 && (
        <div className="hidden md:block">
          <Pager page={clampedPage} totalPages={totalPages} onChange={setPage} />
        </div>
      )}

      <ItemCardList
        className="md:hidden"
        items={mobileItems}
        highlightId={highlightId}
      />

      {clampedPage < totalPages && (
        <Button
          type="button"
          variant="outline"
          className="w-full text-muted-foreground md:hidden"
          onClick={() => setPage(clampedPage + 1)}
        >
          Load {Math.min(PAGE_SIZE, matchCount - mobileItems.length)} more
        </Button>
      )}

      <div className="hidden md:block">
      {view === "table" ? (
        <div className="overflow-hidden rounded-lg border border-border">
          <Table className="min-w-[860px]">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <SortHead label="Item Name" sortKeyName="name" activeSortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <SortHead label="Category" sortKeyName="category" activeSortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <SortHead label="Status" sortKeyName="status" activeSortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <SortHead label="Quantity" sortKeyName="quantity" activeSortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <TableHead>Location</TableHead>
                <SortHead label="Date Acquired" sortKeyName="dateAcquired" activeSortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <TableHead>Last Checked</TableHead>
                <TableHead aria-label="Actions" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageItems.map((item) => {
                const lowStock = item.is_low_stock;
                const catLabel = item.category_name;
                const Icon = categoryIcon(catLabel);
                return (
                  <TableRow
                    key={item.id}
                    className={item.id === highlightId ? "animate-[row-flash_2.4s_ease-out]" : undefined}
                  >
                    <TableCell>
                      <div className="flex min-w-[200px] items-center gap-2.5">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-sm border border-border bg-popover text-muted-foreground">
                          <Icon className="size-[18px]" />
                        </span>
                        <span className="flex min-w-0 flex-col">
                          <strong className="max-w-60 truncate text-[0.875rem] font-bold">
                            {item.item_name}
                          </strong>
                          {lowStock && (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-status-caution">
                              <ExclamationTriangleIcon className="size-[11px]" /> Low stock
                            </span>
                          )}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{catLabel}</TableCell>
                    <TableCell>
                      <StatusBadge status={item.status} />
                      {/* The badge is the item's rollup; this says how many of
                          its units are out of service — "1 of 4" still leaves
                          three working. */}
                      {item.defective_unit_count > 0 && (
                        <span className="mt-1 flex items-center gap-1 text-xs font-bold text-status-critical">
                          <ExclamationTriangleIcon className="size-[11px]" />
                          {item.defective_unit_count} of {item.unit_count} defective
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {item.quantity} {formatUnit(item.unit_of_measure, item.quantity)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{item.location || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {item.date_acquired
                        ? new Date(item.date_acquired).toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })
                        : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {lastCheckedLabel(item) ?? "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button asChild variant="ghost" size="icon-sm" className="text-ink-faint hover:text-foreground">
                          <Link href={`/inventory/new?id=${item.id}`} aria-label={`Edit ${item.item_name}`}>
                            <PencilSquareIcon className="size-4" />
                          </Link>
                        </Button>
                        {item.status === "Retired" ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            className="text-ink-faint hover:text-foreground"
                            aria-label={`Reactivate ${item.item_name}`}
                            loading={reactivatingId === item.id}
                            onClick={() => handleReactivate(item.id)}
                          >
                            <CheckIcon className="size-4" />
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            className="text-ink-faint hover:bg-brand-tint hover:text-brand"
                            aria-label={`Retire ${item.item_name}`}
                            disabled={item.status === "Defective" || item.status === "Under Repair"}
                            onClick={() => setRetireTarget(item)}
                            title={
                              item.status === "Defective" || item.status === "Under Repair"
                                ? "Resolve the open defect before retiring"
                                : "Retire item"
                            }
                          >
                            <ArchiveBoxArrowDownIcon className="size-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {pageItems.length === 0 && (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={8}>
                    <div className="py-16 text-center">
                      <p className="h-title mb-1.5">No items match your filters</p>
                      <p className="mb-4 text-muted-foreground">
                        Try widening your search or clearing filters.
                      </p>
                      <Button type="button" variant="secondary" size="sm" onClick={clearFilters}>
                        Clear Filters
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      ) : pageItems.length > 0 ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
          {pageItems.map((item) => (
            <InventoryCard
              key={item.id}
              item={item}
              categoryLabel={item.category_name}
              lastChecked={lastCheckedLabel(item)}
              highlighted={item.id === highlightId}
              reactivating={reactivatingId === item.id}
              onReactivate={() => handleReactivate(item.id)}
              onRetire={() => setRetireTarget(item)}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-border px-4 py-16 text-center">
          <p className="h-title mb-1.5">No items match your filters</p>
          <p className="mb-4 text-muted-foreground">Try widening your search or clearing filters.</p>
          <Button type="button" variant="secondary" size="sm" onClick={clearFilters}>
            Clear Filters
          </Button>
        </div>
      )}
      </div>

      {matchCount > 0 && (
        <div className="hidden md:block">
          <Pager page={clampedPage} totalPages={totalPages} onChange={setPage} />
        </div>
      )}

      {retireTarget && (
        <Modal title="Retire item?" onClose={() => setRetireTarget(null)}>
          <p className="text-muted-foreground">
            <strong className="text-foreground">{retireTarget.item_name}</strong>{" "}
            will be moved to Retired. It disappears from the active listing and
            counts, but stays visible in historical reports and the audit
            trail.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={retire.isPending}
              onClick={() => setRetireTarget(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              loading={retire.isPending}
              onClick={handleRetireConfirm}
            >
              Retire Item
            </Button>
          </div>
        </Modal>
      )}

      {bulkOpen && (
        <BulkImportModal
          onClose={() => setBulkOpen(false)}
          onDownloadTemplate={downloadTemplate}
          onImport={async (rows) => {
            for (const r of rows) await createItem.mutateAsync(r);
          }}
        />
      )}
    </div>
  );
}

function BulkImportModal({
  onClose,
  onDownloadTemplate,
  onImport,
}: {
  onClose: () => void;
  onDownloadTemplate: () => void;
  onImport: (rows: NewItemInput[]) => void | Promise<void>;
}) {
  const { categories, units, departments, categoryIdByName, departmentIdByName } =
    useReference();
  const [fileName, setFileName] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{
    valid: number;
    errors: { row: number; reason: string }[];
  } | null>(null);

  function parseCsv(text: string) {
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length === 0) return { rows: [], errors: [] };
    const header = lines[0].split(",").map((h) => h.trim());
    const rows: NewItemInput[] = [];
    const errors: { row: number; reason: string }[] = [];

    for (let i = 1; i < lines.length; i++) {
      const cells = lines[i].split(",").map((c) => c.trim());
      const record: Record<string, string> = {};
      header.forEach((h, idx) => (record[h] = cells[idx] ?? ""));

      const name = record["Item Name"];
      const category = record["Category"];
      const quantityRaw = record["Quantity"];
      const unit = record["Unit of Measure"];
      const department = record["Department"];
      const assetType = record["Asset Type"];

      if (!name) {
        errors.push({ row: i + 1, reason: "Item Name is required" });
        continue;
      }
      if (!categories.includes(category)) {
        errors.push({ row: i + 1, reason: `Unknown category "${category}"` });
        continue;
      }
      const quantity = Number(quantityRaw);
      if (!Number.isInteger(quantity) || quantity < 0) {
        errors.push({ row: i + 1, reason: "Quantity must be a whole number ≥ 0" });
        continue;
      }
      if (!units.includes(unit)) {
        errors.push({ row: i + 1, reason: `Unknown unit of measure "${unit}"` });
        continue;
      }
      // Checked against the live list, not a hardcoded three — departments are
      // managed from Settings, so a newly added one has to import too.
      if (!departments.includes(department)) {
        errors.push({ row: i + 1, reason: `Unknown department "${department}"` });
        continue;
      }
      if (
        !["Equipment", "Furniture", "Consumable", "Electronics", "Other"].includes(
          assetType
        )
      ) {
        errors.push({ row: i + 1, reason: `Unknown asset type "${assetType}"` });
        continue;
      }

      rows.push({
        item_name: name,
        description: record["Description"] || null,
        category_id: categoryIdByName(category)!,
        department_id: departmentIdByName(department)!,
        quantity,
        unit_of_measure: unit,
        asset_type: assetType as InventoryItem["asset_type"],
        minimum_stock_threshold: record["Minimum Stock Threshold"]
          ? Number(record["Minimum Stock Threshold"])
          : null,
        location: record["Location"] || null,
        date_acquired: record["Date Acquired"] || null,
        serial_number: record["Serial Number"] || null,
        images: [],
        remarks: record["Remarks"] || null,
      });
    }
    return { rows, errors };
  }

  function handleFile(file: File) {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = async () => {
      const text = String(reader.result ?? "");
      const { rows, errors } = parseCsv(text);
      if (rows.length > 0) {
        setImporting(true);
        try {
          await onImport(rows);
        } finally {
          setImporting(false);
        }
      }
      setResult({ valid: rows.length, errors });
    };
    reader.readAsText(file);
  }

  return (
    <Modal title="Bulk Import Items" onClose={onClose} wide>
      <div className="mb-4 flex items-center justify-between rounded-md border border-border p-3.5">
        <div>
          <p className="h-title text-[0.9375rem]">1. Download the template</p>
          <p className="text-[0.8125rem] text-ink-faint">CSV with the required column headers.</p>
        </div>
        <Button type="button" variant="secondary" size="sm" onClick={onDownloadTemplate}>
          <ArrowDownTrayIcon className="size-3.5" /> Template
        </Button>
      </div>

      <p className="h-title mb-2.5 text-[0.9375rem]">2. Upload your completed file</p>
      <label
        className={cn(
          "flex flex-col items-center gap-2 rounded-md border-[1.5px] border-dashed border-border p-8 text-center text-muted-foreground transition-colors duration-150",
          importing
            ? "cursor-not-allowed opacity-60"
            : "cursor-pointer hover:border-brand hover:bg-brand-tint"
        )}
      >
        <ArrowUpTrayIcon className="size-[22px]" />
        <span>
          {importing ? (
            <strong className="text-foreground">Importing…</strong>
          ) : fileName ? (
            <strong className="text-foreground">{fileName}</strong>
          ) : (
            "Click to choose a CSV file, or drag it here"
          )}
        </span>
        <input
          type="file"
          accept=".csv"
          className="sr-only"
          disabled={importing}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
      </label>

      {result && (
        <div className="mt-4 flex flex-col gap-1.5 rounded-md border border-border p-4 text-[0.8125rem]">
          <span className="font-bold text-status-good">
            {result.valid} row{result.valid === 1 ? "" : "s"} imported
          </span>
          {result.errors.length > 0 && (
            <>
              <span className="font-bold text-brand">
                {result.errors.length} row{result.errors.length === 1 ? "" : "s"} skipped
              </span>
              <ul className="list-disc pl-[18px]">
                {result.errors.slice(0, 8).map((e, idx) => (
                  <li key={idx} className="text-ink-faint">
                    Row {e.row}: {e.reason}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      <div className="mt-5 flex justify-end">
        <Button type="button" variant="secondary" onClick={onClose}>
          Close
        </Button>
      </div>
    </Modal>
  );
}
