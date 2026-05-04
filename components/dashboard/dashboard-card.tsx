"use client";

import { IconBookmark, IconCalendarPlus, IconCamera, IconChartBar } from "@tabler/icons-react";
import type { FeatureTablerIcon } from "@/components/feature-icon";
import { ActionButton, type ActionButtonVariant } from "@/components/dashboard/action-button";
import { SurfaceCard } from "@/components/ui/card";
import { cn } from "@/lib/utils";

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
    <SurfaceCard className={cn("flex min-h-[200px] flex-col justify-between gap-3", className)}>
      <div className="flex flex-col gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--accent)_14%,var(--surface))] p-2 text-[var(--accent)] ring-1 ring-[color-mix(in_srgb,var(--accent)_28%,var(--border-subtle))]">
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
    </SurfaceCard>
  );
}
