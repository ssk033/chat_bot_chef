import { GoogleGenerativeAI } from "@google/generative-ai";

export type GeminiFoodEstimate = {
  dish: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
  confidence: number;
};

function stripKey(raw: string | undefined): string {
  if (!raw) return "";
  return raw.trim().replace(/^["']|["']$/g, "");
}

function extractJsonObject(text: string): Record<string, unknown> | null {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced ? fenced[1]!.trim() : trimmed;
  try {
    const obj = JSON.parse(raw);
    return typeof obj === "object" && obj !== null && !Array.isArray(obj)
      ? (obj as Record<string, unknown>)
      : null;
  } catch {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        const obj = JSON.parse(raw.slice(start, end + 1));
        return typeof obj === "object" && obj !== null && !Array.isArray(obj)
          ? (obj as Record<string, unknown>)
          : null;
      } catch {
        return null;
      }
    }
    return null;
  }
}

function num(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : NaN;
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0.65;
  if (n > 1 && n <= 100) return Math.min(1, Math.max(0, n / 100));
  return Math.min(1, Math.max(0, n));
}

/**
 * Ask Gemini to identify the dish and estimate macros from the meal photo.
 */
export async function estimateFoodWithGeminiVision(args: {
  imageBuffer: Buffer;
  mimeType: string;
  cnnDish?: string;
  cnnConfidence?: number;
}): Promise<GeminiFoodEstimate | null> {
  const apiKey = stripKey(process.env.GEMINI_API_KEY);
  if (!apiKey) return null;

  const mime = args.mimeType?.startsWith("image/") ? args.mimeType : "image/jpeg";
  const base64 = args.imageBuffer.toString("base64");

  const hint =
    args.cnnDish != null && Number.isFinite(args.cnnConfidence)
      ? `A local CNN guessed "${args.cnnDish}" at ${(args.cnnConfidence * 100).toFixed(0)}% confidence (low trust). Use the image as the main evidence and correct the dish name if needed.\n\n`
      : "";

  const prompt = `${hint}You analyze a single meal photo. Respond with ONLY valid JSON (no markdown), exactly these keys:
"dish" (short recognizable meal name, English),
"calories" (integer, kcal for one typical restaurant/home portion of what is visible),
"protein_g", "carbs_g", "fats_g" (numbers, grams for that same portion),
"confidence" (number from 0 to 1 for how sure you are of dish identity).

If multiple dishes appear, pick the dominant/main portion. Round calories/macros to sensible integers.`;

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const modelName = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent([
      { inlineData: { mimeType: mime, data: base64 } },
      { text: prompt },
    ]);
    const text = result.response.text();
    const obj = extractJsonObject(text);
    if (!obj) return null;

    const dish = String(obj.dish ?? "").trim();
    const calories = Math.round(num(obj.calories));
    const protein_g = Math.round(num(obj.protein_g) * 10) / 10;
    const carbs_g = Math.round(num(obj.carbs_g) * 10) / 10;
    const fats_g = Math.round(num(obj.fats_g) * 10) / 10;
    const confidence = clamp01(num(obj.confidence));

    if (!dish || !Number.isFinite(calories) || calories < 0) return null;
    if (![protein_g, carbs_g, fats_g].every((x) => Number.isFinite(x) && x >= 0)) return null;

    return {
      dish,
      calories,
      protein_g,
      carbs_g,
      fats_g,
      confidence: Number.isFinite(confidence) ? confidence : 0.7,
    };
  } catch {
    return null;
  }
}
