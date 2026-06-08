import {
  getSearchTermsForRanking,
  type QueryConstraints,
  type RankedRecipe,
} from "@/lib/query-constraints";

export type RetrievalTier = "high" | "medium" | "low";

export type RetrievalAssessment = {
  tier: RetrievalTier;
  useCursorFallback: boolean;
  reasons: string[];
};

/** Questions best answered from culinary knowledge, not only the recipe DB. */
export function isGeneralCookingKnowledgeQuestion(message: string): boolean {
  const m = message.toLowerCase();
  return (
    /\b(how much|how many)\b.*\b(protein|calorie|carb|fat|kcal|gram)\b/i.test(message) ||
    /\b(protein|calories?|carbs?|fats?|macros?|nutrition(?:al)?|kcal)\b/i.test(m) ||
    /\b(substitute|substitution|instead of|swap|replace)\b/i.test(m) ||
    /\b(meal plan|meal prep|weekly plan|diet plan)\b/i.test(m) ||
    /\b(food science|why does|what happens when|maillard|carameliz|emulsif|ferment)\b/i.test(m) ||
    /\b(how to cook|how do i cook|how should i|best way to|tips for)\b/i.test(m) ||
    /\b(internal temp|safe temperature|shelf life|store|freeze|thaw|marinate)\b/i.test(m) ||
    /\b(keto|paleo|vegan|vegetarian|gluten[- ]?free|diabetic|low[- ]?carb|high[- ]?protein)\b/i.test(m) ||
    /\b(i have|pantry on hand|ingredients on hand|what can i make)\b/i.test(m) ||
    /\b(difference between|compare|which is healthier)\b/i.test(m)
  );
}

function topScores(recipes: RankedRecipe[]) {
  if (recipes.length === 0) {
    return { finalScore: 0, lexicalScore: 0, distance: 1 };
  }
  const top = recipes[0];
  return {
    finalScore: Number(top.finalScore ?? 0),
    lexicalScore: Number(top.lexicalScore ?? 0),
    distance: Number(top.distance ?? 1),
  };
}

export function assessRetrievalConfidence(args: {
  message: string;
  constraints: QueryConstraints;
  rankedResults: RankedRecipe[];
  uniqueCount: number;
}): RetrievalAssessment {
  const reasons: string[] = [];
  const searchTerms = getSearchTermsForRanking(args.constraints, args.message);
  const { finalScore, lexicalScore, distance } = topScores(args.rankedResults);

  if (args.uniqueCount === 0) {
    reasons.push("no_matching_recipes");
  }

  if (isGeneralCookingKnowledgeQuestion(args.message)) {
    reasons.push("general_cooking_or_nutrition_question");
  }

  if (args.uniqueCount > 0 && searchTerms.length > 0) {
    if (lexicalScore < 8) {
      reasons.push("low_lexical_match");
    }
    if (finalScore < 12 && distance > 0.85) {
      reasons.push("weak_vector_similarity");
    }
  }

  if (args.uniqueCount > 0 && args.constraints.requiredIngredients.length > 0) {
    const coverage = Number(args.rankedResults[0]?.coverageScore ?? 0);
    if (coverage < 0.5) {
      reasons.push("low_ingredient_coverage");
    }
  }

  const useCursorFallback =
    args.uniqueCount === 0 ||
    isGeneralCookingKnowledgeQuestion(args.message) ||
    reasons.includes("low_lexical_match") ||
    reasons.includes("weak_vector_similarity") ||
    reasons.includes("low_ingredient_coverage");

  let tier: RetrievalTier = "high";
  if (useCursorFallback) tier = "low";
  else if (finalScore < 40 || lexicalScore < 12) tier = "medium";

  return { tier, useCursorFallback, reasons };
}
