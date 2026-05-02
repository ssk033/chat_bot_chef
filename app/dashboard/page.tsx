"use client";

import Link from "next/link";
import { useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { IconMessageCircle } from "@tabler/icons-react";
import { AppNavbar } from "@/components/app-navbar";
import { getStoredUser } from "@/lib/client-auth";

const cards = [
  {
    title: "Create Meal Plan",
    description: "Build a personalized plan from your ingredients and goals.",
    href: "/meal-plan/create",
    cta: "Start Planning",
  },
  {
    title: "Saved Meal Plans",
    description: "Review and manage your previously saved plans.",
    href: "/meal-plan/saved",
    cta: "Open Saved Plans",
  },
  {
    title: "Nutrition Tracker",
    description: "Track daily calories and macros quickly.",
    href: "/nutrition/tracker",
    cta: "Track Nutrition",
  },
  {
    title: "Food Tracker",
    description: "Upload a meal photo — CNN recognizes the dish and shows calories & protein.",
    href: "/food-tracker",
    cta: "Analyze photo",
  },
];

export default function DashboardPage() {
  const router = useRouter();
  const isAuthorized = useSyncExternalStore(
    () => () => {},
    () => Boolean(getStoredUser()),
    () => false
  );

  useEffect(() => {
    if (!isAuthorized) {
      router.replace("/auth/login?next=/dashboard");
    }
  }, [isAuthorized, router]);

  if (!isAuthorized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)] text-[var(--muted-text)]">
        Checking account...
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col bg-[var(--background)] text-[var(--foreground)]">
      <div
        className="pointer-events-none absolute inset-0 bg-cover bg-center bg-no-repeat dark:hidden"
        style={{ backgroundImage: "url('/food%20background%20light%20theme.png')" }}
      />
      <div
        className="pointer-events-none absolute inset-0 hidden bg-cover bg-center bg-no-repeat dark:block"
        style={{ backgroundImage: "url('/food%20backgorund.png')" }}
      />
      <div className="pointer-events-none absolute inset-0 bg-white/35 dark:bg-black/50" />
      <AppNavbar />
      <main className="relative z-10 mx-auto w-full max-w-7xl flex-1 px-4 py-10 sm:px-6 lg:px-8">
        <div className="theme-panel mb-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl p-6 sm:p-8">
          <div>
            <h1 className="text-3xl font-bold sm:text-4xl">Meal-IT!! Dashboard</h1>
            <p className="mt-1 text-sm text-[var(--muted-text)] sm:text-base">
              Built by Sanidhya, Rajnish, Sachet, Aayush
            </p>
          </div>
          <Link
            href="/chat-bot-chef"
            className="glow-pill inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium text-[var(--foreground)] hover:opacity-90 sm:text-base"
          >
            <IconMessageCircle size={18} />
            Talk to Chef!!
          </Link>
        </div>

        <div className="grid w-full grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6 xl:gap-8">
          {cards.map((card) => (
            <div
              key={card.title}
              className="theme-panel flex min-h-[220px] flex-col justify-between rounded-2xl p-8 sm:min-h-[260px] lg:min-h-[280px] lg:p-7 xl:p-8"
            >
              <div>
                <h2 className="mb-3 text-xl font-semibold leading-tight sm:text-2xl lg:text-xl xl:text-[1.35rem]">
                  {card.title}
                </h2>
                <p className="text-base leading-relaxed text-[var(--muted-text)] sm:text-[0.9375rem] lg:text-sm xl:text-base">
                  {card.description}
                </p>
              </div>
              <Link
                href={card.href}
                className="glow-pill mt-8 inline-flex w-fit rounded-lg px-5 py-2.5 text-sm font-medium text-[var(--foreground)] hover:opacity-90 xl:text-[0.95rem]"
              >
                {card.cta}
              </Link>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
