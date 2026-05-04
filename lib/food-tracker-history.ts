/** Snapshot saved with history (matches API / page result shape). */
export type FoodTrackerResultSnapshot = {
  dish: string;
  confidence: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
  demoMode?: boolean;
  backend?: "keras" | "foodx" | "clip";
  demoLowConfidence?: boolean;
  demoHint?: string;
  suppressedGuess?: string;
  clipLabelCount?: number;
};

export type FoodTrackerHistoryEntry = {
  id: string;
  createdAt: number;
  thumbDataUrl: string;
  filename: string;
  result: FoodTrackerResultSnapshot;
};

const STORAGE_KEY = "meal-it-food-tracker-history-v1";
const MAX_ENTRIES = 24;

export function loadFoodTrackerHistory(): FoodTrackerHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isHistoryEntry);
  } catch {
    return [];
  }
}

function isHistoryEntry(x: unknown): x is FoodTrackerHistoryEntry {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    typeof o.createdAt === "number" &&
    typeof o.thumbDataUrl === "string" &&
    typeof o.filename === "string" &&
    o.result !== null &&
    typeof o.result === "object" &&
    typeof (o.result as FoodTrackerResultSnapshot).dish === "string"
  );
}

export function persistFoodTrackerHistory(entries: FoodTrackerHistoryEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    try {
      const trimmed = entries.slice(0, Math.max(4, Math.floor(entries.length / 2)));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    } catch {
      /* quota — ignore */
    }
  }
}

export function prependFoodTrackerHistory(
  prev: FoodTrackerHistoryEntry[],
  entry: FoodTrackerHistoryEntry,
): FoodTrackerHistoryEntry[] {
  const next = [entry, ...prev.filter((e) => e.id !== entry.id)].slice(0, MAX_ENTRIES);
  persistFoodTrackerHistory(next);
  return next;
}

export function removeFoodTrackerHistoryEntry(
  prev: FoodTrackerHistoryEntry[],
  id: string,
): FoodTrackerHistoryEntry[] {
  const next = prev.filter((e) => e.id !== id);
  persistFoodTrackerHistory(next);
  return next;
}

export function clearFoodTrackerHistory(): FoodTrackerHistoryEntry[] {
  persistFoodTrackerHistory([]);
  return [];
}

export async function fileToThumbnailDataUrl(file: File, maxSide = 112): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let w = img.naturalWidth;
      let h = img.naturalHeight;
      const scale = Math.min(1, maxSide / Math.max(w, h));
      w = Math.max(1, Math.round(w * scale));
      h = Math.max(1, Math.round(h * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("No canvas context"));
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", 0.68));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Image load failed"));
    };
    img.src = url;
  });
}
