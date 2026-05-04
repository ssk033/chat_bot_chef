import { AppNavbar } from "@/components/app-navbar";
import { Skeleton } from "@/components/ui/skeleton";

/** Full-view placeholder while auth is resolving before redirect or hydrate. */
export function DashboardLoadingSkeleton() {
  return (
    <div className="relative flex min-h-screen flex-col bg-[var(--background)] text-[var(--foreground)]">
      <AppNavbar />
      <main className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-6 py-10" aria-busy="true" aria-label="Loading dashboard">
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-6 shadow-sm md:p-8">
          <Skeleton className="h-7 w-56 max-w-full rounded-lg" />
          <Skeleton className="mt-4 h-4 w-full max-w-xl rounded-md" />
          <Skeleton className="mt-2 h-4 w-full max-w-lg rounded-md" />
          <Skeleton className="mt-6 h-11 w-44 rounded-xl" />
        </div>
        <div className="flex flex-col gap-3">
          <Skeleton className="h-6 w-36 rounded-md" />
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((key) => (
              <div
                key={key}
                className="flex min-h-[200px] flex-col justify-between gap-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5 shadow-sm"
              >
                <div className="space-y-3">
                  <Skeleton className="h-11 w-11 rounded-xl" />
                  <Skeleton className="h-6 w-[80%] max-w-[200px] rounded-md" />
                  <Skeleton className="h-4 w-full rounded-md" />
                  <Skeleton className="h-4 w-full rounded-md" />
                </div>
                <Skeleton className="h-9 w-28 rounded-xl" />
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
