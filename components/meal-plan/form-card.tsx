import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type FormCardProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
};

export function FormCard({ title, subtitle, children, className }: FormCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface)_94%,transparent)] p-6 shadow-sm backdrop-blur-xl transition-all duration-200 hover:shadow-md md:p-8",
        className
      )}
    >
      <header className="space-y-3 border-b border-[var(--border-subtle)] pb-6">
        <h1 className="text-xl font-semibold tracking-tight text-[var(--foreground)] sm:text-2xl">{title}</h1>
        {subtitle ? <p className="text-sm leading-relaxed text-[var(--muted-text)]">{subtitle}</p> : null}
      </header>
      <div className="pt-6">{children}</div>
    </div>
  );
}
