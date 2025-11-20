import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import Papa from "papaparse";
import dotenv from "dotenv";
import { generateEmbedding } from "../lib/embedding-model.js";
import { createReadStream } from "fs";

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log("🔥 Loading recipes into database...");
  console.log("📦 Using CUSTOM trained embedding model (not Google API)");
  console.log("\n💡 TIP: To limit recipes, set MAX_RECIPES_TO_LOAD env var:");
  console.log("   MAX_RECIPES_TO_LOAD=5000 npm run load  (loads 5k recipes)");
  console.log("   MAX_RECIPES_TO_LOAD=10000 npm run load (loads 10k recipes)\n");

  // Try recipes_data.csv first (your large dataset), fallback to recipes.csv
  const filePath = fs.existsSync(path.join(process.cwd(), "recipes_data.csv"))
    ? path.join(process.cwd(), "recipes_data.csv")
    : path.join(process.cwd(), "recipes.csv");

  if (!fs.existsSync(filePath)) {
    console.error("❌ Recipe CSV not found in project root.");
    console.error("   Tried: recipes_data.csv and recipes.csv");
    process.exit(1);
  }
  
  const fileSize = fs.statSync(filePath).size / (1024 * 1024); // MB
  console.log(`📂 Using file: ${path.basename(filePath)} (${fileSize.toFixed(2)} MB)`);
  
  // For large files, use streaming to avoid memory issues
  if (fileSize > 100) {
    console.log("📦 Large file detected - using streaming mode with batching...");
    await loadWithStreaming(filePath);
  } else {
    console.log("📦 Small file - loading into memory...");
    await loadWithMemory(filePath);
  }
}

