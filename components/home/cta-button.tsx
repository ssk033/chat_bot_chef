import Link from "next/link";
import type { ReactNode } from "react";
import { buttonClass } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type CTAButtonProps = {
  href: string;
  variant: "primary" | "secondary";
  children: ReactNode;
  iconRight?: ReactNode;
  className?: string;
};

export function CTAButton({ href, variant, children, iconRight, className }: CTAButtonProps) {
  return (
    <Link
      href={href}
      className={cn(
        buttonClass(variant === "primary" ? "primary" : "secondary"),
        "px-6 py-3 text-base shadow-sm transition-all duration-200",
        variant === "secondary" && "border-[var(--border-subtle)]",
        className
      )}
    >
      {children}
      {iconRight}
    </Link>
  );
}
