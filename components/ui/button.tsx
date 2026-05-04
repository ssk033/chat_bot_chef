import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "secondary" | "ghost";

const base =
  "inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-all duration-200 motion-safe:active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] disabled:pointer-events-none disabled:opacity-45";

export const buttonClass = (variant: ButtonVariant = "primary", className?: string) =>
  cn(
    base,
    variant === "primary" &&
      "border-[var(--border)] bg-[var(--accent)] text-[var(--foreground)] shadow-sm hover:bg-[var(--accent)] hover:opacity-90 hover:shadow-md hover:brightness-[1.03] motion-safe:hover:scale-[1.02]",
    variant === "secondary" &&
      "border-[var(--border-subtle)] bg-[var(--surface-muted)] text-[var(--foreground)] shadow-sm hover:bg-[color-mix(in_srgb,var(--surface-muted)_92%,var(--foreground)_8%)] hover:opacity-95 hover:shadow-md motion-safe:hover:scale-[1.02]",
    variant === "ghost" &&
      "border-[var(--border-subtle)] bg-transparent text-[var(--foreground)] hover:bg-[var(--surface-muted)] hover:opacity-95 motion-safe:hover:scale-[1.02]",
    className
  );

type ButtonProps = Omit<ComponentProps<"button">, "className"> & {
  variant?: ButtonVariant;
  className?: string;
  children: ReactNode;
};

export function Button({ variant = "primary", className, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={buttonClass(variant, className)} {...props} />;
}

type ButtonLinkProps = Omit<ComponentProps<typeof Link>, "className"> & {
  variant?: ButtonVariant;
  className?: string;
  children: ReactNode;
};

export function ButtonLink({ variant = "primary", className, ...props }: ButtonLinkProps) {
  return <Link className={buttonClass(variant, className)} {...props} />;
}
