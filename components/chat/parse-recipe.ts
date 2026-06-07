/**
 * Recipe response parsing: JSON (Zod) first, then markdown heuristics, else markdown fallback.
 */

import {
  parseRecipeJson,
  servingsToString,
  type RecipeItemJson,
} from "@/lib/recipe-response-schema";

export type ParsedRecipe = {
  title: string;
  ingredients: string[];
  steps: string[];
  cuisine: string | null;
  servings: string | null;
  caloriesLine: string | null;
  intro: string;
};

export type ParsedRecipeMessage = {
  intro: string;
  recipes: ParsedRecipe[];
};

export type RecipeParseResult =
  | { kind: "recipes"; intro: string; recipes: ParsedRecipe[] }
  | { kind: "markdown"; content: string };

const SECTION_LINE =
  /^(#{1,6}\s*)?(\*\*)?\s*(Ingredients?|What you(?:'|’)ll need|What you need|You(?:'|’)ll need|Steps?|Instructions?|Directions?|Method|Cook(?:ing)? steps?|How to (?:make|cook)|Nutrition|Calories?)\s*(\*\*)?\s*[:.]?\s*$/i;

const META_CUISINE = /^(?:\*\*)?\s*(?:cuisine|style|type)\s*(?:\*\*)?\s*[:]\s*(.+)$/i;
const META_SERVINGS = /^(?:\*\*)?\s*(?:servings?|serves?|yield)\s*(?:\*\*)?\s*[:]\s*(.+)$/i;

const STEP_VERB_START =
  /^(?:\d+[\.)]\s+)?(?:heat|add|mix|cook|bake|stir|pour|combine|preheat|serve|remove|let|place|drain|season|whisk|fold|reduce|simmer|boil|fry|grill|roast|chop|slice|dice|peel|wash|rinse|cover|transfer|spread|brush|sprinkle|garnish|cool|chill|freeze|thaw|marinate|rest|set aside|beat|blend|sift|roll|cut|trim|discard|reserve|store|refrigerate|top with|bring to|line a|in a|using a|prepare|make the|place the|return|continue|repeat|divide|layer|arrange|brush the|stir in|stir to|mix in|mix together|combine the)\b/i;

function cleanMarkdownHeading(s: string): string {
  return s
    .replace(/^#{1,6}\s+/, "")
    .replace(/^\*\*(.+)\*\*$/, "$1")
    .replace(/\*\*/g, "")
    .trim();
}

function cleanListItem(s: string): string {
  return s
    .replace(/^[-*•·]\s+/, "")
    .replace(/^\d{1,3}[\.)]\s+/, "")
    .replace(/^\*\*(.+)\*\*$/, "$1")
    .replace(/\*\*/g, "")
    .trim();
}

function isNumberedRecipeTitleLine(line: string): boolean {
  const trimmed = line.trim();
  const m = trimmed.match(/^(\d{1,2})[\.)]\s+(.+)$/);
  if (!m) return false;
  const text = m[2].trim();
  if (text.length < 3 || text.length > 140) return false;
  if (SECTION_LINE.test(text)) return false;
  if (/^(step\s*\d+|ingredients?|instructions?|directions?|method)\b/i.test(text)) return false;
  if (STEP_VERB_START.test(text)) return false;
  if (/^total time\b/i.test(text)) return false;
  return true;
}

function countLikelyRecipeBoundaries(raw: string): number {
  let count = 0;
  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (!t) continue;
    if (/^#\s+[^#]/.test(t)) count++;
    else if (/^recipe\s+\d+\s*[:.]/i.test(t)) count++;
    else if (isNumberedRecipeTitleLine(t)) count++;
  }
  return count;
}

function jsonItemToParsed(item: RecipeItemJson): ParsedRecipe {
  return {
    title: item.title.trim(),
    ingredients: item.ingredients.map((s) => s.trim()).filter(Boolean),
    steps: item.instructions.map((s) => s.trim()).filter(Boolean),
    cuisine: item.cuisine?.trim() || null,
    servings: servingsToString(item.servings),
    caloriesLine: item.caloriesLine?.trim() || null,
    intro: "",
  };
}

