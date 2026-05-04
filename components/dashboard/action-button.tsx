import type { ReactNode } from "react";
import { ButtonLink } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ActionButtonVariant = "primary" | "secondary";

type ActionButtonProps = {
  href: string;
  children: ReactNode;
  variant?: ActionButtonVariant;
  className?: string;
};

export function ActionButton({ href, children, variant = "secondary", className }: ActionButtonProps) {
  return (
    <ButtonLink
      href={href}
      variant={variant === "primary" ? "primary" : "secondary"}
      className={cn("inline-flex w-fit", className)}
    >
      {children}
    </ButtonLink>
  );
}
