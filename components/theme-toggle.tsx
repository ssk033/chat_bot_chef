"use client";

import { useCallback, useSyncExternalStore } from "react";
import { IconMoon, IconSun } from "@tabler/icons-react";

const STORAGE_KEY = "chef-theme";

function readThemeIsDarkFromDom(): boolean {
  if (typeof document === "undefined") return false;
  return document.documentElement.classList.contains("dark");
}

function subscribeTheme(onChange: () => void) {
  if (typeof document === "undefined") return () => {};
  const el = document.documentElement;
  const obs = new MutationObserver(() => onChange());
  obs.observe(el, { attributes: true, attributeFilter: ["class"] });
  return () => obs.disconnect();
}

export function ThemeToggle() {
  const isDark = useSyncExternalStore(
    subscribeTheme,
    readThemeIsDarkFromDom,
    () => false
  );

  const toggle = useCallback(() => {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem(STORAGE_KEY, next ? "dark" : "light");
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <button
      type="button"
      onClick={toggle}
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-transparent text-[var(--foreground)] transition-all duration-200 hover:bg-[var(--surface-muted)] motion-safe:active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Light mode" : "Dark mode"}
    >
      {isDark ? (
        <IconSun size={20} stroke={1.75} aria-hidden />
      ) : (
        <IconMoon size={20} stroke={1.75} aria-hidden />
      )}
    </button>
  );
}
