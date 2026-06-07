import { z } from "zod";

export const RecipeItemSchema = z.object({
  title: z.string().min(1),
  ingredients: z.array(z.string()).min(1),
  instructions: z.array(z.string()).min(1),
  cuisine: z.string().optional().nullable(),
  servings: z.union([z.string(), z.number()]).optional().nullable(),
  caloriesLine: z.string().optional().nullable(),
});

export const RecipeResponseSchema = z.object({
  intro: z.string().optional().default(""),
  recipes: z.array(RecipeItemSchema),
});

export type RecipeItemJson = z.infer<typeof RecipeItemSchema>;
export type RecipeResponseJson = z.infer<typeof RecipeResponseSchema>;

export function extractJsonCandidate(raw: string): unknown | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("{")) {
    try {
      return JSON.parse(trimmed) as unknown;
    } catch {
      /* continue */
    }
  }

  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence?.[1]) {
    try {
      return JSON.parse(fence[1].trim()) as unknown;
    } catch {
      /* continue */
    }
  }

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try {
      return JSON.parse(trimmed.slice(start, end + 1)) as unknown;
    } catch {
      return null;
    }
  }

  return null;
}

/** Accept `{ recipes: [...] }` or a bare array of recipe objects. */
export function parseRecipeJson(raw: string): RecipeResponseJson | null {
  const candidate = extractJsonCandidate(raw);
  if (candidate == null) return null;

  let payload: unknown = candidate;
  if (Array.isArray(candidate)) {
    payload = { intro: "", recipes: candidate };
  }

  const parsed = RecipeResponseSchema.safeParse(payload);
  if (!parsed.success) return null;
  return parsed.data;
}

export function servingsToString(servings: string | number | null | undefined): string | null {
  if (servings == null || servings === "") return null;
  return String(servings);
}
