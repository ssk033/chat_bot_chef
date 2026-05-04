import type { MealPlanRecord } from "@/lib/meal-plans-storage";

/** Build query string for `/meal-plan/chat` from intake fields or a saved draft. */
export function buildMealPlanChatQuery(params: {
  planName: string;
  householdSize: number;
  ingredients: string;
  dietaryNotes: string;
  allergies?: string;
  proteinTarget?: string;
}): string {
  const q = new URLSearchParams();
  q.set("planName", params.planName.trim() || "Meal plan");
  q.set("householdSize", String(params.householdSize));
  q.set("ingredients", params.ingredients.trim());
  q.set("dietaryRestrictions", params.dietaryNotes.trim() || "none");
  q.set("allergies", (params.allergies ?? "none").trim() || "none");
  q.set("proteinTarget", params.proteinTarget?.trim() || "not specified");
  return q.toString();
}

export function mealPlanRecordToChatQuery(
  record: MealPlanRecord,
  extras?: { proteinTarget?: string; allergies?: string }
): string {
  const allergies = extras?.allergies ?? record.allergies?.trim();
  const protein = extras?.proteinTarget ?? record.proteinTarget?.trim();
  return buildMealPlanChatQuery({
    planName: record.planName,
    householdSize: record.householdSize,
    ingredients: record.ingredients,
    dietaryNotes: record.dietaryNotes,
    allergies: allergies && allergies.length > 0 ? allergies : "none",
    proteinTarget: protein && protein.length > 0 ? protein : "not specified",
  });
}
