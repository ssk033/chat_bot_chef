import { NextResponse } from "next/server";
import { buildHonestNutritionResponse } from "@/lib/food-nutrition-display";
import { estimateFoodWithGeminiVision } from "@/lib/gemini-food-vision";

// Must match `FOOD_AI_PORT` in scripts/food-ai-dev.mjs (default 8788).
const UPSTREAM = process.env.FOOD_AI_SERVICE_URL ?? "http://127.0.0.1:8788";

/** When CNN softmax/confidence is strictly below this (0–1), run Gemini Vision on the same image. */
const CNN_CONFIDENCE_THRESHOLD = 0.65;

export const runtime = "nodejs";

function normalizeConfidence(c: unknown): number {
  const n = Number(c);
  if (!Number.isFinite(n)) return 0;
  if (n > 1 && n <= 100) return Math.min(1, Math.max(0, n / 100));
  if (n > 100) return 1;
  return Math.min(1, Math.max(0, n));
}

/** Food AI servers may name the softmax field differently. */
function extractCnnConfidence(parsed: Record<string, unknown>): number {
  const keys = ["confidence", "softmax_confidence", "score", "cnn_confidence", "prob", "probability"] as const;
  for (const k of keys) {
    if (k in parsed && parsed[k] != null && parsed[k] !== "") {
      const v = normalizeConfidence(parsed[k]);
      return v;
    }
  }
  return 0;
}

function respondHonest(parsed: Record<string, unknown>, fromGemini = false) {
  return NextResponse.json(buildHonestNutritionResponse(parsed, { fromGemini }));
}

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("image");
  if (!(file instanceof Blob) || file.size === 0) {
    return NextResponse.json({ error: "Missing image field (multipart form)." }, { status: 400 });
  }

  const mimeType = file.type || "image/jpeg";
  const imageBuffer = Buffer.from(await file.arrayBuffer());

  const upstream = new FormData();
  upstream.append("image", new Blob([imageBuffer], { type: mimeType }), "upload.jpg");

  let text: string;
  let res: Response;
  try {
    res = await fetch(`${UPSTREAM}/predict`, {
      method: "POST",
      body: upstream,
    });
    text = await res.text();
  } catch {
    const geminiOnly = await estimateFoodWithGeminiVision({
      imageBuffer,
      mimeType,
    });
    if (geminiOnly) {
      return respondHonest(
        {
          dish: geminiOnly.dish,
          confidence: geminiOnly.confidence,
          calories: geminiOnly.calories,
          protein_g: geminiOnly.protein_g,
          carbs_g: geminiOnly.carbs_g,
          fats_g: geminiOnly.fats_g,
        },
        true
      );
    }
    return NextResponse.json(
      {
        error: `Cannot reach Food AI service at ${UPSTREAM}. Set GEMINI_API_KEY for Gemini vision fallback, or run npm run food-ai:dev (see ml-models/food-ai-server/requirements.txt).`,
      },
      { status: 503 },
    );
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(text) as Record<string, unknown>;
  } catch {
    const geminiOnly = await estimateFoodWithGeminiVision({
      imageBuffer,
      mimeType,
    });
    if (geminiOnly) {
      return respondHonest(
        {
          dish: geminiOnly.dish,
          confidence: geminiOnly.confidence,
          calories: geminiOnly.calories,
          protein_g: geminiOnly.protein_g,
          carbs_g: geminiOnly.carbs_g,
          fats_g: geminiOnly.fats_g,
        },
        true
      );
    }
    return new NextResponse(text, {
      status: res.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!res.ok) {
    const geminiOnly = await estimateFoodWithGeminiVision({
      imageBuffer,
      mimeType,
    });
    if (geminiOnly) {
      return respondHonest(
        {
          dish: geminiOnly.dish,
          confidence: geminiOnly.confidence,
          calories: geminiOnly.calories,
          protein_g: geminiOnly.protein_g,
          carbs_g: geminiOnly.carbs_g,
          fats_g: geminiOnly.fats_g,
        },
        true
      );
    }
    return NextResponse.json(parsed, { status: res.status });
  }

  const conf = extractCnnConfidence(parsed);
  const useGemini = conf < CNN_CONFIDENCE_THRESHOLD;

  if (!useGemini) {
    return respondHonest({ ...parsed, confidence: conf }, false);
  }

  const gemini = await estimateFoodWithGeminiVision({
    imageBuffer,
    mimeType,
    cnnDish: typeof parsed.dish === "string" ? parsed.dish : undefined,
    cnnConfidence: conf,
  });

  if (!gemini) {
    return respondHonest({ ...parsed, confidence: conf }, false);
  }

  return respondHonest(
    {
      ...parsed,
      dish: gemini.dish,
      confidence: gemini.confidence,
      calories: gemini.calories,
      protein_g: gemini.protein_g,
      carbs_g: gemini.carbs_g,
      fats_g: gemini.fats_g,
    },
    true
  );
}
