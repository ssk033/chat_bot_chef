// scripts/load_recipes.js
import fs from "fs";
import Papa from "papaparse";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();
const prisma = new PrismaClient();

const GEMINI_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_KEY) throw new Error("GEMINI_API_KEY missing");

const genAI = new GoogleGenerativeAI(GEMINI_KEY);
const embeddingModel = genAI.getEmbeddingModel({ model: "gemini-embedding-1.5" }); // change if needed

function parseCSV(path) {
  const raw = fs.readFileSync(path, "utf8");
  return new Promise((resolve, reject) => {
    Papa.parse(raw, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => resolve(res.data),
      error: (err) => reject(err),
    });
  });
}

function textForEmbedding(row) {
  // combine fields that best represent the recipe for similarity search
  return [
    row.recipe_name ?? row.Name ?? row.title ?? "",
    row.ingredients ?? row.Ingredients ?? "",
    row.instructions ?? row.Directions ?? row.instructions ?? "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

async function generateEmbedding(text) {
  // call Gemini embedding model
  const resp = await embeddingModel.embed(text);
  // resp?.embeddings? follow SDK's method; adjust according to SDK
  // Example: resp?.data?.[0]?.embedding
  // The exact accessor depends on SDK - adapt if necessary
  const emb = resp.data[0].embedding;
  return emb; // array of floats
}

async function main() {
  const rows = await parseCSV("./data/recipes.csv"); // path relative to repo root
  console.log("Rows:", rows.length);

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    try {
      const title = row.recipe_name ?? row.Name ?? row.title ?? "Untitled";
      const ingredients = row.ingredients ?? row.Ingredients ?? "";
      const instructions = row.instructions ?? row.Directions ?? "";
      const prepTime = parseInt(row.prep_time || row["Prep Time"] || 0) || null;
      const cookTime = parseInt(row.cook_time || row["Cook Time"] || 0) || null;
      const totalTime = parseInt(row.total_time || row["Total Time"] || 0) || null;

      const newRecipe = await prisma.recipe.create({
        data: {
          title,
          ingredients,
          instructions,
          prepTime,
          cookTime,
          totalTime,
          cuisine: row.cuisine ?? row.Cuisine ?? null,
          url: row.url ?? null,
          image: row.img_src ?? row.img ?? null,
          yield: row.yield ?? row.Yield ?? null,
        },
      });

      // generate embedding from combined text
      const text = textForEmbedding(row);
      const vector = await generateEmbedding(text); // array of floats

      // Insert vector using raw SQL with ::vector cast (pgvector)
      // Convert JS array to PostgreSQL array string: '[0.1,0.2,...]'::vector
      const vectorLiteral = `[${vector.join(",")}]`;
      await prisma.$executeRawUnsafe(
        `INSERT INTO "Embedding" ("recipeId","vector","createdAt") VALUES (${newRecipe.id}, '${vectorLiteral}'::vector, now())`
      );

      if (i % 50 === 0) console.log(`Inserted ${i} rows`);
    } catch (err) {
      console.error("Error on row", i, err);
    }
  }

  console.log("Done");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