function splitIngredientLine(line: string): string[] {
  const trimmed = line.trim();
  if (!trimmed) return [];
  if (/^[-*•·]\s/.test(trimmed)) return [cleanListItem(trimmed)];
  const commaParts = trimmed.split(/,\s*(?=[A-Za-z(]|\d)/);
  if (commaParts.length >= 2) {
    return commaParts.map((p) => p.trim()).filter(Boolean);
  }
  return [trimmed];
}

function parseMetaLine(trimmed: string): { cuisine?: string; servings?: string; calories?: string } | null {
  const cuisineMatch = trimmed.match(META_CUISINE);
  if (cuisineMatch) return { cuisine: cuisineMatch[1].trim() };
  const servingsMatch = trimmed.match(META_SERVINGS);
  if (servingsMatch) return { servings: servingsMatch[1].trim() };
  const labeledCuisine = trimmed.match(/^cuisine\s*[:]\s*(.+)$/i);
  if (labeledCuisine) return { cuisine: labeledCuisine[1].trim() };
  const labeledServings = trimmed.match(/^(?:servings?|serves?|yield)\s*[:]\s*(.+)$/i);
  if (labeledServings) return { servings: labeledServings[1].trim() };
  if (/calories?|kcal|nutrition/i.test(trimmed) && /\d/.test(trimmed) && trimmed.length < 160) {
    return { calories: cleanMarkdownHeading(trimmed) };
  }
  return null;
}

function parseRecipeBlock(block: string): ParsedRecipe | null {
  const normalized = block.replace(/\r\n/g, "\n").trim();
  if (!normalized || normalized.length < 12) return null;

  const lines = normalized.split("\n");
  let title: string | null = null;
  const ingredients: string[] = [];
  const steps: string[] = [];
  let cuisine: string | null = null;
  let servings: string | null = null;
  let caloriesLine: string | null = null;

  type Mode = "seek" | "ing" | "steps";
  let mode: Mode = "seek";

  const pushIngredient = (text: string) => {
    for (const item of splitIngredientLine(text)) {
      if (item) ingredients.push(item);
    }
  };

  const pushStepLine = (text: string) => {
    const cleaned = cleanListItem(text);
    if (cleaned) steps.push(cleaned);
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (isNumberedRecipeTitleLine(trimmed) && !title && ingredients.length === 0 && steps.length === 0) {
      title = cleanListItem(trimmed);
      continue;
    }

    const meta = parseMetaLine(trimmed);
    if (meta) {
      if (meta.cuisine) cuisine = meta.cuisine;
      if (meta.servings) servings = meta.servings;
      if (meta.calories) caloriesLine = meta.calories;
      continue;
    }

    const recipeHeader = trimmed.match(/^recipe\s*(\d+)\s*[:.]\s*(.+)$/i);
    if (recipeHeader && !title) {
      title = cleanMarkdownHeading(recipeHeader[2]);
      continue;
    }

    const labeledIngredients = trimmed.match(/^ingredients?\s*[:]\s*(.+)$/i);
    if (labeledIngredients) {
      mode = "ing";
      pushIngredient(labeledIngredients[1]);
      continue;
    }

    const labeledInstructions = trimmed.match(/^(?:instructions?|steps?|directions?|method)\s*[:]\s*(.+)$/i);
    if (labeledInstructions) {
      mode = "steps";
      pushStepLine(labeledInstructions[1]);
      continue;
    }

    const secMatch = trimmed.match(SECTION_LINE);
    if (secMatch) {
      const key = secMatch[3].toLowerCase();
      if (key.startsWith("ingredient") || key.includes("need") || key.includes("what you")) {
        mode = "ing";
        continue;
      }
      if (
        key.startsWith("step") ||
        key.startsWith("instruction") ||
        key.startsWith("direction") ||
        key === "method" ||
        key.includes("cook") ||
        key.includes("how to")
      ) {
        mode = "steps";
        continue;
      }
      if (key.includes("calorie") || key === "nutrition") {
        caloriesLine = cleanMarkdownHeading(trimmed);
        mode = "seek";
        continue;
      }
    }

    if (mode === "seek") {
      const hMatch = trimmed.match(/^#{1}\s+(.+)/);
      const h2AsTitle = trimmed.match(/^#{2}\s+(.+)/);
      const boldMatch = trimmed.match(/^\*\*(.+)\*\*\s*$/);
      if ((hMatch || boldMatch) && !title) {
        title = cleanMarkdownHeading(hMatch?.[1] ?? boldMatch?.[1] ?? "");
        continue;
      }
      if (h2AsTitle && !title && !SECTION_LINE.test(trimmed)) {
        const maybeTitle = cleanMarkdownHeading(h2AsTitle[1]);
        if (!/ingredients?|instructions?|steps?|directions?/i.test(maybeTitle)) {
          title = maybeTitle;
          continue;
        }
      }

      if (/^[-*•·]\s+\S/.test(trimmed)) {
        mode = "ing";
        pushIngredient(trimmed);
        continue;
      }

      if (/^\d{1,2}[\.)]\s+\S/.test(trimmed) && STEP_VERB_START.test(trimmed)) {
        mode = "steps";
        pushStepLine(trimmed);
        continue;
      }

      continue;
    }

    if (mode === "ing") {
      if (/^\d{1,2}[\.)]\s+\S/.test(trimmed) && STEP_VERB_START.test(trimmed)) {
        mode = "steps";
        pushStepLine(trimmed);
        continue;
      }
      if (isNumberedRecipeTitleLine(trimmed)) break;
      if (/^[-*•·]\s+\S/.test(trimmed)) {
        pushIngredient(trimmed);
        continue;
      }
      if (ingredients.length > 0 && trimmed.length < 220 && !SECTION_LINE.test(trimmed)) {
        ingredients[ingredients.length - 1] += ` ${trimmed}`;
        continue;
      }
      break;
    }

    if (mode === "steps") {
      if (isNumberedRecipeTitleLine(trimmed)) break;
      if (/^[-*•·]\s+\S/.test(trimmed)) break;
      if (/^\d{1,2}[\.)]\s+\S/.test(trimmed)) {
        pushStepLine(trimmed);
        continue;
      }
      if (steps.length > 0 && trimmed.length < 280 && !SECTION_LINE.test(trimmed)) {
        steps[steps.length - 1] += ` ${trimmed}`;
        continue;
      }
      break;
    }
  }

  const valid =
    ingredients.length >= 1 &&
    steps.length >= 1 &&
    Boolean(title?.trim() || ingredients.length >= 2);

  if (!valid) return null;

  return {
    title: title?.trim() || "Recipe",
    ingredients,
    steps,
    cuisine,
    servings,
    caloriesLine,
    intro: "",
  };
}

