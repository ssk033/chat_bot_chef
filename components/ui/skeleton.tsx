import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/** Neutral pulse block — pair with `aria-busy` / live regions on parent where relevant. */
export function Skeleton({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("animate-pulse rounded-lg bg-[var(--surface-muted)]", className)}
      aria-hidden
      {...props}
    />
  );
}
