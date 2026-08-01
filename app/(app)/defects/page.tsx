"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import type { Defect, DefectSeverity, InventoryItem } from "@/lib/types";
import StatusBadge from "@/components/StatusBadge";
import SeverityLabel from "@/components/SeverityLabel";
import Modal from "@/components/Modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetBody, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { IconCheck as CheckIcon, IconAlertTriangle as ExclamationTriangleIcon, IconPlus as PlusIcon, IconTool as WrenchScrewdriverIcon } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

const TODAY = new Date().toISOString().slice(0, 10);

function daysOpen(dateReported: string) {
  const start = new Date(dateReported).getTime();
  const diff = Date.now() - start;
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

function fmtDate(iso: string) {
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

const STATUS_TONE: Record<Defect["status"], string> = {
  Open: "var(--status-critical)",
  "Under Repair": "var(--status-caution)",
  Resolved: "var(--status-good)",
  "Not Repairable": "var(--status-neutral)",
};

function TabCount({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-popover px-1.5 py-px text-[0.6875rem] text-muted-foreground group-data-[state=active]:bg-brand-tint group-data-[state=active]:text-brand">
      {children}
    </span>
  );
}

export default function DefectLogPage() {
  return (
    <Suspense fallback={null}>
      <DefectLogContent />
    </Suspense>
  );
}

function DefectLogContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { items, defects, getItem, categoryName } = useStore();

  const [tab, setTab] = useState<"open" | "all">("open");
  const [logOpen, setLogOpen] = useState(searchParams.get("log") === "1");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const openDefects = defects.filter(
    (d) => d.status === "Open" || d.status === "Under Repair"
  );

  const visible = useMemo(() => {
    const list = tab === "open" ? openDefects : defects;
    return [...list].sort(
      (a, b) =>
        new Date(b.date_reported).getTime() -
        new Date(a.date_reported).getTime()
    );
  }, [tab, openDefects, defects]);

  const selectedDefect = defects.find((d) => d.id === selectedId) ?? null;

  function closeLogModal() {
    setLogOpen(false);
    if (searchParams.get("log")) router.replace("/defects");
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="h-headline">Defect Log</h1>
          <p className="mt-1.5 text-muted-foreground">
            Track what&apos;s broken, who&apos;s fixing it, and for how long.
          </p>
        </div>
        <Button type="button" onClick={() => setLogOpen(true)}>
          <PlusIcon className="size-4" /> Log Defect
        </Button>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as "open" | "all")}>
        <TabsList>
          <TabsTrigger value="open" className="group">
            Open Defects <TabCount>{openDefects.length}</TabCount>
          </TabsTrigger>
          <TabsTrigger value="all" className="group">
            All Defects <TabCount>{defects.length}</TabCount>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="overflow-hidden rounded-lg border border-border">
        <Table className="min-w-[720px]">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Item</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date Reported</TableHead>
              <TableHead>Days Open</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((d) => {
              const item = getItem(d.item_id);
              const isTerminal = d.status === "Resolved" || d.status === "Not Repairable";
              return (
                <TableRow key={d.id} className="cursor-pointer" onClick={() => setSelectedId(d.id)}>
                  <TableCell>
                    <strong className="block text-[0.875rem] font-bold">
                      {item?.item_name ?? "Unknown item"}
                    </strong>
                    <span className="text-xs text-ink-faint">
                      {item ? categoryName(item.category_id) : ""}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-80 truncate text-muted-foreground">
                    {d.description}
                  </TableCell>
                  <TableCell>
                    <SeverityLabel severity={d.severity} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={d.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">{fmtDate(d.date_reported)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {isTerminal ? "—" : `${daysOpen(d.date_reported)}d`}
                  </TableCell>
                </TableRow>
              );
            })}
            {visible.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={6}>
                  <div className="py-16 text-center text-muted-foreground">
                    {tab === "open"
                      ? "No open defects right now — nice work."
                      : "No defects logged yet."}
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {selectedDefect && (
        <DefectDrawer
          defect={selectedDefect}
          item={getItem(selectedDefect.item_id)}
          onClose={() => setSelectedId(null)}
        />
      )}

      {logOpen && (
        <LogDefectModal
          items={items.filter((i) => i.status !== "Retired")}
          initialItemId={searchParams.get("item") ?? undefined}
          onClose={closeLogModal}
        />
      )}
    </div>
  );
}

