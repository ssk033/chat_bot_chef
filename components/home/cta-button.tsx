import Link from "next/link";
import type { ReactNode } from "react";
import { twMerge } from "tailwind-merge";

export type CTAButtonProps = {
  href: string;
  variant: "primary" | "secondary";
  children: ReactNode;
  iconRight?: ReactNode;
  className?: string;
};

export function CTAButton({ href, variant, children, iconRight, className }: CTAButtonProps) {
  if (variant === "primary") {
    return (
      <Link
        href={href}
        className={twMerge(
          "btn-solid inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-base font-medium transition-all duration-200",
          "bg-[var(--user-bubble-bg)] text-[var(--user-bubble-fg)] shadow-md shadow-black/15 ring-1 ring-black/[0.06]",
          "shadow-[0_0_26px_-6px_color-mix(in_srgb,var(--icon-green)_32%,transparent)]",
          "hover:brightness-[1.05] hover:shadow-[0_0_36px_-4px_color-mix(in_srgb,var(--icon-green)_40%,transparent)]",
          "motion-safe:active:scale-[0.98] dark:ring-white/10",
          className
        )}
      >
        {children}
        {iconRight}
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className={twMerge(
        "glow-pill inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-base font-medium text-[var(--foreground)] transition-all duration-200",
        "bg-[color-mix(in_srgb,var(--surface-muted)_88%,transparent)] hover:brightness-[1.03]",
        "motion-safe:active:scale-[0.98]",
        className
      )}
    >
      {children}
      {iconRight}
    </Link>
  );
}
