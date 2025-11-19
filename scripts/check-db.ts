import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log("🔍 Checking database status...\n");

  try {
    // Check recipe count
    const recipeCount = await prisma.recipe.count();
    console.log(`📊 Total recipes: ${recipeCount}`);

    // Check embedding count
    const embeddingCount = await prisma.$queryRawUnsafe(
      `SELECT COUNT(*) as count FROM "embeddings"`
    ) as any[];
    const embeddingCountNum = embeddingCount[0]?.count || 0;
    console.log(`📊 Total embeddings: ${embeddingCountNum}`);

    // Check sample recipes
    const sampleRecipes = await prisma.recipe.findMany({
      take: 5,
      orderBy: { id: "desc" },
      select: {
        id: true,
        title: true,
        cuisine: true,
        createdAt: true,
      },
    });

    console.log("\n📝 Sample recipes (latest 5):");
    sampleRecipes.forEach((r, i) => {
      console.log(`   ${i + 1}. ID: ${r.id}, Title: ${r.title}, Cuisine: ${r.cuisine || "N/A"}`);
      console.log(`      Created: ${r.createdAt}`);
    });

    // Check if embeddings exist for recipes
    const recipesWithEmbeddings = await prisma.$queryRawUnsafe(
      `SELECT COUNT(DISTINCT r.id) as count 
       FROM "Recipe" r 
       INNER JOIN "embeddings" e ON r.id = e."recipeId"`
    ) as any[];
    const recipesWithEmbeddingsCount = recipesWithEmbeddings[0]?.count || 0;
    console.log(`\n📊 Recipes with embeddings: ${recipesWithEmbeddingsCount}`);

    // Check schema
    console.log("\n📋 Schema check:");
    console.log("   ✅ Recipe table exists");
    console.log("   ✅ Embeddings table exists");
    console.log("   ✅ Vector type should be supported (pgvector)");

    if (recipeCount > 0 && embeddingCountNum === 0) {
      console.log("\n⚠️  WARNING: Recipes exist but no embeddings!");
      console.log("   Run: npm run load");
    }

    if (recipeCount === 0) {
      console.log("\n⚠️  WARNING: No recipes in database!");
      console.log("   Run: npm run load");
    }

  } catch (error: any) {
    console.error("❌ Error checking database:", error.message);
    if (error.message?.includes("relation") || error.message?.includes("does not exist")) {
      console.error("\n💡 Database tables not found. Run migrations:");
      console.error("   npx prisma migrate dev");
    }
  } finally {
    await prisma.$disconnect();
  }
}

main();

