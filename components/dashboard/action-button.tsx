import Link from "next/link";
import type { ReactNode } from "react";
import { twMerge } from "tailwind-merge";

export type ActionButtonVariant = "primary" | "secondary";

type ActionButtonProps = {
  href: string;
  children: ReactNode;
  variant?: ActionButtonVariant;
  className?: string;
};

export function ActionButton({ href, children, variant = "secondary", className }: ActionButtonProps) {
  if (variant === "primary") {
    return (
      <Link
        href={href}
        className={twMerge(
          "btn-solid inline-flex w-fit items-center justify-center rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200",
          "bg-[var(--user-bubble-bg)] text-[var(--user-bubble-fg)] shadow-md ring-1 ring-black/[0.06]",
          "hover:brightness-[1.05] motion-safe:active:scale-[0.97] dark:ring-white/10",
          className
        )}
      >
        {children}
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className={twMerge(
        "inline-flex w-fit items-center justify-center rounded-lg border px-4 py-2.5 text-sm font-medium transition-all duration-200",
        "border-[color-mix(in_srgb,var(--accent)_32%,var(--border-subtle))] bg-transparent text-[var(--accent)]",
        "hover:bg-[var(--accent-muted)] motion-safe:active:scale-[0.97]",
        className
      )}
    >
      {children}
    </Link>
  );
}
