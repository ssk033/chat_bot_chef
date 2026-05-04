"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ChefAvatar } from "@/components/chef-avatar";
import { cn } from "@/lib/utils";

export type AssistantModalProps = {
  title: string;
  subtitle?: string;
  headerRight?: ReactNode;
  children: ReactNode;
  className?: string;
};

/**
 * Premium glass panel for the chef assistant (scroll + composer live inside `children`).
 */
export function AssistantModal({ title, subtitle, headerRight, children, className }: AssistantModalProps) {
  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface)_90%,transparent)] p-4 shadow-[0_16px_44px_-18px_rgba(15,23,42,0.35)] backdrop-blur-xl transition-all duration-200 dark:border-white/10 dark:bg-[color-mix(in_srgb,var(--foreground)_5%,transparent)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.6)]",
        "max-h-[min(80vh,calc(100dvh-5.75rem))]",
        className,
      )}
    >
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--border-subtle)] pb-3 transition-all duration-200 dark:border-white/10">
        <Link
          href="/"
          className="group flex min-w-0 flex-1 items-center gap-3 rounded-xl py-1 pr-2 transition-all duration-200 hover:bg-[color-mix(in_srgb,var(--foreground)_6%,transparent)] motion-safe:active:scale-[0.99]"
          aria-label="Go to homepage"
        >
          <ChefAvatar size={36} sizeSm={40} className="shrink-0" />
          <div className="min-w-0 text-left">
            <h2 className="truncate font-semibold text-lg tracking-tight text-[var(--foreground)]">{title}</h2>
            {subtitle ? (
              <p className="truncate text-xs text-[color-mix(in_srgb,var(--foreground)_58%,transparent)] dark:text-white/60">{subtitle}</p>
            ) : null}
          </div>
        </Link>
        {headerRight ? <div className="flex shrink-0 items-center gap-2">{headerRight}</div> : null}
      </div>

      <div className="flex min-h-0 flex-1 flex-col pt-3">{children}</div>
    </div>
  );
}
