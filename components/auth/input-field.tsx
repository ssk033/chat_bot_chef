"use client";

import { useId, useState } from "react";
import { IconEye, IconEyeOff } from "@tabler/icons-react";
import { twMerge } from "tailwind-merge";

export type InputFieldProps = {
  id?: string;
  label: string;
  type?: "email" | "password" | "text";
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: string;
  error?: string;
  showPasswordToggle?: boolean;
  required?: boolean;
  className?: string;
};

export function InputField({
  id: idProp,
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  autoComplete,
  error,
  showPasswordToggle,
  required,
  className,
}: InputFieldProps) {
  const genId = useId();
  const id = idProp ?? genId;
  const [show, setShow] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword && showPasswordToggle && show ? "text" : type;

  return (
    <div className={twMerge("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-sm font-medium text-[var(--muted-text)]">
        {label}
        {required ? <span className="text-[var(--muted-text)]"> *</span> : null}
      </label>
      <div className="relative">
        <input
          id={id}
          type={inputType}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className={twMerge(
            "w-full rounded-xl border border-[var(--border)] bg-transparent px-4 py-3 text-[var(--foreground)] shadow-sm outline-none transition-all duration-200",
            "placeholder:text-[var(--muted-text)] placeholder:opacity-80",
            "focus:border-[var(--input-border-focus)] focus:ring-2 focus:ring-[var(--ring-focus)]",
            isPassword && showPasswordToggle && "pr-12"
          )}
        />
        {isPassword && showPasswordToggle ? (
          <button
            type="button"
            className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-[var(--muted-text)] transition-colors duration-200 hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? "Hide password" : "Show password"}
          >
            {show ? <IconEyeOff size={20} stroke={1.5} aria-hidden /> : <IconEye size={20} stroke={1.5} aria-hidden />}
          </button>
        ) : null}
      </div>
      {error ? (
        <p id={`${id}-error`} className="text-sm leading-relaxed text-[var(--foreground)]" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