function splitIntoRecipeBlocks(raw: string): { intro: string; blocks: string[] } {
  const normalized = raw.replace(/\r\n/g, "\n").trim();
  const lines = normalized.split("\n");

  const boundaryIndices: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (!t) continue;
    if (t === "---" || t === "***") {
      boundaryIndices.push(i);
      continue;
    }
    if (/^#\s+[^#]/.test(t)) {
      boundaryIndices.push(i);
      continue;
    }
    if (/^recipe\s+\d+\s*[:.]/i.test(t)) {
      boundaryIndices.push(i);
      continue;
    }
    if (isNumberedRecipeTitleLine(t)) {
      boundaryIndices.push(i);
    }
  }

  if (boundaryIndices.length >= 2) {
    const intro = lines.slice(0, boundaryIndices[0]).join("\n").trim();
    const blocks: string[] = [];
    for (let b = 0; b < boundaryIndices.length; b++) {
      const start = boundaryIndices[b];
      const end = boundaryIndices[b + 1] ?? lines.length;
      const chunk = lines
        .slice(start, end)
        .filter((l) => l.trim() !== "---" && l.trim() !== "***")
        .join("\n")
        .trim();
      if (chunk) blocks.push(chunk);
    }
    return { intro, blocks };
  }

  const byHr = normalized.split(/\n---+\n/).map((b) => b.trim()).filter(Boolean);
  if (byHr.length > 1) {
    const firstLine = byHr[0].split("\n").find((l) => l.trim())?.trim() ?? "";
    const firstBlockIsRecipe =
      /^#\s+[^#]/.test(firstLine) ||
      /^recipe\s+\d+\s*[:.]/i.test(firstLine) ||
      isNumberedRecipeTitleLine(firstLine);
    if (!firstBlockIsRecipe) {
      return { intro: byHr[0], blocks: byHr.slice(1) };
    }
    return { intro: "", blocks: byHr };
  }

  const h1Parts = normalized.split(/\n(?=# [^#])/);
  if (h1Parts.length > 1) {
    const intro = h1Parts[0].trim();
    return { intro, blocks: h1Parts.slice(1).map((p) => p.trim()).filter(Boolean) };
  }

  return { intro: "", blocks: [normalized] };
}

function tryParseRecipesHeuristic(raw: string): ParsedRecipeMessage | null {
  const normalized = raw.replace(/\r\n/g, "\n").trim();
  if (!normalized || normalized.length < 20) return null;

  const { intro, blocks } = splitIntoRecipeBlocks(normalized);
  const recipes: ParsedRecipe[] = [];

  for (const block of blocks) {
    const parsed = parseRecipeBlock(block);
    if (parsed) recipes.push(parsed);
  }

  if (recipes.length === 0) return null;

  const boundaryCount = countLikelyRecipeBoundaries(normalized);
  if (boundaryCount >= 2 && recipes.length < boundaryCount) return null;
  if (boundaryCount >= 2 && recipes.length === 1) return null;

  return { intro, recipes };
}

function validateHeuristicRecipes(raw: string, recipes: ParsedRecipe[]): boolean {
  const boundaryCount = countLikelyRecipeBoundaries(raw);
  if (boundaryCount >= 2 && recipes.length < boundaryCount) return false;
  if (boundaryCount >= 2 && recipes.length === 1) return false;

  const titles = new Set(recipes.map((r) => r.title.toLowerCase()));
  if (titles.size !== recipes.length) return false;

  for (const recipe of recipes) {
    for (const step of recipe.steps) {
      if (isNumberedRecipeTitleLine(`1. ${step}`)) return false;
      const stepTitle = recipe.title.toLowerCase();
      if (step.toLowerCase() === stepTitle) return false;
    }
  }

  return recipes.every(
    (r) => r.ingredients.length >= 1 && r.steps.length >= 1 && r.title.length > 0
  );
}

export function parseRecipeResponse(raw: string): RecipeParseResult {
  const normalized = raw.replace(/\r\n/g, "\n").trim();
  if (!normalized) {
    return { kind: "markdown", content: raw };
  }

  const json = parseRecipeJson(normalized);
  if (json) {
    if (json.recipes.length > 0) {
      return {
        kind: "recipes",
        intro: json.intro?.trim() ?? "",
        recipes: json.recipes.map(jsonItemToParsed),
      };
    }
    if (json.intro?.trim()) {
      return { kind: "markdown", content: json.intro.trim() };
    }
  }

  const heuristic = tryParseRecipesHeuristic(normalized);
  if (heuristic && heuristic.recipes.length > 0 && validateHeuristicRecipes(normalized, heuristic.recipes)) {
    return {
      kind: "recipes",
      intro: heuristic.intro,
      recipes: heuristic.recipes,
    };
  }

  return { kind: "markdown", content: raw };
}

/** @deprecated Use parseRecipeResponse */
export function tryParseRecipes(raw: string): ParsedRecipeMessage | null {
  const result = parseRecipeResponse(raw);
  if (result.kind !== "recipes") return null;
  return { intro: result.intro, recipes: result.recipes };
}

/** @deprecated Use parseRecipeResponse */
export function tryParseRecipe(raw: string): ParsedRecipe | null {
  const result = tryParseRecipes(raw);
  if (!result || result.recipes.length === 0) return null;
  const first = result.recipes[0];
  return { ...first, intro: result.intro || first.intro };
}

export function recipeToPlainText(recipe: ParsedRecipe): string {
  const lines: string[] = [`# ${recipe.title}`, "", "## Ingredients"];
  for (const ing of recipe.ingredients) {
    lines.push(`- ${ing}`);
  }
  lines.push("", "## Instructions");
  recipe.steps.forEach((step, i) => {
    lines.push(`${i + 1}. ${step}`);
  });
  if (recipe.cuisine) lines.push("", `Cuisine: ${recipe.cuisine}`);
  if (recipe.servings) lines.push(`Servings: ${recipe.servings}`);
  if (recipe.caloriesLine) lines.push(recipe.caloriesLine);
  return lines.join("\n");
}
