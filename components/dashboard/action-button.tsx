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
          "btn-solid inline-flex w-fit items-center justify-center rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-medium text-black shadow-sm transition-all duration-200",
          "hover:shadow-md hover:brightness-105 motion-safe:active:scale-[0.97]",
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
        "inline-flex w-fit items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-medium text-[var(--accent)] shadow-sm transition-all duration-200",
        "hover:bg-[color-mix(in_srgb,var(--surface)_88%,var(--accent))] hover:shadow-md motion-safe:active:scale-[0.97]",
        className
      )}
    >
      {children}
    </Link>
  );
}
