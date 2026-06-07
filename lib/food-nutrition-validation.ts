/** Sanity checks for estimated nutrition — not measured from images. */

export type NutritionValidationResult = {
  suspicious: boolean;
  reasons: string[];
};

export type NutritionPointValues = {
  dish: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
};

const DISH_RULES: Array<{
  match: RegExp;
  checks: Array<{
    test: (v: NutritionPointValues) => boolean;
    reason: string;
  }>;
}> = [
  {
    match: /\bpoha\b/i,
    checks: [
      {
        test: (v) => v.protein_g > 12,
        reason: "Protein unusually high for poha (typical servings are lower).",
      },
      {
        test: (v) => v.calories > 550,
        reason: "Calories unusually high for a typical poha serving.",
      },
    ],
  },
];

const GLOBAL_RULES: Array<{
  test: (v: NutritionPointValues) => boolean;
  reason: string;
}> = [
  {
    test: (v) => v.calories > 700,
    reason: "Calories exceed a typical single-dish serving.",
  },
  {
    test: (v) => v.carbs_g > 120,
    reason: "Carbohydrates exceed a typical single-dish serving.",
  },
  {
    test: (v) => v.protein_g > 80,
    reason: "Protein exceeds a typical single-dish serving.",
  },
  {
    test: (v) => v.fats_g > 60,
    reason: "Fat exceeds a typical single-dish serving.",
  },
];

export function validateNutritionEstimate(values: NutritionPointValues): NutritionValidationResult {
  const reasons: string[] = [];

  for (const rule of GLOBAL_RULES) {
    if (rule.test(values)) reasons.push(rule.reason);
  }

  for (const dishRule of DISH_RULES) {
    if (!dishRule.match.test(values.dish)) continue;
    for (const check of dishRule.checks) {
      if (check.test(values)) reasons.push(check.reason);
    }
  }

  return { suspicious: reasons.length > 0, reasons };
}
