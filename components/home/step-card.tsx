"use client";

import { CardBody, CardContainer, CardItem } from "@/components/ui/3d-card";
import { cn } from "@/lib/utils";

export type StepCardProps = {
  step: number;
  title: string;
  description: string;
  className?: string;
};

export function StepCard({ step, title, description, className }: StepCardProps) {
  return (
    <CardContainer containerClassName="py-0" className={cn("flex h-full w-full flex-col", className)}>
      <CardBody
        className={cn(
          "theme-panel group/card flex min-h-[248px] h-full w-full max-w-none flex-col items-center rounded-2xl border border-[var(--border-subtle)] p-6 text-center transition-all duration-200",
          "shadow-[0_12px_38px_-14px_color-mix(in_srgb,var(--foreground)_12%,transparent)] ring-1 ring-[var(--border-subtle)]",
          "motion-safe:hover:scale-[1.01] motion-safe:hover:shadow-lg motion-safe:hover:ring-[color-mix(in_srgb,var(--accent)_22%,var(--border-subtle))]",
          "hover:bg-[color-mix(in_srgb,var(--surface-muted)_55%,var(--surface)_45%)]"
        )}
      >
        <CardItem translateZ={55} className="mx-auto mb-5 w-full max-w-none">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--accent)_16%,var(--surface-muted))] text-lg font-bold tabular-nums text-[var(--accent)] shadow-sm ring-2 ring-[color-mix(in_srgb,var(--accent)_28%,var(--border-subtle))]">
            {step}
          </div>
        </CardItem>
        <CardItem as="h3" translateZ={70} className="w-full max-w-none text-lg font-semibold leading-snug text-[var(--foreground)]">
          {title}
        </CardItem>
        <CardItem as="p" translateZ={58} className="mt-3 w-full max-w-none text-sm leading-relaxed text-[var(--muted-text)]">
          {description}
        </CardItem>
      </CardBody>
    </CardContainer>
  );
}
