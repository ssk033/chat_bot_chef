-- CreateTable
CREATE TABLE "Recipe" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "ingredients" TEXT,
    "instructions" TEXT,
    "prepTime" INTEGER,
    "cookTime" INTEGER,
    "totalTime" INTEGER,
    "cuisine" TEXT,
    "tags" TEXT,
    "url" TEXT,
    "image" TEXT,
    "yield" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Recipe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "embeddings" (
    "id" SERIAL NOT NULL,
    "recipeId" INTEGER NOT NULL,
    "vector" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "embeddings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "embeddings_recipeId_key" ON "embeddings"("recipeId");

-- AddForeignKey
ALTER TABLE "embeddings" ADD CONSTRAINT "embeddings_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
