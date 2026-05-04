-- CreateTable
CREATE TABLE IF NOT EXISTS "food_ai_prediction_reviews" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewerEmail" TEXT NOT NULL,
    "predictedDish" TEXT NOT NULL,
    "predictedConfidence" DOUBLE PRECISION NOT NULL,
    "backend" TEXT,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "correctedDish" TEXT,
    "demoLowConfidence" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "food_ai_prediction_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "food_ai_prediction_reviews_reviewerEmail_createdAt_idx" ON "food_ai_prediction_reviews"("reviewerEmail", "createdAt");
