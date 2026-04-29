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
    <nav className="sticky top-0 z-40 border-b border-[var(--border-subtle)] bg-[var(--surface)]/90 backdrop-blur-sm">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-2.5">
        <ChefLogo compact />

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            href={talkToChefHref}
            className="glow-pill rounded-lg px-3 py-2 text-sm font-medium text-[var(--foreground)] hover:opacity-90"
          >
            Talk to Chef
          </Link>
          {showAuth && !loggedIn ? (
            <>
              <Link
                href="/auth/login"
                className="glow-pill rounded-lg px-3 py-2 text-sm font-medium text-[var(--foreground)] hover:opacity-90"
              >
                Sign In
              </Link>
              <Link
                href="/auth/register"
                className="btn-solid rounded-lg bg-[var(--user-bubble-bg)] px-3 py-2 text-sm font-medium text-[var(--user-bubble-fg)] shadow"
              >
                Get Started
              </Link>
            </>
          ) : null}
          {showAuth && loggedIn ? (
            <>
              <Link
                href="/dashboard"
                className="glow-pill rounded-lg px-3 py-2 text-sm font-medium text-[var(--foreground)] hover:opacity-90"
              >
                Dashboard
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="btn-solid rounded-lg bg-[var(--user-bubble-bg)] px-3 py-2 text-sm font-medium text-[var(--user-bubble-fg)]"
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
