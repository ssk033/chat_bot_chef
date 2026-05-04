import type { ReactNode } from "react";
import { twMerge } from "tailwind-merge";

export type FormCardProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
};

export function FormCard({ title, subtitle, children, className }: FormCardProps) {
  return (
    <div
      className={twMerge(
        "rounded-2xl border border-[color-mix(in_srgb,var(--border)_90%,transparent)] bg-[color-mix(in_srgb,var(--surface)_68%,transparent)] p-6 shadow-[0_10px_30px_color-mix(in_srgb,var(--foreground)_12%,transparent)] backdrop-blur-xl ring-1 ring-black/[0.03] md:p-8",
        "dark:border-white/[0.09] dark:bg-[color-mix(in_srgb,var(--surface)_72%,transparent)] dark:shadow-[0_14px_40px_rgba(0,0,0,0.42)] dark:ring-white/[0.05]",
        className
      )}
    >
      <header className="space-y-2 border-b border-[color-mix(in_srgb,var(--border)_55%,transparent)] pb-6 dark:border-white/[0.06]">
        <h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)]">{title}</h1>
        {subtitle ? (
          <p className="text-base leading-relaxed text-[var(--muted-text)]">{subtitle}</p>
        ) : null}
      </header>
      <div className="pt-6">{children}</div>
    </div>
  );
}
