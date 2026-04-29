"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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
];

export default function DashboardPage() {
  const router = useRouter();
  const [isAuthorized] = useState(() => Boolean(getStoredUser()));

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
    <div className="relative min-h-screen bg-[var(--background)] text-[var(--foreground)]">
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
      <main className="relative z-10 mx-auto w-full max-w-6xl px-4 py-10">
        <div className="theme-panel mb-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl p-5">
          <div>
            <h1 className="text-3xl font-bold">Meal-IT!! Dashboard</h1>
            <p className="text-sm text-[var(--muted-text)]">Built by Sanidhya, Rajnish, Sachet, Aayush</p>
          </div>
          <Link
            href="/chat-bot-chef"
            className="glow-pill inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-[var(--foreground)] hover:opacity-90"
          >
            <IconMessageCircle size={16} />
            Talk to Chef!!
          </Link>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {cards.map((card) => (
            <div
              key={card.title}
              className="theme-panel flex h-full flex-col rounded-2xl p-6"
            >
              <h2 className="mb-2 text-xl font-semibold">{card.title}</h2>
              <p className="mb-5 text-sm text-[var(--muted-text)]">
                {card.description}
              </p>
              <Link
                href={card.href}
                className="glow-pill mt-auto inline-flex rounded-lg px-4 py-2 text-sm font-medium text-[var(--foreground)] hover:opacity-90"
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
