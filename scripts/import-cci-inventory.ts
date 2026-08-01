/**
 * One-off seed: imports the CCI Ikorodu equipment inventory (hand-cleaned from
 * the 2026 CSV stock-take) into Supabase.
 *
 * Usage:
 *   npx -y tsx scripts/import-cci-inventory.ts --dry-run   # print, write nothing
 *   npx -y tsx scripts/import-cci-inventory.ts             # import
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY (or
 * SUPABASE_SERVICE_ROLE_KEY) from the environment, falling back to .env.local.
 *
 * Idempotent by item name: rows whose item_name already exists (case-
 * insensitive) are skipped, matching the app's own duplicate-name rule. To
 * re-import one item, delete it first.
 *
 * Notes:
 * - Statuses are written directly (Defective / Under Repair rows), which is
 *   why this bypasses the createItem server action (it hardcodes Available).
 * - Defective items get no defects-log row — this is a historical bulk load;
 *   staff can log real defects in the app afterwards.
 * - created_by/updated_by stay null so the activity feed shows "System".
 * - Mixed-condition CSV lines are split into two items with distinct names.
 * - Name-only CSV lines import as quantity-0 placeholders.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Cleaned data
// ---------------------------------------------------------------------------

type SeedRow = {
  name: string;
  description?: string;
  category: string;
  department: "Sound" | "Light" | "Projection";
  quantity: number;
  unit: "Piece" | "Set" | "Pair" | "Roll";
  assetType: "Equipment" | "Electronics" | "Consumable" | "Furniture" | "Other";
  status: "Available" | "Defective" | "Under Repair";
  /** NGN per unit. CSV line totals were divided by quantity during cleaning. */
  estimatedValue: number | null;
  remarks: string | null;
};

const PLACEHOLDER_REMARK = "Not counted at import — quantity unknown.";

