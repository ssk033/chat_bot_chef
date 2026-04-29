"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppNavbar } from "@/components/app-navbar";

export default function CreateMealPlanPage() {
  const router = useRouter();
  const [ingredientsInput, setIngredientsInput] = useState("");
  const [dietaryInput, setDietaryInput] = useState("");
  const [allergiesInput, setAllergiesInput] = useState("");
  const [proteinTarget, setProteinTarget] = useState(100);

  const ingredientList = useMemo(
    () =>
      ingredientsInput
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    [ingredientsInput]
  );

  const submit = () => {
    const params = new URLSearchParams();
    params.set("ingredients", ingredientList.join(","));
    params.set("dietaryRestrictions", dietaryInput);
    params.set("allergies", allergiesInput);
    params.set("proteinTarget", String(proteinTarget));
    localStorage.setItem(
      "meal_it_latest_plan",
      JSON.stringify({
        ingredients: ingredientList,
        dietaryRestrictions: dietaryInput,
        allergies: allergiesInput,
        proteinTarget,
      })
    );
    router.push(`/meal-plan/chat?${params.toString()}`);
  };

  return (
    <div className="relative min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div
        className="pointer-events-none absolute inset-0 bg-cover bg-center bg-no-repeat dark:hidden"
        style={{ backgroundImage: "url('/food%20background%20light%20theme.png')" }}
      />
      <div
        className="pointer-events-none absolute inset-0 hidden bg-cover bg-center bg-no-repeat dark:block"
        style={{ backgroundImage: "url('/food%20backgorund.png')" }}
      />
      <div className="pointer-events-none absolute inset-0 bg-white/35 dark:bg-black/50" />
      <AppNavbar />
      <main className="relative z-10 mx-auto w-full max-w-3xl px-4 py-10">
        <div className="theme-panel mb-6 rounded-2xl p-5">
          <h1 className="text-3xl font-bold">Create Meal Plan</h1>
          <p className="mt-1 text-sm text-[var(--muted-text)]">
            Match your dashboard and homepage theme while planning meals.
          </p>
        </div>

        <div className="theme-panel space-y-4 rounded-2xl p-6">
          <label className="block text-sm font-medium">Ingredients (comma separated)</label>
          <textarea
            value={ingredientsInput}
            onChange={(e) => setIngredientsInput(e.target.value)}
            className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-3 text-[var(--foreground)] outline-none focus:border-[var(--input-border-focus)] focus:ring-2 focus:ring-[var(--ring-focus)]"
            rows={4}
            placeholder="chicken, rice, tomato, onion"
          />

          <label className="block text-sm font-medium">Dietary preferences</label>
          <input
            value={dietaryInput}
            onChange={(e) => setDietaryInput(e.target.value)}
            className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-3 text-[var(--foreground)] outline-none focus:border-[var(--input-border-focus)] focus:ring-2 focus:ring-[var(--ring-focus)]"
            placeholder="high-protein, vegetarian, etc."
          />

          <label className="block text-sm font-medium">Allergies</label>
          <input
            value={allergiesInput}
            onChange={(e) => setAllergiesInput(e.target.value)}
            className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-3 text-[var(--foreground)] outline-none focus:border-[var(--input-border-focus)] focus:ring-2 focus:ring-[var(--ring-focus)]"
            placeholder="peanuts, dairy, shellfish"
          />

          <label className="block text-sm font-medium">Daily protein target (grams)</label>
          <input
            type="number"
            min={20}
            value={proteinTarget}
            onChange={(e) => setProteinTarget(Number(e.target.value))}
            className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-3 text-[var(--foreground)] outline-none focus:border-[var(--input-border-focus)] focus:ring-2 focus:ring-[var(--ring-focus)]"
          />

          <button
            onClick={submit}
            disabled={ingredientList.length === 0}
            className="btn-solid rounded-lg bg-[var(--user-bubble-bg)] px-4 py-2 text-sm font-medium text-[var(--user-bubble-fg)] hover:opacity-90 disabled:opacity-40"
          >
            Generate Meal Plan
          </button>
        </div>
      </main>
    </div>
  );
}
