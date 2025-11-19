import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log("🗑️  Clearing old database data...\n");

  try {
    // Check current counts
    const recipeCount = await prisma.recipe.count();
    const embeddingCount = await prisma.$queryRawUnsafe(
      `SELECT COUNT(*) as count FROM "embeddings"`
    ) as any[];
    const embeddingCountNum = embeddingCount[0]?.count || 0;

    console.log(`📊 Current data:`);
    console.log(`   Recipes: ${recipeCount}`);
    console.log(`   Embeddings: ${embeddingCountNum}`);

    if (recipeCount === 0 && embeddingCountNum === 0) {
      console.log("\n✅ Database is already empty!");
      return;
    }

    // Delete embeddings first (foreign key constraint)
    console.log("\n🗑️  Deleting embeddings...");
    await prisma.$executeRawUnsafe(`DELETE FROM "embeddings"`);
    console.log("   ✅ Embeddings deleted");

    // Delete recipes
    console.log("🗑️  Deleting recipes...");
    await prisma.recipe.deleteMany();
    console.log("   ✅ Recipes deleted");

    // Verify
    const finalRecipeCount = await prisma.recipe.count();
    const finalEmbeddingCount = await prisma.$queryRawUnsafe(
      `SELECT COUNT(*) as count FROM "embeddings"`
    ) as any[];
    const finalEmbeddingCountNum = finalEmbeddingCount[0]?.count || 0;

    console.log("\n✅ Database cleared!");
    console.log(`   Final recipes: ${finalRecipeCount}`);
    console.log(`   Final embeddings: ${finalEmbeddingCountNum}`);

    console.log("\n💡 Next step: Load new recipes");
    console.log("   npm run load");

  } catch (error: any) {
    console.error("❌ Error clearing database:", error.message);
    if (error.message?.includes("relation") || error.message?.includes("does not exist")) {
      console.error("\n💡 Database tables not found. Run migrations:");
      console.error("   npx prisma migrate dev");
    }
  } finally {
    await prisma.$disconnect();
  }
}

main();

