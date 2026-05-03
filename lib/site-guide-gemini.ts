import type { Content } from "@google/generative-ai";

/**
 * Gemini expects alternating user/model turns starting with user.
 * Merge consecutive same-role turns so the SDK accepts the history.
 */
export function mergeAdjacentSameRole(history: Content[]): Content[] {
  const out: Content[] = [];
  for (const turn of history) {
    const role = turn.role;
    const text = turn.parts?.map((p) => ("text" in p ? String(p.text ?? "") : "")).join("") ?? "";
    if (!text.trim()) continue;

    if (out.length === 0) {
      if (role === "user") {
        out.push({ role: "user", parts: [{ text: text.trim() }] });
      }
      continue;
    }

    const prev = out[out.length - 1]!;
    if (prev.role !== role) {
      out.push({ role, parts: [{ text: text.trim() }] });
    } else {
      const prevPart = prev.parts?.[0];
      const prevText = prevPart && "text" in prevPart ? String(prevPart.text ?? "") : "";
      prev.parts = [{ text: `${prevText}\n\n${text}`.trim() }];
    }
  }
  return out;
}

export function responseTextSafe(response: {
  text: () => string;
  promptFeedback?: { blockReason?: string } | null;
}): string | null {
  const br = response.promptFeedback?.blockReason;
  if (br && br !== "BLOCK_REASON_UNSPECIFIED") return null;
  try {
    const t = response.text();
    const s = typeof t === "string" ? t.trim() : "";
    return s.length > 0 ? s : null;
  } catch {
    return null;
  }
}
