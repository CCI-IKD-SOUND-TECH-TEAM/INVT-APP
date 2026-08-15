/** TEMPORARY verification fixture — delete with the preview route. */
import { weekStartIso } from "@/lib/checks";
import type {
  AuditEntry,
  Category,
  CheckSession,
  Defect,
  Department,
  InventoryItem,
  Profile,
  SessionUser,
} from "@/lib/types";

/**
 * Shape of the preview fixture.
 *
 * Declared here rather than imported: it used to be `StoreSeed` from
 * lib/store.tsx, which no longer exists. The harness now seeds the query cache
 * (./seed-cache.ts) instead of a client store.
 */
export interface PreviewSeed {
  items: InventoryItem[];
  defects: Defect[];
  activity: AuditEntry[];
  categories: Category[];
  departments: Department[];
  units: string[];
  profiles: Profile[];
  checkSessions: CheckSession[];
  /** item_id -> last time the item was seen in a check. */
  lastConfirmed: Record<string, string>;
}

const NOW = "2026-08-03T09:00:00.000Z";

export const DEPARTMENTS: Department[] = [
  { id: "dep-sound", name: "Sound", created_at: NOW },
  { id: "dep-light", name: "Light", created_at: NOW },
  { id: "dep-projection", name: "Projection", created_at: NOW },
];

export const CATEGORIES: Category[] = [
  "Cabling & Connectors",
  "Speakers",
  "Mixing Consoles",
  "Microphones",
  "Musical Instruments",
  "Lighting Fixtures",
].map((name, i) => ({ id: `cat-${i}`, name, created_at: NOW }));

function item(
  i: number,
  item_name: string,
  category_id: string,
  status: InventoryItem["status"],
  quantity = 1,
  department_id = "dep-sound"
): InventoryItem {
  return {
    id: `item-${i}`,
    item_name,
    category_id,
    department_id,
    quantity,
    minimum_stock_threshold: null,
    status,
    location: "Main store",
    date_acquired: "2025-11-02",
    created_at: NOW,
    updated_at: NOW,
    images: [],
    unit_of_measure: "Piece",
    asset_type: "Equipment",
  };
}

export const ITEMS: InventoryItem[] = [
  item(1, "4K HDMI Cable (30m)", "cat-0", "Available", 4),
  item(2, "Admark Monitors", "cat-1", "In Use", 2),
  item(3, "Behringer X32 Mixer", "cat-2", "Available"),
  item(4, "Canon Plugs (pack of 12)", "cat-0", "Available", 12),
  item(5, "Keyboard Chair", "cat-4", "Defective"),
  item(6, "Shure BLX Wireless Mic", "cat-3", "Under Repair"),
  item(7, "Yamaha Stage Monitor", "cat-1", "Available"),
  item(8, "Stage Wash Light", "cat-5", "Defective", 1, "dep-light"),
  item(9, "Beam 230 Moving Head", "cat-5", "Available", 2, "dep-light"),
  item(10, "Epson Projector", "cat-5", "Available", 1, "dep-projection"),
];

function defect(
  i: number,
  item_id: string,
  description: string,
  severity: Defect["severity"],
  status: Defect["status"],
  daysAgo: number
): Defect {
  return {
    id: `def-${i}`,
    item_id,
    description,
    date_reported: new Date(Date.parse(NOW) - daysAgo * 86400000).toISOString(),
    reported_by: "user-1",
    severity,
    status,
    created_at: NOW,
    updated_at: NOW,
    history: [
      { id: `ev-${i}`, status, timestamp: NOW, user: "jeffowoloko" },
    ],
  };
}

export const DEFECTS: Defect[] = [
  defect(1, "item-5", "Stolen", "High", "Open", 8),
  defect(2, "item-4", "I don't think we have this", "Low", "Open", 3),
  defect(3, "item-6", "Receiver won't pair with the handheld", "Medium", "Under Repair", 3),
  defect(4, "item-8", "Flickers after 20 minutes", "Medium", "Open", 5),
];

const PROFILES: Profile[] = [
  {
    id: "user-1",
    full_name: "Jeff Owoloko",
    email: "jeffowoloko@gmail.com",
    is_active: true,
    created_at: NOW,
  },
];

const WEEK = weekStartIso(new Date(NOW));

/** One in-progress setup session — reproduces the "Resume / 0 of N" row. */
const SESSIONS: CheckSession[] = [
  {
    id: "sess-1",
    department_id: "dep-sound",
    session_type: "setup",
    week_start: WEEK,
    status: "in_progress",
    started_by: "user-1",
    total_items: 50,
    present_count: 0,
    missing_count: 0,
    issue_count: 0,
    shortfall_count: 0,
    na_count: 0,
    unchecked_count: 50,
    created_at: NOW,
    updated_at: NOW,
    entries: [],
  },
  {
    id: "sess-2",
    department_id: "dep-sound",
    session_type: "set_down",
    week_start: WEEK,
    status: "completed",
    started_by: "user-1",
    completed_by: "user-1",
    completed_at: NOW,
    total_items: 50,
    present_count: 23,
    missing_count: 0,
    issue_count: 4,
    shortfall_count: 0,
    na_count: 23,
    unchecked_count: 0,
    created_at: NOW,
    updated_at: NOW,
    entries: [],
  },
];

export const CURRENT_USER: SessionUser = {
  id: "user-1",
  full_name: "Jeff Owoloko",
  email: "jeffowoloko@gmail.com",
};

export const SEED: PreviewSeed = {
  items: ITEMS,
  defects: DEFECTS,
  activity: [
    {
      id: "a1",
      timestamp: NOW,
      user: "jeffowoloko",
      actionType: "Check",
      recordLabel: "Sound — Setup check",
      detail: "Abandoned setup check.",
    },
    {
      id: "a2",
      timestamp: NOW,
      user: "jeffowoloko",
      actionType: "Create",
      recordLabel: "FBT Speaker",
      detail: "Added new item to inventory.",
    },
  ],
  categories: CATEGORIES,
  departments: DEPARTMENTS,
  units: ["Piece", "Set", "Roll", "Pair", "Box"],
  profiles: PROFILES,
  checkSessions: SESSIONS,
  lastConfirmed: {},
};
