import { cn } from "@/lib/utils";

export function TrackerCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5 shadow-sm transition-all duration-200 hover:shadow-md",
        className
      )}
    >
      {children}
    </div>
  );
}
