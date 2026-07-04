import type {
  AssetType,
  AuditEntry,
  Category,
  Defect,
  Department,
  DepartmentName,
  InventoryItem,
  Profile,
  RepairEvent,
} from "./types";
import {
  CATEGORIES,
  CURRENT_USER_ID,
  DEPARTMENTS,
  UNITS_OF_MEASURE,
  USERS,
} from "./types";

function slug(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
export function categoryId(name: string) {
  return `cat-${slug(name)}`;
}
export function departmentId(name: string) {
  return `dept-${slug(name)}`;
}
export function profileId(fullName: string) {
  return `usr-${slug(fullName)}`;
}

function emailFor(name: string) {
  const parts = name.trim().toLowerCase().split(/\s+/);
  const local =
    parts.length > 1 ? `${parts[0]}.${parts[parts.length - 1]}` : parts[0];
  return `${local}@ccikorodu.org`;
}

const SEED_TS = "2026-01-01T09:00:00.000Z";

export const INITIAL_PROFILES: Profile[] = USERS.map((name) => ({
  id: profileId(name),
  full_name: name,
  email: emailFor(name),
  is_active: true,
  last_login_at: name === "Tolu Adebayo" ? SEED_TS : null,
  created_at: SEED_TS,
}));

export const INITIAL_DEPARTMENTS: Department[] = DEPARTMENTS.map((name) => ({
  id: departmentId(name),
  name,
  created_at: SEED_TS,
}));

export const INITIAL_CATEGORIES: Category[] = CATEGORIES.map((name) => ({
  id: categoryId(name),
  name,
  created_at: SEED_TS,
}));

export { UNITS_OF_MEASURE };

interface ItemSeed {
  id: string;
  item_name: string;
  description?: string;
  category: string;
  department: DepartmentName;
  quantity: number;
  unit_of_measure: string;
  asset_type: AssetType;
  status: InventoryItem["status"];
  minimum_stock_threshold?: number;
  location?: string;
  date_acquired?: string;
  remarks?: string;
}

function item(seed: ItemSeed): InventoryItem {
  const ts = seed.date_acquired
    ? `${seed.date_acquired}T09:00:00.000Z`
    : SEED_TS;
  return {
    id: seed.id,
    item_name: seed.item_name,
    description: seed.description ?? null,
    category_id: categoryId(seed.category),
    department_id: departmentId(seed.department),
    quantity: seed.quantity,
    minimum_stock_threshold: seed.minimum_stock_threshold ?? null,
    status: seed.status,
    location: seed.location ?? null,
    date_acquired: seed.date_acquired ?? null,
    remarks: seed.remarks ?? null,
    created_by: CURRENT_USER_ID,
    updated_by: CURRENT_USER_ID,
    created_at: ts,
    updated_at: ts,
    images: [],
    unit_of_measure: seed.unit_of_measure,
    asset_type: seed.asset_type,
  };
}

export const INITIAL_ITEMS: InventoryItem[] = [
  item({
    id: "itm-001",
    item_name: "QSC K12.2 Powered Speaker",
    description: "Main hall left/right powered PA speaker.",
    category: "Speakers",
    quantity: 4,
    unit_of_measure: "Piece",
    department: "Sound",
    asset_type: "Equipment",
    status: "Available",
    minimum_stock_threshold: 2,
    location: "Main Hall Storage",
    date_acquired: "2023-02-14",
    remarks: "Paired with sub for main hall front-of-house.",
  }),
  item({
    id: "itm-002",
    item_name: "Shure SM58 Handheld Mic",
    description: "Standard vocal mic for pulpit and choir.",
    category: "Microphones",
    quantity: 6,
    unit_of_measure: "Piece",
    department: "Sound",
    asset_type: "Equipment",
    status: "In Use",
    minimum_stock_threshold: 4,
    location: "Sound Booth Cabinet",
    date_acquired: "2022-11-02",
  }),
  item({
    id: "itm-003",
    item_name: "Shure SM58 Handheld Mic (Backup)",
    category: "Microphones",
    quantity: 1,
    unit_of_measure: "Piece",
    department: "Sound",
    asset_type: "Equipment",
    status: "Defective",
    minimum_stock_threshold: 4,
    location: "Sound Booth Cabinet",
    date_acquired: "2021-06-20",
    remarks: "Capsule crackles intermittently.",
  }),
  item({
    id: "itm-004",
    item_name: "Behringer X32 Digital Mixer",
    description: "Front-of-house digital console.",
    category: "Mixing Consoles",
    quantity: 1,
    unit_of_measure: "Piece",
    department: "Sound",
    asset_type: "Electronics",
    status: "In Use",
    location: "Sound Booth",
    date_acquired: "2023-08-01",
  }),
  item({
    id: "itm-005",
    item_name: "XLR Cable 20ft",
    description: "Standard 3-pin XLR balanced cable.",
    category: "Cabling & Connectors",
    quantity: 3,
    unit_of_measure: "Piece",
    department: "Sound",
    asset_type: "Consumable",
    status: "Available",
    minimum_stock_threshold: 10,
    location: "Sound Booth Cabinet",
    date_acquired: "2024-01-10",
    remarks: "Reorder before next tech restock.",
  }),
  item({
    id: "itm-006",
    item_name: "XLR Cable 50ft",
    category: "Cabling & Connectors",
    quantity: 8,
    unit_of_measure: "Piece",
    department: "Sound",
    asset_type: "Consumable",
    status: "Available",
    minimum_stock_threshold: 5,
    location: "Sound Booth Cabinet",
    date_acquired: "2024-01-10",
  }),
  item({
    id: "itm-007",
    item_name: "Chauvet Rogue R2 Spot",
    description: "Moving-head spotlight, stage left truss.",
    category: "Lighting Fixtures",
    quantity: 2,
    unit_of_measure: "Piece",
    department: "Light",
    asset_type: "Equipment",
    status: "Under Repair",
    location: "Lighting Rig — Stage Left",
    date_acquired: "2022-09-05",
    remarks: "Pan motor grinding on full sweep.",
  }),
  item({
    id: "itm-008",
    item_name: "Chauvet Rogue R2 Spot",
    category: "Lighting Fixtures",
    quantity: 2,
    unit_of_measure: "Piece",
    department: "Light",
    asset_type: "Equipment",
    status: "In Use",
    location: "Lighting Rig — Stage Right",
    date_acquired: "2022-09-05",
  }),
  item({
    id: "itm-009",
    item_name: "LED PAR Can RGBW",
    description: "Wash lighting for stage backdrop.",
    category: "Lighting Fixtures",
    quantity: 12,
    unit_of_measure: "Piece",
    department: "Light",
    asset_type: "Equipment",
    status: "Available",
    minimum_stock_threshold: 8,
    location: "Lighting Storage",
    date_acquired: "2023-03-18",
  }),
  item({
    id: "itm-010",
    item_name: "ChamSys MagicQ Compact Console",
    description: "Lighting control desk.",
    category: "Lighting Controllers",
    quantity: 1,
    unit_of_measure: "Piece",
    department: "Light",
    asset_type: "Electronics",
    status: "In Use",
    location: "Lighting Booth",
    date_acquired: "2023-03-18",
  }),
  item({
    id: "itm-011",
    item_name: "DMX Cable 25ft",
    category: "Cabling & Connectors",
    quantity: 2,
    unit_of_measure: "Piece",
    department: "Light",
    asset_type: "Consumable",
    status: "Available",
    minimum_stock_threshold: 6,
    location: "Lighting Storage",
    date_acquired: "2023-03-18",
    remarks: "Two returned frayed — flagged for replacement.",
  }),
  item({
    id: "itm-012",
    item_name: "Epson Pro L1755U Laser Projector",
    description: "Main screen projector.",
    category: "Projectors",
    quantity: 1,
    unit_of_measure: "Piece",
    department: "Projection",
    asset_type: "Electronics",
    status: "In Use",
    location: "Projection Booth",
    date_acquired: "2023-05-22",
  }),
  item({
    id: "itm-013",
    item_name: "Epson Pro L1755U Laser Projector",
    description: "Overflow room projector.",
    category: "Projectors",
    quantity: 1,
    unit_of_measure: "Piece",
    department: "Projection",
    asset_type: "Electronics",
    status: "Defective",
    location: "Overflow Room",
    date_acquired: "2022-01-15",
    remarks: "No signal on HDMI input 2.",
  }),
  item({
    id: "itm-014",
    item_name: "Da-Lite Motorized Screen 120in",
    category: "Screens & Mounts",
    quantity: 2,
    unit_of_measure: "Piece",
    department: "Projection",
    asset_type: "Equipment",
    status: "Available",
    location: "Main Hall — Ceiling Mount",
    date_acquired: "2021-11-30",
  }),
  item({
    id: "itm-015",
    item_name: "HDMI Cable 15ft",
    category: "Cabling & Connectors",
    quantity: 1,
    unit_of_measure: "Piece",
    department: "Projection",
    asset_type: "Consumable",
    status: "Available",
    minimum_stock_threshold: 5,
    location: "Projection Booth",
    date_acquired: "2024-02-01",
  }),
  item({
    id: "itm-016",
    item_name: "ProPresenter Streaming Laptop",
    description: "Dell Precision — runs slides, ProPresenter, and stream encoder.",
    category: "Projectors",
    quantity: 1,
    unit_of_measure: "Piece",
    department: "Projection",
    asset_type: "Electronics",
    status: "In Use",
    location: "Projection Booth",
    date_acquired: "2023-09-12",
  }),
  item({
    id: "itm-017",
    item_name: "Speaker Stand — Tripod",
    category: "Stands & Rigging",
    quantity: 4,
    unit_of_measure: "Piece",
    department: "Sound",
    asset_type: "Equipment",
    status: "Available",
    location: "Main Hall Storage",
    date_acquired: "2022-04-19",
  }),
  item({
    id: "itm-018",
    item_name: "Mic Stand — Boom",
    category: "Stands & Rigging",
    quantity: 5,
    unit_of_measure: "Piece",
    department: "Sound",
    asset_type: "Equipment",
    status: "Available",
    minimum_stock_threshold: 4,
    location: "Sound Booth Cabinet",
    date_acquired: "2022-04-19",
  }),
  item({
    id: "itm-019",
    item_name: "Behringer X-Air XR18 Mixer",
    description: "Retired after console upgrade to X32.",
    category: "Mixing Consoles",
    quantity: 1,
    unit_of_measure: "Piece",
    department: "Sound",
    asset_type: "Electronics",
    status: "Retired",
    location: "Storage Room B",
    date_acquired: "2019-07-10",
    remarks: "Kept as spare for offsite events; not on active rig.",
  }),
  item({
    id: "itm-020",
    item_name: "48V Phantom Power DI Box",
    category: "Cabling & Connectors",
    quantity: 3,
    unit_of_measure: "Piece",
    department: "Sound",
    asset_type: "Equipment",
    status: "Available",
    minimum_stock_threshold: 2,
    location: "Sound Booth Cabinet",
    date_acquired: "2023-01-20",
  }),
  item({
    id: "itm-021",
    item_name: "In-Ear Monitor Pack",
    description: "Wireless IEM transmitter + 4 receivers for worship team.",
    category: "Speakers",
    quantity: 1,
    unit_of_measure: "Set",
    department: "Sound",
    asset_type: "Electronics",
    status: "In Use",
    location: "Sound Booth",
    date_acquired: "2023-10-04",
  }),
  item({
    id: "itm-022",
    item_name: "AA Rechargeable Battery Pack",
    category: "Power & Batteries",
    quantity: 4,
    unit_of_measure: "Box",
    department: "Sound",
    asset_type: "Consumable",
    status: "Available",
    minimum_stock_threshold: 3,
    location: "Sound Booth Cabinet",
    date_acquired: "2024-03-11",
  }),
  item({
    id: "itm-023",
    item_name: "Haze Machine",
    description: "Stage atmosphere machine, used for spotlight visibility.",
    category: "Lighting Fixtures",
    quantity: 1,
    unit_of_measure: "Piece",
    department: "Light",
    asset_type: "Equipment",
    status: "Available",
    location: "Lighting Storage",
    date_acquired: "2022-12-01",
  }),
  item({
    id: "itm-024",
    item_name: "Truss Clamp — Half Coupler",
    category: "Stands & Rigging",
    quantity: 2,
    unit_of_measure: "Piece",
    department: "Light",
    asset_type: "Equipment",
    status: "Available",
    minimum_stock_threshold: 6,
    location: "Lighting Storage",
    date_acquired: "2021-08-14",
  }),
  item({
    id: "itm-025",
    item_name: "Wireless Handheld Mic (Shure QLXD)",
    category: "Microphones",
    quantity: 2,
    unit_of_measure: "Piece",
    department: "Sound",
    asset_type: "Electronics",
    status: "Under Repair",
    location: "Sound Booth Cabinet",
    date_acquired: "2023-06-06",
    remarks: "One channel drops out above 30m range.",
  }),
  item({
    id: "itm-026",
    item_name: "Confidence Monitor — Stage Front",
    category: "Screens & Mounts",
    quantity: 2,
    unit_of_measure: "Piece",
    department: "Projection",
    asset_type: "Electronics",
    status: "Available",
    location: "Main Hall — Stage Front",
    date_acquired: "2023-05-22",
  }),
  item({
    id: "itm-027",
    item_name: "USB Presentation Clicker",
    category: "Projectors",
    quantity: 1,
    unit_of_measure: "Piece",
    department: "Projection",
    asset_type: "Electronics",
    status: "Available",
    minimum_stock_threshold: 2,
    location: "Projection Booth",
    date_acquired: "2023-09-12",
  }),
  item({
    id: "itm-028",
    item_name: "Gaffer Tape Roll",
    category: "Power & Batteries",
    quantity: 2,
    unit_of_measure: "Roll",
    department: "Sound",
    asset_type: "Consumable",
    status: "Available",
    minimum_stock_threshold: 3,
    location: "Main Hall Storage",
    date_acquired: "2024-04-02",
  }),
  item({
    id: "itm-029",
    item_name: "Power Distro — 8-Way",
    category: "Power & Batteries",
    quantity: 3,
    unit_of_measure: "Piece",
    department: "Light",
    asset_type: "Equipment",
    status: "Available",
    location: "Lighting Storage",
    date_acquired: "2022-09-05",
  }),
  item({
    id: "itm-030",
    item_name: "Choir Riser Section",
    category: "Stands & Rigging",
    quantity: 6,
    unit_of_measure: "Piece",
    department: "Sound",
    asset_type: "Furniture",
    status: "Retired",
    location: "Storage Room B",
    date_acquired: "2018-02-01",
    remarks: "Replaced with new fibreglass risers.",
  }),
];

interface DefectSeed {
  id: string;
  item_id: string;
  description: string;
  date_reported: string;
  reported_by: string;
  severity: Defect["severity"];
  status: Defect["status"];
  repair_start_date?: string;
  performing_party?: string;
  resolution_notes?: string;
  history: RepairEvent[];
}

function defect(seed: DefectSeed): Defect {
  const created = `${seed.date_reported}T09:00:00.000Z`;
  const last = seed.history[seed.history.length - 1];
  return {
    id: seed.id,
    item_id: seed.item_id,
    description: seed.description,
    date_reported: seed.date_reported,
    reported_by: profileId(seed.reported_by),
    severity: seed.severity,
    status: seed.status,
    repair_start_date: seed.repair_start_date ?? null,
    performing_party: seed.performing_party ?? null,
    resolution_notes: seed.resolution_notes ?? null,
    created_at: created,
    updated_at: last ? last.timestamp : created,
    history: seed.history,
  };
}

export const INITIAL_DEFECTS: Defect[] = [
  defect({
    id: "def-001",
    item_id: "itm-003",
    description:
      "Capsule crackles intermittently when handled — likely internal connector issue.",
    date_reported: "2026-06-18",
    reported_by: "Ngozi Eze",
    severity: "Medium",
    status: "Open",
    history: [
      {
        id: "ev-001",
        status: "Open",
        timestamp: "2026-06-18T09:20:00",
        user: "Ngozi Eze",
        note: "Logged after Sunday second service.",
      },
    ],
  }),
  defect({
    id: "def-002",
    item_id: "itm-007",
    description: "Pan motor grinding on full sweep, occasional stall at 270°.",
    date_reported: "2026-06-10",
    reported_by: "Chuka Obi",
    severity: "High",
    status: "Under Repair",
    repair_start_date: "2026-06-15",
    performing_party: "Lagos Stage Tech Ltd",
    history: [
      {
        id: "ev-002",
        status: "Open",
        timestamp: "2026-06-10T14:05:00",
        user: "Chuka Obi",
        note: "Noticed during Wednesday rehearsal setup.",
      },
      {
        id: "ev-003",
        status: "Under Repair",
        timestamp: "2026-06-15T11:00:00",
        user: "Chuka Obi",
        note: "Sent to Lagos Stage Tech Ltd for motor replacement.",
      },
    ],
  }),
  defect({
    id: "def-003",
    item_id: "itm-013",
    description: "No signal on HDMI input 2 — input 1 works fine.",
    date_reported: "2026-05-29",
    reported_by: "Sarah Johnson",
    severity: "Medium",
    status: "Open",
    history: [
      {
        id: "ev-004",
        status: "Open",
        timestamp: "2026-05-29T08:40:00",
        user: "Sarah Johnson",
        note: "Overflow room feed failed mid-service, switched to input 1.",
      },
    ],
  }),
  defect({
    id: "def-004",
    item_id: "itm-025",
    description: "One channel drops out above 30m range from the receiver.",
    date_reported: "2026-06-01",
    reported_by: "Tolu Adebayo",
    severity: "Low",
    status: "Under Repair",
    repair_start_date: "2026-06-08",
    performing_party: "Feyi Bankole (in-house)",
    history: [
      {
        id: "ev-005",
        status: "Open",
        timestamp: "2026-06-01T10:15:00",
        user: "Tolu Adebayo",
        note: "Dropout during outdoor youth program.",
      },
      {
        id: "ev-006",
        status: "Under Repair",
        timestamp: "2026-06-08T09:00:00",
        user: "Feyi Bankole",
        note: "Re-seating antenna and checking firmware.",
      },
    ],
  }),
  defect({
    id: "def-005",
    item_id: "itm-011",
    description: "Two DMX cables returned frayed at the connector housing.",
    date_reported: "2026-05-02",
    reported_by: "Chuka Obi",
    severity: "Low",
    status: "Resolved",
    repair_start_date: "2026-05-04",
    performing_party: "Feyi Bankole (in-house)",
    resolution_notes:
      "Frayed cables discarded and replaced from stock; remaining cables tested good.",
    history: [
      {
        id: "ev-007",
        status: "Open",
        timestamp: "2026-05-02T16:00:00",
        user: "Chuka Obi",
        note: "Found during post-event teardown.",
      },
      {
        id: "ev-008",
        status: "Under Repair",
        timestamp: "2026-05-04T09:30:00",
        user: "Feyi Bankole",
        note: "Testing remaining cables in the run.",
      },
      {
        id: "ev-009",
        status: "Resolved",
        timestamp: "2026-05-06T13:10:00",
        user: "Feyi Bankole",
        note: "Frayed cables discarded and replaced from stock; remaining cables tested good.",
      },
    ],
  }),
  defect({
    id: "def-006",
    item_id: "itm-019",
    description: "Channel 3 fader unresponsive on the old X-Air console.",
    date_reported: "2026-03-11",
    reported_by: "Ngozi Eze",
    severity: "Low",
    status: "Not Repairable",
    resolution_notes:
      "Board is end-of-life since the X32 upgrade; not worth sourcing a replacement fader assembly. Kept as an offsite spare with the fault noted.",
    history: [
      {
        id: "ev-010",
        status: "Open",
        timestamp: "2026-03-11T10:00:00",
        user: "Ngozi Eze",
        note: "Found while packing for offsite crusade.",
      },
      {
        id: "ev-011",
        status: "Not Repairable",
        timestamp: "2026-03-14T12:00:00",
        user: "Ngozi Eze",
        note: "Board is end-of-life since the X32 upgrade; not worth sourcing a replacement fader assembly.",
      },
    ],
  }),
];

export const INITIAL_ACTIVITY: AuditEntry[] = [
  {
    id: "act-001",
    timestamp: "2026-06-18T09:20:00",
    user: "Ngozi Eze",
    actionType: "Defect",
    recordLabel: "Shure SM58 Handheld Mic (Backup)",
    detail: "Logged defect — capsule crackles intermittently.",
  },
  {
    id: "act-002",
    timestamp: "2026-06-15T11:00:00",
    user: "Chuka Obi",
    actionType: "Repair Status Change",
    recordLabel: "Chauvet Rogue R2 Spot",
    detail: "Defect moved to Under Repair — sent to Lagos Stage Tech Ltd.",
  },
  {
    id: "act-003",
    timestamp: "2026-06-08T09:00:00",
    user: "Feyi Bankole",
    actionType: "Repair Status Change",
    recordLabel: "Wireless Handheld Mic (Shure QLXD)",
    detail: "Defect moved to Under Repair — re-seating antenna.",
  },
  {
    id: "act-004",
    timestamp: "2026-05-29T08:40:00",
    user: "Sarah Johnson",
    actionType: "Defect",
    recordLabel: "Epson Pro L1755U Laser Projector",
    detail: "Logged defect — no signal on HDMI input 2.",
  },
  {
    id: "act-005",
    timestamp: "2026-05-06T13:10:00",
    user: "Feyi Bankole",
    actionType: "Repair Status Change",
    recordLabel: "DMX Cable 25ft",
    detail: "Defect marked Resolved — replaced frayed cables from stock.",
  },
  {
    id: "act-006",
    timestamp: "2026-04-02T15:00:00",
    user: "Tolu Adebayo",
    actionType: "Create",
    recordLabel: "Gaffer Tape Roll",
    detail: "Added new item to Power & Batteries.",
  },
  {
    id: "act-007",
    timestamp: "2026-03-14T12:00:00",
    user: "Ngozi Eze",
    actionType: "Repair Status Change",
    recordLabel: "Behringer X-Air XR18 Mixer",
    detail: "Defect marked Not Repairable — kept as offsite spare.",
  },
  {
    id: "act-008",
    timestamp: "2026-02-01T10:00:00",
    user: "Chuka Obi",
    actionType: "Retire",
    recordLabel: "Choir Riser Section",
    detail: "Retired — replaced with new fibreglass risers.",
  },
];
