import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  className,
}: {
  label: string;
  value: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 text-center shadow-sm transition-all duration-200 hover:shadow-md",
        className
      )}
    >
      <p className="text-xs leading-relaxed text-[var(--muted-text)]">{label}</p>
      <p className="text-xl font-semibold text-[var(--foreground)]">{value}</p>
    </div>
  );
}
