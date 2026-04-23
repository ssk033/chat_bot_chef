"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AppNavbar } from "@/components/app-navbar";

type Msg = { role: "user" | "bot"; text: string };

function MealPlanChatContent() {
  const params = useSearchParams();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const initialPrompt = useMemo(() => {
    const ingredients = params.get("ingredients") || "";
    const dietaryRestrictions = params.get("dietaryRestrictions") || "none";
    const allergies = params.get("allergies") || "none";
    const proteinTarget = params.get("proteinTarget") || "not specified";
    return `Generate a meal plan with ingredients: ${ingredients}. Dietary restrictions: ${dietaryRestrictions}. Allergies: ${allergies}. Protein target: ${proteinTarget} grams/day. Use only recipes that match these ingredients and restrictions.`;
  }, [params]);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/query", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: initialPrompt }),
        });
        const data = await res.json();
        if (!mounted) return;
        setMessages([
          { role: "user", text: initialPrompt },
          { role: "bot", text: data.reply || "No plan generated." },
        ]);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    run();
    return () => {
      mounted = false;
    };
  }, [initialPrompt]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userText = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: userText }]);
    setLoading(true);
    try {
      const res = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userText }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "bot", text: data.reply || "No response." }]);
    } finally {
      setLoading(false);
    }
  };

  const savePlan = () => {
    const lastBot = [...messages].reverse().find((m) => m.role === "bot");
    if (!lastBot) return;
    const existing = JSON.parse(localStorage.getItem("meal_it_saved_plans") || "[]") as Array<{
      id: string;
      name: string;
      content: string;
      createdAt: string;
    }>;
    const next = [
      {
        id: crypto.randomUUID(),
        name: `Meal Plan #${existing.length + 1}`,
        content: lastBot.text,
        createdAt: new Date().toISOString(),
      },
      ...existing,
    ];
    localStorage.setItem("meal_it_saved_plans", JSON.stringify(next));
    alert("Meal plan saved!");
  };

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <AppNavbar />
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 py-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Meal Plan Chat</h1>
          <button
            onClick={savePlan}
            className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-4 py-2 text-sm font-medium"
          >
            Save Plan
          </button>
        </div>

        <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-4">
          <div className="mb-4 max-h-[55vh] space-y-3 overflow-y-auto pr-1">
            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "text-right" : "text-left"}>
                <div
                  className={`inline-block max-w-[90%] rounded-xl px-4 py-3 text-sm ${
                    m.role === "user"
                      ? "bg-[var(--user-bubble-bg)] text-[var(--user-bubble-fg)]"
                      : "border border-[var(--border-subtle)] bg-[var(--surface-muted)]"
                  }`}
                >
                  <p className="mb-1 text-xs opacity-70">{m.role === "user" ? "You" : "Chef"}</p>
                  <p className="whitespace-pre-wrap">{m.text}</p>
                </div>
              </div>
            ))}
            {loading ? <p className="text-sm text-[var(--muted-text)]">Thinking...</p> : null}
          </div>

          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => (e.key === "Enter" ? void send() : null)}
              placeholder="Ask follow-up..."
              className="flex-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-3 py-2"
            />
            <button
              onClick={send}
              className="rounded-lg bg-[var(--user-bubble-bg)] px-4 py-2 text-sm font-medium text-[var(--user-bubble-fg)]"
            >
              Send
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}

export default function MealPlanChatPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] p-6">Loading meal plan chat...</div>}>
      <MealPlanChatContent />
    </Suspense>
  );
}
