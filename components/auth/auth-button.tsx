import type { ButtonHTMLAttributes, ReactNode } from "react";
import { twMerge } from "tailwind-merge";

type AuthButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
};

export function AuthButton({ children, className, disabled, type = "submit", ...rest }: AuthButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={twMerge(
        "btn-solid w-full rounded-xl bg-[var(--user-bubble-bg)] px-4 py-3 text-center text-sm font-medium text-[var(--user-bubble-fg)] shadow-md shadow-black/15 ring-1 ring-black/[0.06] transition-all duration-200",
        "shadow-[0_0_22px_-4px_color-mix(in_srgb,var(--icon-green)_28%,transparent)]",
        "hover:brightness-[1.03] hover:shadow-[0_0_26px_-4px_color-mix(in_srgb,var(--icon-green)_35%,transparent)]",
        "motion-safe:active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45 disabled:shadow-none dark:ring-white/10",
        className
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
