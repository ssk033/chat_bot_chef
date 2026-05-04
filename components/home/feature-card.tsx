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
          "theme-panel group/card flex min-h-[260px] h-full w-full max-w-none flex-col gap-5 rounded-2xl p-6 text-left transition-all duration-200 sm:min-h-[270px]",
          "shadow-[0_12px_38px_-14px_rgba(15,23,42,0.18)] ring-1 ring-black/[0.05] dark:shadow-[0_14px_40px_-12px_rgba(0,0,0,0.5)] dark:ring-white/[0.08]",
          "motion-safe:hover:scale-[1.02] motion-safe:hover:shadow-xl motion-safe:hover:ring-[var(--accent)]/22",
          "hover:bg-[color-mix(in_srgb,var(--surface-muted)_55%,var(--surface)_45%)] dark:hover:bg-[color-mix(in_srgb,var(--surface-muted)_88%,var(--foreground)_10%)]"
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
