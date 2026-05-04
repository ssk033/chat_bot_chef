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
        "mb-10 flex flex-col gap-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm transition hover:shadow-md md:flex-row md:items-center md:justify-between md:gap-8 md:p-8",
        className
      )}
    >
      <div className="min-w-0 space-y-2">
        <h1 className="text-xl font-semibold tracking-tight text-[var(--foreground)] md:text-2xl">{title}</h1>
        <p className="max-w-xl text-sm leading-relaxed text-[var(--muted-text)]">{subtitle}</p>
      </div>
      {action ? <div className="flex shrink-0 flex-wrap items-center gap-6 md:justify-end">{action}</div> : null}
    </header>
  );
}
