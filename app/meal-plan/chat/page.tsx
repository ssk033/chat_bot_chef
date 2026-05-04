"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { IconArrowLeft, IconBookmark } from "@tabler/icons-react";
import { AssistantModal } from "@/components/chat/assistant-modal";
import { ChatInput } from "@/components/chat/chat-input";
import { ChatMessage, ChefTypingIndicator } from "@/components/chat/chat-message";
import { AppNavbar } from "@/components/app-navbar";
import { MealPlanPageBackdrop } from "@/components/meal-plan/meal-plan-page-backdrop";
import { sanitizeAssistantDisplayText } from "@/lib/sanitize-chat-display";
import {
  appendAiSavedPlan,
  getMealPlanChatSession,
} from "@/lib/meal-plan-ai-saves";

type Msg = { id: string; role: "user" | "bot"; text: string };

function MealPlanChatContent() {
  const params = useSearchParams();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [saveBanner, setSaveBanner] = useState<string | null>(null);

  const initialPrompt = useMemo(() => {
    const planName = params.get("planName")?.trim() || "Meal plan";
    const householdSize = params.get("householdSize")?.trim() || "not specified";
    const ingredients = params.get("ingredients")?.trim() || "";
    const dietaryRestrictions = params.get("dietaryRestrictions")?.trim() || "none";
    const allergies = params.get("allergies")?.trim() || "none";
    const proteinTarget = params.get("proteinTarget")?.trim() || "not specified";

    return [
      `Plan title: ${planName}.`,
      `Household size: ${householdSize} people.`,
      `Ingredients / pantry on hand: ${ingredients}.`,
      `Dietary preferences / restrictions: ${dietaryRestrictions}.`,
      `Allergies (must avoid): ${allergies}.`,
      `Protein target (if given): ${proteinTarget} (interpret as grams/day only when it looks like a number).`,
      "",
      "You are the Meal Planner assistant (not general small-talk). Suggest concrete meals and a simple weekly outline using the ingredients when possible. Use concise bullets. If you reference recipes, keep portions realistic for the household size.",
    ].join("\n");
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
        const data = (await res.json()) as { reply?: string };
        if (!mounted) return;
        setMessages([
          { id: crypto.randomUUID(), role: "user", text: initialPrompt },
          {
            id: crypto.randomUUID(),
            role: "bot",
            text: data.reply || "No plan generated. Try tweaking ingredients or check /api/query logs.",
          },
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
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "user", text: userText }]);
    setLoading(true);
    try {
      const res = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userText }),
      });
      const data = (await res.json()) as { reply?: string };
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "bot",
          text: data.reply || "No response.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const saveLatestPlannerReply = useCallback(() => {
    const lastBot = [...messages].reverse().find((m) => m.role === "bot");
    if (!lastBot) return;
    const session = getMealPlanChatSession();
    const defaultName = `Planner suggestion ${new Intl.DateTimeFormat(undefined, { dateStyle: "short", timeStyle: "short" }).format(new Date())}`;
    const name = session?.planName ? `${session.planName}, reply` : defaultName;
    appendAiSavedPlan({ name, content: lastBot.text });
    setSaveBanner(sanitizeAssistantDisplayText(`Saved "${name}", view under Saved meal plans.`));
    window.setTimeout(() => setSaveBanner(null), 4500);
  }, [messages]);

  return (
    <div className="relative flex min-h-screen flex-col bg-[var(--background)] text-[var(--foreground)]">
      <MealPlanPageBackdrop />
      <AppNavbar />
      <main className="relative z-10 mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 py-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/meal-plan/create"
              className="inline-flex items-center gap-2 text-sm font-medium text-[var(--muted-text)] hover:text-[var(--foreground)]"
            >
              <IconArrowLeft size={18} stroke={1.75} aria-hidden />
              Edit intake
            </Link>
            <Link
              href="/meal-plan/saved"
              className="text-sm font-medium text-[var(--accent)] underline-offset-4 hover:underline"
            >
              Saved plans
            </Link>
          </div>
          <button
            type="button"
            onClick={saveLatestPlannerReply}
            disabled={loading || messages.filter((m) => m.role === "bot").length === 0}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_80%,transparent)] px-4 py-2.5 text-sm font-semibold text-[var(--foreground)] shadow-sm backdrop-blur transition-all hover:bg-[var(--surface-muted)] disabled:pointer-events-none disabled:opacity-45 dark:border-white/[0.1]"
          >
            <IconBookmark size={18} stroke={1.75} aria-hidden />
            Save latest reply
          </button>
        </div>

        {saveBanner ? (
          <p
            className="rounded-xl border border-[var(--accent)]/35 bg-[var(--accent-muted)] px-4 py-3 text-sm leading-relaxed text-[var(--foreground)] dark:text-white/70"
            role="status"
          >
            {saveBanner}
          </p>
        ) : null}

        <p className="text-xs text-[color-mix(in_srgb,var(--foreground)_58%,transparent)] dark:text-white/60">
          Separate from main Chef chat (same assistant styling).
        </p>

        <AssistantModal
          title="Meal planner"
          subtitle="Weekly outline, swaps, and tweaks"
          className="w-full max-h-[min(80vh,calc(100dvh-10rem))]"
        >
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="relative min-h-0 flex-1 overflow-y-auto overscroll-y-contain">
              <div className="mx-auto max-w-[760px] space-y-6 px-2 py-4 sm:px-4 sm:py-5">
                {messages.map((m) => (
                  <ChatMessage
                    key={m.id}
                    message={{
                      id: m.id,
                      role: m.role === "user" ? "user" : "assistant",
                      text: m.text,
                    }}
                    userInitials="YO"
                    assistantLabel="Planner"
                  />
                ))}
                {loading ? <ChefTypingIndicator assistantLabel="Planner" /> : null}
              </div>
            </div>

            <ChatInput
              value={input}
              onChange={setInput}
              onSend={() => void send()}
              isLoading={loading}
              isListening={false}
              onMicToggle={() => {}}
              hasBotReply={false}
              isPlayingTTS={false}
              onSpeak={() => {}}
              onStopSpeak={() => {}}
              helperText="Enter to send · Separate planner assistant"
            />
          </div>
        </AssistantModal>
      </main>
    </div>
  );
}

export default function MealPlanChatPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[var(--background)] text-[var(--muted-text)]">
          Loading meal planner…
        </div>
      }
    >
      <MealPlanChatContent />
    </Suspense>
  );
}
