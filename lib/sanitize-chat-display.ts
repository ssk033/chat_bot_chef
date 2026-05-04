/**
 * Cleans assistant-facing copy for display (does not alter API or stored messages).
 * Replaces em/en dash separators with comma spacing for natural reading.
 */
export function sanitizeAssistantDisplayText(text: string): string {
  if (!text) return text;
  let t = text.replace(/\s*[\u2014\u2013]\s*/g, ", ");
  t = t.replace(/\n-{3,}\n/g, "\n\n");
  t = t.replace(/^\s*-{3,}\s*$/gm, "");
  t = t.replace(/\s-\s-\s/g, ", ");
  t = t.replace(/\s{2,}/g, " ");
  t = t.replace(/,\s*,+/g, ", ");
  t = t.replace(/^\s*,\s*/, "");
  return t.trim();
}
