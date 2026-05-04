"use client";

import Image from "next/image";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { IconMessageCircle } from "@tabler/icons-react";
import { AppNavbar } from "@/components/app-navbar";
import { DashboardCard, type DashboardCardIconId } from "@/components/dashboard/dashboard-card";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { ButtonLink } from "@/components/ui/button";
import { getStoredUser } from "@/lib/client-auth";
import { DashboardLoadingSkeleton } from "@/components/dashboard/dashboard-loading";
import { cn } from "@/lib/utils";

function subscribeHtmlDark(cb: () => void) {
  if (typeof document === "undefined") return () => {};
  const el = document.documentElement;
  const obs = new MutationObserver(cb);
  obs.observe(el, { attributes: true, attributeFilter: ["class"] });
  return () => obs.disconnect();
}

function readHtmlIsDark(): boolean {
  return typeof document !== "undefined" && document.documentElement.classList.contains("dark");
}

type CardConfig = {
  title: string;
  description: string;
  href: string;
  cta: string;
  iconId: DashboardCardIconId;
};

const cards: CardConfig[] = [
  {
    title: "Create Meal Plan",
    description: "Start from ingredients and goals to generate a fresh weekly plan you can edit anytime.",
    href: "/meal-plan/create",
    cta: "Start Planning",
    iconId: "meal",
  },
  {
    title: "Saved Meal Plans",
    description: "Open drafts and finished plans, tweak servings, and reuse what already worked.",
    href: "/meal-plan/saved",
    cta: "Open Saved Plans",
    iconId: "saved",
  },
  {
    title: "Nutrition Tracker",
    description: "Log calories and macros in one view so you can spot trends without extra spreadsheets.",
    href: "/nutrition/tracker",
    cta: "Track Nutrition",
    iconId: "nutrition",
  },
  {
    title: "Food Tracker",
    description: "Upload a meal photo to classify the dish and surface calories and protein at a glance.",
    href: "/food-tracker",
    cta: "Analyze Photo",
    iconId: "food",
  },
];

export default function DashboardPage() {
  const router = useRouter();
  const isAuthorized = useSyncExternalStore(
    () => () => {},
    () => Boolean(getStoredUser()),
    () => false
  );
  const isDark = useSyncExternalStore(subscribeHtmlDark, readHtmlIsDark, () => false);
  const [lightBgSrc, setLightBgSrc] = useState("/dashboard-bg-light.png");
  const [darkBgSrc, setDarkBgSrc] = useState("/dashboard-bg-dark.png");

  useEffect(() => {
    if (!isAuthorized) {
      router.replace("/auth/login?next=/dashboard");
    }
  }, [isAuthorized, router]);

  if (!isAuthorized) {
    return <DashboardLoadingSkeleton />;
  }

  return (
    <div className="relative flex min-h-screen flex-col bg-[var(--background)] text-[var(--foreground)]">
      {/* Full-bleed photos via next/image (CSS url() was flaky); fallback paths if copied assets missing */}
      <div
        className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
        aria-hidden
        suppressHydrationWarning
      >
        <Image
          alt=""
          src={lightBgSrc}
          fill
          sizes="100vw"
          quality={90}
          className={cn(
            "object-cover object-center transition-opacity duration-300",
            isDark ? "opacity-0" : "opacity-[0.52]"
          )}
          onError={() => setLightBgSrc("/food%20background%20light%20theme.png")}
          priority={false}
        />
        <Image
          alt=""
          src={darkBgSrc}
          fill
          sizes="100vw"
          quality={90}
          className={cn(
            "object-cover object-center transition-opacity duration-300",
            isDark ? "opacity-[0.52]" : "opacity-0"
          )}
          onError={() => setDarkBgSrc("/food%20backgorund%20dark%20theme.png")}
          priority={false}
        />
      </div>
      <div
        className={cn(
          "pointer-events-none absolute inset-0 z-[1]",
          isDark
            ? "bg-[color-mix(in_srgb,var(--background)_54%,transparent)]"
            : "bg-[color-mix(in_srgb,var(--background)_48%,transparent)]"
        )}
        aria-hidden
      />

      <AppNavbar />
      <main className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-6 py-10">
        <DashboardHeader
          title="Meal-IT!! Dashboard"
          subtitle="Built by Sanidhya, Rajnish, Sachet, Aayush. Jump into planning, tracking, or chat from one place."
          action={
            <ButtonLink href="/chat-bot-chef" variant="secondary" className="inline-flex gap-2 px-5 py-3 text-sm font-medium">
              <IconMessageCircle size={18} stroke={1.75} aria-hidden />
              Talk to Chef
            </ButtonLink>
          }
        />

        <section aria-labelledby="quick-actions-heading" className="flex flex-col gap-3">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <h2 id="quick-actions-heading" className="text-lg font-medium text-[var(--foreground)]">
              Quick actions
            </h2>
            <p className="text-sm leading-relaxed text-[var(--muted-text)] sm:text-right">Primary action highlighted below.</p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {cards.map((card, index) => (
              <DashboardCard
                key={card.title}
                title={card.title}
                description={card.description}
                href={card.href}
                cta={card.cta}
                iconId={card.iconId}
                buttonVariant={index === 0 ? "primary" : "secondary"}
              />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
