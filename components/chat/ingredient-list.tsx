"use client";

import { sanitizeAssistantDisplayText } from "@/lib/sanitize-chat-display";

type IngredientListProps = {
  items: string[];
  className?: string;
};

export function IngredientList({ items, className }: IngredientListProps) {
  if (items.length === 0) return null;

  return (
    <ul className={className ?? "list-none space-y-2.5 pl-0"}>
      {items.map((item, idx) => (
        <li key={idx} className="flex gap-3 break-words text-[15px] leading-[1.65] text-[var(--foreground)]">
          <span
            className="mt-[0.55rem] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]"
            aria-hidden
          />
          <span className="min-w-0 flex-1">{sanitizeAssistantDisplayText(item)}</span>
        </li>
      ))}
    </ul>
  );
}