const ROWS: SeedRow[] = [
  // ---- Audio (Sound) ------------------------------------------------------
  {
    name: "X32 Digital Mixer",
    description: "Model: X-32 digital console",
    category: "Mixing Consoles",
    department: "Sound",
    quantity: 1,
    unit: "Piece",
    assetType: "Equipment",
    status: "Available",
    estimatedValue: 2_900_000,
    remarks: "Good",
  },
  {
    name: "Speaker Tops",
    category: "Speakers",
    department: "Sound",
    quantity: 0,
    unit: "Piece",
    assetType: "Equipment",
    status: "Available",
    estimatedValue: null,
    remarks: PLACEHOLDER_REMARK,
  },
  {
    name: "FDB Double Active Subwoofer",
    description: 'Model: FDB" double active subwoofer',
    category: "Speakers",
    department: "Sound",
    quantity: 3,
    unit: "Piece",
    assetType: "Equipment",
    status: "Available",
    estimatedValue: 3_700_000,
    remarks: "From CSV import: '3 good 1 bad' — these are the 3 good units.",
  },
  {
    name: "FDB Double Active Subwoofer (defective unit)",
    description: 'Model: FDB" double active subwoofer',
    category: "Speakers",
    department: "Sound",
    quantity: 1,
    unit: "Piece",
    assetType: "Equipment",
    status: "Defective",
    estimatedValue: 3_700_000,
    remarks: "From CSV import: '3 good 1 bad' — this is the bad unit.",
  },
  {
    name: "Sub Amps",
    category: "Speakers",
    department: "Sound",
    quantity: 0,
    unit: "Piece",
    assetType: "Equipment",
    status: "Available",
    estimatedValue: null,
    remarks: PLACEHOLDER_REMARK,
  },
  {
    name: 'Turbosound 12" Monitor (TFX122M-AN)',
    description: 'Model: Turbosound 12" TFX122M-AN',
    category: "Speakers",
    department: "Sound",
    quantity: 4,
    unit: "Piece",
    assetType: "Equipment",
    status: "Available",
    estimatedValue: 750_000,
    remarks: "Good",
  },
  {
    name: 'Turbosound 15" Speaker (NuQ152)',
    description: 'Model: Turbosound 15" NuQ152',
    category: "Speakers",
    department: "Sound",
    quantity: 4,
    unit: "Piece",
    assetType: "Equipment",
    status: "Available",
    estimatedValue: 1_680_000,
    remarks: "Good",
  },
  {
    name: "FBT Vertus Column Array (FOH)",
    description: "Model: FBT Vertus column array",
    category: "Speakers",
    department: "Sound",
    quantity: 2,
    unit: "Piece",
    assetType: "Equipment",
    status: "Available",
    estimatedValue: 3_500_000,
    remarks: "Good",
  },
  {
    name: "P16M Personal Monitor Mixer",
    category: "Mixing Consoles",
    department: "Sound",
    quantity: 0,
    unit: "Piece",
    assetType: "Equipment",
    status: "Available",
    estimatedValue: null,
    remarks: PLACEHOLDER_REMARK,
  },
  {
    name: "Guitar Effect Pedal",
    category: "Musical Instruments",
    department: "Sound",
    quantity: 0,
    unit: "Piece",
    assetType: "Equipment",
    status: "Available",
    estimatedValue: null,
    remarks: PLACEHOLDER_REMARK,
  },
  {
    name: "P16D Distributor",
    category: "Mixing Consoles",
    department: "Sound",
    quantity: 0,
    unit: "Piece",
    assetType: "Equipment",
    status: "Available",
    estimatedValue: null,
    remarks: PLACEHOLDER_REMARK,
  },
  {
    name: "Cat6 UTP Cable Roll (Audio)",
    description: "Cat 6 — 100m ×1, 50m ×1",
    category: "Cabling & Connectors",
    department: "Sound",
    quantity: 2,
    unit: "Roll",
    assetType: "Consumable",
    status: "Available",
    estimatedValue: null,
    remarks: "Good",
  },
  {
    name: "S32 Stage Box",
    description: "Model: Behringer S32 stage box",
    category: "Mixing Consoles",
    department: "Sound",
    quantity: 1,
    unit: "Piece",
    assetType: "Equipment",
    status: "Available",
    estimatedValue: 4_500_000,
    remarks: "Good",
  },
  {
    name: "P16 Powerplay",
    category: "Mixing Consoles",
    department: "Sound",
    quantity: 0,
    unit: "Piece",
    assetType: "Equipment",
    status: "Available",
    estimatedValue: null,
    remarks: PLACEHOLDER_REMARK,
  },
  {
    name: "Admark Monitors",
    category: "Speakers",
    department: "Sound",
    quantity: 0,
    unit: "Piece",
    assetType: "Equipment",
    status: "Available",
    estimatedValue: null,
    remarks: PLACEHOLDER_REMARK,
  },
  {
    name: "AKG Mics",
    category: "Microphones",
    department: "Sound",
    quantity: 0,
    unit: "Piece",
    assetType: "Equipment",
    status: "Available",
    estimatedValue: null,
    remarks: PLACEHOLDER_REMARK,
  },
  {
    name: "Combo Amp",
    category: "Musical Instruments",
    department: "Sound",
    quantity: 0,
    unit: "Piece",
    assetType: "Equipment",
    status: "Available",
    estimatedValue: null,
    remarks: PLACEHOLDER_REMARK,
  },
  {
    name: "Bass Combo Amp",
    category: "Musical Instruments",
    department: "Sound",
    quantity: 0,
    unit: "Piece",
    assetType: "Equipment",
    status: "Available",
    estimatedValue: null,
    remarks: PLACEHOLDER_REMARK,
  },
  {
    name: "Lavalier Mic",
    description: 'Listed in CSV as "Lavel"',
    category: "Microphones",
    department: "Sound",
    quantity: 0,
    unit: "Piece",
    assetType: "Equipment",
    status: "Available",
    estimatedValue: null,
    remarks: PLACEHOLDER_REMARK,
  },
  {
    name: "Crowd Mic",
    category: "Microphones",
    department: "Sound",
    quantity: 0,
    unit: "Piece",
    assetType: "Equipment",
    status: "Available",
    estimatedValue: null,
    remarks: PLACEHOLDER_REMARK,
  },

  // ---- Musical instruments (Sound) ----------------------------------------
  {
    name: "Shure BLX Wireless Mic (Pastor)",
    description: "Model: Shure BLXD",
    category: "Microphones",
    department: "Sound",
    quantity: 1,
    unit: "Piece",
    assetType: "Equipment",
    status: "Available",
    estimatedValue: 200_000,
    remarks: "From CSV import: 'Lead mic Bad. Pastor Mic Good' — Pastor mic.",
  },
  {
    name: "Shure BLX Wireless Mic (Lead — defective)",
    description: "Model: Shure BLXD",
    category: "Microphones",
    department: "Sound",
    quantity: 1,
    unit: "Piece",
    assetType: "Equipment",
    status: "Defective",
    estimatedValue: 200_000,
    remarks: "From CSV import: 'Lead mic Bad. Pastor Mic Good' — Lead mic.",
  },
  {
    name: "Shure SM58 Wired Mic (BGV)",
    description: "Model: Shure SM58, wired",
    category: "Microphones",
    department: "Sound",
    quantity: 5,
    unit: "Piece",
    assetType: "Equipment",
    status: "Available",
    estimatedValue: 40_000,
    remarks: "From CSV import: '5 good. 1 bad' — these are the 5 good units.",
  },
  {
    name: "Shure SM58 Wired Mic (defective unit)",
    description: "Model: Shure SM58, wired",
    category: "Microphones",
    department: "Sound",
    quantity: 1,
    unit: "Piece",
    assetType: "Equipment",
    status: "Defective",
    estimatedValue: 40_000,
    remarks: "From CSV import: '5 good. 1 bad' — this is the bad unit.",
  },
  {
    name: "Pearl Decade Drum Kit",
    description: "Model: Pearl Decade. Evans Onyx drum heads (5 pieces).",
    category: "Musical Instruments",
    department: "Sound",
    quantity: 1,
    unit: "Set",
    assetType: "Equipment",
    status: "Available",
    estimatedValue: 2_650_000,
    remarks: "Drum head replaced February 2026.",
  },
  {
    name: "Sabian SBR Cymbals",
    description: "Model: Sabian SBR",
    category: "Musical Instruments",
    department: "Sound",
    quantity: 1,
    unit: "Set",
    assetType: "Equipment",
    status: "Available",
    estimatedValue: 360_000,
    remarks: "Fair condition",
  },
  {
    name: "Drum Chair (Pearl)",
    description: "Model: Pearl drum set chair",
    category: "Musical Instruments",
    department: "Sound",
    quantity: 1,
    unit: "Piece",
    assetType: "Furniture",
    status: "Defective",
    estimatedValue: 70_000,
    remarks: "Leg stolen — bad condition.",
  },
  {
    name: "Carol Drum Mic Kit",
    description: "Model: Carol drums mic kit",
    category: "Microphones",
    department: "Sound",
    quantity: 1,
    unit: "Set",
    assetType: "Equipment",
    status: "Available",
    estimatedValue: 235_000,
    remarks: "Good condition",
  },
  {
    name: "Yamaha MODX8 Keyboard",
    description: "Model: Yamaha MODX8",
    category: "Musical Instruments",
    department: "Sound",
    quantity: 1,
    unit: "Piece",
    assetType: "Equipment",
    status: "Available",
    estimatedValue: 3_000_000,
    remarks: "Yaba's previous keyboard — recently serviced February 2026.",
  },
  {
    name: "Double Keyboard Stand",
    category: "Stands & Rigging",
    department: "Sound",
    quantity: 1,
    unit: "Piece",
    assetType: "Equipment",
    status: "Available",
    estimatedValue: 135_000,
    remarks: "Good condition",
  },
  {
    name: "Alctron PS-1 Keyboard Pedal",
    description: "Model: Alctron PS-1",
    category: "Musical Instruments",
    department: "Sound",
    quantity: 1,
    unit: "Piece",
    assetType: "Equipment",
    status: "Available",
    estimatedValue: 50_000,
    remarks: "Good condition",
  },
  {
    name: "Cort Bass Guitar",
    description: "Model: Cort",
    category: "Musical Instruments",
    department: "Sound",
    quantity: 1,
    unit: "Piece",
    assetType: "Equipment",
    status: "Under Repair",
    estimatedValue: 800_000,
    remarks: "Currently with vendor for repairs.",
  },
  {
    name: "Electric Guitar",
    category: "Musical Instruments",
    department: "Sound",
    quantity: 0,
    unit: "Piece",
    assetType: "Equipment",
    status: "Available",
    estimatedValue: null,
    remarks: "None at import (CSV: Nil).",
  },
  {
    name: "Drum Shield (set of 6)",
    category: "Stands & Rigging",
    department: "Sound",
    quantity: 1,
    unit: "Set",
    assetType: "Equipment",
    status: "Defective",
    estimatedValue: 1_500_000,
    remarks: "All panels in bad condition.",
  },
  {
    name: "Guitar Stand",
    category: "Stands & Rigging",
    department: "Sound",
    quantity: 2,
    unit: "Piece",
    assetType: "Equipment",
    status: "Available",
    estimatedValue: 25_000,
    remarks: "One unit in good condition; the other fair condition.",
  },
  {
    name: "Keyboard Chair",
    category: "Musical Instruments",
    department: "Sound",
    quantity: 1,
    unit: "Piece",
    assetType: "Furniture",
    status: "Defective",
    estimatedValue: 70_000,
    remarks: "Leg stolen — bad condition.",
  },
  {
    name: "BGV Mic Stand",
    category: "Stands & Rigging",
    department: "Sound",
    quantity: 1,
    unit: "Piece",
    assetType: "Equipment",
    status: "Defective",
    estimatedValue: 30_000,
    remarks: "Stolen leg — bad condition.",
  },

  // ---- Stage lighting (Light) ---------------------------------------------
  {
    name: "Dynacore COB Light",
    description: "Model: Dynacore COB",
    category: "Lighting Fixtures",
    department: "Light",
    quantity: 6,
    unit: "Piece",
    assetType: "Equipment",
    status: "Available",
    estimatedValue: 100_000,
    remarks: "Fair condition",
  },
  {
    name: "Dynacore PAR Light",
    description: "Model: Dynacore PAR",
    category: "Lighting Fixtures",
    department: "Light",
    quantity: 6,
    unit: "Piece",
    assetType: "Equipment",
    status: "Available",
    estimatedValue: 88_000,
    remarks: "From CSV import: 8 total, '2 in bad condition' — the 6 good units.",
  },
  {
    name: "Dynacore PAR Light (defective units)",
    description: "Model: Dynacore PAR",
    category: "Lighting Fixtures",
    department: "Light",
    quantity: 2,
    unit: "Piece",
    assetType: "Equipment",
    status: "Defective",
    estimatedValue: 88_000,
    remarks: "2 in bad condition — working on solving the issue.",
  },
  {
    name: "Beam 230 Moving Head",
    category: "Lighting Fixtures",
    department: "Light",
    quantity: 3,
    unit: "Piece",
    assetType: "Equipment",
    status: "Available",
    estimatedValue: 340_000,
    remarks: "Good",
  },
  {
    name: "Dynacore T-Bar Stand",
    description: "Model: Dynacore",
    category: "Stands & Rigging",
    department: "Light",
    quantity: 2,
    unit: "Piece",
    assetType: "Equipment",
    status: "Available",
    estimatedValue: 160_000,
    remarks: "Good",
  },
  {
    name: "DMX 512 Controller",
    description: "Model: DMX 512",
    category: "Lighting Controllers",
    department: "Light",
    quantity: 1,
    unit: "Piece",
    assetType: "Equipment",
    status: "Defective",
    estimatedValue: null,
    remarks: "Needs changing.",
  },
  {
    name: "Lighting Truss",
    category: "Stands & Rigging",
    department: "Light",
    quantity: 3,
    unit: "Piece",
    assetType: "Equipment",
    status: "Available",
    estimatedValue: 450_000,
    remarks: "The 2 cranks need changing (see Crank Stand).",
  },
  {
    name: "Light Clips",
    category: "Stands & Rigging",
    department: "Light",
    quantity: 14,
    unit: "Piece",
    assetType: "Equipment",
    status: "Available",
    estimatedValue: null,
    remarks: null,
  },
  {
    name: "Haze Machine",
    category: "Lighting Fixtures",
    department: "Light",
    quantity: 0,
    unit: "Piece",
    assetType: "Equipment",
    status: "Available",
    estimatedValue: null,
    remarks: PLACEHOLDER_REMARK,
  },
  {
    name: "XLR Cables",
    category: "Cabling & Connectors",
    department: "Light",
    quantity: 3,
    unit: "Piece",
    assetType: "Equipment",
    status: "Available",
    estimatedValue: null,
    remarks:
      "Good. CSV listed a total of ₦1,020,000 which looks like a copy error (matches the Beam 230 total) — value left blank.",
  },
  {
    name: "Power Cables (Lighting)",
    category: "Cabling & Connectors",
    department: "Light",
    quantity: 4,
    unit: "Piece",
    assetType: "Equipment",
    status: "Available",
    estimatedValue: null,
    remarks: "Good",
  },
  {
    name: "Crank Stand (pair)",
    category: "Stands & Rigging",
    department: "Light",
    quantity: 1,
    unit: "Pair",
    assetType: "Equipment",
    status: "Defective",
    estimatedValue: 1_400_000,
    remarks: "Not in good condition.",
  },

  // ---- Accessories (Sound unless noted) -----------------------------------
  {
    name: "Roll of Cables",
    category: "Cabling & Connectors",
    department: "Sound",
    quantity: 0,
    unit: "Roll",
    assetType: "Consumable",
    status: "Available",
    estimatedValue: null,
    remarks: PLACEHOLDER_REMARK,
  },
  {
    name: "Speakon Plugs",
    category: "Cabling & Connectors",
    department: "Sound",
    quantity: 0,
    unit: "Piece",
    assetType: "Equipment",
    status: "Available",
    estimatedValue: null,
    remarks: PLACEHOLDER_REMARK,
  },
  {
    name: "Mic Cables",
    category: "Cabling & Connectors",
    department: "Sound",
    quantity: 5,
    unit: "Piece",
    assetType: "Equipment",
    status: "Available",
    estimatedValue: null,
    remarks: "Good",
  },
  {
    name: "Canon Plugs",
    category: "Cabling & Connectors",
    department: "Sound",
    quantity: 0,
    unit: "Piece",
    assetType: "Equipment",
    status: "Available",
    estimatedValue: null,
    remarks: PLACEHOLDER_REMARK,
  },
  {
    name: "Distro Box",
    category: "Power & Batteries",
    department: "Sound",
    quantity: 1,
    unit: "Piece",
    assetType: "Equipment",
    status: "Available",
    estimatedValue: null,
    remarks: "Manageable",
  },
  {
    name: "2-Face Socket",
    category: "Power & Batteries",
    department: "Sound",
    quantity: 1,
    unit: "Piece",
    assetType: "Equipment",
    status: "Available",
    estimatedValue: null,
    remarks: "Good",
  },
  {
    name: "13A Plugs",
    category: "Power & Batteries",
    department: "Sound",
    quantity: 6,
    unit: "Piece",
    assetType: "Equipment",
    status: "Available",
    estimatedValue: null,
    remarks: "Good",
  },
  {
    name: "Extension Box",
    category: "Power & Batteries",
    department: "Sound",
    quantity: 0,
    unit: "Piece",
    assetType: "Equipment",
    status: "Available",
    estimatedValue: null,
    remarks: PLACEHOLDER_REMARK,
  },
  {
    name: "Speaker Stand",
    category: "Stands & Rigging",
    department: "Sound",
    quantity: 6,
    unit: "Piece",
    assetType: "Equipment",
    status: "Defective",
    estimatedValue: null,
    remarks: "Bad condition.",
  },
  {
    name: "TP-Link Router",
    description: "Model: TP-Link",
    category: "Computers & Networking",
    department: "Projection",
    quantity: 1,
    unit: "Piece",
    assetType: "Electronics",
    status: "Available",
    estimatedValue: null,
    remarks: "Good",
  },
  {
    name: "DMX Cables",
    category: "Cabling & Connectors",
    department: "Light",
    quantity: 0,
    unit: "Piece",
    assetType: "Equipment",
    status: "Available",
    estimatedValue: null,
    remarks: PLACEHOLDER_REMARK,
  },
  {
    name: "Mic Stand",
    category: "Stands & Rigging",
    department: "Sound",
    quantity: 6,
    unit: "Piece",
    assetType: "Equipment",
    status: "Available",
    estimatedValue: null,
    remarks: "Good",
  },
  {
    name: "Power Cable for Lights",
    category: "Cabling & Connectors",
    department: "Light",
    quantity: 6,
    unit: "Piece",
    assetType: "Equipment",
    status: "Available",
    estimatedValue: null,
    remarks: "Good",
  },
  {
    name: "Mercury UPS",
    description: "Model: Mercury UPS",
    category: "Power & Batteries",
    department: "Sound",
    quantity: 2,
    unit: "Piece",
    assetType: "Electronics",
    status: "Available",
    estimatedValue: null,
    remarks: "Good",
  },
  {
    name: "Power Cons",
    category: "Power & Batteries",
    department: "Sound",
    quantity: 0,
    unit: "Piece",
    assetType: "Equipment",
    status: "Available",
    estimatedValue: null,
    remarks: PLACEHOLDER_REMARK,
  },
  {
    name: "Mic Holder",
    category: "Stands & Rigging",
    department: "Sound",
    quantity: 0,
    unit: "Piece",
    assetType: "Equipment",
    status: "Available",
    estimatedValue: null,
    remarks: PLACEHOLDER_REMARK,
  },

  // ---- Projection ----------------------------------------------------------
  {
    name: "HP EliteBook 850 G6 Laptop",
    description: "Model: HP EliteBook 850 G6",
    category: "Computers & Networking",
    department: "Projection",
    quantity: 1,
    unit: "Piece",
    assetType: "Electronics",
    status: "Available",
    estimatedValue: 780_000,
    remarks: "Good",
  },
  {
    name: 'Panasonic 24" TV (Teleprompter)',
    description: 'Model: 24" Panasonic TV',
    category: "Screens & Mounts",
    department: "Projection",
    quantity: 1,
    unit: "Piece",
    assetType: "Electronics",
    status: "Available",
    estimatedValue: 50_000,
    remarks: "Working fine",
  },
  {
    name: 'Hisense 55" TV',
    description: "Model: 55'' Hisense TV",
    category: "Screens & Mounts",
    department: "Projection",
    quantity: 2,
    unit: "Piece",
    assetType: "Electronics",
    status: "Available",
    estimatedValue: 573_000,
    remarks: "From CSV import: '2 Good, 1 faulty' — the 2 good units.",
  },
  {
    name: 'Hisense 55" TV (faulty unit)',
    description: "Model: 55'' Hisense TV",
    category: "Screens & Mounts",
    department: "Projection",
    quantity: 1,
    unit: "Piece",
    assetType: "Electronics",
    status: "Defective",
    estimatedValue: 573_000,
    remarks: "From CSV import: '2 Good, 1 faulty' — the faulty unit.",
  },
  {
    name: "TV Stand with Hanger",
    category: "Stands & Rigging",
    department: "Projection",
    quantity: 2,
    unit: "Piece",
    assetType: "Equipment",
    status: "Available",
    estimatedValue: null,
    remarks: "Good",
  },
  {
    name: "4K HDMI Splitter (4-port)",
    description: "Model: 4K splitter",
    category: "Cabling & Connectors",
    department: "Projection",
    quantity: 1,
    unit: "Piece",
    assetType: "Equipment",
    status: "Available",
    estimatedValue: 15_000,
    remarks: "Good",
  },
  {
    name: "HDMI Splitter Power Pack",
    category: "Cabling & Connectors",
    department: "Projection",
    quantity: 1,
    unit: "Piece",
    assetType: "Equipment",
    status: "Available",
    estimatedValue: 2_000,
    remarks: "Good",
  },
  {
    name: "HDMI Extender over Cat6 (150m)",
    description: "HDMI extender transmitter & receiver, over Cat6, 150m",
    category: "Cabling & Connectors",
    department: "Projection",
    quantity: 1,
    unit: "Piece",
    assetType: "Equipment",
    status: "Available",
    estimatedValue: 60_000,
    remarks: "From CSV import: 2 total, one has a faulty transmitter — the good unit.",
  },
  {
    name: "HDMI Extender over Cat6 (150m, faulty transmitter)",
    description: "HDMI extender transmitter & receiver, over Cat6, 150m",
    category: "Cabling & Connectors",
    department: "Projection",
    quantity: 1,
    unit: "Piece",
    assetType: "Equipment",
    status: "Defective",
    estimatedValue: 60_000,
    remarks: "Faulty transmitter.",
  },
  {
    name: "HDMI Extender over Cat6 (70m)",
    description: "HDMI extender transmitter & receiver, over Cat6, 70m",
    category: "Cabling & Connectors",
    department: "Projection",
    quantity: 1,
    unit: "Piece",
    assetType: "Equipment",
    status: "Defective",
    estimatedValue: 55_000,
    remarks: "Transmitter is bad.",
  },
  {
    name: "4K HDMI Cable (30m)",
    category: "Cabling & Connectors",
    department: "Projection",
    quantity: 1,
    unit: "Piece",
    assetType: "Equipment",
    status: "Available",
    estimatedValue: 55_000,
    remarks: "Good",
  },
  {
    name: "HDMI Cable (0.5m)",
    category: "Cabling & Connectors",
    department: "Projection",
    quantity: 4,
    unit: "Piece",
    assetType: "Equipment",
    status: "Available",
    estimatedValue: 2_000,
    remarks: "Good",
  },
  {
    name: "Cat6 Cable Roll (100m)",
    category: "Cabling & Connectors",
    department: "Projection",
    quantity: 1,
    unit: "Roll",
    assetType: "Consumable",
    status: "Available",
    estimatedValue: 66_000,
    remarks: "Good",
  },
  {
    name: "Cat6 Cable Roll (30m)",
    category: "Cabling & Connectors",
    department: "Projection",
    quantity: 1,
    unit: "Roll",
    assetType: "Consumable",
    status: "Available",
    estimatedValue: 15_000,
    remarks: "Good",
  },
  {
    name: "Power Extension",
    category: "Power & Batteries",
    department: "Projection",
    quantity: 1,
    unit: "Piece",
    assetType: "Equipment",
    status: "Available",
    estimatedValue: 5_000,
    remarks: "Good",
  },
];

