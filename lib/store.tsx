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
import {
  abandonCheckSession as abandonCheckSessionAction,
  bulkMarkRemainingPresent as bulkMarkRemainingPresentAction,
  completeCheckSession as completeCheckSessionAction,
  recordCheckEntry as recordCheckEntryAction,
  startCheckSession as startCheckSessionAction,
} from "@/app/actions/checks";
import { logAccessEmail as logAccessEmailAction } from "@/app/actions/audit";
import type {
  AuditEntry,
  Category,
  CheckEntry,
  CheckResult,
  CheckSession,
  CheckType,
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
  checkSessions: CheckSession[];
  /** item_id → last time the item was seen (present/issue) in any check. */
  lastConfirmed: Record<string, string>;
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

  checkSessions: CheckSession[];
  getCheckSession: (id: string) => CheckSession | undefined;
  lastConfirmedAt: (itemId: string) => string | undefined;
  startCheckSession: (
    departmentId: string,
    type: CheckType
  ) => Promise<CheckSession | { error: string }>;
  recordCheckEntry: (input: {
    session_id: string;
    item_id: string;
    result: CheckResult;
    quantity_seen?: number;
    note?: string;
  }) => Promise<MutationResult>;
  bulkMarkRemainingPresent: (sessionId: string) => Promise<MutationResult>;
  completeCheckSession: (sessionId: string) => Promise<MutationResult>;
  abandonCheckSession: (sessionId: string) => Promise<MutationResult>;

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
  const [checkSessions, setCheckSessions] = useState<CheckSession[]>(
    seed.checkSessions
  );
  const [lastConfirmed, setLastConfirmed] = useState<Record<string, string>>(
    seed.lastConfirmed
  );

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
  const departments = useMemo(() => {
    // Canonical display order — Sound leads; unknown departments follow alphabetically.
    const order = ["Sound", "Light", "Projection"];
    return departmentList
      .map((d) => d.name)
      .sort((a, b) => {
        const ai = order.indexOf(a);
        const bi = order.indexOf(b);
        if (ai !== -1 || bi !== -1) {
          return (ai === -1 ? order.length : ai) - (bi === -1 ? order.length : bi);
        }
        return a.localeCompare(b);
      });
  }, [departmentList]);
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

  const getCheckSession = useCallback(
    (id: string) => checkSessions.find((s) => s.id === id),
    [checkSessions]
  );

  const lastConfirmedAt = useCallback(
    (itemId: string) => lastConfirmed[itemId],
    [lastConfirmed]
  );

  /** Insert or replace a session by id, keeping newest-week-first order. */
  const upsertSession = useCallback((session: CheckSession) => {
    setCheckSessions((prev) => {
      const exists = prev.some((s) => s.id === session.id);
      return exists
        ? prev.map((s) => (s.id === session.id ? session : s))
        : [session, ...prev];
    });
  }, []);

  /** Mirror the item_last_confirmed view: present/issue = physically seen. */
  const applyConfirmations = useCallback((entries: CheckEntry[]) => {
    const seen = entries.filter(
      (e) => e.result === "present" || e.result === "issue"
    );
    if (seen.length === 0) return;
    setLastConfirmed((prev) => {
      const next = { ...prev };
      for (const e of seen) next[e.item_id] = e.checked_at;
      return next;
    });
  }, []);

  const startCheckSession = useCallback(
    async (departmentId: string, type: CheckType) => {
      const res = await startCheckSessionAction({
        department_id: departmentId,
        session_type: type,
      });
      if ("error" in res) return { error: res.error };
      upsertSession(res.session);
      return res.session;
    },
    [upsertSession]
  );

  const recordCheckEntry = useCallback(
    async (input: {
      session_id: string;
      item_id: string;
      result: CheckResult;
      quantity_seen?: number;
      note?: string;
    }): Promise<MutationResult> => {
      const res = await recordCheckEntryAction(input);
      if ("error" in res) return { ok: false, error: res.error };
      setCheckSessions((prev) =>
        prev.map((s) => {
          if (s.id !== input.session_id) return s;
          const exists = s.entries.some((e) => e.item_id === input.item_id);
          return {
            ...s,
            entries: exists
              ? s.entries.map((e) =>
                  e.item_id === input.item_id ? res.entry : e
                )
              : [...s.entries, res.entry],
          };
        })
      );
      applyConfirmations([res.entry]);
      return { ok: true };
    },
    [applyConfirmations]
  );

  const bulkMarkRemainingPresent = useCallback(
    async (sessionId: string): Promise<MutationResult> => {
      const res = await bulkMarkRemainingPresentAction(sessionId);
      if ("error" in res) return { ok: false, error: res.error };
      setCheckSessions((prev) =>
        prev.map((s) => (s.id === sessionId ? { ...s, entries: res.entries } : s))
      );
      applyConfirmations(res.entries);
      return { ok: true };
    },
    [applyConfirmations]
  );

  const completeCheckSession = useCallback(
    async (sessionId: string): Promise<MutationResult> => {
      const res = await completeCheckSessionAction(sessionId);
      if ("error" in res) return { ok: false, error: res.error };
      upsertSession(res.session);
      prependActivity(res.activity);
      return { ok: true };
    },
    [upsertSession, prependActivity]
  );

  const abandonCheckSession = useCallback(
    async (sessionId: string): Promise<MutationResult> => {
      const res = await abandonCheckSessionAction(sessionId);
      if ("error" in res) return { ok: false, error: res.error };
      upsertSession(res.session);
      prependActivity(res.activity);
      return { ok: true };
    },
    [upsertSession, prependActivity]
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
      checkSessions,
      getCheckSession,
      lastConfirmedAt,
      startCheckSession,
      recordCheckEntry,
      bulkMarkRemainingPresent,
      completeCheckSession,
      abandonCheckSession,
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
      checkSessions,
      getCheckSession,
      lastConfirmedAt,
      startCheckSession,
      recordCheckEntry,
      bulkMarkRemainingPresent,
      completeCheckSession,
      abandonCheckSession,
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
