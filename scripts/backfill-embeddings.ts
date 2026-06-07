/**
 * Generate embeddings for recipes that have no row in "embeddings".
 * Append-only: never updates or deletes existing embeddings.
 *
 * Usage:
 *   npx tsx scripts/backfill-embeddings.ts           # dry-run
 *   npx tsx scripts/backfill-embeddings.ts --apply
 *   npx tsx scripts/backfill-embeddings.ts --apply --limit=50
 */

import dotenv from "dotenv";
import { generateEmbedding } from "../lib/embedding-model.js";
import { prisma, withPrismaReconnect } from "../lib/prisma.js";

dotenv.config();

const DB_RETRY_ATTEMPTS = 4;
const DB_RETRY_DELAY_MS = 3000;

async function withDbRetry<T>(operation: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= DB_RETRY_ATTEMPTS; attempt++) {
    try {
      return await withPrismaReconnect(operation);
    } catch (error) {
      lastError = error;
      const msg = error instanceof Error ? error.message : String(error);
      const retriable =
        msg.toLowerCase().includes("can't reach database server") ||
        msg.toLowerCase().includes("connection") ||
        msg.toLowerCase().includes("econnreset");
      if (!retriable || attempt === DB_RETRY_ATTEMPTS) throw error;
      console.warn(`⚠️  Database unreachable — retry ${attempt}/${DB_RETRY_ATTEMPTS} in ${DB_RETRY_DELAY_MS / 1000}s…`);
      await new Promise((resolve) => setTimeout(resolve, DB_RETRY_DELAY_MS));
      await prisma.$connect();
    }
  }
  throw lastError;
}

type RecipeRow = {
  id: number;
  title: string;
  ingredients: string | null;
  instructions: string | null;
};

function buildEmbedText(recipe: RecipeRow): string {
  return `
${recipe.title}
Ingredients: ${recipe.ingredients ?? ""}
Instructions: ${recipe.instructions ?? ""}
  `.trim();
}

async function findRecipesMissingEmbeddings(limit?: number): Promise<RecipeRow[]> {
  const capped =
    typeof limit === "number" && Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : null;

  const rows = await withDbRetry(() => prisma.$queryRawUnsafe<RecipeRow[]>(`
    SELECT r.id, r.title, r.ingredients, r.instructions
    FROM "Recipe" r
    LEFT JOIN "embeddings" e ON e."recipeId" = r.id
    WHERE e.id IS NULL
    ORDER BY r.id ASC
    ${capped ? `LIMIT ${capped}` : ""}
  `));

  return rows;
}

async function insertEmbedding(recipeId: number, vector: number[]): Promise<void> {
  const vectorString = `[${vector.join(",")}]`;
  await withDbRetry(() =>
    prisma.$executeRawUnsafe(`
    INSERT INTO "embeddings" ("recipeId", "vector", "createdAt")
    VALUES (${recipeId}, '${vectorString}'::vector, NOW())
  `)
  );
}

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const limitArg = args.find((a) => a.startsWith("--limit="));
  const limit = limitArg ? parseInt(limitArg.split("=")[1] ?? "", 10) : undefined;

  const [recipeCount, embeddingCount] = await withDbRetry(() =>
    Promise.all([
      prisma.recipe.count(),
      prisma.$queryRawUnsafe<{ count: bigint }[]>(`SELECT COUNT(*)::bigint AS count FROM "embeddings"`),
    ])
  );
  const embeddingsBefore = Number(embeddingCount[0]?.count ?? 0);

  const missing = await findRecipesMissingEmbeddings(limit);

  console.log(apply ? "🚀 Embedding backfill (writes enabled)" : "🔍 DRY-RUN (no writes)");
  console.log(`📊 Recipes in DB:              ${recipeCount}`);
  console.log(`📊 Embeddings before:          ${embeddingsBefore}`);
  console.log(`📊 Recipes missing embeddings: ${missing.length}`);
  if (limit) console.log(`⚙️  Limit:                      ${limit}`);

  if (missing.length === 0) {
    console.log("\n✅ All recipes already have embeddings.");
    return;
  }

  if (!apply) {
    console.log("\n   Sample IDs:", missing.slice(0, 8).map((r) => r.id).join(", "), "…");
    console.log("\n✅ Dry-run complete. Re-run with --apply to generate embeddings.");
    return;
  }

  console.log("\n⏳ Generating embeddings…\n");

  let ok = 0;
  let failed = 0;

  for (let i = 0; i < missing.length; i++) {
    const recipe = missing[i];
    try {
      const vector = await generateEmbedding(buildEmbedText(recipe));
      if (!Array.isArray(vector) || vector.length !== 384) {
        throw new Error(`Expected 384-dim vector, got ${vector?.length ?? 0}`);
      }
      await insertEmbedding(recipe.id, vector);
      ok++;
      if (ok % 10 === 0 || i === missing.length - 1) {
        console.log(`✅ ${ok}/${missing.length} embedded (latest id: ${recipe.id})`);
      }
    } catch (err: unknown) {
      failed++;
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`❌ Recipe ${recipe.id} (${recipe.title}): ${msg}`);
      if (msg.includes("Model not found") || msg.includes("recipe-embedder")) {
        console.error("\n💡 Fix the local model or ensure network access for Hugging Face fallback.");
        break;
      }
    }
  }

  const after = await withDbRetry(() =>
    prisma.$queryRawUnsafe<{ count: bigint }[]>(`SELECT COUNT(*)::bigint AS count FROM "embeddings"`)
  );
  const embeddingsAfter = Number(after[0]?.count ?? 0);

  console.log("\n✅ Backfill finished");
  console.log(`   Embedded:           ${ok}`);
  console.log(`   Failed:             ${failed}`);
  console.log(`   Embeddings before:  ${embeddingsBefore}`);
  console.log(`   Embeddings after:   ${embeddingsAfter}`);
}

main()
  .catch((err: unknown) => {
    console.error("❌ Backfill failed:", err instanceof Error ? err.message : err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
