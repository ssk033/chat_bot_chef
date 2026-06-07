/**
 * Append-only recipe import from a JSON array file.
 *
 * Safety:
 * - Never deletes, truncates, or updates existing rows.
 * - Default mode is dry-run (preview counts only).
 * - Pass --apply to perform inserts inside a single transaction.
 *
 * Usage:
 *   npx tsx scripts/import-recipes-json.ts path/to/recipes.json
 *   npx tsx scripts/import-recipes-json.ts path/to/recipes.json --apply
 */

import { PrismaClient, type Prisma } from "@prisma/client";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient();

type RecipeJsonRow = {
  id?: unknown;
  title?: unknown;
  ingredients?: unknown;
  instructions?: unknown;
  prepTime?: unknown;
  cookTime?: unknown;
  totalTime?: unknown;
  cuisine?: unknown;
  tags?: unknown;
  url?: unknown;
  image?: unknown;
  yield?: unknown;
  createdAt?: unknown;
};

type NormalizedRecipe = {
  id: number;
  title: string;
  ingredients: string | null;
  instructions: string | null;
  prepTime: number | null;
  cookTime: number | null;
  totalTime: number | null;
  cuisine: string | null;
  tags: string | null;
  url: string | null;
  image: string | null;
  yield: string | null;
  createdAt: Date;
};

function isNaNLike(value: unknown): boolean {
  return (
    value === null ||
    value === undefined ||
    value === "NaN" ||
    value === "null" ||
    (typeof value === "number" && Number.isNaN(value))
  );
}

function toOptionalInt(value: unknown): number | null {
  if (isNaNLike(value)) return null;
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n) : null;
}

function toOptionalString(value: unknown): string | null {
  if (isNaNLike(value)) return null;
  const s = String(value).trim();
  return s.length > 0 ? s : null;
}

function toRequiredString(value: unknown, fallback = "Untitled"): string {
  const s = toOptionalString(value);
  return s ?? fallback;
}

function toDate(value: unknown): Date {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === "string" || typeof value === "number") {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return new Date();
}

function toPositiveInt(value: unknown): number | null {
  const n = toOptionalInt(value);
  return n !== null && n > 0 ? n : null;
}

function duplicateKey(title: string, url: string | null): string {
  return `${title.trim().toLowerCase()}|${(url ?? "").trim().toLowerCase()}`;
}

function normalizeRow(raw: RecipeJsonRow, index: number): NormalizedRecipe | null {
  const id = toPositiveInt(raw.id);
  if (id === null) {
    console.warn(`⚠️  Row ${index + 1}: missing or invalid id — skipped`);
    return null;
  }

  const title = toRequiredString(raw.title);

  return {
    id,
    title,
    ingredients: toOptionalString(raw.ingredients),
    instructions: toOptionalString(raw.instructions),
    prepTime: toOptionalInt(raw.prepTime),
    cookTime: toOptionalInt(raw.cookTime),
    totalTime: toOptionalInt(raw.totalTime),
    cuisine: toOptionalString(raw.cuisine),
    tags: toOptionalString(raw.tags),
    url: toOptionalString(raw.url),
    image: toOptionalString(raw.image),
    yield: toOptionalString(raw.yield),
    createdAt: toDate(raw.createdAt),
  };
}

function dedupeWithinFile(rows: NormalizedRecipe[]): {
  unique: NormalizedRecipe[];
  skippedInternalDuplicates: number;
} {
  const seen = new Set<string>();
  const unique: NormalizedRecipe[] = [];
  let skippedInternalDuplicates = 0;

  for (const row of rows) {
    const key = duplicateKey(row.title, row.url);
    if (seen.has(key)) {
      skippedInternalDuplicates++;
      continue;
    }
    seen.add(key);
    unique.push(row);
  }

  return { unique, skippedInternalDuplicates };
}

function loadJsonFile(filePath: string): RecipeJsonRow[] {
  const abs = path.resolve(filePath);
  if (!fs.existsSync(abs)) {
    throw new Error(`JSON file not found: ${abs}`);
  }

  const parsed: unknown = JSON.parse(fs.readFileSync(abs, "utf8"));
  if (!Array.isArray(parsed)) {
    throw new Error("JSON root must be an array of recipe objects");
  }
  return parsed as RecipeJsonRow[];
}

async function loadExistingDuplicateKeys(): Promise<{
  duplicateKeys: Set<string>;
  existingIds: Set<number>;
  countBefore: number;
}> {
  const existing = await prisma.recipe.findMany({
    select: { id: true, title: true, url: true },
  });

  const duplicateKeys = new Set<string>();
  const existingIds = new Set<number>();

  for (const row of existing) {
    existingIds.add(row.id);
    duplicateKeys.add(duplicateKey(row.title, row.url));
  }

  return { duplicateKeys, existingIds, countBefore: existing.length };
}

