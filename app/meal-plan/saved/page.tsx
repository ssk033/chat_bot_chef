"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { IconArrowLeft, IconBookmark, IconCalendarPlus, IconMessages, IconNotebook, IconTrash, IconExternalLink } from "@tabler/icons-react";
import { AppNavbar } from "@/components/app-navbar";
import { MealPlanPageBackdrop } from "@/components/meal-plan/meal-plan-page-backdrop";
import { SurfaceCard } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
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
      <main className="relative z-10 mx-auto w-full max-w-4xl flex-1 px-6 py-10">
        <div className="flex flex-col gap-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm font-medium text-[var(--muted-text)] transition-colors duration-200 hover:text-[var(--foreground)]"
          >
            <IconArrowLeft size={18} stroke={1.75} aria-hidden />
            Back to dashboard
          </Link>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-[var(--foreground)] sm:text-2xl">Saved meal plans</h1>
              <p className="mt-2 text-sm leading-relaxed text-[var(--muted-text)]">
                <strong className="text-[var(--foreground)]">Intake drafts</strong> are what you typed on Create.
                <strong className="text-[var(--foreground)]"> Planner replies</strong> come from the meal planner chat’s{" "}
                <em>Save latest reply</em>.
              </p>
            </div>
            <ButtonLink href="/meal-plan/create" variant="primary" className="inline-flex shrink-0 gap-2 px-5 py-3 text-sm font-medium shadow-sm">
              <IconCalendarPlus size={18} stroke={1.75} aria-hidden />
              New intake
            </ButtonLink>
          </div>

          <section className="space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted-text)]">Intake drafts</h2>
            {drafts.length === 0 ? (
              <SurfaceCard className="flex flex-col items-center gap-3 bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-8 text-center backdrop-blur-xl">
                <IconNotebook className="h-11 w-11 text-[var(--muted-text)] opacity-45" stroke={1.25} aria-hidden />
                <p className="text-sm font-semibold text-[var(--foreground)]">No data yet</p>
                <p className="max-w-sm text-sm leading-relaxed text-[var(--muted-text)]">
                  Save intake drafts from the planner flow—they show up here for edits and chat handoff.
                </p>
                <ButtonLink href="/meal-plan/create" variant="secondary" className="mt-1">
                  Create intake
                </ButtonLink>
              </SurfaceCard>
            ) : (
              <ul className="space-y-4">
                {drafts.map((p: MealPlanRecord) => (
                  <li
                    key={p.id}
                    className="rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface)_94%,transparent)] p-5 shadow-sm backdrop-blur-xl transition-all duration-200 hover:shadow-md"
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
                        <ButtonLink
                          href={`/meal-plan/chat?${mealPlanRecordToChatQuery(p)}`}
                          onClick={() => setMealPlanChatSession({ draftId: p.id, planName: p.planName })}
                          variant="primary"
                          className="inline-flex items-center justify-center gap-2 px-4 py-2 text-center text-sm font-semibold shadow-sm"
                        >
                          <IconMessages size={17} stroke={1.75} aria-hidden />
                          Open planner chat
                        </ButtonLink>
                        <Link
                          href={`/meal-plan/create?edit=${p.id}`}
                          className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-4 py-2 text-center text-sm font-medium text-[var(--foreground)] transition-all duration-200 hover:bg-[color-mix(in_srgb,var(--surface-muted)_88%,var(--foreground)_8%)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-focus)]"
                        >
                          Edit intake
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleDeleteDraft(p.id, p.planName)}
                          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[var(--border-subtle)] px-4 py-2 text-sm font-medium text-[var(--muted-text)] transition-all duration-200 hover:bg-[color-mix(in_srgb,var(--foreground)_06%,var(--surface-muted))] hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-focus)]"
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
              <SurfaceCard className="flex flex-col items-center gap-3 bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-8 text-center backdrop-blur-xl">
                <IconBookmark className="h-11 w-11 text-[var(--muted-text)] opacity-45" stroke={1.25} aria-hidden />
                <p className="text-sm font-semibold text-[var(--foreground)]">No data yet</p>
                <p className="max-w-sm text-sm leading-relaxed text-[var(--muted-text)]">
                  Use <em className="not-italic font-medium text-[var(--foreground)]">Save latest reply</em> in planner chat to keep AI answers here.
                </p>
                <ButtonLink href="/meal-plan/create" variant="secondary" className="mt-1">
                  Start from intake
                </ButtonLink>
              </SurfaceCard>
            ) : (
              <ul className="space-y-4">
                {plannerReplies.map((s: AiSavedMealPlan) => (
                  <li
                    key={s.id}
                    className="rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface)_94%,transparent)] p-5 shadow-sm backdrop-blur-xl transition-all duration-200 hover:border-[color-mix(in_srgb,var(--accent)_28%,var(--border-subtle))] hover:shadow-md"
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
                        <ButtonLink
                          href={`/meal-plan/ai/${s.id}`}
                          variant="primary"
                          className="inline-flex items-center justify-center px-4 py-2.5 text-center text-sm font-semibold shadow-sm"
                        >
                          View full
                        </ButtonLink>
                        <button
                          type="button"
                          onClick={() => handleDeleteAi(s.id, s.name)}
                          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[var(--border-subtle)] px-4 py-2.5 text-sm font-medium text-[var(--muted-text)] transition-all duration-200 hover:bg-[color-mix(in_srgb,var(--foreground)_06%,var(--surface-muted))] hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-focus)]"
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
