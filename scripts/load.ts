import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import Papa from "papaparse";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log("🔥 Loading recipes into database...");

  const filePath = path.join(process.cwd(), "recipes.csv");

  if (!fs.existsSync(filePath)) {
    console.error("❌ recipes.csv not found in project root.");
    process.exit(1);
  }

  const file = fs.readFileSync(filePath, "utf8");
  const parsed = Papa.parse(file, { header: true });
  const rows: any[] = parsed.data;

  console.log(`📦 Found ${rows.length} rows in CSV`);

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

  // NEW EMBEDDING MODEL — CORRECT FOR 2024+
  const embedModel = genAI.getGenerativeModel({
    model: "models/text-embedding-004",
  });

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

      const embeddingResult = await embedModel.embedContent(embedText);

      // NEW KEY — correct path
      const vector = embeddingResult.embedding.values;

      const vectorString = `[${vector.join(",")}]`;

      await prisma.$executeRawUnsafe(`
        INSERT INTO "embeddings" ("recipeId", "vector", "createdAt")
        VALUES (${recipe.id}, '${vectorString}'::vector, NOW())
      `);

      if (i % 50 === 0) {
        console.log(`Inserted ${i} recipes`);
      }
    } catch (err) {
      console.error(`❌ Error row ${i}:`, err);
    }
  }

  console.log("🎉 Loading complete!");
  process.exit(0);
}

main().finally(() => prisma.$disconnect());
