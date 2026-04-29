"use client";

import { useMemo, useState } from "react";
import { AppNavbar } from "@/components/app-navbar";

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
    <div
      className="relative min-h-screen bg-[var(--background)] bg-cover bg-center bg-no-repeat text-[var(--foreground)]"
      style={{ backgroundImage: "url('/food%20backgorund.png')" }}
    >
      <div className="pointer-events-none absolute inset-0 bg-black/30 dark:bg-black/50" />
      <AppNavbar />
      <main className="relative z-10 mx-auto grid w-full max-w-6xl gap-6 px-4 py-10 md:grid-cols-3">
        <section className="theme-panel rounded-2xl p-5 md:col-span-1">
          <h1 className="mb-4 text-xl font-bold">Add Meal</h1>
          <div className="space-y-3">
            <select
              value={meal}
              onChange={(e) => setMeal(e.target.value)}
              className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-2 text-[var(--foreground)] outline-none focus:border-[var(--input-border-focus)] focus:ring-2 focus:ring-[var(--ring-focus)]"
            >
              <option value="breakfast">Breakfast</option>
              <option value="lunch">Lunch</option>
              <option value="dinner">Dinner</option>
              <option value="snack">Snack</option>
            </select>
            <input
              value={food}
              onChange={(e) => setFood(e.target.value)}
              placeholder="Food name"
              className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-2 text-[var(--foreground)] outline-none focus:border-[var(--input-border-focus)] focus:ring-2 focus:ring-[var(--ring-focus)]"
            />
            <input type="number" value={calories} onChange={(e) => setCalories(Number(e.target.value))} placeholder="Calories" className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-2 text-[var(--foreground)] outline-none focus:border-[var(--input-border-focus)] focus:ring-2 focus:ring-[var(--ring-focus)]" />
            <input type="number" value={protein} onChange={(e) => setProtein(Number(e.target.value))} placeholder="Protein" className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-2 text-[var(--foreground)] outline-none focus:border-[var(--input-border-focus)] focus:ring-2 focus:ring-[var(--ring-focus)]" />
            <input type="number" value={carbs} onChange={(e) => setCarbs(Number(e.target.value))} placeholder="Carbs" className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-2 text-[var(--foreground)] outline-none focus:border-[var(--input-border-focus)] focus:ring-2 focus:ring-[var(--ring-focus)]" />
            <input type="number" value={fats} onChange={(e) => setFats(Number(e.target.value))} placeholder="Fats" className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-2 text-[var(--foreground)] outline-none focus:border-[var(--input-border-focus)] focus:ring-2 focus:ring-[var(--ring-focus)]" />
            <button onClick={add} className="btn-solid w-full rounded-lg bg-[var(--user-bubble-bg)] px-4 py-2 text-sm font-medium text-[var(--user-bubble-fg)] hover:opacity-90">
              Add to Tracker
            </button>
          </div>
        </section>

        <section className="theme-panel rounded-2xl p-5 md:col-span-2">
          <h2 className="mb-4 text-xl font-bold">Today Summary</h2>
          <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat title="Calories" value={totals.calories} />
            <Stat title="Protein" value={totals.protein} />
            <Stat title="Carbs" value={totals.carbs} />
            <Stat title="Fats" value={totals.fats} />
          </div>
          <div className="space-y-2">
            {entries.length === 0 ? (
              <p className="text-sm text-[var(--muted-text)]">No entries yet.</p>
            ) : (
              entries.map((e) => (
                <div key={e.id} className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-3 text-sm">
                  <p className="font-semibold capitalize">{e.meal}: {e.food}</p>
                  <p className="text-[var(--muted-text)]">
                    {e.calories} kcal | P {e.protein}g | C {e.carbs}g | F {e.fats}g
                  </p>
                </div>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

function Stat({ title, value }: { title: string; value: number }) {
  return (
    <div className="theme-panel rounded-lg p-3">
      <p className="text-xs text-[var(--muted-text)]">{title}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}
