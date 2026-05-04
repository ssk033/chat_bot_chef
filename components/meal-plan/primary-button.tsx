import type { ButtonHTMLAttributes, ReactNode } from "react";
import { twMerge } from "tailwind-merge";

export type PrimaryButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
};

export function PrimaryButton({ children, className, disabled, type = "submit", ...rest }: PrimaryButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={twMerge(
        "inline-flex w-full items-center justify-center rounded-xl bg-[var(--accent)] px-6 py-3 text-sm font-medium text-white shadow-[0_0_22px_-4px_color-mix(in_srgb,var(--icon-green)_38%,transparent)] ring-1 ring-black/[0.06] transition-all duration-200",
        "hover:brightness-[1.08] hover:shadow-[0_0_26px_-2px_color-mix(in_srgb,var(--icon-green)_48%,transparent)]",
        "motion-safe:active:scale-[0.97]",
        "disabled:pointer-events-none disabled:opacity-45 disabled:shadow-none dark:ring-white/10",
        className
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
