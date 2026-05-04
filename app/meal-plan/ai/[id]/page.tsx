"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useSyncExternalStore } from "react";
import { IconArrowLeft } from "@tabler/icons-react";
import { AppNavbar } from "@/components/app-navbar";
import { MealPlanPageBackdrop } from "@/components/meal-plan/meal-plan-page-backdrop";
import {
  getAiSavedPlansServerSnapshot,
  getAiSavedPlansSnapshot,
  subscribeAiSavedPlans,
  type AiSavedMealPlan,
} from "@/lib/meal-plan-ai-saves";

function formatWhen(iso: string) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "full",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default function MealPlanAiSavedDetailPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : Array.isArray(params.id) ? params.id[0] : "";

  const plans = useSyncExternalStore(subscribeAiSavedPlans, getAiSavedPlansSnapshot, getAiSavedPlansServerSnapshot);

  const entry: AiSavedMealPlan | undefined = useMemo(
    () => (id ? plans.find((p) => p.id === id) : undefined),
    [id, plans]
  );

  if (!id || !entry) {
    return (
      <div className="relative flex min-h-screen flex-col bg-[var(--background)] text-[var(--foreground)]">
        <MealPlanPageBackdrop />
        <AppNavbar />
        <main className="relative z-10 mx-auto max-w-3xl flex-1 px-6 py-16 text-center">
          <p className="text-[var(--muted-text)]">Saved reply not found.</p>
          <Link href="/meal-plan/saved" className="mt-4 inline-block text-sm font-semibold text-[var(--accent)] hover:underline">
            ← Saved meal plans
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col bg-[var(--background)] text-[var(--foreground)]">
      <MealPlanPageBackdrop />
      <AppNavbar />
      <main className="relative z-10 mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        <Link
          href="/meal-plan/saved"
          className="inline-flex items-center gap-2 text-sm font-medium text-[var(--muted-text)] hover:text-[var(--foreground)]"
        >
          <IconArrowLeft size={18} aria-hidden />
          Saved meal plans
        </Link>
        <article className="mt-6 rounded-2xl border border-[color-mix(in_srgb,var(--border-subtle)_85%,transparent)] bg-[color-mix(in_srgb,var(--surface)_72%,transparent)] p-6 shadow-[0_10px_30px_color-mix(in_srgb,var(--foreground)_12%,transparent)] backdrop-blur-xl md:p-8 dark:border-white/[0.09]">
          <h1 className="text-2xl font-bold text-[var(--foreground)]">{entry.name}</h1>
          <p className="mt-2 text-sm text-[var(--muted-text)]">{formatWhen(entry.createdAt)}</p>
          <div className="mt-6 whitespace-pre-wrap break-words border-t border-[var(--border-subtle)] pt-6 text-sm leading-relaxed text-[var(--foreground)] dark:border-white/[0.06]">
            {entry.content}
          </div>
        </article>
      </main>
    </div>
  );
}
