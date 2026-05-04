"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { clearStoredUser, getStoredUser } from "@/lib/client-auth";
import { ChefLogo } from "@/components/chef-logo";

type AppNavbarProps = {
  showAuth?: boolean;
};

export function AppNavbar({ showAuth = true }: AppNavbarProps) {
  const router = useRouter();
  const loggedIn = useSyncExternalStore(
    () => () => {},
    () => Boolean(getStoredUser()),
    () => false
  );

  const talkToChefHref = loggedIn ? "/chat-bot-chef" : "/auth/login?next=/chat-bot-chef";

  const handleLogout = () => {
    clearStoredUser();
    router.push("/auth/login");
  };

  return (
    <nav className="sticky top-0 z-40 border-b border-[var(--border-subtle)] bg-[var(--surface)]/80 shadow-[0_1px_0_color-mix(in_srgb,var(--border-subtle)_70%,transparent)] backdrop-blur-xl supports-[backdrop-filter]:bg-[var(--surface)]/68 dark:border-white/10">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 sm:px-5">
        <ChefLogo compact />

        <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-2.5">
          <ThemeToggle />
          <Link
            href={talkToChefHref}
            className="glow-pill rounded-xl px-4 py-2.5 text-sm font-medium text-[var(--foreground)] transition-all duration-200 hover:opacity-95 motion-safe:active:scale-[0.98]"
          >
            Talk to Chef
          </Link>
          {showAuth && !loggedIn ? (
            <>
              <Link
                href="/auth/login"
                className="glow-pill rounded-xl px-4 py-2.5 text-sm font-medium text-[var(--foreground)] transition-all duration-200 hover:opacity-95 motion-safe:active:scale-[0.98]"
              >
                Sign In
              </Link>
              <Link
                href="/auth/register"
                className="btn-solid rounded-xl bg-[var(--user-bubble-bg)] px-4 py-2.5 text-sm font-medium text-[var(--user-bubble-fg)] shadow-md shadow-black/15 ring-1 ring-black/[0.06] transition-all duration-200 hover:brightness-[1.04] motion-safe:active:scale-[0.98] dark:ring-white/10"
              >
                Get Started
              </Link>
            </>
          ) : null}
          {showAuth && loggedIn ? (
            <>
              <Link
                href="/dashboard"
                className="glow-pill rounded-xl px-4 py-2.5 text-sm font-medium text-[var(--foreground)] transition-all duration-200 hover:opacity-95 motion-safe:active:scale-[0.98]"
              >
                Dashboard
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="btn-solid rounded-xl bg-[var(--user-bubble-bg)] px-4 py-2.5 text-sm font-medium text-[var(--user-bubble-fg)] shadow-md ring-1 ring-black/[0.06] transition-all duration-200 hover:brightness-[1.04] motion-safe:active:scale-[0.98] dark:ring-white/10"
              >
                Logout
              </button>
            </>
          ) : null}
        </div>
      </div>
    </nav>
  );
}
