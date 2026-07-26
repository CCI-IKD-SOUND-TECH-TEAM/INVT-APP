"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import {
  createItem as createItemAction,
  reactivateItem as reactivateItemAction,
  retireItem as retireItemAction,
  updateItem as updateItemAction,
} from "@/app/actions/items";
import {
  logDefect as logDefectAction,
  markNotRepairable as markNotRepairableAction,
  resolveDefect as resolveDefectAction,
  startRepair as startRepairAction,
} from "@/app/actions/defects";
import {
  addCategory as addCategoryAction,
  addUnit as addUnitAction,
  deleteCategory as deleteCategoryAction,
  deleteUnit as deleteUnitAction,
  renameCategory as renameCategoryAction,
  renameUnit as renameUnitAction,
} from "@/app/actions/taxonomy";
import { logAccessEmail as logAccessEmailAction } from "@/app/actions/audit";
import type {
  AuditEntry,
  Category,
  Defect,
  Department,
  InventoryItem,
  NewItemInput,
  Profile,
  SessionUser,
} from "./types";

export type { NewItemInput } from "./types";

export type MutationResult = { ok: true } | { ok: false; error: string };

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

/** Everything the (app) layout server-fetches and hands the store to seed from. */
export interface StoreSeed {
  items: InventoryItem[];
  defects: Defect[];
  activity: AuditEntry[];
  categories: Category[];
  departments: Department[];
  units: string[];
  profiles: Profile[];
}

