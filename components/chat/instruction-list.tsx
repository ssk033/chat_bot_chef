"use client";

import { sanitizeAssistantDisplayText } from "@/lib/sanitize-chat-display";

type InstructionListProps = {
  steps: string[];
  className?: string;
};

export function InstructionList({ steps, className }: InstructionListProps) {
  if (steps.length === 0) return null;

  return (
    <ol className={className ?? "list-none space-y-4 pl-0"}>
      {steps.map((step, idx) => (
        <li key={idx} className="flex gap-3.5 break-words text-[15px] leading-[1.65] text-[var(--foreground)]">
          <span
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--accent)_14%,var(--surface))] text-xs font-semibold text-[var(--accent)] ring-1 ring-[color-mix(in_srgb,var(--accent)_22%,var(--border))]"
            aria-hidden
          >
            {idx + 1}
          </span>
          <span className="min-w-0 flex-1 pt-0.5">{sanitizeAssistantDisplayText(step)}</span>
        </li>
      ))}
    </ol>
  );
}
