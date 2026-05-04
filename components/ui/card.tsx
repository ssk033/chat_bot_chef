import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function SurfaceCard({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5 shadow-sm transition-all duration-200 motion-safe:hover:scale-[1.01] hover:shadow-md",
        className
      )}
      {...props}
    />
  );
}
