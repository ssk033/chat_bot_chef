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
      <main className="relative z-10 mx-auto w-full max-w-5xl px-4 py-10">
        <div className="theme-panel mb-6 rounded-2xl p-5">
          <h1 className="text-3xl font-bold">Saved Meal Plans</h1>
          <p className="mt-1 text-sm text-[var(--muted-text)]">
            Review and manage your saved plans with the same main-theme style.
          </p>
        </div>

        {plans.length === 0 ? (
          <p className="text-[var(--muted-text)]">No saved plans yet.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {plans.map((plan) => (
              <article
                key={plan.id}
                className="theme-panel rounded-2xl p-5"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h2 className="text-lg font-semibold">{plan.name}</h2>
                  <button
                    onClick={() => remove(plan.id)}
                    className="glow-pill rounded-md px-2 py-1 text-xs hover:bg-[var(--surface-muted)]"
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
