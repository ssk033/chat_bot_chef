import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clampStr(s: unknown, max: number): string {
  if (typeof s !== "string") return "";
  return s.trim().slice(0, max);
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Record<string, unknown>;

    const reviewerEmail = clampStr(body.reviewerEmail, 320).toLowerCase();
    const predictedDish = clampStr(body.predictedDish, 512);
    const correctedDish = clampStr(body.correctedDish, 512) || null;
    const comment = clampStr(body.comment, 4000) || null;
    const backend = clampStr(body.backend, 32) || null;

    const confRaw = body.predictedConfidence;
    const predictedConfidence =
      typeof confRaw === "number" && Number.isFinite(confRaw) ? confRaw : Number(confRaw);
    if (!Number.isFinite(predictedConfidence) || predictedConfidence < 0 || predictedConfidence > 1) {
      return NextResponse.json({ error: "predictedConfidence must be a number between 0 and 1." }, { status: 400 });
    }

    const ratingRaw = body.rating;
    const rating = typeof ratingRaw === "number" ? ratingRaw : parseInt(String(ratingRaw), 10);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "rating must be an integer from 1 (poor) to 5 (excellent)." }, { status: 400 });
    }

    const demoLowConfidence = Boolean(body.demoLowConfidence);

    if (!EMAIL_RE.test(reviewerEmail)) {
      return NextResponse.json({ error: "A valid reviewerEmail is required." }, { status: 400 });
    }
    if (!predictedDish) {
      return NextResponse.json({ error: "predictedDish is required." }, { status: 400 });
    }

    const row = await prisma.foodAiPredictionReview.create({
      data: {
        reviewerEmail,
        predictedDish,
        predictedConfidence,
        backend,
        rating,
        comment,
        correctedDish,
        demoLowConfidence,
      },
      select: { id: true, createdAt: true },
    });

    return NextResponse.json({ ok: true, id: row.id });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Save failed";
    console.error("POST /api/food-tracker/reviews", e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
