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
        "flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm transition-all duration-200",
        "max-h-[min(80vh,calc(100dvh-5.75rem))]",
        className,
      )}
    >
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--border)] pb-3 transition-all duration-200">
        <Link
          href="/"
          className="group flex min-w-0 flex-1 items-center gap-3 rounded-xl py-1 pr-2 transition-all duration-200 hover:bg-[color-mix(in_srgb,var(--foreground)_6%,transparent)] motion-safe:active:scale-[0.99]"
          aria-label="Go to homepage"
        >
          <ChefAvatar size={36} sizeSm={40} className="shrink-0" />
          <div className="min-w-0 text-left">
            <h2 className="truncate text-xl font-semibold tracking-tight text-[var(--foreground)]">{title}</h2>
            {subtitle ? (
              <p className="truncate text-xs leading-relaxed text-[var(--muted-text)]">{subtitle}</p>
            ) : null}
          </div>
        </Link>
        {headerRight ? <div className="flex shrink-0 items-center gap-2">{headerRight}</div> : null}
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 pt-4">{children}</div>
    </div>
  );
}
