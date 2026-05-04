import { IconToolsKitchen2 } from "@tabler/icons-react";
import { AppNavbar } from "@/components/app-navbar";
import { CTAButton } from "@/components/home/cta-button";
import { FeatureCard } from "@/components/home/feature-card";
import { HeroSection } from "@/components/home/hero-section";
import { StepCard } from "@/components/home/step-card";

const features = [
  {
    title: "Talk to Chef",
    description:
      "Ask for recipes, substitutions, and everyday cooking help in plain language. Answers line up with the ingredients you already keep at home.",
    iconId: "talk-chef" as const,
  },
  {
    title: "Create a Meal Plan",
    description:
      "Turn your tastes, allergies, and nutrition goals into weekly menus. Plans stay balanced while rotating what lands on the table.",
    iconId: "create-meal" as const,
  },
  {
    title: "Nutrition Tracker",
    description:
      "Review calories and macros together inside one calm screen. Adjust portions quickly when your day moves above or below target.",
    iconId: "nutrition" as const,
  },
  {
    title: "Food & Image Recognition",
    description:
      "Photograph ingredients or plated meals to speed up logging and labeling. Clearer food signals help the app suggest smarter next steps.",
    iconId: "food-recognition" as const,
  },
  {
    title: "Save Meals You Love",
    description:
      "Bookmark standout dishes from chats and saved planners with one tap. Return to them anytime or place them on a future week.",
    iconId: "save-meal" as const,
  },
];

const steps = [
  {
    title: "Add Your Ingredients",
    description: "Share what you already have—photos, lists, or pantry staples—in seconds.",
  },
  {
    title: "Set Your Preferences",
    description: "Dial in diet, allergies, goals, and flavors so every plan fits your life.",
  },
  {
    title: "Get Your Meal Plan",
    description: "Receive balanced, editable plans with recipes you can refine anytime.",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <AppNavbar />
      <main>
        <HeroSection />

        <section className="relative border-t border-[var(--border)] py-16 sm:py-20">
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-[color-mix(in_srgb,var(--foreground)_6%,transparent)] to-[color-mix(in_srgb,var(--foreground)_10%,transparent)] opacity-30 dark:opacity-45"
            aria-hidden
          />
          <div className="home-fade-up home-fade-delay-1 relative mx-auto w-full max-w-7xl px-6">
            <h2 className="text-center text-3xl font-bold tracking-tight text-[var(--foreground)] sm:text-4xl">
              Key Features
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-center text-sm leading-relaxed text-[var(--muted-text)] sm:text-base">
              Chat, planning, tracking, camera cues, and saved favorites stay aligned in one Meal-IT!! flow.
            </p>
            <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-8 lg:grid-cols-3 xl:grid-cols-5 xl:items-stretch">
              {features.map((f) => (
                <FeatureCard key={f.title} title={f.title} description={f.description} iconId={f.iconId} />
              ))}
            </div>
          </div>
        </section>

        <section className="relative mx-auto w-full max-w-6xl px-6 py-16 sm:py-20">
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--border)] to-transparent"
            aria-hidden
          />
          <div className="home-fade-up home-fade-delay-2">
            <h2 className="text-center text-3xl font-bold tracking-tight text-[var(--foreground)] sm:text-4xl">
              How It Works
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-center text-sm leading-relaxed text-[var(--muted-text)] sm:text-base">
              Three simple steps to get personalized meal plans.
            </p>
            <div className="mt-12 grid gap-6 sm:gap-8 md:grid-cols-3 md:items-stretch">
              {steps.map((s, index) => (
                <StepCard key={s.title} step={index + 1} title={s.title} description={s.description} />
              ))}
            </div>
            <div className="mt-12 flex flex-col items-center gap-4 text-center sm:mt-16">
              <CTAButton href="/meal-plan/create" variant="primary" iconRight={<IconToolsKitchen2 size={18} className="shrink-0 opacity-90" aria-hidden />}>
                Start Meal Planning
              </CTAButton>
              <p className="text-sm leading-relaxed text-[var(--muted-text)]">
                Meal-IT!! : made by Sanidhya, Rajnish, Sachet, Aayush
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
