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
        "w-full rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-medium text-black shadow-sm transition-all duration-200",
        "hover:shadow-md hover:brightness-105 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50",
        className
      )}
    />
  );
}
