"use client";

import Image from "next/image";
import { useMemo, useState, useSyncExternalStore } from "react";
import { AppNavbar } from "@/components/app-navbar";
import { InputField } from "@/components/nutrition/input-field";
import { PrimaryButton } from "@/components/nutrition/primary-button";
import { SelectField } from "@/components/nutrition/select-field";
import { StatCard } from "@/components/nutrition/stat-card";
import { TrackerCard } from "@/components/nutrition/tracker-card";
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

type Entry = {
  id: string;
  meal: string;
  food: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
};

export default function NutritionTrackerPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [meal, setMeal] = useState("breakfast");
  const [food, setFood] = useState("");
  const [calories, setCalories] = useState(0);
  const [protein, setProtein] = useState(0);
  const [carbs, setCarbs] = useState(0);
  const [fats, setFats] = useState(0);

  const isDark = useSyncExternalStore(subscribeHtmlDark, readHtmlIsDark, () => false);
  const [lightBgSrc, setLightBgSrc] = useState("/dashboard-bg-light.png");
  const [darkBgSrc, setDarkBgSrc] = useState("/dashboard-bg-dark.png");

  const totals = useMemo(
    () =>
      entries.reduce(
        (acc, e) => ({
          calories: acc.calories + e.calories,
          protein: acc.protein + e.protein,
          carbs: acc.carbs + e.carbs,
          fats: acc.fats + e.fats,
        }),
        { calories: 0, protein: 0, carbs: 0, fats: 0 }
      ),
    [entries]
  );

  const add = () => {
    if (!food.trim()) return;
    setEntries((prev) => [
      {
        id: crypto.randomUUID(),
        meal,
        food: food.trim(),
        calories,
        protein,
        carbs,
        fats,
      },
      ...prev,
    ]);
    setFood("");
    setCalories(0);
    setProtein(0);
    setCarbs(0);
    setFats(0);
  };

  return (
    <div className="relative min-h-screen bg-[var(--background)] text-[var(--foreground)]">
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
      <main className="relative z-10 mx-auto w-full max-w-6xl px-6 py-10">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:items-stretch">
          <TrackerCard className="flex min-h-[400px] flex-col p-5 lg:col-span-1">
            <h1 className="mb-2 text-xl font-semibold text-[var(--foreground)]">Add Meal</h1>
            <div className="flex flex-1 flex-col gap-3">
              <SelectField value={meal} onChange={(e) => setMeal(e.target.value)}>
                <option value="breakfast">Breakfast</option>
                <option value="lunch">Lunch</option>
                <option value="dinner">Dinner</option>
                <option value="snack">Snack</option>
              </SelectField>
              <InputField
                value={food}
                onChange={(e) => setFood(e.target.value)}
                placeholder="Food name"
              />
              <InputField
                type="number"
                value={calories}
                onChange={(e) => setCalories(Number(e.target.value))}
                placeholder="Calories"
              />
              <InputField
                type="number"
                value={protein}
                onChange={(e) => setProtein(Number(e.target.value))}
                placeholder="Protein"
              />
              <InputField
                type="number"
                value={carbs}
                onChange={(e) => setCarbs(Number(e.target.value))}
                placeholder="Carbs"
              />
              <InputField
                type="number"
                value={fats}
                onChange={(e) => setFats(Number(e.target.value))}
                placeholder="Fats"
              />
              <div className="flex-1" aria-hidden />
              <PrimaryButton onClick={add}>Add to Tracker</PrimaryButton>
            </div>
          </TrackerCard>

          <TrackerCard className="flex min-h-[400px] flex-col gap-6 p-5 lg:col-span-2">
            <div>
              <h2 className="mb-2 text-xl font-semibold text-[var(--foreground)]">Today Summary</h2>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-6">
                <StatCard label="Calories" value={totals.calories} />
                <StatCard label="Protein" value={totals.protein} />
                <StatCard label="Carbs" value={totals.carbs} />
                <StatCard label="Fats" value={totals.fats} />
              </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col">
              {entries.length === 0 ? (
                <div className="flex h-full min-h-[280px] flex-1 items-center justify-center text-sm leading-relaxed text-[var(--muted-text)]">
                  No entries yet.
                </div>
              ) : (
                <div className="flex flex-1 flex-col gap-3 overflow-y-auto pr-1">
                  {entries.map((e) => (
                    <div
                      key={e.id}
                      className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 text-sm leading-relaxed shadow-sm transition-all duration-200 hover:shadow-md"
                    >
                      <p className="font-semibold capitalize text-[var(--foreground)]">
                        {e.meal}: {e.food}
                      </p>
                      <p className="mt-1 text-[var(--muted-text)]">
                        {e.calories} kcal | P {e.protein}g | C {e.carbs}g | F {e.fats}g
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TrackerCard>
        </div>
      </main>
    </div>
  );
}
