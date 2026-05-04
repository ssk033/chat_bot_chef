import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export const InputField = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function InputField({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        {...props}
        className={cn(
          "w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm leading-relaxed text-[var(--foreground)] outline-none transition-all duration-200",
          "placeholder:text-[color-mix(in_srgb,var(--muted-text)_72%,transparent)]",
          "focus:border-[var(--border-subtle)] focus:ring-2 focus:ring-[var(--ring-focus)]",
          "hover:bg-[color-mix(in_srgb,var(--surface)_94%,var(--surface-muted)_6%)]",
          className
        )}
      />
    );
  }
);
