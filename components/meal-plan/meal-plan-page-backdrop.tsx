/**
 * Meal-plan route backgrounds: anchored to the top, full viewport width, tile vertically
 * as the page grows (repeat-y). Avoids centered “letterbox” strips from bg-contain + bg-center.
 */
export function MealPlanPageBackdrop() {
  const base =
    "pointer-events-none absolute inset-0 z-0 bg-top bg-repeat-y bg-[length:100%_auto]";

  return (
    <>
      <div
        className={`${base} bg-[url('/dashboard-bg-light.png')] opacity-[0.58] dark:hidden`}
        aria-hidden
      />
      <div
        className={`${base} hidden bg-[url('/dashboard-bg-dark.png')] opacity-[0.55] dark:block`}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 z-[1] bg-[color-mix(in_srgb,var(--background)_34%,transparent)] dark:bg-[color-mix(in_srgb,var(--background)_38%,transparent)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 z-[2] bg-gradient-to-b from-transparent via-[color-mix(in_srgb,var(--foreground)_4%,transparent)] to-[color-mix(in_srgb,var(--foreground)_9%,transparent)] dark:via-black/12 dark:to-black/22"
        aria-hidden
      />
    </>
  );
}
