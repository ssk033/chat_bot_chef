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
        "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-[var(--accent-muted)] text-[var(--accent)] shadow-sm ring-1 ring-black/[0.04] transition-all duration-200 dark:ring-white/[0.06]",
        "group-hover/card:bg-[color-mix(in_srgb,var(--accent-muted)_55%,var(--icon-green)_45%)] group-hover/card:shadow-md group-hover/card:ring-[var(--accent)]/25",
        className
      )}
    >
      <Icon size={ICON_SIZE} stroke={STROKE} className="shrink-0 text-[var(--accent)]" aria-hidden />
    </div>
  );
}
