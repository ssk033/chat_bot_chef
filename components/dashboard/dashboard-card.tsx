"use client";

import { IconBookmark, IconCalendarPlus, IconCamera, IconChartBar } from "@tabler/icons-react";
import type { FeatureTablerIcon } from "@/components/feature-icon";
import { ActionButton, type ActionButtonVariant } from "@/components/dashboard/action-button";
import { twMerge } from "tailwind-merge";

export type DashboardCardIconId = "meal" | "saved" | "nutrition" | "food";

const ICON_MAP: Record<DashboardCardIconId, FeatureTablerIcon> = {
  meal: IconCalendarPlus,
  saved: IconBookmark,
  nutrition: IconChartBar,
  food: IconCamera,
};

type DashboardCardProps = {
  title: string;
  description: string;
  href: string;
  cta: string;
  iconId: DashboardCardIconId;
  buttonVariant?: ActionButtonVariant;
  className?: string;
};

export function DashboardCard({
  title,
  description,
  href,
  cta,
  iconId,
  buttonVariant = "secondary",
  className,
}: DashboardCardProps) {
  const Icon = ICON_MAP[iconId];

  return (
    <div
      className={twMerge(
        "flex min-h-[200px] flex-col justify-between space-y-3 rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface)_85%,transparent)] p-6 shadow-[0_12px_36px_-14px_rgba(15,23,42,0.14)] ring-1 ring-black/[0.04] backdrop-blur-md transition-all duration-200 dark:bg-[color-mix(in_srgb,var(--surface)_78%,transparent)] dark:shadow-[0_14px_40px_-12px_rgba(0,0,0,0.45)] dark:ring-white/[0.06]",
        "motion-safe:hover:scale-[1.02] motion-safe:hover:bg-[color-mix(in_srgb,var(--surface-muted)_70%,var(--surface)_30%)] motion-safe:hover:shadow-lg motion-safe:hover:ring-[var(--accent)]/18",
        className
      )}
    >
      <div className="space-y-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--accent-muted)] p-2 text-[var(--accent)] ring-1 ring-[color-mix(in_srgb,var(--accent)_22%,transparent)]">
          <Icon size={22} stroke={1.75} aria-hidden />
        </div>
        <h2 className="text-lg font-semibold leading-snug text-[var(--foreground)]">{title}</h2>
        <p className="text-sm leading-relaxed text-[var(--muted-text)]">{description}</p>
      </div>
      <div className="pt-2">
        <ActionButton href={href} variant={buttonVariant}>
          {cta}
        </ActionButton>
      </div>
    </div>
  );
}
