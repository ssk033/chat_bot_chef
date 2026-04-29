"use client";

import Link from "next/link";
import { IconChefHat } from "@tabler/icons-react";

type ChefLogoProps = {
  href?: string;
  title?: string;
  subtitle?: string;
  compact?: boolean;
  className?: string;
};

export function ChefLogo({
  href = "/",
  title = "Meal-IT!!",
  subtitle,
  compact = false,
  className = "",
}: ChefLogoProps) {
  return (
    <Link
      href={href}
      className={`group inline-flex items-center gap-2 rounded-lg transition hover:opacity-80 hover:scale-[1.02] ${className}`}
      aria-label="Go to homepage"
    >
      <span className="chef-icon-badge flex h-9 w-9 items-center justify-center rounded-lg sm:h-10 sm:w-10">
        <IconChefHat
          size={compact ? 20 : 22}
          stroke={1.8}
          aria-hidden
          className="text-emerald-950 dark:text-emerald-100"
        />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-base font-semibold tracking-tight text-gray-900 dark:text-white">
          {title}
        </span>
        {subtitle ? (
          <span className="block truncate text-xs text-[var(--muted-text)]">{subtitle}</span>
        ) : null}
      </span>
    </Link>
  );
}
