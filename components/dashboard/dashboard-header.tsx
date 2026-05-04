import type { ReactNode } from "react";
import { SurfaceCard } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type DashboardHeaderProps = {
  title: string;
  subtitle: string;
  action?: ReactNode;
  className?: string;
};

export function DashboardHeader({ title, subtitle, action, className }: DashboardHeaderProps) {
  return (
    <SurfaceCard
      className={cn(
        "flex flex-col gap-6 p-6 transition-all duration-200 md:flex-row md:items-center md:justify-between md:gap-8 md:p-8",
        className
      )}
    >
      <header className="min-w-0 space-y-3">
        <h1 className="text-xl font-semibold tracking-tight text-[var(--foreground)]">{title}</h1>
        <p className="max-w-xl text-sm leading-relaxed text-[var(--muted-text)]">{subtitle}</p>
      </header>
      {action ? <div className="flex shrink-0 flex-wrap items-center gap-3 md:justify-end">{action}</div> : null}
    </SurfaceCard>
  );
}
