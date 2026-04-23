import Link from "next/link";
import Image from "next/image";
import { IconArrowRight, IconCamera, IconChefHat, IconChartBar, IconToolsKitchen2 } from "@tabler/icons-react";
import { AppNavbar } from "@/components/app-navbar";

const features = [
  {
    title: "Ingredient Recognition",
    text: "Upload your available ingredients and get meal ideas fast.",
    icon: IconCamera,
  },
  {
    title: "Personalized Meal Plans",
    text: "Generate plans tailored to preferences, allergies, and goals.",
    icon: IconChefHat,
  },
  {
    title: "Nutrition Tracking",
    text: "Track calories and macros with a clean daily workflow.",
    icon: IconChartBar,
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <AppNavbar />
      <main>
        <section className="relative overflow-hidden px-4 py-16 sm:py-20">
          <div className="absolute inset-0 -z-10 opacity-80">
            <div className="absolute left-[16%] top-8 h-72 w-72 rounded-full bg-[var(--accent-muted)] blur-3xl" />
            <div className="absolute right-[12%] top-16 h-64 w-64 rounded-full bg-[var(--icon-green-soft)] blur-3xl" />
          </div>
          <div className="mx-auto grid w-full max-w-6xl items-center gap-8 md:grid-cols-[1fr_1.4fr_1fr]">
            <div className="hidden flex-col items-center gap-8 md:flex">
              <Image src="/beef.png" alt="Beef" width={170} height={120} className="object-contain drop-shadow-[0_10px_25px_rgba(0,0,0,0.45)]" />
              <Image src="/chicken.png" alt="Chicken" width={170} height={120} className="object-contain drop-shadow-[0_10px_25px_rgba(0,0,0,0.45)]" />
            </div>

            <div className="text-center">
              <h1 className="text-5xl font-bold tracking-tight text-white sm:text-6xl">Create a Meal Plan</h1>
              <p className="mt-2 text-4xl font-extrabold tracking-tight text-[var(--foreground)]/15 sm:text-5xl">
                Tailored For You
              </p>
              <p className="mx-auto mt-6 max-w-xl text-base text-[var(--muted-text)] sm:text-lg">
                Plan delicious, nutritious meals based on your ingredients, preferences, and dietary needs with our intelligent AI Agent.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <Link
                  href="/auth/register"
                  className="inline-flex items-center gap-2 rounded-xl bg-[var(--user-bubble-bg)] px-6 py-3 text-base font-medium text-[var(--user-bubble-fg)] shadow hover:opacity-90"
                >
                  Get Started
                  <IconArrowRight size={18} />
                </Link>
                <Link
                  href="/auth/login?next=/chat-bot-chef"
                  className="glow-pill rounded-xl px-6 py-3 text-base font-medium text-[var(--foreground)] hover:bg-[var(--surface)]"
                >
                  Talk to Chef!!
                </Link>
              </div>
            </div>

            <div className="hidden flex-col items-center gap-8 md:flex">
              <Image src="/vegetables.png" alt="Vegetables" width={170} height={120} className="object-contain drop-shadow-[0_10px_25px_rgba(0,0,0,0.45)]" />
              <Image src="/fruits.png" alt="Fruits" width={170} height={120} className="object-contain drop-shadow-[0_10px_25px_rgba(0,0,0,0.45)]" />
            </div>
          </div>
        </section>

        <section className="theme-section py-16">
          <div className="mx-auto w-full max-w-6xl px-4">
            <h2 className="mb-4 text-center text-3xl font-bold">Key Features</h2>
            <p className="mx-auto mb-10 max-w-2xl text-center text-[var(--muted-text)]">
              Discover how our meal planner can transform your cooking and eating experience.
            </p>
            <div className="grid gap-6 md:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="theme-panel rounded-2xl p-6"
              >
                <div className="chef-icon-badge mb-4 flex h-12 w-12 items-center justify-center rounded-xl">
                  <f.icon size={22} className="green-shine-icon" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">{f.title}</h3>
                <p className="text-sm text-[var(--muted-text)]">{f.text}</p>
              </div>
            ))}
          </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 py-16">
          <h2 className="mb-4 text-center text-3xl font-bold">How It Works</h2>
          <p className="mx-auto mb-10 max-w-2xl text-center text-[var(--muted-text)]">
            Three simple steps to get personalized meal plans.
          </p>
          <div className="grid gap-6 md:grid-cols-3">
            {["Add Your Ingredients", "Set Your Preferences", "Get Your Meal Plan"].map((step, index) => (
              <div key={step} className="theme-panel rounded-2xl p-6 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-white text-lg font-bold text-[#0f172a]">
                  {index + 1}
                </div>
                <h3 className="text-lg font-semibold">{step}</h3>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link
              href="/meal-plan/create"
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--user-bubble-bg)] px-6 py-3 text-base font-medium text-[var(--user-bubble-fg)] shadow"
            >
              Start Meal Planning
              <IconToolsKitchen2 size={18} className="green-shine-icon" />
            </Link>
            <p className="mt-4 text-sm text-[var(--muted-text)]">Meal-IT!! - made by Sanidhya Singh</p>
          </div>
        </section>
      </main>
    </div>
  );
}
