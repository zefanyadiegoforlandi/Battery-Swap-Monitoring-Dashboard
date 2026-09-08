import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";

loadEnvConfig(process.cwd());

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL belum tersedia.");
}

if (!supabaseSecretKey) {
  throw new Error("SUPABASE_SECRET_KEY belum tersedia.");
}

const supabase = createClient(supabaseUrl, supabaseSecretKey);

const BRANCHES = [
  "Jakarta",
  "Bandung",
  "Surabaya",
  "Medan",
  "Semarang",
  "Makassar",
  "Yogyakarta",
  "Denpasar",
  "Palembang",
  "Balikpapan",
];

const CABINET_STATUSES = ["ONLINE", "OFFLINE", "MAINTENANCE"] as const;
const SLOT_STATES = ["EMPTY", "CHARGING", "FULL", "LOCKED", "FAULT"] as const;

const TOTAL_CABINETS = 50;
const SLOTS_PER_CABINET = 12;
const TOTAL_TRANSACTIONS = 20_000;
const DAYS = 30;

function randomItem<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDateWithinLastDays(days: number): string {
  const now = Date.now();
  const offset = Math.random() * days * 24 * 60 * 60 * 1000;

  return new Date(now - offset).toISOString();
}

function createBranches() {
  return BRANCHES.map((name, index) => ({
    id: `branch-${String(index + 1).padStart(2, "0")}`,
    name,
  }));
}

function createCabinets(branches: { id: string; name: string }[]) {
  return Array.from({ length: TOTAL_CABINETS }, (_, index) => {
    const branch = randomItem(branches);

    return {
      id: `cabinet-${String(index + 1).padStart(3, "0")}`,
      code: `CAB-${String(index + 1).padStart(3, "0")}`,
      branch_id: branch.id,
      status: randomItem(CABINET_STATUSES),
      total_slots: SLOTS_PER_CABINET,
      last_heartbeat_at:
        Math.random() < 0.9
          ? randomDateWithinLastDays(2)
          : randomDateWithinLastDays(7),
    };
  });
}

function createSlots(cabinets: { id: string }[]) {
  const slots = [];

  for (const cabinet of cabinets) {
    for (let slotNumber = 1; slotNumber <= SLOTS_PER_CABINET; slotNumber++) {
      const state = randomItem(SLOT_STATES);

      slots.push({
        id: `${cabinet.id}-slot-${String(slotNumber).padStart(2, "0")}`,
        cabinet_id: cabinet.id,
        slot_number: slotNumber,
        state,
        soc_percent:
          state === "EMPTY" || state === "LOCKED"
            ? null
            : randomInt(10, 100),
      });
    }
  }

  return slots;
}

function createTransactions(
  cabinets: { id: string }[],
  total: number,
) {
  return Array.from({ length: total }, (_, index) => {
    const cabinet = randomItem(cabinets);
    const slotNumber = randomInt(1, SLOTS_PER_CABINET);

    return {
      id: `swap-${String(index + 1).padStart(5, "0")}`,
      cabinet_id: cabinet.id,
      slot_number: slotNumber,
      swapped_at: randomDateWithinLastDays(DAYS),
      battery_id: `BAT-${randomInt(1, 1000)
        .toString()
        .padStart(4, "0")}`,
    };
  });
}

async function insertInBatches<T extends Record<string, unknown>>(
  table: string,
  rows: T[],
  batchSize = 500,
) {
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);

    const { error } = await supabase.from(table).insert(batch);

    if (error) {
      throw new Error(
        `Gagal insert ke ${table}: ${error.message}`,
      );
    }

    console.log(
      `${table}: ${Math.min(i + batchSize, rows.length)}/${rows.length}`,
    );
  }
}

async function main() {
  console.log("Mulai seed database...");

  const branches = createBranches();
  const cabinets = createCabinets(branches);
  const slots = createSlots(cabinets);
  const transactions = createTransactions(
    cabinets,
    TOTAL_TRANSACTIONS,
  );

  await insertInBatches("branches", branches, 100);
  await insertInBatches("cabinets", cabinets, 100);
  await insertInBatches("slots", slots, 200);
  await insertInBatches("swap_transactions", transactions, 500);

  console.log("");
  console.log("Seed selesai.");
  console.log(`Branches: ${branches.length}`);
  console.log(`Cabinets: ${cabinets.length}`);
  console.log(`Slots: ${slots.length}`);
  console.log(`Transactions: ${transactions.length}`);
}

main().catch((error) => {
  console.error("Seed gagal:");
  console.error(error);
  process.exit(1);
});