/** Saved meal suggestions from `/meal-plan/chat` (legacy key — kept for compatibility). */

export const MEAL_AI_SAVED_PLANS_KEY = "meal_it_saved_plans";
const MEAL_AI_UPDATED_EVENT = "meal-it-ai-plans-updated";

export type AiSavedMealPlan = {
  id: string;
  name: string;
  content: string;
  createdAt: string;
};

let aiSnapshotJson: string | null = null;
let aiSnapshotList: AiSavedMealPlan[] = [];

function parseList(raw: string | null): AiSavedMealPlan[] {
  if (!raw) return [];
  try {
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data)) return [];
    return data.filter(
      (x): x is AiSavedMealPlan =>
        Boolean(x) &&
        typeof x === "object" &&
        typeof (x as AiSavedMealPlan).id === "string" &&
        typeof (x as AiSavedMealPlan).content === "string"
    );
  } catch {
    return [];
  }
}

export function listAiSavedPlans(): AiSavedMealPlan[] {
  if (typeof window === "undefined") return [];
  return parseList(localStorage.getItem(MEAL_AI_SAVED_PLANS_KEY));
}

export function subscribeAiSavedPlans(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};
  const h = () => onStoreChange();
  const storageHandler = (e: StorageEvent) => {
    if (e.key === null || e.key === MEAL_AI_SAVED_PLANS_KEY) onStoreChange();
  };
  window.addEventListener(MEAL_AI_UPDATED_EVENT, h);
  window.addEventListener("storage", storageHandler);
  return () => {
    window.removeEventListener(MEAL_AI_UPDATED_EVENT, h);
    window.removeEventListener("storage", storageHandler);
  };
}

export function getAiSavedPlansSnapshot(): AiSavedMealPlan[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(MEAL_AI_SAVED_PLANS_KEY);
  const json = raw ?? "[]";
  if (aiSnapshotJson === json) return aiSnapshotList;
  aiSnapshotJson = json;
  aiSnapshotList = parseList(raw);
  return aiSnapshotList;
}

export function getAiSavedPlansServerSnapshot(): AiSavedMealPlan[] {
  return [];
}

/** Uses the same cached snapshot as `getAiSavedPlansSnapshot` for stable references. */
export function getAiSavedPlanById(id: string): AiSavedMealPlan | undefined {
  return getAiSavedPlansSnapshot().find((p) => p.id === id);
}

export function appendAiSavedPlan(entry: { name: string; content: string; id?: string }): AiSavedMealPlan {
  const existing = listAiSavedPlans();
  const record: AiSavedMealPlan = {
    id: entry.id ?? crypto.randomUUID(),
    name: entry.name,
    content: entry.content,
    createdAt: new Date().toISOString(),
  };
  aiSnapshotJson = null;
  localStorage.setItem(MEAL_AI_SAVED_PLANS_KEY, JSON.stringify([record, ...existing]));
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(MEAL_AI_UPDATED_EVENT));
  }
  return record;
}

export function deleteAiSavedPlan(id: string): void {
  const next = listAiSavedPlans().filter((p) => p.id !== id);
  aiSnapshotJson = null;
  localStorage.setItem(MEAL_AI_SAVED_PLANS_KEY, JSON.stringify(next));
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(MEAL_AI_UPDATED_EVENT));
  }
}

/** Browser session: links chat saves to the intake draft name / id. */
export const MEAL_PLAN_CHAT_SESSION_KEY = "meal-plan-chat-session";

export type MealPlanChatSession = {
  draftId: string;
  planName: string;
};

export function setMealPlanChatSession(session: MealPlanChatSession) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(MEAL_PLAN_CHAT_SESSION_KEY, JSON.stringify(session));
}

export function getMealPlanChatSession(): MealPlanChatSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(MEAL_PLAN_CHAT_SESSION_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as MealPlanChatSession;
    if (!p?.draftId || typeof p.planName !== "string") return null;
    return p;
  } catch {
    return null;
  }
}
