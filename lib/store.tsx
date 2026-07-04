"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import {
  INITIAL_ACTIVITY,
  INITIAL_CATEGORIES,
  INITIAL_DEFECTS,
  INITIAL_DEPARTMENTS,
  INITIAL_ITEMS,
  INITIAL_PROFILES,
  UNITS_OF_MEASURE,
} from "./mock-data";
import type {
  AuditActionType,
  Category,
  Defect,
  DefectStatus,
  Department,
  InventoryItem,
  Profile,
} from "./types";
import { CURRENT_USER, CURRENT_USER_ID } from "./types";

export type MutationResult = { ok: true } | { ok: false; error: string };

export type NewItemInput = Omit<
  InventoryItem,
  "id" | "status" | "created_by" | "updated_by" | "created_at" | "updated_at"
>;

function nowIso() {
  return new Date().toISOString();
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

interface StoreValue {
  items: InventoryItem[];
  defects: Defect[];
  activity: typeof INITIAL_ACTIVITY;
  profiles: Profile[];
  addItem: (item: NewItemInput) => InventoryItem;
  updateItem: (id: string, patch: Partial<InventoryItem>) => void;
  retireItem: (id: string) => void;
  reactivateItem: (id: string) => void;
  logDefect: (input: {
    item_id: string;
    description: string;
    severity: Defect["severity"];
    date_reported: string;
  }) => Defect;
  startRepair: (
    defectId: string,
    repair_start_date: string,
    performing_party: string
  ) => void;
  resolveDefect: (defectId: string, resolution_notes: string) => void;
  markNotRepairable: (
    defectId: string,
    resolution_notes: string,
    followUp:
      | { action: "retire" }
      | { action: "set-status"; status: InventoryItem["status"] }
  ) => void;
  getItem: (id: string) => InventoryItem | undefined;
  getDefectsForItem: (id: string) => Defect[];

  categoryName: (id: string) => string;
  departmentName: (id: string) => string;
  profileName: (id: string) => string;
  categoryIdByName: (name: string) => string | undefined;
  departmentIdByName: (name: string) => string | undefined;

  categories: string[];
  departments: string[];
  units: string[];
  users: string[];
  categoryUsage: (name: string) => number;
  unitUsage: (name: string) => number;
  addCategory: (name: string) => MutationResult;
  renameCategory: (from: string, to: string) => MutationResult;
  deleteCategory: (name: string) => MutationResult;
  addUnit: (name: string) => MutationResult;
  renameUnit: (from: string, to: string) => MutationResult;
  deleteUnit: (name: string) => MutationResult;
  resetUserPassword: (name: string) => void;
}

const StoreContext = createContext<StoreValue | null>(null);

let idCounter = 1000;
function nextId(prefix: string) {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<InventoryItem[]>(INITIAL_ITEMS);
  const [defects, setDefects] = useState<Defect[]>(INITIAL_DEFECTS);
  const [activity, setActivity] = useState(INITIAL_ACTIVITY);
  const [categoryList, setCategoryList] =
    useState<Category[]>(INITIAL_CATEGORIES);
  const [departmentList] = useState<Department[]>(INITIAL_DEPARTMENTS);
  const [profileList] = useState<Profile[]>(INITIAL_PROFILES);
  const [units, setUnits] = useState<string[]>(() => [...UNITS_OF_MEASURE]);

  const categoryName = useCallback(
    (id: string) => categoryList.find((c) => c.id === id)?.name ?? "—",
    [categoryList]
  );
  const departmentName = useCallback(
    (id: string) => departmentList.find((d) => d.id === id)?.name ?? "—",
    [departmentList]
  );
  const profileName = useCallback(
    (id: string) => profileList.find((p) => p.id === id)?.full_name ?? id,
    [profileList]
  );
  const categoryIdByName = useCallback(
    (name: string) => categoryList.find((c) => c.name === name)?.id,
    [categoryList]
  );
  const departmentIdByName = useCallback(
    (name: string) => departmentList.find((d) => d.name === name)?.id,
    [departmentList]
  );

  const categories = useMemo(
    () =>
      [...categoryList]
        .map((c) => c.name)
        .sort((a, b) => a.localeCompare(b)),
    [categoryList]
  );
  const departments = useMemo(
    () => departmentList.map((d) => d.name),
    [departmentList]
  );
  const users = useMemo(
    () => profileList.map((p) => p.full_name),
    [profileList]
  );

  const pushActivity = useCallback(
    (actionType: AuditActionType, recordLabel: string, detail: string) => {
      setActivity((prev) => [
        {
          id: nextId("act"),
          timestamp: nowIso(),
          user: CURRENT_USER,
          actionType,
          recordLabel,
          detail,
        },
        ...prev,
      ]);
    },
    []
  );

  const addItem = useCallback(
    (input: NewItemInput) => {
      const ts = nowIso();
      const item: InventoryItem = {
        ...input,
        id: nextId("itm"),
        status: "Available",
        created_by: CURRENT_USER_ID,
        updated_by: CURRENT_USER_ID,
        created_at: ts,
        updated_at: ts,
      };
      setItems((prev) => [item, ...prev]);
      pushActivity("Create", item.item_name, "Added new item to inventory.");
      return item;
    },
    [pushActivity]
  );

  const updateItem = useCallback((id: string, patch: Partial<InventoryItem>) => {
    setItems((prev) =>
      prev.map((it) =>
        it.id === id
          ? {
              ...it,
              ...patch,
              updated_by: CURRENT_USER_ID,
              updated_at: nowIso(),
            }
          : it
      )
    );
  }, []);

  const retireItem = useCallback(
    (id: string) => {
      setItems((prev) =>
        prev.map((it) =>
          it.id === id
            ? { ...it, status: "Retired", updated_at: nowIso() }
            : it
        )
      );
      const item = items.find((it) => it.id === id);
      if (item)
        pushActivity("Retire", item.item_name, "Item retired (soft-deleted).");
    },
    [items, pushActivity]
  );

  const reactivateItem = useCallback(
    (id: string) => {
      setItems((prev) =>
        prev.map((it) =>
          it.id === id
            ? { ...it, status: "Available", updated_at: nowIso() }
            : it
        )
      );
      const item = items.find((it) => it.id === id);
      if (item)
        pushActivity(
          "Reactivate",
          item.item_name,
          "Item reactivated — status set to Available."
        );
    },
    [items, pushActivity]
  );

  const logDefect = useCallback(
    (input: {
      item_id: string;
      description: string;
      severity: Defect["severity"];
      date_reported: string;
    }) => {
      const ts = nowIso();
      const defect: Defect = {
        id: nextId("def"),
        item_id: input.item_id,
        description: input.description,
        date_reported: input.date_reported,
        reported_by: CURRENT_USER_ID,
        severity: input.severity,
        status: "Open",
        repair_start_date: null,
        performing_party: null,
        resolution_notes: null,
        created_at: ts,
        updated_at: ts,
        history: [
          {
            id: nextId("ev"),
            status: "Open",
            timestamp: ts,
            user: CURRENT_USER,
          },
        ],
      };
      setDefects((prev) => [defect, ...prev]);
      setItems((prev) =>
        prev.map((it) =>
          it.id === input.item_id
            ? { ...it, status: "Defective", updated_at: ts }
            : it
        )
      );
      const item = items.find((it) => it.id === input.item_id);
      pushActivity(
        "Defect",
        item?.item_name ?? "Item",
        `Logged defect — ${input.description.slice(0, 60)}${
          input.description.length > 60 ? "…" : ""
        }`
      );
      return defect;
    },
    [items, pushActivity]
  );

  const appendHistory = useCallback(
    (defectId: string, status: DefectStatus, note?: string) => {
      setDefects((prev) =>
        prev.map((d) =>
          d.id === defectId
            ? {
                ...d,
                updated_at: nowIso(),
                history: [
                  ...d.history,
                  {
                    id: nextId("ev"),
                    status,
                    timestamp: nowIso(),
                    user: CURRENT_USER,
                    note,
                  },
                ],
              }
            : d
        )
      );
    },
    []
  );

  const startRepair = useCallback(
    (defectId: string, repair_start_date: string, performing_party: string) => {
      setDefects((prev) =>
        prev.map((d) =>
          d.id === defectId
            ? {
                ...d,
                status: "Under Repair",
                repair_start_date,
                performing_party,
                updated_at: nowIso(),
              }
            : d
        )
      );
      appendHistory(
        defectId,
        "Under Repair",
        `Repair started with ${performing_party || "unspecified party"}.`
      );
      const defect = defects.find((d) => d.id === defectId);
      if (defect) {
        setItems((prev) =>
          prev.map((it) =>
            it.id === defect.item_id
              ? { ...it, status: "Under Repair", updated_at: nowIso() }
              : it
          )
        );
        const item = items.find((it) => it.id === defect.item_id);
        pushActivity(
          "Repair Status Change",
          item?.item_name ?? "Item",
          `Defect moved to Under Repair — ${performing_party || "unspecified party"}.`
        );
      }
    },
    [appendHistory, defects, items, pushActivity]
  );

  const resolveDefect = useCallback(
    (defectId: string, resolution_notes: string) => {
      setDefects((prev) =>
        prev.map((d) =>
          d.id === defectId
            ? {
                ...d,
                status: "Resolved",
                resolution_notes,
                updated_at: nowIso(),
              }
            : d
        )
      );
      appendHistory(defectId, "Resolved", resolution_notes);
      const defect = defects.find((d) => d.id === defectId);
      if (defect) {
        setItems((prev) =>
          prev.map((it) =>
            it.id === defect.item_id
              ? { ...it, status: "Available", updated_at: nowIso() }
              : it
          )
        );
        const item = items.find((it) => it.id === defect.item_id);
        pushActivity(
          "Repair Status Change",
          item?.item_name ?? "Item",
          "Defect marked Resolved — item returned to Available."
        );
      }
    },
    [appendHistory, defects, items, pushActivity]
  );

  const markNotRepairable = useCallback(
    (
      defectId: string,
      resolution_notes: string,
      followUp:
        | { action: "retire" }
        | { action: "set-status"; status: InventoryItem["status"] }
    ) => {
      setDefects((prev) =>
        prev.map((d) =>
          d.id === defectId
            ? {
                ...d,
                status: "Not Repairable",
                resolution_notes,
                updated_at: nowIso(),
              }
            : d
        )
      );
      appendHistory(defectId, "Not Repairable", resolution_notes);
      const defect = defects.find((d) => d.id === defectId);
      if (defect) {
        setItems((prev) =>
          prev.map((it) =>
            it.id === defect.item_id
              ? {
                  ...it,
                  status:
                    followUp.action === "retire" ? "Retired" : followUp.status,
                  updated_at: nowIso(),
                }
              : it
          )
        );
        const item = items.find((it) => it.id === defect.item_id);
        pushActivity(
          "Repair Status Change",
          item?.item_name ?? "Item",
          `Defect marked Not Repairable — item set to ${
            followUp.action === "retire" ? "Retired" : followUp.status
          }.`
        );
      }
    },
    [appendHistory, defects, items, pushActivity]
  );

  const getItem = useCallback(
    (id: string) => items.find((it) => it.id === id),
    [items]
  );

  const getDefectsForItem = useCallback(
    (id: string) => defects.filter((d) => d.item_id === id),
    [defects]
  );

  const categoryUsage = useCallback(
    (name: string) => {
      const id = categoryList.find((c) => c.name === name)?.id;
      return id ? items.filter((it) => it.category_id === id).length : 0;
    },
    [categoryList, items]
  );
  const unitUsage = useCallback(
    (name: string) => items.filter((it) => it.unit_of_measure === name).length,
    [items]
  );

  const addCategory = useCallback(
    (value: string): MutationResult => {
      const name = value.trim();
      if (!name) return { ok: false, error: "Category name can't be empty." };
      if (name.length > 40)
        return {
          ok: false,
          error: "Category name must be 40 characters or fewer.",
        };
      if (categoryList.some((c) => c.name.toLowerCase() === name.toLowerCase()))
        return { ok: false, error: `"${name}" already exists.` };
      setCategoryList((prev) => [
        ...prev,
        { id: nextId("cat"), name, created_at: nowIso() },
      ]);
      pushActivity("Settings", name, "Added category.");
      return { ok: true };
    },
    [categoryList, pushActivity]
  );

  const renameCategory = useCallback(
    (from: string, to: string): MutationResult => {
      const name = to.trim();
      if (!name) return { ok: false, error: "Category name can't be empty." };
      if (name === from) return { ok: true };
      if (name.length > 40)
        return {
          ok: false,
          error: "Category name must be 40 characters or fewer.",
        };
      if (categoryList.some((c) => c.name.toLowerCase() === name.toLowerCase()))
        return { ok: false, error: `"${name}" already exists.` };
      setCategoryList((prev) =>
        prev.map((c) => (c.name === from ? { ...c, name } : c))
      );
      pushActivity("Settings", name, `Renamed category from "${from}".`);
      return { ok: true };
    },
    [categoryList, pushActivity]
  );

  const deleteCategory = useCallback(
    (name: string): MutationResult => {
      const used = categoryUsage(name);
      if (used > 0)
        return {
          ok: false,
          error: `"${name}" is used by ${used} item${used === 1 ? "" : "s"}. Reassign or rename them first.`,
        };
      setCategoryList((prev) => prev.filter((c) => c.name !== name));
      pushActivity("Settings", name, "Deleted category.");
      return { ok: true };
    },
    [categoryUsage, pushActivity]
  );

  const addUnit = useCallback(
    (value: string): MutationResult => {
      const name = value.trim();
      if (!name) return { ok: false, error: "Unit name can't be empty." };
      if (name.length > 40)
        return { ok: false, error: "Unit name must be 40 characters or fewer." };
      if (units.some((u) => u.toLowerCase() === name.toLowerCase()))
        return { ok: false, error: `"${name}" already exists.` };
      setUnits((prev) => [...prev, name].sort((a, b) => a.localeCompare(b)));
      pushActivity("Settings", name, "Added unit.");
      return { ok: true };
    },
    [units, pushActivity]
  );

  const renameUnit = useCallback(
    (from: string, to: string): MutationResult => {
      const name = to.trim();
      if (!name) return { ok: false, error: "Unit name can't be empty." };
      if (name === from) return { ok: true };
      if (name.length > 40)
        return { ok: false, error: "Unit name must be 40 characters or fewer." };
      if (units.some((u) => u.toLowerCase() === name.toLowerCase()))
        return { ok: false, error: `"${name}" already exists.` };
      setUnits((prev) =>
        prev.map((u) => (u === from ? name : u)).sort((a, b) => a.localeCompare(b))
      );
      setItems((prev) =>
        prev.map((it) =>
          it.unit_of_measure === from ? { ...it, unit_of_measure: name } : it
        )
      );
      pushActivity("Settings", name, `Renamed unit from "${from}".`);
      return { ok: true };
    },
    [units, pushActivity]
  );

  const deleteUnit = useCallback(
    (name: string): MutationResult => {
      const used = unitUsage(name);
      if (used > 0)
        return {
          ok: false,
          error: `"${name}" is used by ${used} item${used === 1 ? "" : "s"}. Reassign or rename them first.`,
        };
      setUnits((prev) => prev.filter((u) => u !== name));
      pushActivity("Settings", name, "Deleted unit of measure.");
      return { ok: true };
    },
    [unitUsage, pushActivity]
  );

  const resetUserPassword = useCallback(
    (name: string) => {
      pushActivity("Settings", name, "Password reset link issued.");
    },
    [pushActivity]
  );

  const value = useMemo<StoreValue>(
    () => ({
      items,
      defects,
      activity,
      profiles: profileList,
      addItem,
      updateItem,
      retireItem,
      reactivateItem,
      logDefect,
      startRepair,
      resolveDefect,
      markNotRepairable,
      getItem,
      getDefectsForItem,
      categoryName,
      departmentName,
      profileName,
      categoryIdByName,
      departmentIdByName,
      categories,
      departments,
      units,
      users,
      categoryUsage,
      unitUsage,
      addCategory,
      renameCategory,
      deleteCategory,
      addUnit,
      renameUnit,
      deleteUnit,
      resetUserPassword,
    }),
    [
      items,
      defects,
      activity,
      profileList,
      addItem,
      updateItem,
      retireItem,
      reactivateItem,
      logDefect,
      startRepair,
      resolveDefect,
      markNotRepairable,
      getItem,
      getDefectsForItem,
      categoryName,
      departmentName,
      profileName,
      categoryIdByName,
      departmentIdByName,
      categories,
      departments,
      units,
      users,
      categoryUsage,
      unitUsage,
      addCategory,
      renameCategory,
      deleteCategory,
      addUnit,
      renameUnit,
      deleteUnit,
      resetUserPassword,
    ]
  );

  return (
    <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within a StoreProvider");
  return ctx;
}

export { todayIso };
