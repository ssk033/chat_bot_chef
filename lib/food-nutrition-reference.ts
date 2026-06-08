/**
 * Typical single-plate / single-serving macros for well-known Indian dishes.
 * Used when CNN, FoodX (per-100g), or Gemini returns unrealistically low protein.
 */

export type DishNutritionRef = {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
};

type DishRule = {
  patterns: RegExp[];
  nutrition: DishNutritionRef;
};

/** Chicken/mutton biryani — one restaurant/home plate (~300–350 g), not per 100 g. */
const RULES: DishRule[] = [
  {
    patterns: [/\bbiryani\b/i, /\bhyderabadi\b/i, /\bpulao\b/i, /\bpilaf\b/i],
    nutrition: { calories: 520, protein_g: 30, carbs_g: 58, fats_g: 18 },
  },
  {
    patterns: [/\bbutter\s*chicken\b/i, /\bmurgh\s*makhani\b/i],
    nutrition: { calories: 480, protein_g: 32, carbs_g: 14, fats_g: 32 },
  },
  {
    patterns: [/\bpaneer\s*tikka\b/i],
    nutrition: { calories: 320, protein_g: 22, carbs_g: 12, fats_g: 20 },
  },
  {
    patterns: [/\bdal\s*makhani\b/i],
    nutrition: { calories: 340, protein_g: 14, carbs_g: 32, fats_g: 16 },
  },
  {
    patterns: [/\bchole\s*bhature\b/i, /\bchana\s*bhatura\b/i],
    nutrition: { calories: 520, protein_g: 16, carbs_g: 62, fats_g: 22 },
  },
];

export function lookupDishNutritionReference(dish: string): DishNutritionRef | null {
  const name = dish.trim();
  if (!name) return null;
  for (const rule of RULES) {
    if (rule.patterns.some((p) => p.test(name))) {
      return rule.nutrition;
    }
  }
  return null;
}

function proteinCalorieShare(protein_g: number, calories: number): number {
  if (calories <= 0) return 0;
  return (protein_g * 4) / calories;
}

/**
 * Replace underestimated macros with reference serving data when the dish is known
 * and model output looks like per-100g values or generic low-protein estimates.
 */
export function reconcileNutritionWithReference(
  dish: string,
  macros: DishNutritionRef
): { macros: DishNutritionRef; corrected: boolean } {
  const ref = lookupDishNutritionReference(dish);
  if (!ref) return { macros, corrected: false };

  const proteinLow = macros.protein_g < ref.protein_g * 0.6;
  const caloriesLow = macros.calories > 0 && macros.calories < ref.calories * 0.55;
  const proteinShareLow =
    macros.calories > 80 && proteinCalorieShare(macros.protein_g, macros.calories) < 0.12;

  if (proteinLow || caloriesLow || proteinShareLow) {
    return { macros: ref, corrected: true };
  }

  return { macros, corrected: false };
}
