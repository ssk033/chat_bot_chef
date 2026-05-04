"use client";

import { IconFlame } from "@tabler/icons-react";
import type { ParsedRecipe } from "@/components/chat/parse-recipe";
import { sanitizeAssistantDisplayText } from "@/lib/sanitize-chat-display";

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
};

export function RecipeCard({ recipe }: RecipeCardProps) {
  const badge = caloriesBadgeText(recipe.caloriesLine);
  const displayTitle = sanitizeAssistantDisplayText(recipe.title?.trim() || "Recipe");

  return (
    <div className="mt-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-muted)]/80 p-5 shadow-sm ring-1 ring-black/[0.03] dark:bg-[var(--surface-muted)] dark:ring-white/[0.06] sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
        <h3 className="text-lg font-semibold leading-snug tracking-tight text-[var(--foreground)]">{displayTitle}</h3>
        {badge ? (
          <span className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-full bg-[var(--accent-muted)] px-3 py-1.5 text-sm font-medium text-[var(--accent)] ring-1 ring-[var(--accent)]/20">
            <IconFlame size={16} stroke={1.75} aria-hidden />
            {badge}
          </span>
        ) : null}
      </div>

      <div className="mt-6 space-y-4 border-t border-[var(--border-subtle)] pt-5">
        <details open className="group rounded-xl bg-[var(--surface)]/60 ring-1 ring-[var(--border-subtle)] dark:bg-[var(--surface)]/40">
          <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-muted)]/50 [&::-webkit-details-marker]:hidden">
            <span className="flex items-center justify-between gap-2">
              Ingredients
              <span className="text-xs font-normal text-[var(--muted-text)]">{recipe.ingredients.length} items</span>
            </span>
          </summary>
          <ul className="space-y-2.5 border-t border-[var(--border-subtle)] px-4 pb-4 pt-3 text-sm leading-relaxed text-[var(--foreground)]">
            {recipe.ingredients.map((item, idx) => (
              <li key={idx} className="flex gap-2.5 pl-1">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[var(--accent)]" aria-hidden />
                <span className="min-w-0">{sanitizeAssistantDisplayText(item)}</span>
              </li>
            ))}
          </ul>
        </details>

        <details open className="group rounded-xl bg-[var(--surface)]/60 ring-1 ring-[var(--border-subtle)] dark:bg-[var(--surface)]/40">
          <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-muted)]/50 [&::-webkit-details-marker]:hidden">
            <span className="flex items-center justify-between gap-2">
              Steps
              <span className="text-xs font-normal text-[var(--muted-text)]">{recipe.steps.length} steps</span>
            </span>
          </summary>
          <ol className="space-y-4 border-t border-[var(--border-subtle)] px-4 pb-4 pt-4 text-sm leading-relaxed text-[var(--foreground)]">
            {recipe.steps.map((step, idx) => (
              <li key={idx} className="relative flex gap-4 pl-1">
                <span
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-muted)] text-xs font-semibold text-[var(--accent)] ring-1 ring-[var(--accent)]/15"
                  aria-hidden
                >
                  {idx + 1}
                </span>
                <span className="min-w-0 pt-0.5">{sanitizeAssistantDisplayText(step)}</span>
              </li>
            ))}
          </ol>
        </details>
      </div>
    </div>
  );
}
