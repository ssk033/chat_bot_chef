import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export type PrimaryButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
};

export function PrimaryButton({ children, className, disabled, type = "submit", ...rest }: PrimaryButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={cn(
        "inline-flex w-full items-center justify-center rounded-xl bg-[var(--accent)] px-6 py-3 text-sm font-medium text-[var(--foreground)] shadow-sm transition-all duration-200",
        "shadow-[0_0_22px_-4px_color-mix(in_srgb,var(--accent)_32%,transparent)] hover:opacity-90 hover:brightness-[1.03] hover:shadow-md motion-safe:hover:scale-[1.02]",
        "motion-safe:active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]",
        "disabled:pointer-events-none disabled:opacity-45 disabled:shadow-none",
        className
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