// Skipped during cleaning (documented, not imported): one accessories row with
// quantity 2 and remark "Bad" but no item name at all.

// ---------------------------------------------------------------------------
// Env + client
// ---------------------------------------------------------------------------

/** Minimal .env.local fallback so the script runs without node --env-file. */
function loadEnvLocal() {
  try {
    const text = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
    for (const line of text.split("\n")) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      const [, key, raw] = m;
      if (process.env[key] !== undefined) continue;
      process.env[key] = raw.replace(/^["']|["']$/g, "");
    }
  } catch {
    // no .env.local — rely on the ambient environment
  }
}

function getClient() {
  loadEnvLocal();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY/SUPABASE_SERVICE_ROLE_KEY."
    );
    process.exit(1);
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// ---------------------------------------------------------------------------
// Import
// ---------------------------------------------------------------------------

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const supabase = getClient();

  // Departments must already exist (seeded by 0002); fail hard otherwise.
  const { data: deptRows, error: deptError } = await supabase
    .from("departments")
    .select("id, name");
  if (deptError) throw new Error(`departments select failed: ${deptError.message}`);
  const departmentId = new Map((deptRows ?? []).map((d) => [d.name, d.id]));
  for (const required of ["Sound", "Light", "Projection"]) {
    if (!departmentId.has(required)) {
      throw new Error(
        `Department "${required}" not found — is this the right database?`
      );
    }
  }

  // Upsert categories referenced by the seed rows.
  const categoryNames = [...new Set(ROWS.map((r) => r.category))];
  if (!dryRun) {
    const { error } = await supabase
      .from("categories")
      .upsert(
        categoryNames.map((name) => ({ name })),
        { onConflict: "name", ignoreDuplicates: true }
      );
    if (error) throw new Error(`categories upsert failed: ${error.message}`);
  }
  const { data: catRows, error: catError } = await supabase
    .from("categories")
    .select("id, name");
  if (catError) throw new Error(`categories select failed: ${catError.message}`);
  const categoryId = new Map((catRows ?? []).map((c) => [c.name, c.id]));
  const missingCategories = categoryNames.filter((n) => !categoryId.has(n));
  if (!dryRun && missingCategories.length > 0) {
    throw new Error(`categories missing after upsert: ${missingCategories.join(", ")}`);
  }

  // Idempotency: skip rows whose item_name already exists (case-insensitive),
  // matching the app's duplicate-name rule.
  const { data: existingRows, error: existingError } = await supabase
    .from("inventory_items")
    .select("item_name");
  if (existingError) {
    throw new Error(`inventory_items select failed: ${existingError.message}`);
  }
  const existing = new Set(
    (existingRows ?? []).map((r) => (r.item_name as string).trim().toLowerCase())
  );

  let inserted = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of ROWS) {
    const nameKey = row.name.trim().toLowerCase();
    if (existing.has(nameKey)) {
      skipped++;
      console.log(`SKIP    ${row.name} (already exists)`);
      continue;
    }

    if (dryRun) {
      inserted++;
      const value =
        row.estimatedValue == null
          ? "—"
          : `₦${row.estimatedValue.toLocaleString("en-NG")}`;
      console.log(
        `DRY     ${row.name} | ${row.department} | ${row.category} | qty ${row.quantity} ${row.unit} | ${row.status} | ${value}`
      );
      continue;
    }

    const { error } = await supabase.from("inventory_items").insert({
      item_name: row.name,
      description: row.description ?? null,
      category_id: categoryId.get(row.category),
      department_id: departmentId.get(row.department),
      quantity: row.quantity,
      minimum_stock_threshold: null,
      status: row.status,
      location: null,
      date_acquired: null,
      remarks: row.remarks,
      serial_number: null,
      estimated_value: row.estimatedValue,
      unit_of_measure: row.unit,
      asset_type: row.assetType,
      created_by: null,
      updated_by: null,
    });

    if (error) {
      failed++;
      console.error(`FAIL    ${row.name}: ${error.message}`);
      continue;
    }

    inserted++;
    existing.add(nameKey);
    console.log(`INSERT  ${row.name}`);
  }

  // One summary audit entry (not one per item — keeps the activity feed sane).
  if (!dryRun && inserted > 0) {
    const { error } = await supabase.from("audit_log").insert({
      user_id: null,
      action_type: "Create",
      record_label: "CCI Ikorodu CSV import",
      detail: `Imported ${inserted} items (${skipped} skipped as existing).`,
    });
    if (error) console.error(`audit_log insert failed: ${error.message}`);
  }

  const totalValue = ROWS.reduce(
    (sum, r) => sum + (r.estimatedValue ?? 0) * r.quantity,
    0
  );
  console.log("");
  console.log(dryRun ? "— dry run, nothing written —" : "— import complete —");
  console.log(
    `rows: ${ROWS.length} | inserted: ${inserted} | skipped: ${skipped} | failed: ${failed}`
  );
  console.log(
    `total estimated value (all rows): ₦${totalValue.toLocaleString("en-NG")}`
  );

  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
