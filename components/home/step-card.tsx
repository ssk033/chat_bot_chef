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
          "theme-panel group/card flex min-h-[248px] h-full w-full max-w-none flex-col items-center rounded-2xl p-6 text-center transition-all duration-200",
          "shadow-[0_12px_38px_-14px_rgba(15,23,42,0.16)] ring-1 ring-black/[0.05] dark:shadow-[0_14px_40px_-12px_rgba(0,0,0,0.48)] dark:ring-white/[0.08]",
          "motion-safe:hover:scale-[1.02] motion-safe:hover:shadow-xl motion-safe:hover:ring-[var(--accent)]/22",
          "hover:bg-[color-mix(in_srgb,var(--surface-muted)_55%,var(--surface)_45%)] dark:hover:bg-[color-mix(in_srgb,var(--surface-muted)_88%,var(--foreground)_10%)]"
        )}
      >
        <CardItem translateZ={55} className="mx-auto mb-5 w-full max-w-none">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--accent-muted)] text-lg font-bold tabular-nums text-[var(--accent)] shadow-sm ring-2 ring-[var(--accent)]/20">
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
