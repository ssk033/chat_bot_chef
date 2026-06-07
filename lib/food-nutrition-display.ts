import { validateNutritionEstimate } from "@/lib/food-nutrition-validation";

export type NutritionRange = { min: number; max: number };

export type NutritionConfidenceLevel = "estimated" | "low" | "medium" | "high";

export type NutritionSourceLabel =
  | "Dataset Average"
  | "Nutrition Lookup"
  | "Reference Serving"
  | "Typical Serving Estimate";

export type PortionSize = "small" | "medium" | "large";

export type FoodTrackerNutritionResponse = {
  dish: string;
  dishConfidence: number;
  nutritionConfidence: NutritionConfidenceLevel;
  servingBasis: string;
  calories: NutritionRange;
  protein_g: NutritionRange;
  carbs_g: NutritionRange;
  fats_g: NutritionRange;
  nutritionSource: NutritionSourceLabel;
  nutritionUncertaintyNote?: string;
  demoMode?: boolean;
  demoLowConfidence?: boolean;
  demoHint?: string;
  suppressedGuess?: string;
  clipLabelCount?: number;
  backend?: "keras" | "foodx" | "clip";
};

export const PORTION_MULTIPLIERS: Record<PortionSize, number> = {
  small: 0.75,
  medium: 1,
  large: 1.5,
};

export const NUTRITION_DISCLAIMER =
  "Nutrition values are estimated from a typical serving of the detected dish. They are not measured directly from your image and may vary depending on ingredients, preparation method, and portion size.";

const DEFAULT_SPREAD = 0.2;
const WIDENED_SPREAD = 0.35;

function num(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  if (n > 1 && n <= 100) return Math.min(1, Math.max(0, n / 100));
  return Math.min(1, Math.max(0, n));
}

export function toNutritionRange(value: number, spread = DEFAULT_SPREAD): NutritionRange {
  const v = Math.max(0, value);
  if (v === 0) return { min: 0, max: 0 };
  return {
    min: Math.max(0, Math.round(v * (1 - spread))),
    max: Math.round(v * (1 + spread)),
  };
}

export function scaleNutritionRange(range: NutritionRange, multiplier: number): NutritionRange {
  if (multiplier === 1) return range;
  return {
    min: Math.max(0, Math.round(range.min * multiplier)),
    max: Math.max(0, Math.round(range.max * multiplier)),
  };
}

export function scaleFoodTrackerRanges(
  result: FoodTrackerNutritionResponse,
  portion: PortionSize
): FoodTrackerNutritionResponse {
  const mult = PORTION_MULTIPLIERS[portion];
  if (mult === 1) return result;
  return {
    ...result,
    calories: scaleNutritionRange(result.calories, mult),
    protein_g: scaleNutritionRange(result.protein_g, mult),
    carbs_g: scaleNutritionRange(result.carbs_g, mult),
    fats_g: scaleNutritionRange(result.fats_g, mult),
  };
}

export function formatNutritionRange(range: NutritionRange, unit = ""): string {
  if (range.min === 0 && range.max === 0) return "—";
  const suffix = unit ? ` ${unit}` : "";
  return `${range.min}-${range.max}${suffix}`;
}

export function nutritionConfidenceLabel(level: NutritionConfidenceLevel): string {
  const labels: Record<NutritionConfidenceLevel, string> = {
    estimated: "Estimated",
    low: "Low",
    medium: "Medium",
    high: "High",
  };
  return labels[level];
}

function inferNutritionSource(
  parsed: Record<string, unknown>,
  fromGemini: boolean
): NutritionSourceLabel {
  if (fromGemini) return "Typical Serving Estimate";

  const backend = String(parsed.backend ?? "").toLowerCase();
  const predictionSource = String(parsed.predictionSource ?? "").toLowerCase();

  if (backend === "foodx" || predictionSource.includes("foodx")) {
    return "Dataset Average";
  }
  if (predictionSource.includes("clip_zero_shot_foodx")) {
    return "Dataset Average";
  }
  if (backend === "keras" || backend === "clip") {
    return "Nutrition Lookup";
  }
  if (predictionSource.includes("clip")) {
    return "Nutrition Lookup";
  }
  return "Typical Serving Estimate";
}

function extractPointMacros(parsed: Record<string, unknown>) {
  return {
    calories: Math.round(num(parsed.calories)),
    protein_g: Math.round(num(parsed.protein_g) * 10) / 10,
    carbs_g: Math.round(num(parsed.carbs_g) * 10) / 10,
    fats_g: Math.round(num(parsed.fats_g) * 10) / 10,
  };
}

function extractDishConfidence(parsed: Record<string, unknown>): number {
  const keys = ["confidence", "softmax_confidence", "score", "cnn_confidence", "prob", "probability"];
  for (const k of keys) {
    if (k in parsed && parsed[k] != null && parsed[k] !== "") {
      return clamp01(num(parsed[k]));
    }
  }
  return 0;
}

