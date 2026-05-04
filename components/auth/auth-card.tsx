import type { ReactNode } from "react";
import { twMerge } from "tailwind-merge";

type AuthCardProps = {
  children: ReactNode;
  className?: string;
};

export function AuthCard({ children, className }: AuthCardProps) {
  return (
    <div
      className={twMerge(
        "auth-enter rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface)_90%,transparent)] p-8 shadow-[0_12px_40px_-10px_rgba(15,23,42,0.2)] ring-1 ring-black/[0.04] backdrop-blur-xl dark:bg-[color-mix(in_srgb,var(--surface)_82%,transparent)] dark:shadow-[0_10px_34px_-8px_rgba(0,0,0,0.55)] dark:ring-white/[0.06] sm:p-9",
        className
      )}
    >
      {children}
    </div>
  );
}
