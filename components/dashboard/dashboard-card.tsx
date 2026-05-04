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
        "flex min-h-[200px] flex-col justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm transition-all duration-200 hover:shadow-md",
        className
      )}
    >
      <div className="flex flex-col gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--accent)_14%,var(--surface))] p-2 text-[var(--accent)] ring-1 ring-[color-mix(in_srgb,var(--accent)_28%,var(--border))]">
          <Icon size={22} stroke={1.75} aria-hidden />
        </div>
        <h2 className="text-xl font-semibold leading-snug text-[var(--foreground)]">{title}</h2>
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
