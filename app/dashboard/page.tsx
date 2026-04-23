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
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <AppNavbar />
      <main className="mx-auto w-full max-w-6xl px-4 py-10">
        <div className="mb-10 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-subtle)] pb-4">
          <div>
            <h1 className="text-3xl font-bold">Meal-IT!! Dashboard</h1>
            <p className="text-sm text-[var(--muted-text)]">Built by Sanidhya Singh</p>
          </div>
          <Link
            href="/chat-bot-chef"
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--user-bubble-bg)] px-4 py-2 text-sm font-medium text-[var(--user-bubble-fg)]"
          >
            <IconMessageCircle size={16} />
            Talk to Chef!!
          </Link>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {cards.map((card) => (
            <div
              key={card.title}
              className="flex h-full flex-col rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-6 shadow-sm"
            >
              <h2 className="mb-2 text-xl font-semibold">{card.title}</h2>
              <p className="mb-5 text-sm text-[var(--muted-text)]">
                {card.description}
              </p>
              <Link
                href={card.href}
                className="mt-auto inline-flex rounded-lg bg-[var(--user-bubble-bg)] px-4 py-2 text-sm font-medium text-[var(--user-bubble-fg)] hover:opacity-90"
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