/**
 * Transform raw Food AI / Gemini output into an honest client-facing nutrition response.
 * Does not change dish classification — only confidence semantics and macro presentation.
 */
export function buildHonestNutritionResponse(
  parsed: Record<string, unknown>,
  options: { fromGemini?: boolean } = {}
): FoodTrackerNutritionResponse {
  const fromGemini = Boolean(options.fromGemini);
  const dish = String(parsed.dish ?? "Unknown").trim() || "Unknown";
  const dishConfidence = extractDishConfidence(parsed);
  const demoLowConfidence = Boolean(parsed.demoLowConfidence);
  const macros = extractPointMacros(parsed);
  const noNutrition = demoLowConfidence || macros.calories <= 0;

  const nutritionSource = inferNutritionSource(parsed, fromGemini);
  const servingBasis = "Typical Serving";

  if (noNutrition) {
    return {
      dish,
      dishConfidence,
      nutritionConfidence: "low",
      servingBasis,
      calories: { min: 0, max: 0 },
      protein_g: { min: 0, max: 0 },
      carbs_g: { min: 0, max: 0 },
      fats_g: { min: 0, max: 0 },
      nutritionSource,
      nutritionUncertaintyNote: demoLowConfidence
        ? "Nutrition estimate has high uncertainty."
        : undefined,
      demoMode: Boolean(parsed.demoMode),
      demoLowConfidence,
      demoHint: typeof parsed.demoHint === "string" ? parsed.demoHint : undefined,
      suppressedGuess:
        typeof parsed.suppressedGuess === "string" ? parsed.suppressedGuess : undefined,
      clipLabelCount:
        typeof parsed.clipLabelCount === "number" ? parsed.clipLabelCount : undefined,
      backend:
        parsed.backend === "foodx" || parsed.backend === "keras" || parsed.backend === "clip"
          ? parsed.backend
          : undefined,
    };
  }

  const validation = validateNutritionEstimate({ dish, ...macros });
  const spread = validation.suspicious ? WIDENED_SPREAD : DEFAULT_SPREAD;

  let nutritionConfidence: NutritionConfidenceLevel = "estimated";
  if (demoLowConfidence) {
    nutritionConfidence = "low";
  } else if (fromGemini) {
    nutritionConfidence = "estimated";
  } else if (nutritionSource === "Nutrition Lookup" || nutritionSource === "Dataset Average") {
    nutritionConfidence = "estimated";
  }

  if (validation.suspicious) {
    nutritionConfidence = "low";
  }

  const nutritionUncertaintyNote = validation.suspicious
    ? "Nutrition estimate has high uncertainty."
    : undefined;

  return {
    dish,
    dishConfidence,
    nutritionConfidence,
    servingBasis,
    calories: toNutritionRange(macros.calories, spread),
    protein_g: toNutritionRange(macros.protein_g, spread),
    carbs_g: toNutritionRange(macros.carbs_g, spread),
    fats_g: toNutritionRange(macros.fats_g, spread),
    nutritionSource,
    nutritionUncertaintyNote,
    demoMode: Boolean(parsed.demoMode),
    demoLowConfidence,
    demoHint: typeof parsed.demoHint === "string" ? parsed.demoHint : undefined,
    suppressedGuess:
      typeof parsed.suppressedGuess === "string" ? parsed.suppressedGuess : undefined,
    clipLabelCount:
      typeof parsed.clipLabelCount === "number" ? parsed.clipLabelCount : undefined,
    backend:
      parsed.backend === "foodx" || parsed.backend === "keras" || parsed.backend === "clip"
        ? parsed.backend
        : undefined,
  };
}

/** Upgrade legacy history snapshots that stored scalar macros. */
export function migrateLegacyResultSnapshot(
  raw: Record<string, unknown>
): FoodTrackerNutritionResponse | null {
  if (typeof raw.dish !== "string") return null;

  if (raw.calories && typeof raw.calories === "object" && "min" in (raw.calories as object)) {
    return raw as unknown as FoodTrackerNutritionResponse;
  }

  if (typeof raw.confidence !== "number") return null;

  return buildHonestNutritionResponse(
    {
      dish: raw.dish,
      confidence: raw.confidence,
      calories: raw.calories,
      protein_g: raw.protein_g,
      carbs_g: raw.carbs_g,
      fats_g: raw.fats_g,
      demoMode: raw.demoMode,
      demoLowConfidence: raw.demoLowConfidence,
      demoHint: raw.demoHint,
      backend: raw.backend,
      suppressedGuess: raw.suppressedGuess,
      clipLabelCount: raw.clipLabelCount,
    },
    { fromGemini: false }
  );
}
