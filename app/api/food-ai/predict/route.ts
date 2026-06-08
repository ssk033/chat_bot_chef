import { NextResponse } from "next/server";
import { buildHonestNutritionResponse } from "@/lib/food-nutrition-display";
import { estimateFoodWithGeminiVision } from "@/lib/gemini-food-vision";

// Must match `FOOD_AI_PORT` in scripts/food-ai-dev.mjs (default 8788).
const UPSTREAM = process.env.FOOD_AI_SERVICE_URL ?? "http://127.0.0.1:8788";

/** When CNN softmax/confidence is strictly below this (0–1), prefer Gemini Vision. */
const CNN_CONFIDENCE_THRESHOLD = 0.65;

const CNN_TIMEOUT_MS = Number(process.env.FOOD_AI_CNN_TIMEOUT_MS) || 10_000;

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

function geminiToPayload(gemini: {
  dish: string;
  confidence: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
}) {
  return {
    dish: gemini.dish,
    confidence: gemini.confidence,
    calories: gemini.calories,
    protein_g: gemini.protein_g,
    carbs_g: gemini.carbs_g,
    fats_g: gemini.fats_g,
  };
}

type CnnOutcome =
  | { kind: "ok"; parsed: Record<string, unknown>; conf: number }
  | { kind: "error"; status: number; parsed: Record<string, unknown>; conf: number }
  | { kind: "unreachable" }
  | { kind: "invalid_json"; status: number; raw: string };

async function callCnn(imageBuffer: Buffer, mimeType: string): Promise<CnnOutcome> {
  const upstream = new FormData();
  upstream.append("image", new Blob([imageBuffer], { type: mimeType }), "upload.jpg");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CNN_TIMEOUT_MS);

  try {
    const res = await fetch(`${UPSTREAM}/predict`, {
      method: "POST",
      body: upstream,
      signal: controller.signal,
    });
    const text = await res.text();

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(text) as Record<string, unknown>;
    } catch {
      return { kind: "invalid_json", status: res.status, raw: text };
    }

    const conf = extractCnnConfidence(parsed);
    if (!res.ok) {
      return { kind: "error", status: res.status, parsed, conf };
    }
    return { kind: "ok", parsed, conf };
  } catch {
    return { kind: "unreachable" };
  } finally {
    clearTimeout(timer);
  }
}

function parallelGeminiEnabled(): boolean {
  if (!process.env.GEMINI_API_KEY?.trim()) return false;
  return process.env.FOOD_AI_PARALLEL_GEMINI !== "false";
}

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("image");
  if (!(file instanceof Blob) || file.size === 0) {
    return NextResponse.json({ error: "Missing image field (multipart form)." }, { status: 400 });
  }

  const mimeType = file.type || "image/jpeg";
  const imageBuffer = Buffer.from(await file.arrayBuffer());

  const geminiPromise = parallelGeminiEnabled()
    ? estimateFoodWithGeminiVision({ imageBuffer, mimeType })
    : null;

  const cnn = await callCnn(imageBuffer, mimeType);

  if (cnn.kind === "ok" && cnn.conf >= CNN_CONFIDENCE_THRESHOLD) {
    return respondHonest({ ...cnn.parsed, confidence: cnn.conf }, false);
  }

  const awaitGemini = async (cnnDish?: string, cnnConfidence?: number) => {
    if (geminiPromise) {
      return geminiPromise;
    }
    return estimateFoodWithGeminiVision({
      imageBuffer,
      mimeType,
      cnnDish,
      cnnConfidence,
    });
  };

  if (cnn.kind === "ok") {
    const gemini = await awaitGemini(
      typeof cnn.parsed.dish === "string" ? cnn.parsed.dish : undefined,
      cnn.conf,
    );
    if (gemini) {
      return respondHonest({ ...cnn.parsed, ...geminiToPayload(gemini) }, true);
    }
    return respondHonest({ ...cnn.parsed, confidence: cnn.conf }, false);
  }

  if (cnn.kind === "error") {
    const gemini = await awaitGemini();
    if (gemini) {
      return respondHonest(geminiToPayload(gemini), true);
    }
    return NextResponse.json(cnn.parsed, { status: cnn.status });
  }

  const gemini = await awaitGemini();
  if (gemini) {
    return respondHonest(geminiToPayload(gemini), true);
  }

  if (cnn.kind === "invalid_json") {
    return new NextResponse(cnn.raw, {
      status: cnn.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  return NextResponse.json(
    {
      error: `Cannot reach Food AI service at ${UPSTREAM}. Set GEMINI_API_KEY for Gemini vision fallback, or run npm run food-ai:dev (see ml-models/food-ai-server/requirements.txt).`,
    },
    { status: 503 },
  );
}
