"use client";

import { useCallback, useMemo, useState } from "react";
import { IconBookmark, IconCheck, IconCopy, IconFlame } from "@tabler/icons-react";
import type { ParsedRecipe } from "@/components/chat/parse-recipe";
import { recipeToPlainText } from "@/components/chat/parse-recipe";
import { IngredientList } from "@/components/chat/ingredient-list";
import { InstructionList } from "@/components/chat/instruction-list";
import { Button } from "@/components/ui/button";
import { appendAiSavedPlan } from "@/lib/meal-plan-ai-saves";
import { sanitizeAssistantDisplayText } from "@/lib/sanitize-chat-display";
import { cn } from "@/lib/utils";

const COLLAPSE_INGREDIENTS = 8;
const COLLAPSE_STEPS = 6;

function caloriesBadgeText(line: string | null): string | null {
  if (!line?.trim()) return null;
  const m = line.match(/(\d{2,4})\s*(?:kcal|cal(?:ories)?)/i);
  if (m) return `${m[1]} cal`;
  const n = line.match(/\b(\d{3,4})\b/);
  if (n && /cal|kcal|nutrition|serving/i.test(line)) return `${n[1]} cal`;
  return line.length <= 48 ? line : `${line.slice(0, 45)}…`;
}

type RecipeCardProps = {
  recipe: ParsedRecipe;
  className?: string;
  defaultExpanded?: boolean;
  /** Hide title row when parent (accordion) already shows it */
  embedded?: boolean;
};

export function RecipeCard({
  recipe,
  className,
  defaultExpanded = true,
  embedded = false,
}: RecipeCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  const displayTitle = sanitizeAssistantDisplayText(recipe.title?.trim() || "Recipe");
  const badge = caloriesBadgeText(recipe.caloriesLine);

  const isLong =
    recipe.ingredients.length > COLLAPSE_INGREDIENTS ||
    recipe.steps.length > COLLAPSE_STEPS;

  const visibleIngredients = useMemo(
    () =>
      expanded || !isLong
        ? recipe.ingredients
        : recipe.ingredients.slice(0, COLLAPSE_INGREDIENTS),
    [expanded, isLong, recipe.ingredients]
  );

  const visibleSteps = useMemo(
    () => (expanded || !isLong ? recipe.steps : recipe.steps.slice(0, COLLAPSE_STEPS)),
    [expanded, isLong, recipe.steps]
  );

  const handleCopy = useCallback(async () => {
    const text = recipeToPlainText(recipe);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  }, [recipe]);

  const handleSave = useCallback(() => {
    appendAiSavedPlan({ name: displayTitle, content: recipeToPlainText(recipe) });
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2500);
  }, [displayTitle, recipe]);

  return (
    <article
      className={cn(
        "w-full max-w-[800px] overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5 shadow-[0_2px_12px_color-mix(in_srgb,var(--foreground)_6%,transparent)] sm:p-6",
        className
      )}
    >
      <header
        className={cn(
          "flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between",
          embedded && "sm:justify-end"
        )}
      >
        {!embedded ? (
          <h3 className="break-words text-[22px] font-bold leading-snug tracking-tight text-[var(--foreground)]">
            {displayTitle}
          </h3>
        ) : null}
        <div className="flex shrink-0 flex-wrap items-center gap-2 self-start sm:ml-auto">
          {badge ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[color-mix(in_srgb,var(--accent)_14%,var(--surface))] px-3 py-1 text-sm font-medium text-[var(--accent)] ring-1 ring-[color-mix(in_srgb,var(--accent)_28%,var(--border))]">
              <IconFlame size={15} stroke={1.75} aria-hidden />
              {badge}
            </span>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            className="h-9 px-3 py-1.5 text-xs"
            onClick={handleCopy}
            aria-label="Copy recipe"
          >
            {copied ? (
              <IconCheck size={16} stroke={2} aria-hidden />
            ) : (
              <IconCopy size={16} stroke={1.75} aria-hidden />
            )}
            {copied ? "Copied" : "Copy"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="h-9 px-3 py-1.5 text-xs"
            onClick={handleSave}
            aria-label="Save recipe"
          >
            <IconBookmark size={16} stroke={1.75} aria-hidden />
            {saved ? "Saved" : "Save"}
          </Button>
        </div>
      </header>

      {(recipe.cuisine || recipe.servings) && (
        <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-[15px] leading-relaxed text-[var(--muted-text)]">
          {recipe.cuisine ? (
            <p>
              <span className="font-semibold text-[var(--foreground)]">Cuisine:</span>{" "}
              {sanitizeAssistantDisplayText(recipe.cuisine)}
            </p>
          ) : null}
          {recipe.servings ? (
            <p>
              <span className="font-semibold text-[var(--foreground)]">Servings:</span>{" "}
              {sanitizeAssistantDisplayText(recipe.servings)}
            </p>
          ) : null}
        </div>
      )}

      <div className="mt-6 space-y-6">
        <section className="space-y-3">
          <h4 className="text-base font-semibold text-[var(--foreground)]">Ingredients</h4>
          <IngredientList items={visibleIngredients} />
          {!expanded && isLong && recipe.ingredients.length > visibleIngredients.length ? (
            <p className="text-sm text-[var(--muted-text)]">
              +{recipe.ingredients.length - visibleIngredients.length} more ingredients
            </p>
          ) : null}
        </section>

        <section className="space-y-3">
          <h4 className="text-base font-semibold text-[var(--foreground)]">Instructions</h4>
          <InstructionList steps={visibleSteps} />
          {!expanded && isLong && recipe.steps.length > visibleSteps.length ? (
            <p className="text-sm text-[var(--muted-text)]">
              +{recipe.steps.length - visibleSteps.length} more steps
            </p>
          ) : null}
        </section>
      </div>

      {isLong ? (
        <div className="mt-6 border-t border-[var(--border)] pt-5">
          <Button
            type="button"
            variant="ghost"
            className="w-full sm:w-auto"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? "Show less" : "View full recipe"}
          </Button>
        </div>
      ) : null}
    </article>
  );
}
