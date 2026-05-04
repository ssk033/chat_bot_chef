export const MEAL_PLANS_STORAGE_KEY = "meal-it-saved-plans-v1";

const MEAL_PLANS_UPDATED_EVENT = "meal-it-plans-updated";
const EMPTY_JSON = "{\"plans\":[]}";

export type MealPlanRecord = {
  id: string;
  planName: string;
  householdSize: number;
  dietaryNotes: string;
  ingredients: string;
  /** Optional g/day hint for the planner chat */
  proteinTarget?: string;
  allergies?: string;
  createdAt: string;
  updatedAt: string;
};

type StoredShape = { plans: MealPlanRecord[] };

/** Stable snapshot for useSyncExternalStore (same reference until storage JSON changes). */
let snapshotJson: string | null = null;
let snapshotPlans: MealPlanRecord[] = [];

function readRaw(): StoredShape {
  if (typeof window === "undefined") return { plans: [] };
  try {
    const raw = localStorage.getItem(MEAL_PLANS_STORAGE_KEY);
    if (!raw) return { plans: [] };
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || !Array.isArray((parsed as StoredShape).plans)) {
      return { plans: [] };
    }
    return parsed as StoredShape;
  } catch {
    return { plans: [] };
  }
}

function writePlans(plans: MealPlanRecord[]) {
  snapshotJson = null;
  localStorage.setItem(MEAL_PLANS_STORAGE_KEY, JSON.stringify({ plans }));
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(MEAL_PLANS_UPDATED_EVENT));
  }
}

export function subscribeMealPlans(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};
  const localHandler = () => onStoreChange();
  const storageHandler = (e: StorageEvent) => {
    if (e.key === null || e.key === MEAL_PLANS_STORAGE_KEY) onStoreChange();
  };
  window.addEventListener(MEAL_PLANS_UPDATED_EVENT, localHandler);
  window.addEventListener("storage", storageHandler);
  return () => {
    window.removeEventListener(MEAL_PLANS_UPDATED_EVENT, localHandler);
    window.removeEventListener("storage", storageHandler);
  };
}

export function getMealPlansSnapshot(): MealPlanRecord[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(MEAL_PLANS_STORAGE_KEY);
  const json = raw ?? EMPTY_JSON;
  if (snapshotJson === json) return snapshotPlans;
  snapshotJson = json;
  try {
    const parsed = JSON.parse(json) as unknown;
    if (!parsed || typeof parsed !== "object" || !Array.isArray((parsed as StoredShape).plans)) {
      snapshotPlans = [];
    } else {
      snapshotPlans = (parsed as StoredShape).plans;
    }
  } catch {
    snapshotPlans = [];
  }
  return snapshotPlans;
}

export function getMealPlansServerSnapshot(): MealPlanRecord[] {
  return [];
}

export function listMealPlans(): MealPlanRecord[] {
  return readRaw().plans;
}

export function getMealPlan(id: string): MealPlanRecord | undefined {
  return listMealPlans().find((p) => p.id === id);
}

export type MealPlanInput = {
  planName: string;
  householdSize: number;
  dietaryNotes: string;
  ingredients: string;
  proteinTarget?: string;
  allergies?: string;
};

export function createMealPlan(input: MealPlanInput): MealPlanRecord {
  const plans = listMealPlans();
  const now = new Date().toISOString();
  const record: MealPlanRecord = {
    id: crypto.randomUUID(),
    planName: input.planName.trim() || "Meal plan",
    householdSize: input.householdSize,
    dietaryNotes: input.dietaryNotes.trim(),
    ingredients: input.ingredients.trim(),
    proteinTarget: input.proteinTarget?.trim() || "",
    allergies: input.allergies?.trim() || "",
    createdAt: now,
    updatedAt: now,
  };
  plans.unshift(record);
  writePlans(plans);
  return record;
}

export function updateMealPlan(id: string, input: MealPlanInput): MealPlanRecord | null {
  const plans = listMealPlans();
  const idx = plans.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  const prev = plans[idx];
  const updated: MealPlanRecord = {
    ...prev,
    planName: input.planName.trim() || "Meal plan",
    householdSize: input.householdSize,
    dietaryNotes: input.dietaryNotes.trim(),
    ingredients: input.ingredients.trim(),
    proteinTarget: input.proteinTarget?.trim() ?? prev.proteinTarget ?? "",
    allergies: input.allergies?.trim() ?? prev.allergies ?? "",
    updatedAt: new Date().toISOString(),
  };
  plans[idx] = updated;
  writePlans(plans);
  return updated;
}

export function deleteMealPlan(id: string): void {
  writePlans(listMealPlans().filter((p) => p.id !== id));
}
