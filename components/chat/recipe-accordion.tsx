"use client";

import type { ParsedRecipe } from "@/components/chat/parse-recipe";
import { RecipeCard } from "@/components/chat/recipe-card";

type RecipeAccordionProps = {
  recipes: ParsedRecipe[];
};

/** Renders one card per recipe — never merges multiple recipes. */
export function RecipeAccordion({ recipes }: RecipeAccordionProps) {
  return (
    <div className="flex w-full max-w-[800px] flex-col gap-5">
      {recipes.map((recipe, idx) => (
        <RecipeCard key={`${recipe.title}-${idx}`} recipe={recipe} />
      ))}
    </div>
  );
}