async function loadWithMemory(filePath: string) {
  const file = fs.readFileSync(filePath, "utf8");
  const parsed = Papa.parse(file, { header: true });
  const rows: any[] = parsed.data;

  console.log(`📦 Found ${rows.length} rows in CSV`);

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];

    try {
      const recipe = await prisma.recipe.create({
        data: {
          // Try multiple column name variations (CSV has: title, ingredients, directions, link, source, NER, site)
          title: r.title || r.recipe_name || r.Name || r.name || "Untitled",
          ingredients: r.ingredients || r.Ingredients || r.ingredient || "",
          instructions: r.instructions || r.directions || r.Directions || r.instruction || "",
          prepTime: Number(r.prep_time || r["Prep Time"] || r.prepTime || 0) || null,
          cookTime: Number(r.cook_time || r["Cook Time"] || r.cookTime || 0) || null,
          totalTime: Number(r.total_time || r["Total Time"] || r.totalTime || 0) || null,
          cuisine: r.cuisine || r.source || r.Cuisine || "",
          tags: r.tags || r.tag || r.NER || "",
          url: r.url || r.link || "",
          image: r.image || r.img_src || r.img || "",
          yield: r.yield || r.Yield || r.servings || "",
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
}

async function loadWithStreaming(filePath: string) {
  return new Promise<void>((resolve, reject) => {
    let rowCount = 0;
    let processedCount = 0;
    let errorCount = 0;
    
    // Memory-efficient batch processing
    const BATCH_SIZE = 10; // Process 10 recipes at a time
    const MAX_RECIPES = process.env.MAX_RECIPES_TO_LOAD 
      ? parseInt(process.env.MAX_RECIPES_TO_LOAD) 
      : 10000; // Default: load 10k recipes (adjust as needed)
    
    let batchQueue: any[] = [];
    let isProcessing = false;
    
    console.log("📖 Starting to stream CSV file...");
    console.log(`⚙️  Batch size: ${BATCH_SIZE} recipes`);
    console.log(`⚙️  Max recipes to load: ${MAX_RECIPES} (set MAX_RECIPES_TO_LOAD env var to change)`);
    
    const fileStream = createReadStream(filePath, { encoding: "utf8" });
    
    let parser: any;
    let shouldStop = false;
    
    // Process batch function
    async function processBatch() {
      if (isProcessing || batchQueue.length === 0) return;
      
      isProcessing = true;
      const batch = batchQueue.splice(0, BATCH_SIZE);
      
      for (const r of batch) {
        if (processedCount >= MAX_RECIPES) {
          console.log(`\n⚠️  Reached max recipes limit (${MAX_RECIPES}). Stopping...`);
          shouldStop = true;
          if (parser) parser.abort();
          return;
        }
        
        try {
          const recipe = await prisma.recipe.create({
            data: {
              // Try multiple column name variations
              title: r.title || r.recipe_name || r.Name || r.name || "Untitled",
              ingredients: r.ingredients || r.Ingredients || r.ingredient || "",
              instructions: r.instructions || r.directions || r.Directions || r.instruction || "",
              prepTime: Number(r.prep_time || r["Prep Time"] || r.prepTime || 0) || null,
              cookTime: Number(r.cook_time || r["Cook Time"] || r.cookTime || 0) || null,
              totalTime: Number(r.total_time || r["Total Time"] || r.totalTime || 0) || null,
              cuisine: r.cuisine || r.source || r.Cuisine || "",
              tags: r.tags || r.tag || r.NER || "",
              url: r.url || r.link || "",
              image: r.image || r.img_src || r.img || "",
              yield: r.yield || r.Yield || r.servings || "",
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

          processedCount++;
          
          if (processedCount % 50 === 0) {
            console.log(`✅ Processed ${processedCount}/${MAX_RECIPES} recipes...`);
          }
        } catch (err: any) {
          errorCount++;
          
          // If it's a model loading error, stop immediately
          if (err?.message?.includes("Model not found") || 
              err?.message?.includes("trained model not found") ||
              err?.message?.includes("models/recipe-embedder")) {
            console.error(`\n❌ Model Error:`);
            console.error("   The Google Colab trained embedding model is not found.");
            console.error("   Please ensure the model is placed in `models/recipe-embedder/` directory.");
            shouldStop = true;
            if (parser) parser.abort();
            reject(err);
            return;
          }
          
          // Log error but continue
          if (errorCount <= 10) {
            console.error(`❌ Error:`, err?.message || err);
          }
        }
      }
      
      isProcessing = false;
      
      // Process next batch if queue has items
      if (batchQueue.length > 0) {
        setImmediate(() => processBatch());
      }
    }
    
    parser = Papa.parse(fileStream, {
      header: true,
      skipEmptyLines: true,
      step: (result, p) => {
        if (shouldStop) return;
        
        rowCount++;
        const r = result.data as any;
        
        // Stop if we've read enough
        if (rowCount > MAX_RECIPES * 2) {
          shouldStop = true;
          p.abort();
          return;
        }
        
        // Add to batch queue
        batchQueue.push(r);
        
        // Log progress
        if (rowCount % 1000 === 0) {
          console.log(`📊 Read ${rowCount} rows, queue: ${batchQueue.length}, processed: ${processedCount}...`);
        }
        
        // Process batch if queue is full
        if (batchQueue.length >= BATCH_SIZE && !isProcessing) {
          processBatch();
        }
      },
      complete: async () => {
        console.log(`\n📊 Finished reading CSV. Total rows: ${rowCount}`);
        console.log(`⏳ Processing remaining ${batchQueue.length} recipes in queue...`);
        
        // Process remaining items
        while (batchQueue.length > 0 || isProcessing) {
          await processBatch();
          if (batchQueue.length > 0) {
            await new Promise(resolve => setTimeout(resolve, 100)); // Small delay
          }
        }
        
        console.log("\n🎉 Loading complete!");
        console.log(`✅ Total rows read: ${rowCount}`);
        console.log(`✅ Successfully processed: ${processedCount} recipes`);
        console.log(`⚠️  Errors encountered: ${errorCount}`);
        resolve();
      },
      error: (error) => {
        console.error("❌ CSV parsing error:", error);
        reject(error);
      }
    });
  });
}

main().finally(() => prisma.$disconnect());
