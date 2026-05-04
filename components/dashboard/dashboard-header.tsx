import type { ReactNode } from "react";
import { twMerge } from "tailwind-merge";

type DashboardHeaderProps = {
  title: string;
  subtitle: string;
  action?: ReactNode;
  className?: string;
};

export function DashboardHeader({ title, subtitle, action, className }: DashboardHeaderProps) {
  return (
    <header
      className={twMerge(
        "mb-10 flex flex-col gap-6 rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface)_88%,transparent)] p-6 shadow-[0_14px_40px_-12px_rgba(15,23,42,0.18)] ring-1 ring-black/[0.05] backdrop-blur-xl md:flex-row md:items-center md:justify-between md:gap-8 md:p-8 dark:bg-[color-mix(in_srgb,var(--surface)_82%,transparent)] dark:shadow-[0_16px_44px_-14px_rgba(0,0,0,0.5)] dark:ring-white/[0.07]",
        className
      )}
    >
      <div className="min-w-0 space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)]">{title}</h1>
        <p className="max-w-xl text-sm leading-relaxed text-[var(--muted-text)] md:text-base">{subtitle}</p>
      </div>
      {action ? <div className="flex shrink-0 flex-wrap items-center gap-3 md:justify-end">{action}</div> : null}
    </header>
  );
}
