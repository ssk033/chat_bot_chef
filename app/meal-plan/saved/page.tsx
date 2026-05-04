"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { IconArrowLeft, IconCalendarPlus, IconMessages, IconTrash, IconExternalLink } from "@tabler/icons-react";
import { AppNavbar } from "@/components/app-navbar";
import { MealPlanPageBackdrop } from "@/components/meal-plan/meal-plan-page-backdrop";
import { mealPlanRecordToChatQuery } from "@/lib/meal-plan-chat-query";
import {
  deleteAiSavedPlan,
  getAiSavedPlansServerSnapshot,
  getAiSavedPlansSnapshot,
  setMealPlanChatSession,
  subscribeAiSavedPlans,
  type AiSavedMealPlan,
} from "@/lib/meal-plan-ai-saves";
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
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default function SavedMealPlansPage() {
  const drafts = useSyncExternalStore(subscribeMealPlans, getMealPlansSnapshot, getMealPlansServerSnapshot);
  const plannerReplies = useSyncExternalStore(
    subscribeAiSavedPlans,
    getAiSavedPlansSnapshot,
    getAiSavedPlansServerSnapshot
  );

  function handleDeleteDraft(id: string, title: string) {
    if (!window.confirm(`Delete draft “${title}”?`)) return;
    deleteMealPlan(id);
  }

  function handleDeleteAi(id: string, title: string) {
    if (!window.confirm(`Delete saved reply “${title}”?`)) return;
    deleteAiSavedPlan(id);
  }

  return (
    <div className="relative flex min-h-screen flex-col bg-[var(--background)] text-[var(--foreground)]">
      <MealPlanPageBackdrop />
      <AppNavbar />
      <main className="relative z-10 mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        <div className="space-y-10">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm font-medium text-[var(--muted-text)] transition-colors duration-200 hover:text-[var(--foreground)]"
          >
            <IconArrowLeft size={18} stroke={1.75} aria-hidden />
            Back to dashboard
          </Link>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)]">Saved meal plans</h1>
              <p className="mt-2 text-sm leading-relaxed text-[var(--muted-text)]">
                <strong className="text-[var(--foreground)]">Intake drafts</strong> are what you typed on Create.
                <strong className="text-[var(--foreground)]"> Planner replies</strong> come from the meal planner chat’s{" "}
                <em>Save latest reply</em>.
              </p>
            </div>
            <Link
              href="/meal-plan/create"
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-3 text-sm font-medium text-white shadow-[0_0_22px_-4px_color-mix(in_srgb,var(--icon-green)_38%,transparent)] transition-all duration-200 hover:brightness-[1.06] motion-safe:active:scale-[0.98]"
            >
              <IconCalendarPlus size={18} stroke={1.75} aria-hidden />
              New intake
            </Link>
          </div>

          <section className="space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted-text)]">Intake drafts</h2>
            {drafts.length === 0 ? (
              <div className="rounded-2xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_70%,transparent)] p-8 text-center backdrop-blur-xl dark:border-white/[0.08]">
                <p className="text-sm text-[var(--muted-text)]">No drafts yet.</p>
                <Link href="/meal-plan/create" className="mt-3 inline-block text-sm font-semibold text-[var(--accent)] hover:underline">
                  Create intake
                </Link>
              </div>
            ) : (
              <ul className="space-y-4">
                {drafts.map((p: MealPlanRecord) => (
                  <li
                    key={p.id}
                    className="rounded-2xl border border-[color-mix(in_srgb,var(--border)_85%,transparent)] bg-[color-mix(in_srgb,var(--surface)_72%,transparent)] p-5 shadow-[0_8px_28px_-12px_color-mix(in_srgb,var(--foreground)_18%,transparent)] backdrop-blur-xl dark:border-white/[0.08] dark:bg-[color-mix(in_srgb,var(--surface)_78%,transparent)]"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 space-y-2">
                        <Link href={`/meal-plan/${p.id}`} className="block font-semibold text-[var(--foreground)] hover:text-[var(--accent)]">
                          {p.planName}
                        </Link>
                        <p className="text-xs text-[var(--muted-text)]">
                          Updated {formatWhen(p.updatedAt)} · {p.householdSize} people
                        </p>
                        <p className="line-clamp-2 text-sm leading-relaxed text-[var(--muted-text)]">{p.ingredients}</p>
                      </div>
                      <div className="flex shrink-0 flex-wrap gap-2 lg:flex-col">
                        <Link
                          href={`/meal-plan/chat?${mealPlanRecordToChatQuery(p)}`}
                          onClick={() => setMealPlanChatSession({ draftId: p.id, planName: p.planName })}
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2 text-center text-sm font-semibold text-white shadow-[0_0_16px_-4px_color-mix(in_srgb,var(--icon-green)_35%,transparent)] transition-all hover:brightness-[1.06]"
                        >
                          <IconMessages size={17} stroke={1.75} aria-hidden />
                          Open planner chat
                        </Link>
                        <Link
                          href={`/meal-plan/create?edit=${p.id}`}
                          className="rounded-xl border border-[var(--border)] px-4 py-2 text-center text-sm font-medium text-[var(--foreground)] hover:bg-[var(--surface-muted)] dark:border-white/[0.12]"
                        >
                          Edit intake
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleDeleteDraft(p.id, p.planName)}
                          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-red-500/35 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-500/10 dark:text-red-400"
                        >
                          <IconTrash size={16} stroke={1.75} aria-hidden />
                          Delete
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted-text)]">Planner replies</h2>
            {plannerReplies.length === 0 ? (
              <div className="rounded-2xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_70%,transparent)] p-8 text-center backdrop-blur-xl dark:border-white/[0.08]">
                <p className="text-sm text-[var(--muted-text)]">Nothing saved from planner chat yet.</p>
                <Link href="/meal-plan/create" className="mt-3 inline-block text-sm font-semibold text-[var(--accent)] hover:underline">
                  Start from intake → planner chat
                </Link>
              </div>
            ) : (
              <ul className="space-y-4">
                {plannerReplies.map((s: AiSavedMealPlan) => (
                  <li
                    key={s.id}
                    className="rounded-2xl border border-[color-mix(in_srgb,var(--border)_85%,transparent)] bg-[color-mix(in_srgb,var(--surface)_72%,transparent)] p-5 backdrop-blur-xl transition-colors hover:border-[color-mix(in_srgb,var(--accent)_35%,var(--border))] dark:border-white/[0.08]"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1 space-y-2">
                        <div>
                          <h3 className="text-base font-semibold text-[var(--foreground)]">{s.name}</h3>
                          <p className="text-xs text-[var(--muted-text)]">{formatWhen(s.createdAt)}</p>
                        </div>
                        <p className="line-clamp-4 whitespace-pre-wrap text-sm leading-relaxed text-[var(--muted-text)]">{s.content}</p>
                        <Link
                          href={`/meal-plan/ai/${s.id}`}
                          className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent)] underline-offset-4 hover:underline"
                        >
                          <IconExternalLink size={17} stroke={1.75} aria-hidden />
                          Open full reply
                        </Link>
                      </div>
                      <div className="flex shrink-0 flex-col gap-2 sm:items-end">
                        <Link
                          href={`/meal-plan/ai/${s.id}`}
                          className="inline-flex items-center justify-center rounded-xl bg-[var(--accent)] px-4 py-2.5 text-center text-sm font-semibold text-white shadow-[0_0_16px_-4px_color-mix(in_srgb,var(--icon-green)_35%,transparent)] transition-all hover:brightness-[1.06]"
                        >
                          View full
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleDeleteAi(s.id, s.name)}
                          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-red-500/35 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-500/10 dark:text-red-400"
                        >
                          <IconTrash size={16} aria-hidden />
                          Delete
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
