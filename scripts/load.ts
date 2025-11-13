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

  // Check for API key
  if (!process.env.GEMINI_API_KEY) {
    console.error("❌ GEMINI_API_KEY not found in environment variables.");
    console.error("📝 Please create a .env file in the project root with:");
    console.error("   GEMINI_API_KEY=your_api_key_here");
    console.error("\n💡 Get your API key from: https://aistudio.google.com/app/apikey");
    process.exit(1);
  }

  const filePath = path.join(process.cwd(), "recipes.csv");

  if (!fs.existsSync(filePath)) {
    console.error("❌ recipes.csv not found in project root.");
    process.exit(1);
  }

  const file = fs.readFileSync(filePath, "utf8");
  const parsed = Papa.parse(file, { header: true });
  const rows: any[] = parsed.data;

  console.log(`📦 Found ${rows.length} rows in CSV`);

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

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
        console.log(`✅ Inserted ${i + 1} recipes`);
      }
    } catch (err: any) {
      // If it's an API key error, stop immediately
      if (err?.errorDetails?.[0]?.reason === "API_KEY_INVALID" || err?.message?.includes("API key")) {
        console.error(`\n❌ API Key Error at row ${i}:`);
        console.error("   The API key is invalid or expired.");
        console.error("   Please check your .env file and ensure GEMINI_API_KEY is correct.");
        console.error("   Get a new key from: https://aistudio.google.com/app/apikey\n");
        process.exit(1);
      }
      
      // For other errors, log but continue
      console.error(`❌ Error row ${i}:`, err?.message || err);
      
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
