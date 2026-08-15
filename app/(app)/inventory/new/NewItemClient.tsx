"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { itemOptionsQuery, itemQuery } from "@/lib/queries";
import { useReference } from "@/lib/queries/use-reference";
import {
  useCreateItem,
  useRetireItem,
  useUpdateItem,
} from "@/lib/mutations/items";
import type { NewItemInput } from "@/lib/types";
import type {
  AssetType,
  InventoryItem,
  ItemStatus,
  ItemUnit,
  ItemUnitInput,
} from "@/lib/types";
import StatusBadge from "@/components/StatusBadge";
import Modal from "@/components/Modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { IconArrowLeft as ArrowLeftIcon, IconCheck as CheckIcon, IconAlertTriangle as ExclamationTriangleIcon, IconPhoto as PhotoIcon, IconPlus as PlusIcon, IconX as XMarkIcon } from "@tabler/icons-react";

const ASSET_TYPES: AssetType[] = [
  "Equipment",
  "Furniture",
  "Consumable",
  "Electronics",
  "Other",
];

/**
 * One row of the units editor.
 *
 * `key` is a client-side identity so React can track a row that has no database
 * id yet; `id` is present only for a row that already exists. Serial and label
 * are held as strings because they come straight off an input.
 */
interface UnitDraft {
  key: string;
  id?: string;
  label: string;
  serialNumber: string;
  status: ItemStatus;
}

/** Statuses a unit can be moved to by hand — the rest come from the Defect Log. */
const UNIT_STATUS_CHOICES: ItemStatus[] = ["Available", "In Use", "Retired"];

let unitKeySeq = 0;
function newUnitKey() {
  return `unit-${unitKeySeq++}`;
}

function unitsToDrafts(units: ItemUnit[]): UnitDraft[] {
  return units.map((u) => ({
    key: newUnitKey(),
    id: u.id,
    label: u.label,
    serialNumber: u.serial_number ?? "",
    status: u.status,
  }));
}

// UI-shaped form state, mapped to/from InventoryItem at the itemToForm / submit boundaries.
interface FormState {
  name: string;
  serialNumber: string;
  description: string;
  category: string;
  quantity: string;
  unitOfMeasure: string;
  department: string;
  assetType: AssetType | "";
  minStockThreshold: string;
  estimatedValue: string;
  location: string;
  dateAcquired: string;
  remarks: string;
  images: string[];
}

const EMPTY_FORM: FormState = {
  name: "",
  serialNumber: "",
  description: "",
  category: "",
  quantity: "",
  unitOfMeasure: "",
  department: "",
  assetType: "",
  minStockThreshold: "",
  estimatedValue: "",
  location: "",
  dateAcquired: "",
  remarks: "",
  images: [],
};

function itemToForm(
  item: InventoryItem,
  categoryName: (id: string) => string,
  departmentName: (id: string) => string
): FormState {
  return {
    name: item.item_name,
    serialNumber: item.serial_number ?? "",
    description: item.description ?? "",
    category: categoryName(item.category_id),
    quantity: String(item.quantity),
    unitOfMeasure: item.unit_of_measure,
    department: departmentName(item.department_id),
    assetType: item.asset_type,
    minStockThreshold:
      typeof item.minimum_stock_threshold === "number"
        ? String(item.minimum_stock_threshold)
        : "",
    estimatedValue:
      typeof item.estimated_value === "number"
        ? String(item.estimated_value)
        : "",
    location: item.location ?? "",
    dateAcquired: item.date_acquired ?? "",
    remarks: item.remarks ?? "",
    images: item.images,
  };
}

const TODAY = new Date().toISOString().slice(0, 10);

export default function NewItemClient() {
  return (
    <Suspense fallback={null}>
      <ItemFormContent />
    </Suspense>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4">
      <span className="border-b border-line-subtle pb-2 text-xs font-bold tracking-wide text-ink-faint uppercase">
        {title}
      </span>
      {children}
    </div>
  );
}

function ItemFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("id");
  const {
    categories,
    // Aliased: "units" in this file means the item's individual physical units,
    // which is a different thing from a unit of measure.
    units: unitsOfMeasure,
    departments,
    categoryName,
    departmentName,
    categoryIdByName,
    departmentIdByName,
  } = useReference();

  const addItem = useCreateItem();
  const updateItem = useUpdateItem();
  const retireItem = useRetireItem();

  // Just the row being edited, prefetched by the server wrapper — not the
  // whole table filtered down to one.
  const { data: editingItem } = useQuery({
    ...itemQuery(editId ?? ""),
    enabled: Boolean(editId),
  });

  // Id + name for every active item, for the duplicate-name check below. The
  // check has to see names this form never renders, so it needs the full list
  // — but only two fields of it.
  const { data: items = [] } = useQuery(itemOptionsQuery());
  const isEdit = Boolean(editingItem);

  const [form, setForm] = useState<FormState>(() =>
    editingItem
      ? itemToForm(editingItem, categoryName, departmentName)
      : EMPTY_FORM
  );
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>(
    {}
  );
  // Empty means "not unit-tracked": one quantity, one status, one serial on the
  // item itself — the shape every item had before units existed.
  const [units, setUnits] = useState<UnitDraft[]>(() =>
    editingItem ? unitsToDrafts(editingItem.units) : []
  );
  const [unitsError, setUnitsError] = useState("");
  const tracksUnits = units.length > 0;

  // The item query is prefetched, so the initialisers above normally see it on
  // the first render — but if it lands later (cache miss, direct navigation)
  // the form would stay blank and a save would wipe the units it never loaded.
  // Re-seed once, keyed on the id, so a later refetch can't clobber edits.
  const [hydratedFor, setHydratedFor] = useState(editingItem?.id ?? null);
  if (editingItem && hydratedFor !== editingItem.id) {
    setHydratedFor(editingItem.id);
    setForm(itemToForm(editingItem, categoryName, departmentName));
    setUnits(unitsToDrafts(editingItem.units));
  }
  const [showRetire, setShowRetire] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [retiring, setRetiring] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasOpenDefect =
    isEdit &&
    (editingItem!.status === "Defective" || editingItem!.status === "Under Repair");

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function setUnit(key: string, patch: Partial<UnitDraft>) {
    setUnits((list) =>
      list.map((u) => (u.key === key ? { ...u, ...patch } : u))
    );
    setUnitsError("");
  }

  function addUnitRow() {
    setUnits((list) => [
      ...list,
      { key: newUnitKey(), label: `Unit ${list.length + 1}`, serialNumber: "", status: "Available" },
    ]);
    setUnitsError("");
  }

  /**
   * Turn a quantity into that many unit rows. The item's own serial moves onto
   * the first one — it described a single piece of hardware, and once units
   * exist that is where a serial belongs.
   */
  function startTrackingUnits() {
    const count = Math.min(Math.max(Number(form.quantity) || 1, 1), 50);
    setUnits(
      Array.from({ length: count }, (_, i) => ({
        key: newUnitKey(),
        label: `Unit ${i + 1}`,
        serialNumber: i === 0 ? form.serialNumber.trim() : "",
        status: "Available" as ItemStatus,
      }))
    );
    set("serialNumber", "");
    setUnitsError("");
  }

  /**
   * Drop back to a plain quantity group. The reverse of startTrackingUnits:
   * the first serial moves back onto the item so untracking doesn't quietly
   * throw it away, and the quantity keeps whatever the units added up to.
   */
  function stopTrackingUnits() {
    const firstSerial = units.find((u) => u.serialNumber.trim())?.serialNumber;
    setForm((f) => ({
      ...f,
      quantity: String(units.filter((u) => u.status !== "Retired").length),
      serialNumber: firstSerial?.trim() ?? f.serialNumber,
    }));
    setUnits([]);
    setUnitsError("");
  }

  function removeUnit(key: string) {
    setUnits((list) => list.filter((u) => u.key !== key));
    setUnitsError("");
  }

  /** Mirrors the server's check (lib/data/units.ts) so it fails before the trip. */
  function validateUnits(): boolean {
    if (units.some((u) => !u.label.trim())) {
      setUnitsError("Every unit needs a label.");
      return false;
    }

    const seen = new Set<string>();
    for (const unit of units) {
      const serial = unit.serialNumber.trim().toLowerCase();
      if (!serial) continue;
      if (seen.has(serial)) {
        setUnitsError(
          `Serial number "${unit.serialNumber.trim()}" is on more than one unit. Each unit needs its own.`
        );
        return false;
      }
      seen.add(serial);
    }

    setUnitsError("");
    return true;
  }

  function validate(): boolean {
    const next: Partial<Record<keyof FormState, string>> = {};

    if (!form.name.trim()) next.name = "Item Name is required.";
    else if (form.name.length > 100)
      next.name = "Item Name must be 100 characters or fewer.";
    else {
      // itemOptionsQuery already excludes retired items.
      const duplicate = items.some(
        (i) =>
          i.id !== editId &&
          i.item_name.trim().toLowerCase() === form.name.trim().toLowerCase()
      );
      if (duplicate)
        next.name = "An active item with this name already exists.";
    }

    if (form.description.length > 1000)
      next.description = "Description must be 1000 characters or fewer.";

    if (!form.category) next.category = "Category is required.";
    if (!form.unitOfMeasure) next.unitOfMeasure = "Unit of Measure is required.";
    if (!form.department) next.department = "Department is required.";
    if (!form.assetType) next.assetType = "Asset Type is required.";

    // Quantity is derived from the unit list once units exist, so there is
    // nothing for the user to get wrong.
    if (!tracksUnits) {
      const qty = Number(form.quantity);
      if (form.quantity.trim() === "" || !Number.isInteger(qty) || qty < 0)
        next.quantity = "Quantity must be a whole number of 0 or more.";
    }

    if (form.minStockThreshold.trim() !== "") {
      const min = Number(form.minStockThreshold);
      if (!Number.isInteger(min) || min < 0)
        next.minStockThreshold = "Threshold must be a whole number of 0 or more.";
    }

    if (form.estimatedValue.trim() !== "") {
      const value = Number(form.estimatedValue);
      if (!Number.isFinite(value) || value < 0)
        next.estimatedValue = "Estimated Value must be a number of 0 or more.";
    }

    if (form.location.length > 100)
      next.location = "Location must be 100 characters or fewer.";

    if (form.serialNumber.length > 100)
      next.serialNumber = "Serial Number must be 100 characters or fewer.";

    if (form.dateAcquired && form.dateAcquired > TODAY)
      next.dateAcquired = "Date Acquired cannot be in the future.";

    if (form.remarks.length > 500)
      next.remarks = "Remarks must be 500 characters or fewer.";

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  // One upload finishes at a time; use a functional update so appends don't
  // clobber each other across multiple files in one session.
  function addImage(url: string) {
    setForm((f) =>
      f.images.length >= 5 ? f : { ...f, images: [...f.images, url] }
    );
    setErrors((e) => ({ ...e, images: undefined }));
  }

  const ALLOWED_TYPES = ["image/jpeg", "image/png"];
  const MAX_FILE_SIZE = 5 * 1024 * 1024;

  // Signed direct upload — send the file straight to Cloudinary with a
  // server-generated signature, never showing Cloudinary's own UI.
  async function uploadFile(file: File) {
    if (!ALLOWED_TYPES.includes(file.type)) {
      setErrors((e) => ({ ...e, images: "Only JPG and PNG images are allowed." }));
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setErrors((e) => ({ ...e, images: "Each image must be 5MB or smaller." }));
      return;
    }

    setUploading(true);
    try {
      const signRes = await fetch("/api/sign-cloudinary", { method: "POST" });
      if (!signRes.ok) throw new Error("sign failed");
      const { signature, timestamp, folder, transformation, apiKey, cloudName } =
        await signRes.json();

      const data = new FormData();
      data.append("file", file);
      data.append("api_key", apiKey);
      data.append("timestamp", String(timestamp));
      data.append("folder", folder);
      data.append("transformation", transformation);
      data.append("signature", signature);

      const uploadRes = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        { method: "POST", body: data }
      );
      if (!uploadRes.ok) throw new Error("upload failed");
      const { secure_url } = await uploadRes.json();
      addImage(secure_url);
    } catch {
      setErrors((e) => ({ ...e, images: "Upload failed. Please try again." }));
    } finally {
      setUploading(false);
    }
  }

  async function onFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const remaining = 5 - form.images.length;
    for (const file of files.slice(0, remaining)) {
      await uploadFile(file);
    }
    // Reset so re-selecting the same file re-fires onChange.
    e.target.value = "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Both run — a form with a bad name and a duplicate serial should show
    // both, not one and then the other on the next attempt.
    const formOk = validate();
    const unitsOk = validateUnits();
    if (!formOk || !unitsOk) return;
    if (submitting) return;

    const unitPayload: ItemUnitInput[] = units.map((u) => ({
      id: u.id,
      label: u.label.trim(),
      serial_number: u.serialNumber.trim() || null,
      status: u.status,
    }));

    const payload: NewItemInput = {
      item_name: form.name.trim(),
      description: form.description.trim() || null,
      category_id: categoryIdByName(form.category)!,
      department_id: departmentIdByName(form.department)!,
      quantity: Number(form.quantity),
      unit_of_measure: form.unitOfMeasure,
      asset_type: form.assetType as AssetType,
      minimum_stock_threshold:
        form.minStockThreshold.trim() === ""
          ? null
          : Number(form.minStockThreshold),
      estimated_value:
        form.estimatedValue.trim() === "" ? null : Number(form.estimatedValue),
      location: form.location.trim() || null,
      date_acquired: form.dateAcquired || null,
      remarks: form.remarks.trim() || null,
      // Serials live on the units once an item is unit-tracked.
      serial_number: tracksUnits ? null : form.serialNumber.trim() || null,
      images: form.images,
      units: unitPayload,
    };

    setSubmitting(true);
    try {
      let id: string;
      if (isEdit && editingItem) {
        await updateItem.mutateAsync({ id: editingItem.id, patch: payload });
        id = editingItem.id;
      } else {
        const created = await addItem.mutateAsync(payload);
        if (!created) {
          setSubmitting(false);
          return;
        }
        id = created.id;
      }

      setSaved(true);
      window.setTimeout(() => {
        router.push(`/inventory?highlight=${id}`);
      }, 550);
      // Leave `submitting` true through the redirect so the button stays busy.
    } catch {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-[760px] flex-col gap-6">
      <Link
        href="/inventory"
        className="inline-flex w-fit items-center gap-1.5 text-[0.8125rem] font-bold text-muted-foreground transition-colors duration-150 hover:text-foreground"
      >
        <ArrowLeftIcon className="size-3.5" /> Back to Inventory
      </Link>

      <div>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="h-headline">{isEdit ? editingItem?.item_name : "Add Item"}</h1>
          {isEdit && <StatusBadge status={editingItem!.status} />}
        </div>
        <p className="mt-1.5 text-muted-foreground">
          {isEdit
            ? "Update this item's details, stock, and photos."
            : "Log a new church asset into the inventory."}
        </p>
      </div>

      <form className="flex flex-col gap-6" onSubmit={handleSubmit} noValidate>
        <Section title="Basics">
          <div>
            <Label htmlFor="name">Item Name *</Label>
            <Input
              id="name"
              aria-invalid={Boolean(errors.name)}
              value={form.name}
              maxLength={100}
              onChange={(e) => set("name", e.target.value)}
              placeholder="e.g. QSC K12.2 Powered Speaker"
            />
            {errors.name && (
              <span className="field-error">
                <ExclamationTriangleIcon className="size-[13px]" /> {errors.name}
              </span>
            )}
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              aria-invalid={Boolean(errors.description)}
              value={form.description}
              maxLength={1000}
              onChange={(e) => set("description", e.target.value)}
              placeholder="What is it, where does it live, anything worth noting…"
            />
            <div className="mt-1 text-right text-xs text-ink-faint">
              {form.description.length}/1000
            </div>
            {errors.description && (
              <span className="field-error">
                <ExclamationTriangleIcon className="size-[13px]" /> {errors.description}
              </span>
            )}
          </div>

          {!tracksUnits && (
            <div>
              <Label htmlFor="serialNumber">Serial Number</Label>
              <Input
                id="serialNumber"
                aria-invalid={Boolean(errors.serialNumber)}
                value={form.serialNumber}
                maxLength={100}
                onChange={(e) => set("serialNumber", e.target.value)}
                placeholder="Manufacturer serial or asset tag (optional)"
              />
              {errors.serialNumber && (
                <span className="field-error">
                  <ExclamationTriangleIcon className="size-[13px]" /> {errors.serialNumber}
                </span>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <Label htmlFor="category">Category *</Label>
              <Select value={form.category} onValueChange={(v) => set("category", v)}>
                <SelectTrigger id="category" className={errors.category ? "border-brand" : undefined}>
                  <SelectValue placeholder="Select…" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.category && (
                <span className="field-error">
                  <ExclamationTriangleIcon className="size-[13px]" /> {errors.category}
                </span>
              )}
            </div>

            <div>
              <Label htmlFor="department">Department *</Label>
              <Select
                value={form.department}
                onValueChange={(v) => set("department", v)}
              >
                <SelectTrigger id="department" className={errors.department ? "border-brand" : undefined}>
                  <SelectValue placeholder="Select…" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.department && (
                <span className="field-error">
                  <ExclamationTriangleIcon className="size-[13px]" /> {errors.department}
                </span>
              )}
            </div>

            <div>
              <Label htmlFor="assetType">Asset Type *</Label>
              <Select
                value={form.assetType}
                onValueChange={(v) => set("assetType", v as AssetType)}
              >
                <SelectTrigger id="assetType" className={errors.assetType ? "border-brand" : undefined}>
                  <SelectValue placeholder="Select…" />
                </SelectTrigger>
                <SelectContent>
                  {ASSET_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.assetType && (
                <span className="field-error">
                  <ExclamationTriangleIcon className="size-[13px]" /> {errors.assetType}
                </span>
              )}
            </div>
          </div>
        </Section>

        <Section title="Stock">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <Label htmlFor="quantity">Quantity *</Label>
              <Input
                id="quantity"
                type="number"
                min={0}
                step={1}
                // Once units are tracked the count comes from the list below —
                // the database derives it, so an editable box here would only
                // offer a number the save throws away.
                readOnly={tracksUnits}
                aria-invalid={Boolean(errors.quantity)}
                value={tracksUnits ? String(units.filter((u) => u.status !== "Retired").length) : form.quantity}
                onChange={(e) => set("quantity", e.target.value)}
              />
              {tracksUnits ? (
                <p className="field-hint">Counted from the units below.</p>
              ) : (
                errors.quantity && (
                  <span className="field-error">
                    <ExclamationTriangleIcon className="size-[13px]" /> {errors.quantity}
                  </span>
                )
              )}
            </div>

            <div>
              <Label htmlFor="unit">Unit of Measure *</Label>
              <Select
                value={form.unitOfMeasure}
                onValueChange={(v) => set("unitOfMeasure", v)}
              >
                <SelectTrigger id="unit" className={errors.unitOfMeasure ? "border-brand" : undefined}>
                  <SelectValue placeholder="Select…" />
                </SelectTrigger>
                <SelectContent>
                  {unitsOfMeasure.map((u) => (
                    <SelectItem key={u} value={u}>
                      {u}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.unitOfMeasure && (
                <span className="field-error">
                  <ExclamationTriangleIcon className="size-[13px]" /> {errors.unitOfMeasure}
                </span>
              )}
            </div>

            <div>
              <Label htmlFor="minStock">Minimum Stock Threshold</Label>
              <Input
                id="minStock"
                type="number"
                min={0}
                step={1}
                aria-invalid={Boolean(errors.minStockThreshold)}
                value={form.minStockThreshold}
                onChange={(e) => set("minStockThreshold", e.target.value)}
                placeholder="Blank = no monitoring"
              />
              {errors.minStockThreshold && (
                <span className="field-error">
                  <ExclamationTriangleIcon className="size-[13px]" /> {errors.minStockThreshold}
                </span>
              )}
            </div>

            <div>
              <Label htmlFor="estimatedValue">Estimated Value (₦)</Label>
              <Input
                id="estimatedValue"
                type="number"
                min={0}
                step="0.01"
                aria-invalid={Boolean(errors.estimatedValue)}
                value={form.estimatedValue}
                onChange={(e) => set("estimatedValue", e.target.value)}
                placeholder="Per unit, optional"
              />
              {errors.estimatedValue && (
                <span className="field-error">
                  <ExclamationTriangleIcon className="size-[13px]" /> {errors.estimatedValue}
                </span>
              )}
            </div>
          </div>

          {isEdit && (
            <div>
              <Label>Status</Label>
              {hasOpenDefect || tracksUnits ? (
                <>
                  <div>
                    <StatusBadge status={editingItem!.status} />
                  </div>
                  <p className="field-hint">
                    {tracksUnits
                      ? "Summarised from the units below — one defective unit marks the whole item Defective."
                      : "Status is driven by the Defect Log while a defect is open."}
                  </p>
                </>
              ) : (
                <Select
                  value={editingItem!.status}
                  onValueChange={(v) =>
                    updateItem.mutate({
                      id: editingItem!.id,
                      patch: { status: v as InventoryItem["status"] },
                    })
                  }
                >
                  <SelectTrigger className="max-w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Available">Available</SelectItem>
                    <SelectItem value="In Use">In Use</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          )}
        </Section>

        <Section title="Units & Serial Numbers">
          {!tracksUnits ? (
            <div className="flex flex-col items-start gap-3 rounded-md border border-dashed border-border p-4">
              <p className="text-sm text-muted-foreground">
                This item is counted as a group — one status and one serial for
                all {form.quantity || "0"} of them. Track them individually if
                each piece has its own serial number, or if one can break while
                the others keep working.
              </p>
              <Button type="button" variant="secondary" size="sm" onClick={startTrackingUnits}>
                <PlusIcon className="size-3.5" /> Track units individually
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-muted-foreground">
                One row per physical unit. Each keeps its own serial number and
                status, so a defect logged against one leaves the rest in
                service.
              </p>

              <div className="flex flex-col gap-2">
                {units.map((unit) => {
                  // Same rule as the item above: the Defect Log owns a unit's
                  // status while it is broken, so it isn't editable here.
                  const defectDriven =
                    unit.status === "Defective" || unit.status === "Under Repair";
                  return (
                    <div
                      key={unit.key}
                      className="flex flex-wrap items-end gap-2 rounded-md border border-border p-3"
                    >
                      <div className="min-w-30 flex-1">
                        <Label htmlFor={`unit-label-${unit.key}`}>Label *</Label>
                        <Input
                          id={`unit-label-${unit.key}`}
                          value={unit.label}
                          maxLength={60}
                          onChange={(e) => setUnit(unit.key, { label: e.target.value })}
                          placeholder="e.g. Left"
                        />
                      </div>

                      <div className="min-w-40 flex-2">
                        <Label htmlFor={`unit-serial-${unit.key}`}>Serial Number</Label>
                        <Input
                          id={`unit-serial-${unit.key}`}
                          value={unit.serialNumber}
                          maxLength={100}
                          onChange={(e) =>
                            setUnit(unit.key, { serialNumber: e.target.value })
                          }
                          placeholder="Optional"
                        />
                      </div>

                      <div className="min-w-35">
                        <Label htmlFor={`unit-status-${unit.key}`}>Status</Label>
                        {defectDriven ? (
                          <div className="flex h-9 items-center">
                            <StatusBadge status={unit.status} />
                          </div>
                        ) : (
                          <Select
                            value={unit.status}
                            onValueChange={(v) =>
                              setUnit(unit.key, { status: v as ItemStatus })
                            }
                          >
                            <SelectTrigger id={`unit-status-${unit.key}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {UNIT_STATUS_CHOICES.map((s) => (
                                <SelectItem key={s} value={s}>
                                  {s}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="mb-1"
                        aria-label={`Remove ${unit.label || "unit"}`}
                        title={
                          defectDriven
                            ? "Close the open defect before removing this unit"
                            : undefined
                        }
                        disabled={defectDriven}
                        onClick={() => removeUnit(unit.key)}
                      >
                        <XMarkIcon className="size-3.5" />
                      </Button>
                    </div>
                  );
                })}
              </div>

              {unitsError && (
                <span className="field-error">
                  <ExclamationTriangleIcon className="size-[13px]" /> {unitsError}
                </span>
              )}

              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="secondary" size="sm" onClick={addUnitRow}>
                  <PlusIcon className="size-3.5" /> Add unit
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={stopTrackingUnits}
                >
                  Stop tracking individually
                </Button>
              </div>
              <p className="field-hint">
                Stopping removes every unit row and its serial numbers on save,
                and returns the item to a plain quantity.
              </p>
            </div>
          )}
        </Section>

        <Section title="Location & Dates">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                aria-invalid={Boolean(errors.location)}
                value={form.location}
                maxLength={100}
                onChange={(e) => set("location", e.target.value)}
                placeholder="e.g. Main Hall Storage"
              />
              {errors.location && (
                <span className="field-error">
                  <ExclamationTriangleIcon className="size-[13px]" /> {errors.location}
                </span>
              )}
            </div>
            <div>
              <Label htmlFor="dateAcquired">Date Acquired</Label>
              <DatePicker
                id="dateAcquired"
                maxDate={new Date()}
                aria-invalid={Boolean(errors.dateAcquired)}
                value={form.dateAcquired}
                onChange={(v) => set("dateAcquired", v)}
              />
              {errors.dateAcquired && (
                <span className="field-error">
                  <ExclamationTriangleIcon className="size-[13px]" /> {errors.dateAcquired}
                </span>
              )}
            </div>
          </div>
        </Section>

        <Section title="Photos (optional, up to 5)">
          {form.images.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {form.images.map((src, idx) => (
                <div
                  key={idx}
                  className="relative size-[84px] overflow-hidden rounded-md border border-border bg-popover"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className="size-full object-cover" />
                  <button
                    type="button"
                    className="absolute top-1 right-1 flex size-[22px] items-center justify-center rounded-full bg-black/60 text-white transition-colors duration-150 hover:bg-brand"
                    aria-label="Remove image"
                    onClick={() => set("images", form.images.filter((_, i) => i !== idx))}
                  >
                    <XMarkIcon className="size-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {form.images.length < 5 && (
            <>
              <button
                type="button"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
                className="flex cursor-pointer flex-col items-center gap-2 rounded-md border-[1.5px] border-dashed border-border p-6 text-center text-muted-foreground transition-colors duration-150 hover:border-ink-faint disabled:cursor-not-allowed disabled:opacity-60"
              >
                <PhotoIcon className="size-6" />
                <span>
                  {uploading ? (
                    <strong className="text-foreground">Uploading…</strong>
                  ) : (
                    <>
                      <strong className="text-foreground">Click to upload</strong> —
                      JPG/PNG, up to 5MB each
                    </>
                  )}
                </span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg"
                multiple
                hidden
                onChange={onFilesSelected}
              />
            </>
          )}
        </Section>

        <Section title="Remarks">
          <div>
            <Label htmlFor="remarks">Remarks</Label>
            <Textarea
              id="remarks"
              aria-invalid={Boolean(errors.remarks)}
              value={form.remarks}
              maxLength={500}
              onChange={(e) => set("remarks", e.target.value)}
              placeholder="Anything else worth flagging"
            />
            <div className="mt-1 text-right text-xs text-ink-faint">{form.remarks.length}/500</div>
            {errors.remarks && (
              <span className="field-error">
                <ExclamationTriangleIcon className="size-[13px]" /> {errors.remarks}
              </span>
            )}
          </div>
        </Section>

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-line-subtle pt-6">
          {isEdit && (
            <Button
              type="button"
              variant="destructive"
              disabled={hasOpenDefect}
              title={hasOpenDefect ? "Resolve the open defect before retiring" : undefined}
              onClick={() => setShowRetire(true)}
            >
              Retire Item
            </Button>
          )}
          <div className="ml-auto flex gap-2">
            <Button asChild variant="secondary">
              <Link href="/inventory">Cancel</Link>
            </Button>
            <Button type="submit" loading={submitting}>
              {isEdit ? "Save Changes" : "Save Item"}
            </Button>
          </div>
        </div>
      </form>

      {showRetire && editingItem && (
        <Modal title="Retire item?" onClose={() => setShowRetire(false)}>
          <p className="text-muted-foreground">
            <strong className="text-foreground">{editingItem.item_name}</strong> will
            be moved to Retired. It disappears from the active listing and
            counts, but stays visible in historical reports and the audit
            trail.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={retiring}
              onClick={() => setShowRetire(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              loading={retiring}
              onClick={async () => {
                setRetiring(true);
                try {
                  await retireItem.mutateAsync(editingItem.id);
                  setShowRetire(false);
                  router.push("/inventory");
                } catch {
                  setRetiring(false);
                }
              }}
            >
              Retire Item
            </Button>
          </div>
        </Modal>
      )}

      {saved && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-md border border-status-good bg-popover px-4 py-3 text-sm font-bold text-status-good shadow-none">
          <CheckIcon className="size-4" /> {isEdit ? "Item updated" : "Item saved"}
        </div>
      )}
    </div>
  );
}
