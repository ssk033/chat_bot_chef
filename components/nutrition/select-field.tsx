import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export const SelectField = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  function SelectField({ className, children, ...props }, ref) {
    return (
      <select
        ref={ref}
        {...props}
        className={cn(
          "w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] outline-none transition-all duration-200",
          "focus:border-[var(--border-subtle)] focus:ring-2 focus:ring-[var(--ring-focus)]",
          "hover:bg-[color-mix(in_srgb,var(--surface)_94%,var(--surface-muted)_6%)]",
          className
        )}
      >
        {children}
      </select>
    );
  }
);
