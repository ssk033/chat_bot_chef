"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSyncExternalStore } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { clearStoredUser, getStoredUser } from "@/lib/client-auth";
import { ChefLogo } from "@/components/chef-logo";
import { ButtonLink } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type AppNavbarProps = {
  showAuth?: boolean;
};

/** Shared chrome for text links and logout — matches design-system nav buttons. */
function navLinkClass(active: boolean) {
  return cn(
    "inline-flex items-center justify-center rounded-xl border px-4 py-2 text-sm font-medium transition-all duration-200",
    "bg-transparent hover:bg-[var(--surface-muted)]",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]",
    active
      ? "border-[var(--border)] bg-[var(--surface-muted)] text-[var(--foreground)]"
      : "border-[var(--border-subtle)] text-[var(--foreground)]"
  );
}

export function AppNavbar({ showAuth = true }: AppNavbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const loggedIn = useSyncExternalStore(
    () => () => {},
    () => Boolean(getStoredUser()),
    () => false
  );

  const talkToChefHref = loggedIn ? "/chat-bot-chef" : "/auth/login?next=/chat-bot-chef";
  const chefActive = pathname === "/chat-bot-chef";
  const dashActive = pathname === "/dashboard";

  const handleLogout = () => {
    clearStoredUser();
    router.push("/auth/login");
  };

  return (
    <nav className="sticky top-0 z-40 border-b border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface)_88%,transparent)] shadow-[0_1px_0_color-mix(in_srgb,var(--border-subtle)_80%,transparent)] backdrop-blur-xl supports-[backdrop-filter]:bg-[color-mix(in_srgb,var(--surface)_78%,transparent)] transition-colors duration-200">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-6 py-3">
        <ChefLogo compact />

        <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-2.5">
          <ThemeToggle />
          <Link href={talkToChefHref} className={navLinkClass(chefActive)}>
            Talk to Chef
          </Link>
          {showAuth && !loggedIn ? (
            <>
              <Link href="/auth/login" className={navLinkClass(pathname.startsWith("/auth/login"))}>
                Sign in
              </Link>
              <ButtonLink href="/auth/register" variant="primary">
                Get started
              </ButtonLink>
            </>
          ) : null}
          {showAuth && loggedIn ? (
            <>
              <Link href="/dashboard" className={navLinkClass(dashActive)}>
                Dashboard
              </Link>
              <button type="button" onClick={handleLogout} className={navLinkClass(false)}>
                Log out
              </button>
            </>
          ) : null}
        </div>
      </div>
    </nav>
  );
}