function partitionForImport(
  rows: NormalizedRecipe[],
  duplicateKeys: Set<string>,
  existingIds: Set<number>
): {
  toInsert: NormalizedRecipe[];
  skippedDuplicates: number;
  skippedIdCollision: number;
} {
  const toInsert: NormalizedRecipe[] = [];
  let skippedDuplicates = 0;
  let skippedIdCollision = 0;

  for (const row of rows) {
    const key = duplicateKey(row.title, row.url);
    if (duplicateKeys.has(key)) {
      skippedDuplicates++;
      continue;
    }
    if (existingIds.has(row.id)) {
      skippedIdCollision++;
      continue;
    }

    toInsert.push(row);
    duplicateKeys.add(key);
    existingIds.add(row.id);
  }

  return { toInsert, skippedDuplicates, skippedIdCollision };
}

const INSERT_BATCH_SIZE = 40;
const TX_TIMEOUT_MS = 120_000;

async function insertRecipes(toInsert: NormalizedRecipe[]): Promise<number> {
  if (toInsert.length === 0) return 0;

  let inserted = 0;

  for (let i = 0; i < toInsert.length; i += INSERT_BATCH_SIZE) {
    const batch = toInsert.slice(i, i + INSERT_BATCH_SIZE);

    await prisma.$transaction(
      async (tx) => {
        for (const row of batch) {
          const data: Prisma.RecipeUncheckedCreateInput = {
            id: row.id,
            title: row.title,
            ingredients: row.ingredients,
            instructions: row.instructions,
            prepTime: row.prepTime,
            cookTime: row.cookTime,
            totalTime: row.totalTime,
            cuisine: row.cuisine,
            tags: row.tags,
            url: row.url,
            image: row.image,
            yield: row.yield,
            createdAt: row.createdAt,
          };
          await tx.recipe.create({ data });
        }
      },
      { maxWait: TX_TIMEOUT_MS, timeout: TX_TIMEOUT_MS }
    );

    inserted += batch.length;
    if (toInsert.length > INSERT_BATCH_SIZE) {
      console.log(`   … ${inserted}/${toInsert.length} inserted`);
    }
  }

  await prisma.$executeRawUnsafe(`
    SELECT setval(
      pg_get_serial_sequence('"Recipe"', 'id'),
      COALESCE((SELECT MAX(id) FROM "Recipe"), 1),
      true
    );
  `);

  return inserted;
}

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const fileArg = args.find((a) => !a.startsWith("--"));

  if (!fileArg) {
    console.error("Usage: npx tsx scripts/import-recipes-json.ts <recipes.json> [--apply]");
    console.error("  Omit --apply for dry-run (preview only, no writes).");
    process.exit(1);
  }

  console.log(apply ? "🚀 APPEND import (writes enabled)" : "🔍 DRY-RUN (no database writes)");
  console.log(`📂 File: ${path.resolve(fileArg)}\n`);

  const rawRows = loadJsonFile(fileArg);
  const normalized = rawRows
    .map((row, index) => normalizeRow(row, index))
    .filter((row): row is NormalizedRecipe => row !== null);

  const { unique, skippedInternalDuplicates } = dedupeWithinFile(normalized);
  const { duplicateKeys, existingIds, countBefore } = await loadExistingDuplicateKeys();
  const { toInsert, skippedDuplicates, skippedIdCollision } = partitionForImport(
    unique,
    duplicateKeys,
    existingIds
  );

  console.log("📊 Import preview");
  console.log(`   Existing recipes in DB:     ${countBefore}`);
  console.log(`   Recipes in JSON file:       ${rawRows.length}`);
  console.log(`   Valid rows after parse:     ${normalized.length}`);
  console.log(`   Duplicates within JSON:     ${skippedInternalDuplicates} (skipped)`);
  console.log(`   Skipped (title+url match):  ${skippedDuplicates}`);
  console.log(`   Skipped (id already used):  ${skippedIdCollision}`);
  console.log(`   → Would insert:             ${toInsert.length}`);
  console.log(`   → Final count if applied:   ${countBefore + toInsert.length}\n`);

  if (toInsert.length > 0 && toInsert.length <= 10) {
    console.log("   Sample IDs to insert:", toInsert.map((r) => r.id).join(", "));
  } else if (toInsert.length > 10) {
    const sample = toInsert.slice(0, 5).map((r) => r.id);
    const tail = toInsert.slice(-3).map((r) => r.id);
    console.log(`   Sample IDs to insert: ${sample.join(", ")} … ${tail.join(", ")}`);
  }

  if (!apply) {
    console.log("\n✅ Dry-run complete. Re-run with --apply to insert new recipes only.");
    return;
  }

  if (toInsert.length === 0) {
    console.log("\n✅ Nothing to insert.");
    return;
  }

  console.log("\n⏳ Inserting (single transaction)…");
  const inserted = await insertRecipes(toInsert);
  const countAfter = await prisma.recipe.count();

  console.log("\n✅ Import complete");
  console.log(`   Inserted:              ${inserted}`);
  console.log(`   Skipped (duplicates):  ${skippedDuplicates}`);
  console.log(`   Skipped (id in use):   ${skippedIdCollision}`);
  console.log(`   Final recipe count:    ${countAfter}`);
  console.log("\n💡 New rows have no embeddings yet. Run embedding backfill separately if needed.");
}

main()
  .catch((err: unknown) => {
    console.error("❌ Import failed:", err instanceof Error ? err.message : err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
