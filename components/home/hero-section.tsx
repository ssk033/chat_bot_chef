import Image from "next/image";
import { IconArrowRight } from "@tabler/icons-react";
import { CTAButton } from "@/components/home/cta-button";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden px-6 py-16 sm:py-20 lg:py-24">
      <div className="absolute inset-0 -z-10">
        <div className="absolute left-[10%] top-0 h-80 w-80 rounded-full bg-[color-mix(in_srgb,var(--accent)_24%,var(--background))] blur-3xl opacity-90" />
        <div className="absolute right-[8%] top-24 h-72 w-72 rounded-full bg-[color-mix(in_srgb,var(--accent)_16%,var(--surface-muted))] blur-3xl opacity-90" />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[color-mix(in_srgb,var(--foreground)_8%,transparent)] to-transparent opacity-40 dark:opacity-60"
          aria-hidden
        />
      </div>

      {/* Decorative stickers — full source resolution + high encoder quality (replace PNGs with larger assets for true 4K prints) */}
      <div
        className="pointer-events-none absolute inset-y-0 left-0 z-0 hidden w-[min(22vw,14rem)] flex-col items-center justify-center gap-12 pt-16 opacity-95 lg:flex xl:w-[min(24vw,17rem)]"
        aria-hidden
      >
        <Image
          src="/beef.png"
          alt=""
          width={577}
          height={433}
          sizes="(min-width: 1280px) min(24vw, 272px), (min-width: 1024px) min(22vw, 224px), 0px"
          quality={96}
          priority
          className="object-contain drop-shadow-[0_12px_28px_color-mix(in_srgb,var(--foreground)_22%,transparent)]"
          style={{ width: "clamp(150px, 22vw, 272px)", height: "auto" }}
        />
        <Image
          src="/chicken.png"
          alt=""
          width={800}
          height={800}
          sizes="(min-width: 1280px) min(24vw, 272px), (min-width: 1024px) min(22vw, 224px), 0px"
          quality={96}
          className="object-contain drop-shadow-[0_12px_28px_color-mix(in_srgb,var(--foreground)_22%,transparent)]"
          style={{ width: "clamp(150px, 22vw, 272px)", height: "auto" }}
        />
      </div>
      <div
        className="pointer-events-none absolute inset-y-0 right-0 z-0 hidden w-[min(22vw,14rem)] flex-col items-center justify-center gap-12 pt-16 opacity-95 lg:flex xl:w-[min(24vw,17rem)]"
        aria-hidden
      >
        <Image
          src="/vegetables.png"
          alt=""
          width={500}
          height={500}
          sizes="(min-width: 1280px) min(24vw, 272px), (min-width: 1024px) min(22vw, 224px), 0px"
          quality={96}
          className="object-contain drop-shadow-[0_12px_28px_color-mix(in_srgb,var(--foreground)_22%,transparent)]"
          style={{ width: "clamp(150px, 22vw, 272px)", height: "auto" }}
        />
        <Image
          src="/fruits.png"
          alt=""
          width={612}
          height={408}
          sizes="(min-width: 1280px) min(24vw, 272px), (min-width: 1024px) min(22vw, 224px), 0px"
          quality={96}
          className="object-contain drop-shadow-[0_12px_28px_color-mix(in_srgb,var(--foreground)_22%,transparent)]"
          style={{ width: "clamp(150px, 22vw, 272px)", height: "auto" }}
        />
      </div>

      <div className="home-fade-up relative z-10 mx-auto max-w-3xl px-4 text-center">
        <h1 className="text-4xl font-semibold tracking-tight text-[var(--foreground)] sm:text-5xl lg:text-6xl">
          Create a Meal Plan
        </h1>
        <p className="mt-4 text-2xl font-semibold tracking-tight text-[var(--accent)] sm:text-3xl lg:text-4xl">
          Tailored For You
        </p>
        <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-[var(--muted-text)] sm:text-lg">
          Plan delicious, nutritious meals based on your ingredients, preferences, and dietary needs with our intelligent
          AI agent.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <CTAButton href="/auth/register" variant="primary" iconRight={<IconArrowRight size={18} aria-hidden />}>
            Get Started
          </CTAButton>
          <CTAButton href="/auth/login?next=/chat-bot-chef" variant="secondary">
            Talk to Chef!!
          </CTAButton>
        </div>
      </div>
    </section>
  );
}
