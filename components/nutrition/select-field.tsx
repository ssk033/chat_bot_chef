import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export const SelectField = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  function SelectField({ className, children, ...props }, ref) {
    return (
      <select
        ref={ref}
        {...props}
        className={cn(
          "w-full rounded-xl border border-[var(--border)] bg-transparent px-4 py-3 text-sm text-[var(--foreground)] outline-none transition-all duration-200",
          "focus:border-[color-mix(in_srgb,var(--accent)_45%,var(--border))] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--accent)_22%,transparent)]",
          "hover:bg-[color-mix(in_srgb,var(--surface)_92%,var(--background))]",
          className
        )}
      >
        {children}
      </select>
    );
  }
);
