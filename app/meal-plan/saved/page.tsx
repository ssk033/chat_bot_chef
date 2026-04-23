"use client";

import { useSyncExternalStore } from "react";
import { AppNavbar } from "@/components/app-navbar";
import {
  getSavedMealPlansServerSnapshot,
  getSavedMealPlansSnapshot,
  setSavedMealPlans,
  subscribeSavedMealPlans,
} from "@/lib/saved-meal-plans-store";

export default function SavedMealPlansPage() {
  const plans = useSyncExternalStore(
    subscribeSavedMealPlans,
    getSavedMealPlansSnapshot,
    getSavedMealPlansServerSnapshot
  );

  const remove = (id: string) => {
    setSavedMealPlans(plans.filter((p) => p.id !== id));
  };

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <AppNavbar />
      <main className="mx-auto w-full max-w-5xl px-4 py-10">
        <h1 className="mb-6 text-3xl font-bold">Saved Meal Plans</h1>

        {plans.length === 0 ? (
          <p className="text-[var(--muted-text)]">No saved plans yet.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {plans.map((plan) => (
              <article
                key={plan.id}
                className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h2 className="text-lg font-semibold">{plan.name}</h2>
                  <button
                    onClick={() => remove(plan.id)}
                    className="rounded-md border border-[var(--border-subtle)] px-2 py-1 text-xs hover:bg-[var(--surface-muted)]"
                  >
                    Delete
                  </button>
                </div>
                <p className="mb-3 text-xs text-[var(--muted-text)]">
                  {new Date(plan.createdAt).toLocaleString()}
                </p>
                <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-lg bg-[var(--surface-muted)] p-3 text-sm">
                  {plan.content}
                </pre>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
