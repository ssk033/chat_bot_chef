import { Skeleton } from "@/components/ui/skeleton";

/** Initial Chef shell while bootstrap completes — skeleton conversation + composer. */
export function ChatLoadingShell() {
  return (
    <div
      className="flex h-[100dvh] flex-col bg-[var(--background)] text-[var(--foreground)]"
      aria-busy="true"
      aria-label="Loading Chef chat"
    >
      <header className="shrink-0 border-b border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] px-4 py-3 backdrop-blur-md sm:px-6">
        <div className="mx-auto flex max-w-[760px] items-center gap-3 xl:max-w-[840px]">
          <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
          <Skeleton className="h-9 flex-1 max-w-[180px] rounded-lg sm:max-w-[220px]" />
          <Skeleton className="ml-auto h-9 w-28 rounded-xl" />
        </div>
      </header>
      <div className="relative flex min-h-0 flex-1 flex-col">
        <div className="flex flex-1 flex-col gap-4 overflow-hidden px-5 py-8 sm:px-6 sm:py-10">
          <div className="mx-auto flex w-full max-w-[760px] flex-col gap-4 xl:max-w-[840px]">
            <div className="flex gap-3 sm:gap-4">
              <Skeleton className="h-9 w-9 shrink-0 rounded-xl" />
              <Skeleton className="h-20 max-w-[70%] flex-1 rounded-2xl rounded-bl-md" />
            </div>
            <div className="flex flex-row-reverse gap-3 sm:gap-4">
              <Skeleton className="h-9 w-9 shrink-0 rounded-xl" />
              <Skeleton className="h-14 max-w-[55%] flex-1 rounded-2xl rounded-br-md" />
            </div>
            <div className="flex gap-3 sm:gap-4">
              <Skeleton className="h-9 w-9 shrink-0 rounded-xl" />
              <Skeleton className="h-24 max-w-[70%] flex-1 rounded-2xl rounded-bl-md" />
            </div>
          </div>
        </div>
        <div className="shrink-0 border-t border-[var(--border-subtle)] px-4 pb-4 pt-3 sm:px-6">
          <Skeleton className="mx-auto h-14 max-w-[760px] rounded-2xl xl:max-w-[840px]" />
        </div>
      </div>
    </div>
  );
}
