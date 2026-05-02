import Link from "next/link";
import Image from "next/image";
import { IconArrowRight, IconCamera, IconChefHat, IconChartBar, IconToolsKitchen2 } from "@tabler/icons-react";
import { AppNavbar } from "@/components/app-navbar";
import { CardBody, CardContainer, CardItem } from "@/components/ui/3d-card";

const features = [
  {
    title: "Ingredient Recognition",
    text:
      "Upload a photo or list of your ingredients and let the chef agent recognize what you have, suggest smart combinations, and surface recipes that actually match your kitchen.",
    icon: IconCamera,
  },
  {
    title: "Personalized Meal Plans",
    text:
      "Generate weekly meal plans tailored to your taste preferences, allergies, and nutrition goals, with balanced recipes and automatic variety so you never get bored.",
    icon: IconChefHat,
  },
  {
    title: "Nutrition Tracking",
    text:
      "Track calories, macros, and key nutrients in a clean daily view, so you can see exactly how each suggested meal fits into your targets and adjust in seconds.",
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
              <Image src="/beef.png" alt="Beef" width={170} height={120} sizes="170px" className="h-auto w-auto object-contain drop-shadow-[0_10px_25px_rgba(0,0,0,0.45)]" />
              <Image src="/chicken.png" alt="Chicken" width={170} height={120} sizes="170px" className="h-auto w-auto object-contain drop-shadow-[0_10px_25px_rgba(0,0,0,0.45)]" />
            </div>

            <div className="text-center">
              <h1 className="text-5xl font-bold tracking-tight text-[var(--foreground)] sm:text-6xl dark:text-white">
                Create a Meal Plan
              </h1>
              <p className="mt-2 text-4xl font-extrabold tracking-tight text-[var(--accent)]/85 sm:text-5xl">
                Tailored For You
              </p>
              <p className="mx-auto mt-6 max-w-xl text-base text-[var(--muted-text)] sm:text-lg">
                Plan delicious, nutritious meals based on your ingredients, preferences, and dietary needs with our intelligent AI Agent.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <Link
                  href="/auth/register"
                  className="btn-solid inline-flex items-center gap-2 rounded-xl bg-[var(--user-bubble-bg)] px-6 py-3 text-base font-medium text-[var(--user-bubble-fg)] shadow"
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
              <Image src="/vegetables.png" alt="Vegetables" width={170} height={120} sizes="170px" priority className="h-auto w-auto object-contain drop-shadow-[0_10px_25px_rgba(0,0,0,0.45)]" />
              <Image src="/fruits.png" alt="Fruits" width={170} height={120} sizes="170px" className="h-auto w-auto object-contain drop-shadow-[0_10px_25px_rgba(0,0,0,0.45)]" />
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
                <CardContainer
                  key={f.title}
                  containerClassName="py-0"
                  className="w-full"
                >
                  <CardBody className="theme-panel group/card h-full w-full rounded-2xl p-6">
                    <CardItem translateZ={50}>
                      <div className="chef-icon-badge mb-4 flex h-12 w-12 items-center justify-center rounded-xl">
                        <f.icon size={22} className="green-shine-icon" />
                      </div>
                    </CardItem>
                    <CardItem
                      as="h3"
                      translateZ={70}
                      className="mb-2 text-lg font-semibold"
                    >
                      {f.title}
                    </CardItem>
                    <CardItem
                      as="p"
                      translateZ={60}
                      className="text-sm text-[var(--muted-text)]"
                    >
                      {f.text}
                    </CardItem>
                  </CardBody>
                </CardContainer>
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
              <CardContainer
                key={step}
                containerClassName="py-0"
                className="w-full"
              >
                <CardBody className="theme-panel group/card h-full w-full rounded-2xl p-6 text-center">
                  <CardItem translateZ={55} className="mx-auto mb-4">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--surface)] text-lg font-bold text-[var(--foreground)]">
                      {index + 1}
                    </div>
                  </CardItem>
                  <CardItem
                    as="h3"
                    translateZ={70}
                    className="mx-auto text-lg font-semibold"
                  >
                    {step}
                  </CardItem>
                </CardBody>
              </CardContainer>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link
              href="/meal-plan/create"
              className="btn-solid inline-flex items-center gap-2 rounded-xl bg-[var(--user-bubble-bg)] px-6 py-3 text-base font-medium text-[var(--user-bubble-fg)] shadow"
            >
              Start Meal Planning
              <IconToolsKitchen2 size={18} className="green-shine-icon" />
            </Link>
            <p className="mt-4 text-sm text-[var(--muted-text)]">Meal-IT!! - made by Sanidhya, Rajnish, Sachet, Aayush</p>
          </div>
        </section>
      </main>
    </div>
  );
}
