"use client";

import Link from "next/link";
import { ChefAvatar } from "@/components/chef-avatar";

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
      <ChefAvatar size={compact ? 34 : 36} sizeSm={compact ? undefined : 40} />
      <span className="min-w-0">
        <span className="block truncate text-base font-semibold tracking-tight text-[var(--foreground)]">
          {title}
        </span>
        {subtitle ? (
          <span className="block truncate text-xs text-[var(--muted-text)]">{subtitle}</span>
        ) : null}
      </span>
    </Link>
  );
}
