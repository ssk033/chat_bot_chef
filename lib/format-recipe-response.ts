import type { RecipeResponseJson } from "@/lib/recipe-response-schema";

type DbRecipe = {
  title?: string | null;
  ingredients?: string | null;
  instructions?: string | null;
  cuisine?: string | null;
  yield?: string | null;
  prepTime?: number | null;
  cookTime?: number | null;
};

function ingredientsAsList(ingredients: string | null | undefined): string[] {
  if (!ingredients) return [];
  try {
    const parsed = JSON.parse(ingredients) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item).trim()).filter(Boolean);
    }
  } catch {
    /* plain text */
  }
  return ingredients
    .replace(/^\[|\]$/g, "")
    .replace(/","/g, ", ")
    .replace(/"/g, "")
    .split(/,\s*(?=[A-Za-z(]|\d)/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function instructionsAsList(instructions: string | null | undefined): string[] {
  if (!instructions) return [];
  try {
    const parsed = JSON.parse(instructions) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.map((step) => String(step).trim()).filter(Boolean);
    }
  } catch {
    /* plain text */
  }
  const numbered = instructions.split(/\n(?=\d{1,2}[\.)]\s+)/).map((s) => s.trim()).filter(Boolean);
  if (numbered.length >= 2) {
    return numbered.map((line) => line.replace(/^\d{1,2}[\.)]\s+/, "").trim());
  }
  return [instructions.trim()].filter(Boolean);
}

export function dbRecipeToJsonItem(r: DbRecipe): RecipeResponseJson["recipes"][number] {
  const ingredients = ingredientsAsList(r.ingredients);
  const instructions = instructionsAsList(r.instructions);
  const totalTime = (r.prepTime || 0) + (r.cookTime || 0);

  return {
    title: r.title?.trim() || "Recipe",
    ingredients: ingredients.length > 0 ? ingredients : ["See recipe details"],
    instructions: instructions.length > 0 ? instructions : ["Follow the recipe method"],
    cuisine: r.cuisine?.trim() || undefined,
    servings: r.yield?.trim() || undefined,
    caloriesLine: totalTime > 0 ? `Total time: ${totalTime} minutes` : undefined,
  };
}

/** Structured JSON string for chat UI (one object per recipe, never merged). */
export function formatRecipesJsonReply(intro: string, recipes: DbRecipe[]): string {
  const payload: RecipeResponseJson = {
    intro: intro.trim(),
    recipes: recipes.map(dbRecipeToJsonItem),
  };
  return JSON.stringify(payload);
}
