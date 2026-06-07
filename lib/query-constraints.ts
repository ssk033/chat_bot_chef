/**
 * Query constraint extraction, post-retrieval filtering, and coverage-based ranking.
 */

export const MIN_INGREDIENT_MATCH = 0.5;

export interface QueryConstraints {
  dietary: string[];
  requiredIngredients: string[];
  excludedIngredients: string[];
}

export type RecipeRecord = {
  title?: string | null;
  ingredients?: string | null;
  instructions?: string | null;
  tags?: string | null;
  cuisine?: string | null;
  distance?: number | string | null;
};

const MEAT_TERMS = [
  "chicken",
  "beef",
  "fish",
  "shrimp",
  "prawn",
  "mutton",
  "lamb",
  "pork",
  "ham",
  "bacon",
  "turkey",
  "anchovy",
  "seafood",
  "salmon",
  "tuna",
  "crab",
  "lobster",
  "sausage",
  "veal",
  "duck",
];

const DAIRY_EGG_TERMS = [
  "milk",
  "butter",
  "cheese",
  "egg",
  "eggs",
  "cream",
  "ghee",
  "yogurt",
  "curd",
  "paneer",
  "whey",
  "honey",
];

const DIETARY_KEYWORDS = new Set([
  "vegetarian",
  "vegan",
  "veggie",
  "meatless",
  "plant-based",
  "plantbased",
]);

const INGREDIENT_STOPWORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "from",
  "that",
  "this",
  "give",
  "me",
  "recipes",
  "recipe",
  "make",
  "cook",
  "please",
  "only",
  "want",
  "need",
  "using",
  "have",
  "some",
  "any",
  "all",
  "just",
  "can",
  "you",
  "what",
  "how",
  "best",
  "good",
  "easy",
  "quick",
  "simple",
  "ideas",
  "dishes",
  "dish",
  "meals",
  "meal",
  "food",
  "foods",
  "something",
  "anything",
]);

const CUISINE_WORDS = new Set([
  "indian",
  "italian",
  "mexican",
  "chinese",
  "thai",
  "japanese",
  "french",
  "greek",
  "mediterranean",
  "american",
  "british",
  "korean",
  "vietnamese",
  "spanish",
]);

