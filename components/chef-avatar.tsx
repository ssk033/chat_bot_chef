"use client";

import type { CSSProperties } from "react";
import { IconChefHat } from "@tabler/icons-react";
import { twMerge } from "tailwind-merge";

export type ChefAvatarProps = {
  /** Outer width & height in px (default breakpoint). */
  size?: number;
  /** Optional larger size from `sm` and up (for responsive header, etc.). */
  sizeSm?: number;
  /** Hover emphasis for chrome (sidebar, headers); omit in message lists. */
  interactive?: boolean;
  className?: string;
};

/**
 * Unified Chef mark — always `IconChefHat` from Tabler.
 * Colors come only from theme tokens (`--accent`, `--accent-muted`, `--icon-green`).
 */
export function ChefAvatar({ size = 32, sizeSm, interactive = false, className }: ChefAvatarProps) {
  const outerMax = Math.max(size, sizeSm ?? size);
  const iconPx = Math.min(Math.max(Math.round(outerMax * 0.52), 14), outerMax - 8);

  const style: CSSProperties =
    sizeSm != null
      ? ({
          "--chef-av": `${size}px`,
          "--chef-av-sm": `${sizeSm}px`,
        } as CSSProperties)
      : { width: size, height: size };

  return (
    <span
      className={twMerge(
        "inline-flex shrink-0 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--accent)_14%,var(--surface-muted))] text-[var(--accent)] shadow-sm ring-1 ring-[var(--border-subtle)]",
        sizeSm != null && "h-[var(--chef-av)] w-[var(--chef-av)] sm:h-[var(--chef-av-sm)] sm:w-[var(--chef-av-sm)]",
        interactive &&
          "cursor-default transition-all duration-200 motion-safe:hover:scale-105 motion-safe:hover:bg-[color-mix(in_srgb,var(--accent)_18%,var(--surface-muted))] motion-safe:active:scale-[0.98]",
        className
      )}
      style={style}
      aria-hidden
    >
      <IconChefHat size={iconPx} stroke={1.75} className="shrink-0 text-[var(--accent)]" aria-hidden />
    </span>
  );
}

type UserAvatarProps = {
  initials: string;
  className?: string;
};

export function UserAvatar({ initials, className }: UserAvatarProps) {
  const letter = initials.trim().slice(0, 2).toUpperCase() || "?";
  return (
    <span
      className={twMerge(
        "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--user-bubble-bg)] text-[11px] font-semibold text-[var(--user-bubble-fg)] shadow-sm ring-1 ring-[var(--border-subtle)]",
        className
      )}
      aria-hidden
    >
      {letter}
    </span>
  );
}
