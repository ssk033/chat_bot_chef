"use client";

import { IconClock, IconPhoto, IconTrash } from "@tabler/icons-react";
import type { FoodTrackerHistoryEntry } from "@/lib/food-tracker-history";
import { cn } from "@/lib/utils";

type FoodTrackerHistorySidebarProps = {
  entries: FoodTrackerHistoryEntry[];
  activeId: string | null;
  onSelect: (entry: FoodTrackerHistoryEntry) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
  className?: string;
};

function formatTime(ts: number): string {
  try {
    const d = new Date(ts);
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export function FoodTrackerHistorySidebar({
  entries,
  activeId,
  onSelect,
  onRemove,
  onClear,
  className,
}: FoodTrackerHistorySidebarProps) {
  return (
    <aside
      className={cn(
        "rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface)_85%,transparent)] shadow-[0_12px_36px_-14px_rgba(15,23,42,0.14)] ring-1 ring-black/[0.04] backdrop-blur-md dark:bg-[color-mix(in_srgb,var(--surface)_78%,transparent)] dark:shadow-[0_14px_40px_-12px_rgba(0,0,0,0.45)] dark:ring-white/[0.06]",
        "flex max-h-[min(70vh,560px)] flex-col overflow-hidden lg:max-h-[calc(100vh-8rem)]",
        className,
      )}
      aria-label="Upload history"
    >
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[var(--border-subtle)] px-4 py-3">
        <div className="flex items-center gap-2 min-w-0">
          <IconPhoto className="h-5 w-5 shrink-0 text-[var(--accent)]" stroke={1.75} aria-hidden />
          <div className="min-w-0">
            <h2 className="text-sm font-semibold tracking-tight text-[var(--foreground)]">History</h2>
            <p className="truncate text-xs text-[var(--muted-text)]">Saved on this device after analyse</p>
          </div>
        </div>
        {entries.length > 0 ? (
          <button
            type="button"
            onClick={onClear}
            className="shrink-0 rounded-lg px-2 py-1.5 text-xs font-medium text-[var(--muted-text)] transition hover:bg-[color-mix(in_srgb,var(--surface-muted)_80%,transparent)] hover:text-[var(--foreground)]"
          >
            Clear
          </button>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
        {entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center">
            <IconClock className="h-10 w-10 text-[var(--muted-text)] opacity-40" stroke={1.25} aria-hidden />
            <p className="text-sm text-[var(--muted-text)]">No uploads yet. Run analyse to save a snapshot here.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {entries.map((entry) => {
              const active = entry.id === activeId;
              return (
                <li key={entry.id}>
                  <div
                    className={cn(
                      "group flex gap-3 rounded-xl border p-2 transition",
                      active
                        ? "border-[color-mix(in_srgb,var(--accent)_45%,var(--border-subtle))] bg-[color-mix(in_srgb,var(--accent-muted)_55%,transparent)] ring-1 ring-[var(--accent)]/15"
                        : "border-transparent bg-[color-mix(in_srgb,var(--surface-muted)_45%,transparent)] hover:border-[var(--border-subtle)] hover:bg-[color-mix(in_srgb,var(--surface-muted)_72%,transparent)]",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => onSelect(entry)}
                      className="flex min-w-0 flex-1 gap-3 rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-focus)]"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={entry.thumbDataUrl}
                        alt=""
                        className="h-14 w-14 shrink-0 rounded-lg object-cover ring-1 ring-black/[0.06] dark:ring-white/[0.08]"
                      />
                      <span className="min-w-0 flex-1 py-0.5">
                        <span className="line-clamp-2 text-sm font-medium text-[var(--foreground)]">{entry.result.dish}</span>
                        <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[var(--muted-text)]">
                          <span>{entry.result.calories} kcal</span>
                          <span className="opacity-70">{formatTime(entry.createdAt)}</span>
                        </span>
                        <span className="mt-0.5 block truncate text-[11px] text-[var(--muted-text)] opacity-80" title={entry.filename}>
                          {entry.filename}
                        </span>
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemove(entry.id);
                      }}
                      className="flex h-9 w-9 shrink-0 items-center justify-center self-center rounded-lg text-[var(--muted-text)] opacity-70 transition hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400"
                      aria-label={`Remove ${entry.result.dish}`}
                    >
                      <IconTrash className="h-4 w-4" stroke={1.75} />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}
