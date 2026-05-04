/**
 * Heuristic parser for recipe-shaped assistant messages (plain text / light markdown).
 * Returns null when structure is not confident enough — caller renders plain prose.
 */

export type ParsedRecipe = {
  title: string | null;
  ingredients: string[];
  steps: string[];
  caloriesLine: string | null;
  /** Introductory prose before structured sections */
  intro: string;
};

function cleanMarkdownHeading(s: string): string {
  return s
    .replace(/^#{1,6}\s+/, "")
    .replace(/^\*\*(.+)\*\*$/, "$1")
    .trim();
}

const SECTION_LINE =
  /^(#{1,6}\s*)?(\*\*)?\s*(Ingredients?|What you(?:'|’)ll need|What you need|You(?:'|’)ll need|Steps?|Instructions?|Directions?|Method|Cook(?:ing)? steps?|How to (?:make|cook)|Nutrition|Calories?)\s*(\*\*)?\s*[:.]?\s*$/i;

export function tryParseRecipe(raw: string): ParsedRecipe | null {
  const normalized = raw.replace(/\r\n/g, "\n").trim();
  if (!normalized || normalized.length < 28) return null;

  const lines = normalized.split("\n");
  const introLines: string[] = [];
  let title: string | null = null;
  const ingredients: string[] = [];
  const steps: string[] = [];
  let caloriesLine: string | null = null;

  type Mode = "seek" | "ing" | "steps";
  let mode: Mode = "seek";

  const pushIngredient = (text: string) => {
    const t = text.trim();
    if (t) ingredients.push(t);
  };

  const pushStep = (text: string) => {
    const t = text.trim();
    if (t) steps.push(t);
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      continue;
    }

    if (
      /calories?|kcal|nutrition|per serving|servings?:/i.test(trimmed) &&
      /\d/.test(trimmed) &&
      trimmed.length < 160
    ) {
      if (/cal|kcal|nutrition|serving/i.test(trimmed)) {
        caloriesLine = cleanMarkdownHeading(trimmed.replace(/\*\*/g, ""));
        continue;
      }
    }

    const secMatch = trimmed.match(SECTION_LINE);
    if (secMatch) {
      const key = secMatch[3].toLowerCase();
      if (
        key.startsWith("ingredient") ||
        key.includes("need") ||
        key.includes("you'll need") ||
        key.includes("what you")
      ) {
        mode = "ing";
        continue;
      }
      if (
        key.startsWith("step") ||
        key.startsWith("instruction") ||
        key.startsWith("direction") ||
        key === "method" ||
        key.includes("cook") ||
        key.includes("how to")
      ) {
        mode = "steps";
        continue;
      }
      if (key.includes("calorie") || key === "nutrition") {
        mode = "seek";
        caloriesLine = cleanMarkdownHeading(trimmed.replace(/\*\*/g, ""));
        continue;
      }
    }

    if (mode === "seek") {
      const hMatch = trimmed.match(/^#{1,6}\s+(.+)/);
      const boldMatch = trimmed.match(/^\*\*(.+)\*\*\s*$/);
      if ((hMatch || boldMatch) && !title && introLines.join("\n").trim() === "") {
        title = cleanMarkdownHeading(hMatch?.[1] ?? boldMatch?.[1] ?? "");
        continue;
      }

      if (/^[-*•·]\s+\S/.test(trimmed) && ingredients.length === 0 && steps.length === 0) {
        mode = "ing";
        pushIngredient(trimmed.replace(/^[-*•·]\s+/, ""));
        continue;
      }

      if (/^\d{1,2}[\.)]\s+\S/.test(trimmed) && steps.length === 0 && ingredients.length === 0) {
        mode = "steps";
        pushStep(trimmed.replace(/^\d{1,2}[\.)]\s+/, ""));
        continue;
      }

      introLines.push(line);
      continue;
    }

    if (mode === "ing") {
      if (/^\d{1,2}[\.)]\s+\S/.test(trimmed)) {
        mode = "steps";
        pushStep(trimmed.replace(/^\d{1,2}[\.)]\s+/, ""));
        continue;
      }
      if (/^[-*•·]\s+\S/.test(trimmed)) {
        pushIngredient(trimmed.replace(/^[-*•·]\s+/, ""));
        continue;
      }
      if (ingredients.length > 0 && trimmed.length < 220 && !SECTION_LINE.test(trimmed)) {
        ingredients[ingredients.length - 1] += ` ${trimmed}`;
        continue;
      }
      mode = "seek";
      introLines.push(line);
      continue;
    }

    if (mode === "steps") {
      if (/^[-*•·]\s+\S/.test(trimmed)) {
        mode = "ing";
        pushIngredient(trimmed.replace(/^[-*•·]\s+/, ""));
        continue;
      }
      if (/^\d{1,2}[\.)]\s+\S/.test(trimmed)) {
        pushStep(trimmed.replace(/^\d{1,2}[\.)]\s+/, ""));
        continue;
      }
      if (steps.length > 0 && trimmed.length < 280 && !SECTION_LINE.test(trimmed)) {
        steps[steps.length - 1] += ` ${trimmed}`;
        continue;
      }
      mode = "seek";
      introLines.push(line);
      continue;
    }
  }

  const intro = introLines.join("\n").trim();

  const valid =
    (ingredients.length >= 2 && steps.length >= 1) ||
    (ingredients.length >= 1 && steps.length >= 2);

  if (!valid) return null;

  return { title, ingredients, steps, caloriesLine, intro };
}
