import type { ComponentType } from "react";
import { twMerge } from "tailwind-merge";

/** Shared Tabler icon props surface used by `@tabler/icons-react`. */
export type FeatureTablerIcon = ComponentType<{
  size?: number | string;
  stroke?: number | string;
  className?: string;
  "aria-hidden"?: boolean;
}>;

const ICON_SIZE = 22;
const STROKE = 1.75;

export type FeatureIconProps = {
  icon: FeatureTablerIcon;
  className?: string;
};

/**
 * Uniform feature icon shell for homepage cards — outline icons, fixed stroke/size,
 * palette from CSS variables only (`--accent`, `--accent-muted`).
 */
export function FeatureIcon({ icon: Icon, className }: FeatureIconProps) {
  return (
    <div
      className={twMerge(
        "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--accent)_14%,var(--surface-muted))] text-[var(--accent)] shadow-sm transition-all duration-200",
        "group-hover/card:bg-[color-mix(in_srgb,var(--accent)_18%,var(--surface-muted))] group-hover/card:shadow-md group-hover/card:ring-1 group-hover/card:ring-[color-mix(in_srgb,var(--accent)_22%,var(--border-subtle))]",
        className
      )}
    >
      <Icon size={ICON_SIZE} stroke={STROKE} className="shrink-0 text-[var(--accent)]" aria-hidden />
    </div>
  );
}
