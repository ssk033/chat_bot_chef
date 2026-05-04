"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState, type FormEvent } from "react";
import { IconArrowLeft, IconBookmark, IconMessages } from "@tabler/icons-react";
import { AppNavbar } from "@/components/app-navbar";
import { FormCard } from "@/components/meal-plan/form-card";
import { InputField } from "@/components/meal-plan/input-field";
import { MealPlanPageBackdrop } from "@/components/meal-plan/meal-plan-page-backdrop";
import { PrimaryButton } from "@/components/meal-plan/primary-button";
import { Button } from "@/components/ui/button";
import { TextAreaField } from "@/components/meal-plan/textarea-field";
import { buildMealPlanChatQuery } from "@/lib/meal-plan-chat-query";
import { setMealPlanChatSession } from "@/lib/meal-plan-ai-saves";
import {
  createMealPlan,
  getMealPlan,
  updateMealPlan,
  type MealPlanInput,
} from "@/lib/meal-plans-storage";

const MIN_INGREDIENTS_LEN = 12;

function CreateMealPlanForm({ editId }: { editId: string | null }) {
  const router = useRouter();
  const existing = editId ? getMealPlan(editId) : undefined;
  const editingId = existing?.id ?? null;

  const [planName, setPlanName] = useState(() =>
    existing ? (existing.planName === "Meal plan" ? "" : existing.planName) : ""
  );
  const [householdSize, setHouseholdSize] = useState(() =>
    existing ? String(existing.householdSize) : "2"
  );
  const [dietaryNotes, setDietaryNotes] = useState(() => existing?.dietaryNotes ?? "");
  const [allergies, setAllergies] = useState(() => existing?.allergies ?? "");
  const [proteinTarget, setProteinTarget] = useState(() => existing?.proteinTarget ?? "");
  const [ingredients, setIngredients] = useState(() => existing?.ingredients ?? "");
  const [touchedSubmit, setTouchedSubmit] = useState(false);

  const ingredientsError = useMemo(() => {
    if (!touchedSubmit && ingredients.trim().length === 0) return undefined;
    if (ingredients.trim().length > 0 && ingredients.trim().length < MIN_INGREDIENTS_LEN) {
      return `Add a bit more detail (at least ${MIN_INGREDIENTS_LEN} characters).`;
    }
    return undefined;
  }, [ingredients, touchedSubmit]);

  const isValid =
    ingredients.trim().length >= MIN_INGREDIENTS_LEN &&
    Number(householdSize) >= 1 &&
    Number(householdSize) <= 20;

  function buildPayload(): MealPlanInput {
    return {
      planName: planName.trim() || "Meal plan",
      householdSize: Number(householdSize),
      dietaryNotes: dietaryNotes.trim(),
      ingredients: ingredients.trim(),
      proteinTarget: proteinTarget.trim(),
      allergies: allergies.trim(),
    };
  }

  /** Saves intake draft; returns draft id + display name for the planner session. */
  function persistDraft(): { draftId: string; planName: string } | null {
    if (!isValid) return null;
    const payload = buildPayload();
    if (editingId) {
      updateMealPlan(editingId, payload);
      return { draftId: editingId, planName: payload.planName };
    }
    const rec = createMealPlan(payload);
    return { draftId: rec.id, planName: rec.planName };
  }

  function continueToPlannerChat() {
    setTouchedSubmit(true);
    if (!isValid) return;
    const meta = persistDraft();
    if (!meta) return;
    setMealPlanChatSession({ draftId: meta.draftId, planName: meta.planName });
    const payload = buildPayload();
    const qs = buildMealPlanChatQuery({
      planName: payload.planName,
      householdSize: payload.householdSize,
      ingredients: payload.ingredients,
      dietaryNotes: payload.dietaryNotes,
      allergies: payload.allergies || "none",
      proteinTarget: payload.proteinTarget || "not specified",
    });
    router.push(`/meal-plan/chat?${qs}`);
  }

  function saveDraftOnly(e: FormEvent) {
    e.preventDefault();
    setTouchedSubmit(true);
    if (!isValid) return;
    persistDraft();
    router.push("/meal-plan/saved");
  }

  return (
    <div className="relative flex min-h-screen flex-col bg-[var(--background)] text-[var(--foreground)]">
      <MealPlanPageBackdrop />

      <AppNavbar />
      <main className="relative z-10 mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        <div className="mb-6 space-y-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm font-medium text-[var(--muted-text)] transition-colors duration-200 hover:text-[var(--foreground)]"
          >
            <IconArrowLeft size={18} stroke={1.75} aria-hidden />
            Back to dashboard
          </Link>

          <FormCard
            title={editingId ? "Edit meal plan intake" : "Create meal plan"}
            subtitle="Fill your details, then open the planner chat—it suggests meals using /api/query (recipe-backed). Save replies you like from that chat. Main Chef chat stays separate."
          >
            <form className="space-y-5" onSubmit={saveDraftOnly} noValidate>
              <InputField
                label="Plan name"
                placeholder='e.g. "Week of healthy dinners"'
                value={planName}
                onChange={(e) => setPlanName(e.target.value)}
                helperText="Optional — ties saved drafts and planner replies together."
                autoComplete="off"
              />

              <InputField
                label="Household size"
                type="number"
                min={1}
                max={20}
                required
                inputMode="numeric"
                placeholder="2"
                value={householdSize}
                onChange={(e) => setHouseholdSize(e.target.value)}
                helperText="How many people should portions roughly cover?"
              />

              <TextAreaField
                label="Dietary notes"
                placeholder='e.g. "High protein, vegetarian weekdays"'
                value={dietaryNotes}
                onChange={(e) => setDietaryNotes(e.target.value)}
                helperText="General preferences (not the same as allergies)."
                rows={3}
              />

              <InputField
                label="Allergies"
                placeholder='e.g. "Shellfish, peanuts" or "none"'
                value={allergies}
                onChange={(e) => setAllergies(e.target.value)}
                helperText="Important safety — passed straight into the planner prompt."
                autoComplete="off"
              />

              <InputField
                label="Protein target (optional)"
                placeholder='e.g. "120" for grams/day, or "not specified"'
                value={proteinTarget}
                onChange={(e) => setProteinTarget(e.target.value)}
                helperText="Rough grams/day if you track protein; otherwise leave blank."
                autoComplete="off"
              />

              <TextAreaField
                label="Ingredients & pantry"
                required
                placeholder={
                  "Chicken breast, basmati rice, spinach, Greek yogurt, lemons…\n\nList what you already have (one per line is fine)."
                }
                value={ingredients}
                onChange={(e) => setIngredients(e.target.value)}
                error={ingredientsError}
                helperText={
                  touchedSubmit || ingredients.length > 0
                    ? undefined
                    : `Need at least ${MIN_INGREDIENTS_LEN} characters so the planner has enough context.`
                }
                rows={6}
              />

              <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs leading-relaxed text-[var(--muted-text)]">
                  Drafts use browser storage. Planner replies you save from chat appear under Saved → “Planner replies”.
                </p>
                <Link
                  href="/chat-bot-chef"
                  className="text-xs font-medium text-[var(--accent)] underline-offset-4 transition-colors hover:underline"
                >
                  Main Chef chat →
                </Link>
              </div>

              {!isValid ? (
                <p className="text-center text-xs text-[var(--muted-text)]" role="status">
                  Add pantry details ({MIN_INGREDIENTS_LEN}+ chars), household 1–20, then continue.
                </p>
              ) : null}

              <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
                <Button
                  type="button"
                  onClick={continueToPlannerChat}
                  disabled={!isValid}
                  variant="primary"
                  className="inline-flex flex-1 items-center justify-center gap-2 px-6 py-3 text-sm font-medium shadow-sm disabled:pointer-events-none disabled:opacity-45"
                >
                  <IconMessages size={18} stroke={1.75} aria-hidden />
                  Continue to planner chat
                </Button>
                <PrimaryButton type="submit" disabled={!isValid} className="sm:max-w-[200px]">
                  <span className="inline-flex items-center justify-center gap-2">
                    <IconBookmark size={18} stroke={1.75} aria-hidden />
                    Save draft only
                  </span>
                </PrimaryButton>
              </div>
            </form>
          </FormCard>
        </div>
      </main>
    </div>
  );
}

function CreateMealPlanRouteInner() {
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const formKey = editId ?? "new";
  return <CreateMealPlanForm key={formKey} editId={editId} />;
}

export default function CreateMealPlanPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[var(--background)] text-[var(--muted-text)]">
          Loading…
        </div>
      }
    >
      <CreateMealPlanRouteInner />
    </Suspense>
  );
}
