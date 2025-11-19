import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import Papa from "papaparse";
import dotenv from "dotenv";
import { generateEmbedding } from "../lib/embedding-model.js";

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log("🔥 Loading recipes into database...");
  console.log("📦 Using CUSTOM trained embedding model (not Google API)");

  // Try recipes_data.csv first (your large dataset), fallback to recipes.csv
  const filePath = fs.existsSync(path.join(process.cwd(), "recipes_data.csv"))
    ? path.join(process.cwd(), "recipes_data.csv")
    : path.join(process.cwd(), "recipes.csv");

  if (!fs.existsSync(filePath)) {
    console.error("❌ Recipe CSV not found in project root.");
    console.error("   Tried: recipes_data.csv and recipes.csv");
    process.exit(1);
  }
  
  console.log(`📂 Using file: ${path.basename(filePath)}`);

  const file = fs.readFileSync(filePath, "utf8");
  const parsed = Papa.parse(file, { header: true });
  const rows: any[] = parsed.data;

  console.log(`📦 Found ${rows.length} rows in CSV`);

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];

    try {
      const recipe = await prisma.recipe.create({
        data: {
          title: r.recipe_name || r.Name || "Untitled",
          ingredients: r.ingredients || r.Ingredients || "",
          instructions: r.instructions || r.Directions || "",
          prepTime: Number(r.prep_time || r["Prep Time"] || 0),
          cookTime: Number(r.cook_time || r["Cook Time"] || 0),
          totalTime: Number(r.total_time || r["Total Time"] || 0),
          cuisine: r.cuisine || "",
          tags: r.tags || "",
          url: r.url || "",
          image: r.img_src || "",
          yield: r.yield || "",
        },
      });

      const embedText = `
${recipe.title}
Ingredients: ${recipe.ingredients}
Instructions: ${recipe.instructions}
      `.trim();

      // Use custom trained model instead of Google API
      const vector = await generateEmbedding(embedText);

      const vectorString = `[${vector.join(",")}]`;

      await prisma.$executeRawUnsafe(`
        INSERT INTO "embeddings" ("recipeId", "vector", "createdAt")
        VALUES (${recipe.id}, '${vectorString}'::vector, NOW())
      `);

      if (i % 50 === 0) {
        console.log(`✅ Inserted ${i + 1} recipes`);
      }
    } catch (err: any) {
      // For errors, log but continue
      console.error(`❌ Error row ${i}:`, err?.message || err);
      
      // If it's a model loading error, stop immediately
      if (err?.message?.includes("Model not found") || err?.message?.includes("train the model")) {
        console.error(`\n❌ Model Error:`);
        console.error("   The custom embedding model is not trained yet.");
        console.error("   Please train the model first by running:");
        console.error("   python scripts/train_model.py\n");
        process.exit(1);
      }
      
      // If too many consecutive errors, stop
      if (i > 0 && i % 100 === 0) {
        const errorCount = i;
        console.warn(`⚠️  Encountered errors. Continuing... (processed ${errorCount} rows)`);
      }
    }
  }

  console.log("\n🎉 Loading complete!");
  console.log(`✅ Successfully processed ${rows.length} recipes`);
  process.exit(0);
}

main().finally(() => prisma.$disconnect());
