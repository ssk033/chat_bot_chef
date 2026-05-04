import { cn } from "@/lib/utils";

export function PrimaryButton({
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        "w-full rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--foreground)] shadow-sm transition-all duration-200",
        "hover:opacity-90 hover:shadow-md hover:brightness-[1.03] motion-safe:hover:scale-[1.02] motion-safe:active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] disabled:pointer-events-none disabled:opacity-50",
        className
      )}
    />
  );
}