export const COMMON_INGREDIENT_HINTS = [
  "chicken",
  "egg",
  "eggs",
  "rice",
  "tomato",
  "onion",
  "potato",
  "garlic",
  "ginger",
  "paneer",
  "milk",
  "cheese",
  "butter",
  "yogurt",
  "curd",
  "spinach",
  "broccoli",
  "carrot",
  "beans",
  "peas",
  "corn",
  "mushroom",
  "capsicum",
  "lettuce",
  "cucumber",
  "chili",
  "chilli",
  "coriander",
  "cilantro",
  "mint",
  "lemon",
  "lime",
  "beef",
  "mutton",
  "pork",
  "fish",
  "shrimp",
  "prawn",
  "tuna",
  "salmon",
  "oats",
  "flour",
  "pasta",
  "noodles",
  "bread",
  "lentils",
  "dal",
  "chickpea",
  "rajma",
];

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i += 1) dp[i][0] = i;
  for (let j = 0; j <= n; j += 1) dp[0][j] = j;
  for (let i = 1; i <= m; i += 1) {
    for (let j = 1; j <= n; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

export function resolveIngredientToken(token: string): string {
  const normalized = token.trim().toLowerCase().replace(/[^\w-]/g, "");
  if (!normalized) return "";
  if (COMMON_INGREDIENT_HINTS.includes(normalized)) return normalized;

  let bestMatch = normalized;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const candidate of COMMON_INGREDIENT_HINTS) {
    const dist = levenshteinDistance(normalized, candidate);
    if (dist < bestDistance) {
      bestDistance = dist;
      bestMatch = candidate;
    }
  }
  return bestDistance <= 2 ? bestMatch : normalized;
}

function normalizeIngredientKey(ing: string): string {
  if (ing === "eggs") return "egg";
  return ing;
}

export function tokenizeIngredientPhrase(message: string): string[] {
  const withCommas = message
    .toLowerCase()
    .replace(/\band\b/g, ",")
    .replace(/[/&]+/g, ",");
  return withCommas
    .split(",")
    .flatMap((segment) => segment.split(/\s+/))
    .map((t) => t.replace(/[^\w-]/g, "").trim())
    .filter((t) => t.length > 1);
}

function extractDietary(message: string): string[] {
  const dietary: string[] = [];
  const lower = message.toLowerCase();
  if (/\b(vegetarian|veggie|meatless|no\s+meat|without\s+meat)\b/.test(lower)) {
    dietary.push("vegetarian");
  }
  if (/\b(vegan|plant[- ]?based\s+only)\b/.test(lower)) {
    dietary.push("vegan");
  }
  return [...new Set(dietary)];
}

function extractExcludedIngredients(message: string): string[] {
  const excluded: string[] = [];
  const patterns = message.matchAll(/\b(?:no|without|avoid)\s+([a-z][a-z\s-]{1,30})/gi);
  for (const match of patterns) {
    const chunk = match[1].split(/\s+and\s+|\s*,\s*/)[0]?.trim();
    if (chunk) {
      const resolved = resolveIngredientToken(chunk);
      if (resolved) excluded.push(resolved);
    }
  }
  return [...new Set(excluded)];
}

function isKnownIngredientToken(token: string): boolean {
  const resolved = resolveIngredientToken(token);
  return (
    COMMON_INGREDIENT_HINTS.includes(token) || COMMON_INGREDIENT_HINTS.includes(resolved)
  );
}

function extractRequiredIngredients(message: string): string[] {
  const hasListDelimiter = /[,/&]|\band\b/i.test(message);
  let tokens = tokenizeIngredientPhrase(message);

  if (!hasListDelimiter) {
    const meaningful = tokens.filter(
      (t) =>
        t.length > 1 &&
        !INGREDIENT_STOPWORDS.has(t) &&
        !DIETARY_KEYWORDS.has(t) &&
        !CUISINE_WORDS.has(t)
    );
    const hintMatches = meaningful.filter((t) => isKnownIngredientToken(t));

    if (hintMatches.length >= 2) {
      tokens = hintMatches;
    } else if (hintMatches.length === 1 && meaningful.length === 1) {
      // Single-ingredient queries: "spinach", "chicken", "rice"
      tokens = hintMatches;
    } else {
      return [];
    }
  }

  const ingredients: string[] = [];
  for (const raw of tokens) {
    if (INGREDIENT_STOPWORDS.has(raw) || DIETARY_KEYWORDS.has(raw) || CUISINE_WORDS.has(raw)) {
      continue;
    }
    const resolved = resolveIngredientToken(raw);
    if (!resolved || DIETARY_KEYWORDS.has(resolved) || CUISINE_WORDS.has(resolved)) {
      continue;
    }
    if (INGREDIENT_STOPWORDS.has(resolved)) continue;
    ingredients.push(normalizeIngredientKey(resolved));
  }

  return [...new Set(ingredients)];
}

export function parseQueryConstraints(message: string): QueryConstraints {
  const dietary = extractDietary(message);
  const requiredIngredients = extractRequiredIngredients(message);
  const excludedIngredients = extractExcludedIngredients(message);

  return {
    dietary,
    requiredIngredients,
    excludedIngredients,
  };
}

export function recipeConstraintText(recipe: RecipeRecord): string {
  return `${recipe.title ?? ""} ${recipe.ingredients ?? ""} ${recipe.tags ?? ""}`.toLowerCase();
}

function containsTerm(text: string, term: string): boolean {
  const t = term.toLowerCase();
  if (t === "egg" || t === "eggs") {
    return /\begg(s)?\b/i.test(text);
  }
  const pattern = new RegExp(`\\b${escapeRegExp(t)}(s|es)?\\b`, "i");
  return pattern.test(text);
}

function containsAnyTerm(text: string, terms: string[]): boolean {
  return terms.some((term) => containsTerm(text, term));
}

export function violatesDietary(recipe: RecipeRecord, dietary: string[]): boolean {
  if (dietary.length === 0) return false;
  const text = recipeConstraintText(recipe);
  const needsVegan = dietary.includes("vegan");
  const needsVegetarian = needsVegan || dietary.includes("vegetarian");

  if (needsVegetarian && containsAnyTerm(text, MEAT_TERMS)) {
    return true;
  }
  if (needsVegan && containsAnyTerm(text, [...MEAT_TERMS, ...DAIRY_EGG_TERMS])) {
    return true;
  }
  return false;
}

export function violatesExcluded(recipe: RecipeRecord, excluded: string[]): boolean {
  if (excluded.length === 0) return false;
  const text = recipeConstraintText(recipe);
  return containsAnyTerm(text, excluded);
}

export function ingredientMatchesText(text: string, ingredient: string): boolean {
  const ing = normalizeIngredientKey(ingredient.toLowerCase());
  if (containsTerm(text, ing)) return true;
  if (ing === "oat" && /\boats?\b/i.test(text)) return true;
  if (ing === "oats" && /\boats?\b/i.test(text)) return true;
  return text.includes(ing);
}

export function ingredientCoverageScore(recipe: RecipeRecord, requiredIngredients: string[]): number {
  if (requiredIngredients.length === 0) return 1;
  const text = recipeConstraintText(recipe);
  let matched = 0;
  for (const ing of requiredIngredients) {
    if (ingredientMatchesText(text, ing)) matched += 1;
  }
  return matched / requiredIngredients.length;
}

export function validateRecipeConstraints(recipe: RecipeRecord, constraints: QueryConstraints): boolean {
  if (violatesDietary(recipe, constraints.dietary)) return false;
  if (violatesExcluded(recipe, constraints.excludedIngredients)) return false;
  if (constraints.requiredIngredients.length > 0) {
    if (ingredientCoverageScore(recipe, constraints.requiredIngredients) < MIN_INGREDIENT_MATCH) {
      return false;
    }
  }
  return true;
}

export function getFilterRejectReason(
  recipe: RecipeRecord,
  constraints: QueryConstraints
): string | null {
  if (violatesDietary(recipe, constraints.dietary)) {
    return `dietary (${constraints.dietary.join(", ")})`;
  }
  if (violatesExcluded(recipe, constraints.excludedIngredients)) {
    return "excluded ingredient";
  }
  if (constraints.requiredIngredients.length > 0) {
    const coverage = ingredientCoverageScore(recipe, constraints.requiredIngredients);
    if (coverage < MIN_INGREDIENT_MATCH) {
      return `low ingredient coverage (${(coverage * 100).toFixed(0)}%)`;
    }
  }
  return null;
}

export function filterRecipesByConstraints(
  recipes: RecipeRecord[],
  constraints: QueryConstraints
): RecipeRecord[] {
  return recipes.filter((r) => validateRecipeConstraints(r, constraints));
}

export function getSearchTermsForRanking(
  constraints: QueryConstraints,
  message: string
): string[] {
  if (constraints.requiredIngredients.length > 0) {
    return constraints.requiredIngredients.map((t) => t.trim().toLowerCase()).filter(Boolean);
  }

  return tokenizeIngredientPhrase(message)
    .filter(
      (t) =>
        t.length > 2 &&
        !INGREDIENT_STOPWORDS.has(t) &&
        !DIETARY_KEYWORDS.has(t) &&
        !CUISINE_WORDS.has(t)
    )
    .map((t) => resolveIngredientToken(t))
    .filter(Boolean);
}

export function lexicalRelevanceScore(recipe: RecipeRecord, searchTerms: string[]): number {
  if (searchTerms.length === 0) return 0;
  const title = String(recipe.title ?? "").toLowerCase();
  const ingredients = String(recipe.ingredients ?? "").toLowerCase();
  const instructions = String(recipe.instructions ?? "").toLowerCase();

  let score = 0;
  for (const term of searchTerms) {
    if (title.includes(term)) score += 8;
    if (ingredients.includes(term)) score += 12;
    if (instructions.includes(term)) score += 2;
  }
  return score;
}

export type RankedRecipe = RecipeRecord & {
  coverageScore: number;
  finalScore: number;
  lexicalScore: number;
};

export function rankRecipesWithConstraints(
  recipes: RecipeRecord[],
  constraints: QueryConstraints,
  searchTerms: string[]
): RankedRecipe[] {
  const ranked = recipes.map((recipe) => {
    const coverageScore =
      constraints.requiredIngredients.length > 0
        ? ingredientCoverageScore(recipe, constraints.requiredIngredients)
        : 0;
    const lexicalScore = lexicalRelevanceScore(recipe, searchTerms);
    const distance = Number(recipe.distance ?? 1);
    const vectorSimilarityBonus = Math.max(0, 1 - Math.min(distance, 1)) * 10;
    const finalScore = coverageScore * 100 + lexicalScore + vectorSimilarityBonus;

    return {
      ...recipe,
      coverageScore,
      lexicalScore,
      finalScore,
    };
  });

  return ranked.sort((a, b) => b.finalScore - a.finalScore);
}

export function logRecipeSearchDebug(payload: {
  query: string;
  constraints: QueryConstraints;
  vectorResults: { title: string; distance?: number | string | null }[];
  filteredResults: { title: string }[];
  rejected: { title: string; reason: string }[];
  coverageScores: { title: string; coverage: number; finalScore: number }[];
  finalResults: { title: string }[];
}): void {
  if (process.env.NODE_ENV !== "development" && process.env.RECIPE_SEARCH_DEBUG !== "1") {
    return;
  }
  console.log("QUERY:", payload.query);
  console.log("CONSTRAINTS:", JSON.stringify(payload.constraints, null, 2));
  console.log("VECTOR RESULTS:", JSON.stringify(payload.vectorResults, null, 2));
  console.log("FILTERED RESULTS:", JSON.stringify(payload.filteredResults, null, 2));
  if (payload.rejected.length > 0) {
    console.log("REJECTED:", JSON.stringify(payload.rejected, null, 2));
  }
  console.log("COVERAGE SCORES:", JSON.stringify(payload.coverageScores, null, 2));
  console.log("FINAL RESULTS:", JSON.stringify(payload.finalResults, null, 2));
}
