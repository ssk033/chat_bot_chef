import { buildCursorChefPrompt, type ChefChatTurn, type ChefCursorContext } from "@/lib/chef-cursor-prompt";
import { completeChefWithCursor, isCursorChefConfigured } from "@/lib/cursor-chef-client";
import { formatRecipesJsonReply } from "@/lib/format-recipe-response";
import { parseRecipeJson } from "@/lib/recipe-response-schema";
import type { QueryConstraints } from "@/lib/query-constraints";

export type ChefFallbackInput = Omit<ChefCursorContext, "fallbackReasons"> & {
  fallbackReasons: string[];
};

export type ChefFallbackOutcome = {
  reply: string;
  source: "cursor" | "static";
  cursorUsed: boolean;
};

function wrapProseAsReply(intro: string): string {
  const trimmed = intro.trim();
  if (!trimmed) {
    return JSON.stringify({ intro: "Here are some ideas to get you started.", recipes: [] });
  }
  return JSON.stringify({ intro: trimmed, recipes: [] });
}

export function normalizeCursorChefReply(raw: string): string {
  const parsed = parseRecipeJson(raw);
  if (parsed) {
    return JSON.stringify({
      intro: parsed.intro ?? "",
      recipes: parsed.recipes,
    });
  }

  const trimmed = raw.trim();
  if (trimmed.startsWith("{")) {
    return wrapProseAsReply(trimmed);
  }

  return wrapProseAsReply(trimmed);
}

export function buildStaticChefFallbackReply(
  message: string,
  constraints: QueryConstraints
): string {
  if (constraints.requiredIngredients.length === 1) {
    return formatRecipesJsonReply(
      `I couldn't find a stored recipe with ${constraints.requiredIngredients[0]}, but you can sauté it with onion, garlic, and spices for a quick side, or add it to a simple curry base (tomato, ginger, cumin). Tell me what else is in your pantry and I'll suggest a full dish.`,
      []
    );
  }
  if (constraints.requiredIngredients.length > 1) {
    return formatRecipesJsonReply(
      `No exact match for ${constraints.requiredIngredients.join(", ")} in our recipe library. Try a stir-fry or one-pot rice dish using those ingredients — list any extras you have (oil, spices, yogurt) and I'll outline steps.`,
      []
    );
  }
  return formatRecipesJsonReply(
    `I don't have a strong database match for "${message.slice(0, 120)}". Share ingredients you have on hand, a cuisine you prefer, or whether you want something quick vs. special-occasion — I'll suggest a practical recipe either way.`,
    []
  );
}

export async function invokeChefCursorFallback(
  input: ChefFallbackInput
): Promise<ChefFallbackOutcome> {
  if (!isCursorChefConfigured()) {
    return {
      reply: buildStaticChefFallbackReply(input.userQuery, input.constraints),
      source: "static",
      cursorUsed: false,
    };
  }

  const prompt = buildCursorChefPrompt(input);

  try {
    const result = await completeChefWithCursor(prompt);
    if (result.ok) {
      return {
        reply: normalizeCursorChefReply(result.text),
        source: "cursor",
        cursorUsed: true,
      };
    }
    if (process.env.NODE_ENV === "development" && "error" in result) {
      console.warn("[chef-fallback] Cursor unavailable:", result.error);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn("[chef-fallback] Cursor error:", msg);
  }

  return {
    reply: buildStaticChefFallbackReply(input.userQuery, input.constraints),
    source: "static",
    cursorUsed: false,
  };
}

export type { ChefChatTurn };
