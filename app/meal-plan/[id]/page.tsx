"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useSyncExternalStore } from "react";
import { IconArrowLeft, IconMessages, IconPencil, IconTrash } from "@tabler/icons-react";
import { AppNavbar } from "@/components/app-navbar";
import { MealPlanPageBackdrop } from "@/components/meal-plan/meal-plan-page-backdrop";
import { setMealPlanChatSession } from "@/lib/meal-plan-ai-saves";
import { mealPlanRecordToChatQuery } from "@/lib/meal-plan-chat-query";
import {
  deleteMealPlan,
  getMealPlansServerSnapshot,
  getMealPlansSnapshot,
  subscribeMealPlans,
  type MealPlanRecord,
} from "@/lib/meal-plans-storage";

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

export default function MealPlanDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === "string" ? params.id : Array.isArray(params.id) ? params.id[0] : "";

  const plans = useSyncExternalStore(subscribeMealPlans, getMealPlansSnapshot, getMealPlansServerSnapshot);
  const plan: MealPlanRecord | undefined = id ? plans.find((p) => p.id === id) : undefined;

  function handleDelete() {
    if (!plan) return;
    if (!window.confirm(`Delete “${plan.planName}”?`)) return;
    deleteMealPlan(plan.id);
    router.replace("/meal-plan/saved");
  }

  if (!id || !plan) {
    return (
      <div className="relative flex min-h-screen flex-col bg-[var(--background)] text-[var(--foreground)]">
        <MealPlanPageBackdrop />
        <AppNavbar />
        <main className="relative z-10 mx-auto max-w-3xl flex-1 px-6 py-16 text-center">
          <p className="text-[var(--muted-text)]">This meal plan was not found.</p>
          <Link href="/meal-plan/saved" className="mt-4 inline-block text-sm font-semibold text-[var(--accent)] hover:underline">
            ← Saved plans
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
        <div className="space-y-6">
          <Link
            href="/meal-plan/saved"
            className="inline-flex items-center gap-2 text-sm font-medium text-[var(--muted-text)] transition-colors duration-200 hover:text-[var(--foreground)]"
          >
            <IconArrowLeft size={18} stroke={1.75} aria-hidden />
            Saved plans
          </Link>

          <article className="rounded-2xl border border-[color-mix(in_srgb,var(--border)_85%,transparent)] bg-[color-mix(in_srgb,var(--surface)_72%,transparent)] p-6 shadow-[0_10px_30px_color-mix(in_srgb,var(--foreground)_12%,transparent)] backdrop-blur-xl md:p-8 dark:border-white/[0.09] dark:bg-[color-mix(in_srgb,var(--surface)_76%,transparent)] dark:shadow-[0_14px_40px_rgba(0,0,0,0.42)]">
            <header className="border-b border-[var(--border)] pb-6 dark:border-white/[0.06]">
              <h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)]">{plan.planName}</h1>
              <p className="mt-2 text-sm text-[var(--muted-text)]">
                Last updated {formatWhen(plan.updatedAt)} · {plan.householdSize} people · Created {formatWhen(plan.createdAt)}
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Link
                  href={`/meal-plan/chat?${mealPlanRecordToChatQuery(plan)}`}
                  onClick={() => setMealPlanChatSession({ draftId: plan.id, planName: plan.planName })}
                  className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-white shadow-[0_0_18px_-4px_color-mix(in_srgb,var(--icon-green)_35%,transparent)] transition-all hover:brightness-[1.06] motion-safe:active:scale-[0.98]"
                >
                  <IconMessages size={17} stroke={1.75} aria-hidden />
                  Open planner chat
                </Link>
                <Link
                  href={`/meal-plan/create?edit=${plan.id}`}
                  className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-5 py-2.5 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-muted)] dark:border-white/[0.12]"
                >
                  <IconPencil size={17} stroke={1.75} aria-hidden />
                  Edit intake
                </Link>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="inline-flex items-center gap-2 rounded-xl border border-red-500/40 px-5 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-500/10 dark:text-red-400"
                >
                  <IconTrash size={17} stroke={1.75} aria-hidden />
                  Delete
                </button>
              </div>
            </header>

            <div className="space-y-6 pt-6">
              <section>
                <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted-text)]">Dietary notes</h2>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[var(--foreground)]">
                  {plan.dietaryNotes.trim() ? plan.dietaryNotes : "—"}
                </p>
              </section>
              {(plan.allergies?.trim().length ?? 0) > 0 ? (
                <section>
                  <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted-text)]">Allergies</h2>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[var(--foreground)]">{plan.allergies}</p>
                </section>
              ) : null}
              {(plan.proteinTarget?.trim().length ?? 0) > 0 ? (
                <section>
                  <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted-text)]">Protein target</h2>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--foreground)]">{plan.proteinTarget}</p>
                </section>
              ) : null}
              <section>
                <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted-text)]">Ingredients & pantry</h2>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[var(--foreground)]">{plan.ingredients}</p>
              </section>
            </div>

            <p className="mt-8 border-t border-[var(--border)] pt-6 text-xs text-[var(--muted-text)] dark:border-white/[0.06]">
              Planner chat uses this intake with <code className="rounded bg-[var(--surface-muted)] px-1 py-0.5 text-[11px]">/api/query</code>.
              Main Chef is separate —{" "}
              <Link href="/chat-bot-chef" className="font-medium text-[var(--accent)] hover:underline">
                open Chef
              </Link>
              .
            </p>
          </article>
        </div>
      </main>
    </div>
  );
}
