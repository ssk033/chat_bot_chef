import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export const InputField = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function InputField({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        {...props}
        className={cn(
          "w-full rounded-xl border border-[var(--border)] bg-transparent px-4 py-3 text-sm text-[var(--foreground)] outline-none transition-all duration-200",
          "placeholder:text-[var(--muted-text)]",
          "focus:border-[color-mix(in_srgb,var(--accent)_45%,var(--border))] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--accent)_22%,transparent)]",
          "hover:bg-[color-mix(in_srgb,var(--surface)_92%,var(--background))]",
          className
        )}
      />
    );
  }
);
