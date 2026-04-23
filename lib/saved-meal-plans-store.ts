export type SavedMealPlan = {
  id: string;
  name: string;
  content: string;
  createdAt: string;
};

const STORAGE_KEY = "meal_it_saved_plans";

const listeners = new Set<() => void>();
const EMPTY_PLANS: SavedMealPlan[] = [];
let cachedRaw: string | null = null;
let cachedPlans: SavedMealPlan[] = EMPTY_PLANS;

function parsePlans(raw: string | null): SavedMealPlan[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed as SavedMealPlan[];
  } catch {
    return [];
  }
}

export function subscribeSavedMealPlans(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  if (typeof window !== "undefined") {
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) onStoreChange();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(onStoreChange);
      window.removeEventListener("storage", onStorage);
    };
  }
  return () => {
    listeners.delete(onStoreChange);
  };
}

export function getSavedMealPlansSnapshot(): SavedMealPlan[] {
  if (typeof window === "undefined") return EMPTY_PLANS;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === cachedRaw) return cachedPlans;
  cachedRaw = raw;
  cachedPlans = parsePlans(raw);
  return cachedPlans;
}

export function getSavedMealPlansServerSnapshot(): SavedMealPlan[] {
  return EMPTY_PLANS;
}

export function setSavedMealPlans(plans: SavedMealPlan[]) {
  if (typeof window === "undefined") return;
  const raw = JSON.stringify(plans);
  cachedRaw = raw;
  cachedPlans = plans;
  localStorage.setItem(STORAGE_KEY, raw);
  listeners.forEach((l) => l());
}
