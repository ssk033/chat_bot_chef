import { useId, type InputHTMLAttributes } from "react";
import { twMerge } from "tailwind-merge";

export type MealPlanInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "className"> & {
  label: string;
  helperText?: string;
  error?: string;
  className?: string;
};

export function InputField({
  label,
  helperText,
  error,
  id: idProp,
  required,
  className,
  ...inputProps
}: MealPlanInputProps) {
  const genId = useId();
  const id = idProp ?? genId;

  return (
    <div className={twMerge("space-y-2", className)}>
      <label htmlFor={id} className="block text-sm font-medium text-[var(--muted-text)]">
        {label}
        {required ? <span className="text-[var(--muted-text)]"> *</span> : null}
      </label>
      <input
        id={id}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : helperText ? `${id}-hint` : undefined}
        className={twMerge(
          "w-full rounded-xl border border-[color-mix(in_srgb,var(--foreground)_12%,var(--border-subtle))] bg-transparent px-4 py-3 text-[var(--foreground)] shadow-sm outline-none transition-all duration-200",
          "placeholder:text-[var(--muted-text)] placeholder:opacity-75",
          "focus:border-[color-mix(in_srgb,var(--accent)_45%,var(--border-subtle))] focus:ring-2 focus:ring-[var(--ring-focus)] focus:ring-offset-2 focus:ring-offset-[var(--background)]",
          "dark:border-white/[0.11]",
          error && "border-red-500/60 focus:border-red-500/60 focus:ring-red-500/25"
        )}
        {...inputProps}
      />
      {helperText && !error ? (
        <p id={`${id}-hint`} className="text-xs leading-relaxed text-[var(--muted-text)]">
          {helperText}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className="text-xs text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
