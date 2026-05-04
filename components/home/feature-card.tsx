"use client";

import {
  IconBookmark,
  IconCalendarPlus,
  IconCamera,
  IconChartBar,
  IconMessageCircle,
} from "@tabler/icons-react";
import { FeatureIcon, type FeatureTablerIcon } from "@/components/feature-icon";
import { CardBody, CardContainer, CardItem } from "@/components/ui/3d-card";
import { cn } from "@/lib/utils";

/** Serializable across Server → Client boundary (icons resolved inside this module only). */
export type FeatureIconId = "talk-chef" | "create-meal" | "nutrition" | "food-recognition" | "save-meal";

const ICON_MAP: Record<FeatureIconId, FeatureTablerIcon> = {
  "talk-chef": IconMessageCircle,
  "create-meal": IconCalendarPlus,
  nutrition: IconChartBar,
  "food-recognition": IconCamera,
  "save-meal": IconBookmark,
};

export type FeatureCardProps = {
  title: string;
  description: string;
  iconId: FeatureIconId;
  className?: string;
};

export function FeatureCard({ title, description, iconId, className }: FeatureCardProps) {
  const IconComponent = ICON_MAP[iconId];

  return (
    <CardContainer containerClassName="py-0" className={cn("flex h-full w-full flex-col", className)}>
      <CardBody
        className={cn(
          "theme-panel group/card flex min-h-[260px] h-full w-full max-w-none flex-col gap-5 rounded-2xl border border-[var(--border-subtle)] p-6 text-left transition-all duration-200 sm:min-h-[270px]",
          "shadow-[0_12px_38px_-14px_color-mix(in_srgb,var(--foreground)_14%,transparent)] ring-1 ring-[var(--border-subtle)]",
          "motion-safe:hover:scale-[1.01] motion-safe:hover:shadow-lg motion-safe:hover:ring-[color-mix(in_srgb,var(--accent)_22%,var(--border-subtle))]",
          "hover:bg-[color-mix(in_srgb,var(--surface-muted)_55%,var(--surface)_45%)]"
        )}
      >
        <CardItem translateZ={50} className="w-full max-w-none">
          <FeatureIcon icon={IconComponent} />
        </CardItem>
        <CardItem as="h3" translateZ={70} className="w-full max-w-none text-lg font-semibold leading-snug text-[var(--foreground)]">
          {title}
        </CardItem>
        <CardItem as="p" translateZ={60} className="w-full max-w-none text-sm leading-relaxed text-[var(--muted-text)]">
          {description}
        </CardItem>
      </CardBody>
    </CardContainer>
  );
}