function DefectDrawer({
  defect,
  item,
  onClose,
}: {
  defect: Defect;
  item: InventoryItem | undefined;
  onClose: () => void;
}) {
  const { profileName } = useStore();
  const [showStart, setShowStart] = useState(false);
  const [showResolve, setShowResolve] = useState(false);
  const [showNotRepairable, setShowNotRepairable] = useState(false);

  return (
    <>
      <Sheet open onOpenChange={(open) => !open && onClose()}>
        <SheetContent aria-describedby={undefined}>
          <SheetHeader>
            <div>
              <SheetTitle>{item?.item_name ?? "Unknown item"}</SheetTitle>
              <div className="mt-2 flex items-center gap-2.5">
                <SeverityLabel severity={defect.severity} />
                <StatusBadge status={defect.status} />
              </div>
            </div>
          </SheetHeader>

          <SheetBody>
            <div className="text-sm leading-relaxed text-muted-foreground">{defect.description}</div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <span className="text-[0.6875rem] font-bold tracking-wide text-ink-faint uppercase">
                  Reported By
                </span>
                <span className="text-sm">{profileName(defect.reported_by)}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[0.6875rem] font-bold tracking-wide text-ink-faint uppercase">
                  Date Reported
                </span>
                <span className="text-sm">{fmtDate(defect.date_reported)}</span>
              </div>
              {defect.performing_party && (
                <div className="flex flex-col gap-1">
                  <span className="text-[0.6875rem] font-bold tracking-wide text-ink-faint uppercase">
                    Performing Party
                  </span>
                  <span className="text-sm">{defect.performing_party}</span>
                </div>
              )}
              {defect.repair_start_date && (
                <div className="flex flex-col gap-1">
                  <span className="text-[0.6875rem] font-bold tracking-wide text-ink-faint uppercase">
                    Repair Started
                  </span>
                  <span className="text-sm">{fmtDate(defect.repair_start_date)}</span>
                </div>
              )}
            </div>

            {defect.resolution_notes && (
              <div>
                <span className="text-[0.6875rem] font-bold tracking-wide text-ink-faint uppercase">
                  Resolution Notes
                </span>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {defect.resolution_notes}
                </p>
              </div>
            )}

            {defect.status === "Open" && (
              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={() => setShowStart(true)}>
                  <WrenchScrewdriverIcon className="size-[15px]" /> Start Repair
                </Button>
              </div>
            )}

            {defect.status === "Under Repair" && (
              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={() => setShowResolve(true)}>
                  <CheckIcon className="size-[15px]" /> Mark Resolved
                </Button>
                <Button type="button" variant="secondary" onClick={() => setShowNotRepairable(true)}>
                  <ExclamationTriangleIcon className="size-[15px]" /> Mark Not Repairable
                </Button>
              </div>
            )}

            <div>
              <span className="h-title text-[0.9375rem]">Repair History</span>
              <div className="mt-3.5 flex flex-col">
                {defect.history.map((ev, idx) => (
                  <div
                    key={ev.id}
                    className={cn(
                      "relative flex gap-3 pb-6",
                      idx === defect.history.length - 1 && "pb-0",
                      idx !== defect.history.length - 1 &&
                        "before:absolute before:top-[22px] before:bottom-0 before:left-[5px] before:w-px before:bg-border"
                    )}
                  >
                    <span
                      className="mt-1 size-[11px] shrink-0 rounded-full border-2 border-popover shadow-[0_0_0_1px_var(--border)]"
                      style={{ background: STATUS_TONE[ev.status] }}
                    />
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className="text-sm font-bold">{ev.status}</span>
                      {ev.note && <span className="text-[0.8125rem] text-muted-foreground">{ev.note}</span>}
                      <span className="text-xs text-ink-faint">
                        {ev.user} · {fmtDateTime(ev.timestamp)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </SheetBody>
        </SheetContent>
      </Sheet>

      {showStart && (
        <StartRepairModal defect={defect} onClose={() => setShowStart(false)} />
      )}
      {showResolve && (
        <ResolveModal defect={defect} onClose={() => setShowResolve(false)} />
      )}
      {showNotRepairable && (
        <NotRepairableModal
          defect={defect}
          onClose={() => setShowNotRepairable(false)}
        />
      )}
    </>
  );
}

function LogDefectModal({
  items,
  initialItemId,
  onClose,
}: {
  items: InventoryItem[];
  /** Pre-select an item (deep link from the weekly check walkthrough). */
  initialItemId?: string;
  onClose: () => void;
}) {
  const { logDefect } = useStore();
  const [itemId, setItemId] = useState(() =>
    initialItemId && items.some((i) => i.id === initialItemId)
      ? initialItemId
      : ""
  );
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState<DefectSeverity | "">("");
  const [dateReported, setDateReported] = useState(TODAY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!itemId) next.itemId = "Select which item this defect affects.";
    if (!description.trim()) next.description = "Defect description is required.";
    else if (description.length > 500)
      next.description = "Description must be 500 characters or fewer.";
    if (!severity) next.severity = "Severity is required.";
    if (!dateReported) next.dateReported = "Date Reported is required.";

    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);
    try {
      await logDefect({
        item_id: itemId,
        description: description.trim(),
        severity: severity as DefectSeverity,
        date_reported: dateReported,
      });
      onClose();
    } catch {
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Log Defect" onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <div>
          <Label htmlFor="defItem">Item *</Label>
          <Select value={itemId} onValueChange={setItemId}>
            <SelectTrigger id="defItem" className={errors.itemId ? "border-brand" : undefined}>
              <SelectValue placeholder="Select an item…" />
            </SelectTrigger>
            <SelectContent>
              {items.map((i) => (
                <SelectItem key={i.id} value={i.id}>
                  {i.item_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.itemId && (
            <span className="field-error">
              <ExclamationTriangleIcon className="size-[13px]" /> {errors.itemId}
            </span>
          )}
        </div>

        <div>
          <Label htmlFor="defDesc">Defect Description *</Label>
          <Textarea
            id="defDesc"
            aria-invalid={Boolean(errors.description)}
            value={description}
            maxLength={500}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What's wrong with it?"
          />
          {errors.description && (
            <span className="field-error">
              <ExclamationTriangleIcon className="size-[13px]" /> {errors.description}
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="defDate">Date Reported *</Label>
            <DatePicker
              id="defDate"
              maxDate={new Date()}
              aria-invalid={Boolean(errors.dateReported)}
              value={dateReported}
              onChange={setDateReported}
            />
            {errors.dateReported && (
              <span className="field-error">
                <ExclamationTriangleIcon className="size-[13px]" /> {errors.dateReported}
              </span>
            )}
          </div>
          <div>
            <Label htmlFor="defSeverity">Severity *</Label>
            <Select value={severity} onValueChange={(v) => setSeverity(v as DefectSeverity)}>
              <SelectTrigger id="defSeverity" className={errors.severity ? "border-brand" : undefined}>
                <SelectValue placeholder="Select…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Low">Low</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="High">High</SelectItem>
              </SelectContent>
            </Select>
            {errors.severity && (
              <span className="field-error">
                <ExclamationTriangleIcon className="size-[13px]" /> {errors.severity}
              </span>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" disabled={submitting} onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={submitting}>Log Defect</Button>
        </div>
      </form>
    </Modal>
  );
}

function StartRepairModal({
  defect,
  onClose,
}: {
  defect: Defect;
  onClose: () => void;
}) {
  const { startRepair } = useStore();
  const [date, setDate] = useState(TODAY);
  const [party, setParty] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!date) next.date = "Repair Start Date is required.";
    if (!party.trim()) next.party = "Performing Party is required.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    setSubmitting(true);
    try {
      await startRepair(defect.id, date, party.trim());
      onClose();
    } catch {
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Start Repair" onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <div>
          <Label htmlFor="repairDate">Repair Start Date *</Label>
          <DatePicker
            id="repairDate"
            aria-invalid={Boolean(errors.date)}
            value={date}
            onChange={setDate}
          />
          {errors.date && (
            <span className="field-error">
              <ExclamationTriangleIcon className="size-[13px]" /> {errors.date}
            </span>
          )}
        </div>
        <div>
          <Label htmlFor="repairParty">Performing Party *</Label>
          <Input
            id="repairParty"
            aria-invalid={Boolean(errors.party)}
            value={party}
            onChange={(e) => setParty(e.target.value)}
            placeholder="e.g. Lagos Stage Tech Ltd, or an in-house name"
          />
          {errors.party && (
            <span className="field-error">
              <ExclamationTriangleIcon className="size-[13px]" /> {errors.party}
            </span>
          )}
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" disabled={submitting} onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={submitting}>Start Repair</Button>
        </div>
      </form>
    </Modal>
  );
}

function ResolveModal({
  defect,
  onClose,
}: {
  defect: Defect;
  onClose: () => void;
}) {
  const { resolveDefect } = useStore();
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!notes.trim()) {
      setError("Resolution Notes are required to mark a defect Resolved.");
      return;
    }
    setSubmitting(true);
    try {
      await resolveDefect(defect.id, notes.trim());
      onClose();
    } catch {
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Mark Resolved" onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <p className="text-[0.8125rem] text-muted-foreground">
          The item&apos;s status will automatically return to Available.
        </p>
        <div>
          <Label htmlFor="resolveNotes">Resolution Notes *</Label>
          <Textarea
            id="resolveNotes"
            aria-invalid={Boolean(error)}
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value);
              setError("");
            }}
            placeholder="What was done to fix it?"
          />
          {error && (
            <span className="field-error">
              <ExclamationTriangleIcon className="size-[13px]" /> {error}
            </span>
          )}
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" disabled={submitting} onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={submitting}>Mark Resolved</Button>
        </div>
      </form>
    </Modal>
  );
}

function NotRepairableModal({
  defect,
  onClose,
}: {
  defect: Defect;
  onClose: () => void;
}) {
  const { markNotRepairable } = useStore();
  const [step, setStep] = useState<1 | 2>(1);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [followUp, setFollowUp] = useState<"retire" | "set-status">("retire");
  const [newStatus, setNewStatus] = useState<"Available" | "In Use">("Available");
  const [submitting, setSubmitting] = useState(false);

  function submitNotes(e: React.FormEvent) {
    e.preventDefault();
    if (!notes.trim()) {
      setError("Resolution Notes are required.");
      return;
    }
    setStep(2);
  }

  async function submitFollowUp(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await markNotRepairable(
        defect.id,
        notes.trim(),
        followUp === "retire" ? { action: "retire" } : { action: "set-status", status: newStatus }
      );
      onClose();
    } catch {
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Mark Not Repairable" onClose={onClose}>
      {step === 1 ? (
        <form onSubmit={submitNotes} className="flex flex-col gap-4" noValidate>
          <div>
            <Label htmlFor="nrNotes">Resolution Notes *</Label>
            <Textarea
              id="nrNotes"
              aria-invalid={Boolean(error)}
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value);
                setError("");
              }}
              placeholder="Why isn't this worth repairing?"
            />
            {error && (
              <span className="field-error">
                <ExclamationTriangleIcon className="size-[13px]" /> {error}
              </span>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Continue</Button>
          </div>
        </form>
      ) : (
        <form onSubmit={submitFollowUp} className="flex flex-col gap-4" noValidate>
          <p className="text-[0.8125rem] text-muted-foreground">
            The system won&apos;t guess for you — choose what happens to the item.
          </p>

          <RadioGroup
            value={followUp}
            onValueChange={(v) => setFollowUp(v as "retire" | "set-status")}
          >
            <label
              className={cn(
                "flex items-start gap-2.5 rounded-md border border-border p-3.5 transition-colors duration-150 hover:border-ink-faint",
                followUp === "retire" && "border-brand bg-brand-tint"
              )}
            >
              <RadioGroupItem value="retire" />
              <span className="flex flex-col gap-0.5">
                <span className="text-sm font-bold">Retire this item</span>
                <span className="text-xs text-ink-faint">
                  Moves it out of active inventory for good.
                </span>
              </span>
            </label>

            <label
              className={cn(
                "flex items-start gap-2.5 rounded-md border border-border p-3.5 transition-colors duration-150 hover:border-ink-faint",
                followUp === "set-status" && "border-brand bg-brand-tint"
              )}
            >
              <RadioGroupItem value="set-status" />
              <span className="flex flex-col gap-0.5">
                <span className="text-sm font-bold">Set a new status manually</span>
                <span className="text-xs text-ink-faint">
                  Keep it active — e.g. still usable with the fault noted.
                </span>
              </span>
            </label>
          </RadioGroup>

          {followUp === "set-status" && (
            <Select value={newStatus} onValueChange={(v) => setNewStatus(v as "Available" | "In Use")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Available">Available</SelectItem>
                <SelectItem value="In Use">In Use</SelectItem>
              </SelectContent>
            </Select>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" disabled={submitting} onClick={() => setStep(1)}>
              Back
            </Button>
            <Button type="submit" loading={submitting}>Confirm</Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
