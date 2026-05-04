import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type AuthCardProps = {
  children: ReactNode;
  className?: string;
};

export function AuthCard({ children, className }: AuthCardProps) {
  return (
    <div
      className={cn(
        "auth-enter rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface)_94%,transparent)] p-8 shadow-sm backdrop-blur-xl transition-all duration-200 hover:shadow-md sm:p-9",
        className
      )}
    >
      {children}
    </div>
  );
}