interface StoreValue {
  /** The signed-in staff member. Stamped onto every audit entry (server-side). */
  currentUser: SessionUser;
  items: InventoryItem[];
  defects: Defect[];
  activity: AuditEntry[];
  profiles: Profile[];
  addItem: (item: NewItemInput) => Promise<InventoryItem | null>;
  updateItem: (id: string, patch: Partial<InventoryItem>) => Promise<void>;
  retireItem: (id: string) => Promise<void>;
  reactivateItem: (id: string) => Promise<void>;
  logDefect: (input: {
    item_id: string;
    description: string;
    severity: Defect["severity"];
    date_reported: string;
  }) => Promise<Defect | null>;
  startRepair: (
    defectId: string,
    repair_start_date: string,
    performing_party: string
  ) => Promise<void>;
  resolveDefect: (defectId: string, resolution_notes: string) => Promise<void>;
  markNotRepairable: (
    defectId: string,
    resolution_notes: string,
    followUp:
      | { action: "retire" }
      | { action: "set-status"; status: InventoryItem["status"] }
  ) => Promise<void>;
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
  addCategory: (name: string) => Promise<MutationResult>;
  renameCategory: (from: string, to: string) => Promise<MutationResult>;
  deleteCategory: (name: string) => Promise<MutationResult>;
  addUnit: (name: string) => Promise<MutationResult>;
  renameUnit: (from: string, to: string) => Promise<MutationResult>;
  deleteUnit: (name: string) => Promise<MutationResult>;
  logAccessEmail: (name: string, kind: "invite" | "sign-in") => Promise<void>;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({
  currentUser,
  seed,
  children,
}: {
  /** Resolved from the Supabase session in app/(app)/layout.tsx. */
  currentUser: SessionUser;
  /** Server-fetched initial data (lib/data/inventory.ts getStoreData). */
  seed: StoreSeed;
  children: React.ReactNode;
}) {
  const [items, setItems] = useState<InventoryItem[]>(seed.items);
  const [defects, setDefects] = useState<Defect[]>(seed.defects);
  const [activity, setActivity] = useState<AuditEntry[]>(seed.activity);
  const [categoryList, setCategoryList] = useState<Category[]>(seed.categories);
  const [departmentList] = useState<Department[]>(seed.departments);
  const [profileList] = useState<Profile[]>(seed.profiles);
  const [units, setUnits] = useState<string[]>(seed.units);

  const prependActivity = useCallback((entry?: AuditEntry) => {
    if (entry) setActivity((prev) => [entry, ...prev]);
  }, []);

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
      [...categoryList].map((c) => c.name).sort((a, b) => a.localeCompare(b)),
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

  const addItem = useCallback(
    async (input: NewItemInput) => {
      const res = await createItemAction(input);
      if ("error" in res) {
        console.error("[store] addItem", res.error);
        return null;
      }
      setItems((prev) => [res.item, ...prev]);
      prependActivity(res.activity);
      return res.item;
    },
    [prependActivity]
  );

  const updateItem = useCallback(
    async (id: string, patch: Partial<InventoryItem>) => {
      const res = await updateItemAction(id, patch);
      if ("error" in res) {
        console.error("[store] updateItem", res.error);
        return;
      }
      setItems((prev) => prev.map((it) => (it.id === id ? res.item : it)));
      prependActivity(res.activity);
    },
    [prependActivity]
  );

  const retireItem = useCallback(
    async (id: string) => {
      const res = await retireItemAction(id);
      if ("error" in res) {
        console.error("[store] retireItem", res.error);
        return;
      }
      setItems((prev) => prev.map((it) => (it.id === id ? res.item : it)));
      prependActivity(res.activity);
    },
    [prependActivity]
  );

  const reactivateItem = useCallback(
    async (id: string) => {
      const res = await reactivateItemAction(id);
      if ("error" in res) {
        console.error("[store] reactivateItem", res.error);
        return;
      }
      setItems((prev) => prev.map((it) => (it.id === id ? res.item : it)));
      prependActivity(res.activity);
    },
    [prependActivity]
  );

  const applyDefectResult = useCallback(
    (res: { defect: Defect; item: InventoryItem; activity: AuditEntry }) => {
      setDefects((prev) => {
        const exists = prev.some((d) => d.id === res.defect.id);
        return exists
          ? prev.map((d) => (d.id === res.defect.id ? res.defect : d))
          : [res.defect, ...prev];
      });
      setItems((prev) =>
        prev.map((it) => (it.id === res.item.id ? res.item : it))
      );
      prependActivity(res.activity);
    },
    [prependActivity]
  );

  const logDefect = useCallback(
    async (input: {
      item_id: string;
      description: string;
      severity: Defect["severity"];
      date_reported: string;
    }) => {
      const res = await logDefectAction(input);
      if ("error" in res) {
        console.error("[store] logDefect", res.error);
        return null;
      }
      applyDefectResult(res);
      return res.defect;
    },
    [applyDefectResult]
  );

  const startRepair = useCallback(
    async (
      defectId: string,
      repair_start_date: string,
      performing_party: string
    ) => {
      const res = await startRepairAction(
        defectId,
        repair_start_date,
        performing_party
      );
      if ("error" in res) {
        console.error("[store] startRepair", res.error);
        return;
      }
      applyDefectResult(res);
    },
    [applyDefectResult]
  );

  const resolveDefect = useCallback(
    async (defectId: string, resolution_notes: string) => {
      const res = await resolveDefectAction(defectId, resolution_notes);
      if ("error" in res) {
        console.error("[store] resolveDefect", res.error);
        return;
      }
      applyDefectResult(res);
    },
    [applyDefectResult]
  );

  const markNotRepairable = useCallback(
    async (
      defectId: string,
      resolution_notes: string,
      followUp:
        | { action: "retire" }
        | { action: "set-status"; status: InventoryItem["status"] }
    ) => {
      const res = await markNotRepairableAction(
        defectId,
        resolution_notes,
        followUp
      );
      if ("error" in res) {
        console.error("[store] markNotRepairable", res.error);
        return;
      }
      applyDefectResult(res);
    },
    [applyDefectResult]
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
    async (value: string): Promise<MutationResult> => {
      const res = await addCategoryAction(value);
      if ("error" in res) return { ok: false, error: res.error };
      setCategoryList((prev) => [...prev, res.category]);
      prependActivity(res.activity);
      return { ok: true };
    },
    [prependActivity]
  );

  const renameCategory = useCallback(
    async (from: string, to: string): Promise<MutationResult> => {
      if (to.trim() === from) return { ok: true };
      const res = await renameCategoryAction(from, to);
      if ("error" in res) return { ok: false, error: res.error };
      setCategoryList((prev) =>
        prev.map((c) => (c.id === res.category.id ? res.category : c))
      );
      prependActivity(res.activity);
      return { ok: true };
    },
    [prependActivity]
  );

  const deleteCategory = useCallback(
    async (name: string): Promise<MutationResult> => {
      const res = await deleteCategoryAction(name);
      if ("error" in res) return { ok: false, error: res.error };
      setCategoryList((prev) => prev.filter((c) => c.name !== name));
      prependActivity(res.activity);
      return { ok: true };
    },
    [prependActivity]
  );

  const addUnit = useCallback(
    async (value: string): Promise<MutationResult> => {
      const res = await addUnitAction(value);
      if ("error" in res) return { ok: false, error: res.error };
      setUnits((prev) =>
        [...prev, res.name].sort((a, b) => a.localeCompare(b))
      );
      prependActivity(res.activity);
      return { ok: true };
    },
    [prependActivity]
  );

  const renameUnit = useCallback(
    async (from: string, to: string): Promise<MutationResult> => {
      if (to.trim() === from) return { ok: true };
      const res = await renameUnitAction(from, to);
      if ("error" in res) return { ok: false, error: res.error };
      setUnits((prev) =>
        prev.map((u) => (u === from ? res.name : u)).sort((a, b) => a.localeCompare(b))
      );
      setItems((prev) =>
        prev.map((it) =>
          it.unit_of_measure === from
            ? { ...it, unit_of_measure: res.name }
            : it
        )
      );
      prependActivity(res.activity);
      return { ok: true };
    },
    [prependActivity]
  );

  const deleteUnit = useCallback(
    async (name: string): Promise<MutationResult> => {
      const res = await deleteUnitAction(name);
      if ("error" in res) return { ok: false, error: res.error };
      setUnits((prev) => prev.filter((u) => u !== name));
      prependActivity(res.activity);
      return { ok: true };
    },
    [prependActivity]
  );

  const logAccessEmail = useCallback(
    async (name: string, kind: "invite" | "sign-in") => {
      const res = await logAccessEmailAction(name, kind);
      if ("error" in res) {
        console.error("[store] logAccessEmail", res.error);
        return;
      }
      prependActivity(res.activity);
    },
    [prependActivity]
  );

  const value = useMemo<StoreValue>(
    () => ({
      currentUser,
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
      logAccessEmail,
    }),
    [
      currentUser,
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
      logAccessEmail,
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
