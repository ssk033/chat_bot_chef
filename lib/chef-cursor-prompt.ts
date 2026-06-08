import { RECIPE_CHEF_JSON_INSTRUCTION } from "@/lib/recipe-chef-prompt";
import type { QueryConstraints } from "@/lib/query-constraints";

export type ChefChatTurn = {
  role: "user" | "assistant";
  content: string;
};

export type ChefCursorContext = {
  userQuery: string;
  chatHistory: ChefChatTurn[];
  dietaryPreferences?: string;
  sessionTitle?: string;
  mealPlanContext?: Record<string, string>;
  constraints: QueryConstraints;
  retrievedRecipes: Array<{
    title: string;
    ingredients?: string | null;
    instructions?: string | null;
    prepTime?: number | null;
    cookTime?: number | null;
    cuisine?: string | null;
    yield?: string | null;
    distance?: number | null;
    finalScore?: number | null;
  }>;
  fallbackReasons: string[];
  databaseRecipeCount: number;
};

const CHEF_PERSONA = `You are **Chef**, the culinary assistant for Meal-IT — a professional chef, nutrition expert, and practical meal planner.

Voice: warm, confident, conversational — like a skilled home chef helping a friend. Never open with "I don't know" or refuse outright. Always try to help.

Capabilities:
- Recipe ideas from pantry ingredients (include missing ingredients, steps, rough nutrition when useful).
- Nutrition facts (calories, protein, carbs, fat per typical serving or per 100g when asked).
- Substitutions, technique tips, food science basics, meal-planning outlines.
- Respect dietary restrictions and allergies when provided.

Safety: do not prescribe medical treatment. For clinical diets, suggest consulting a healthcare professional while still giving general cooking guidance.

When the recipe database returned weak or no matches, you may invent sensible recipes — label them as suggestions, not database entries.`;

function trimHistory(history: ChefChatTurn[], maxTurns = 8): ChefChatTurn[] {
  return history
    .filter((t) => t.content.trim().length > 0)
    .slice(-maxTurns)
    .map((t) => ({
      role: t.role,
      content: t.content.slice(0, 1200),
    }));
}

function formatRetrievedRecipes(recipes: ChefCursorContext["retrievedRecipes"]): string {
  if (recipes.length === 0) return "None — database search did not return confident matches.";
  return recipes
    .slice(0, 5)
    .map((r, i) => {
      const ing = (r.ingredients ?? "not listed").slice(0, 500);
      const steps = (r.instructions ?? "not listed").slice(0, 400);
      return [
        `${i + 1}. ${r.title}`,
        `   Ingredients: ${ing}`,
        `   Instructions (excerpt): ${steps}`,
        r.prepTime != null ? `   Prep: ${r.prepTime} min` : null,
        r.cookTime != null ? `   Cook: ${r.cookTime} min` : null,
        r.cuisine ? `   Cuisine: ${r.cuisine}` : null,
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n");
}

export function buildCursorChefPrompt(ctx: ChefCursorContext): string {
  const history = trimHistory(ctx.chatHistory);
  const historyBlock =
    history.length === 0
      ? "(no prior turns)"
      : history.map((t) => `${t.role === "user" ? "User" : "Chef"}: ${t.content}`).join("\n\n");

  const dietary =
    ctx.dietaryPreferences?.trim() ||
    (ctx.constraints.dietary.length > 0 ? ctx.constraints.dietary.join(", ") : "") ||
    "not specified";

  const allergies =
    ctx.constraints.excludedIngredients.length > 0
      ? ctx.constraints.excludedIngredients.join(", ")
      : "none stated";

  const required =
    ctx.constraints.requiredIngredients.length > 0
      ? ctx.constraints.requiredIngredients.join(", ")
      : "none parsed";

  const mealPlanLines = ctx.mealPlanContext
    ? Object.entries(ctx.mealPlanContext)
        .filter(([, v]) => v?.trim())
        .map(([k, v]) => `- ${k}: ${v}`)
        .join("\n")
    : "";

  return `${CHEF_PERSONA}

${RECIPE_CHEF_JSON_INSTRUCTION}

Additional rules for this response:
- If you output recipes, use the JSON shape above (intro + recipes array). Each recipe needs title, ingredients[], instructions[], optional cuisine/servings/caloriesLine.
- For pure nutrition Q&A with no recipe, return JSON: { "intro": "your clear answer with numbers and a brief explanation", "recipes": [] }
- For ingredient-only prompts ("I have onion, tomato, paneer"), suggest 1–3 recipes in the recipes array with missing ingredients noted in intro or ingredients list.
- Prefer database recipes when they truly match; otherwise improve or replace with better suggestions.
- Do not mention Cursor, APIs, or "the database" to the user.

--- Session ---
Title: ${ctx.sessionTitle ?? "Chef chat"}
Database size: ~${ctx.databaseRecipeCount} recipes indexed
Fallback triggers: ${ctx.fallbackReasons.join(", ") || "quality check"}

--- User preferences ---
Dietary: ${dietary}
Allergies / avoid: ${allergies}
Required / pantry ingredients parsed: ${required}
${mealPlanLines ? `\nMeal plan intake:\n${mealPlanLines}` : ""}

--- Recent chat ---
${historyBlock}

--- Retrieved from database (may be incomplete or irrelevant) ---
${formatRetrievedRecipes(ctx.retrievedRecipes)}

--- Current user message ---
${ctx.userQuery}

Respond now with valid JSON only (no markdown fences).`;
}
