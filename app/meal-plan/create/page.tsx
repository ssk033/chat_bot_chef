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
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <AppNavbar />
      <main className="mx-auto w-full max-w-3xl px-4 py-10">
        <h1 className="mb-6 text-3xl font-bold">Create Meal Plan</h1>

        <div className="space-y-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-6">
          <label className="block text-sm font-medium">Ingredients (comma separated)</label>
          <textarea
            value={ingredientsInput}
            onChange={(e) => setIngredientsInput(e.target.value)}
            className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-3"
            rows={4}
            placeholder="chicken, rice, tomato, onion"
          />

          <label className="block text-sm font-medium">Dietary preferences</label>
          <input
            value={dietaryInput}
            onChange={(e) => setDietaryInput(e.target.value)}
            className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-3"
            placeholder="high-protein, vegetarian, etc."
          />

          <label className="block text-sm font-medium">Allergies</label>
          <input
            value={allergiesInput}
            onChange={(e) => setAllergiesInput(e.target.value)}
            className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-3"
            placeholder="peanuts, dairy, shellfish"
          />

          <label className="block text-sm font-medium">Daily protein target (grams)</label>
          <input
            type="number"
            min={20}
            value={proteinTarget}
            onChange={(e) => setProteinTarget(Number(e.target.value))}
            className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-3"
          />

          <button
            onClick={submit}
            disabled={ingredientList.length === 0}
            className="rounded-lg bg-[var(--user-bubble-bg)] px-4 py-2 text-sm font-medium text-[var(--user-bubble-fg)] disabled:opacity-40"
          >
            Generate Meal Plan
          </button>
        </div>
      </main>
    </div>
  );
}
