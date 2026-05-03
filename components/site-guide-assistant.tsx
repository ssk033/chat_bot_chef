"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  IconMessageCircle,
  IconMinus,
  IconRobot,
  IconSend,
  IconSparkles,
  IconX,
} from "@tabler/icons-react";

type ChatRole = "user" | "assistant";

type ChatMessage = {
  role: ChatRole;
  content: string;
  localOnly?: boolean;
};

const WELCOME: ChatMessage = {
  role: "assistant",
  content:
    "Hi — I'm **Guide**, your site assistant. Ask me where anything lives (meal plans, Chef chat, photo food tracker, nutrition log), or say you're new and I'll walk you through.",
  localOnly: true,
};

export function SiteGuideAssistant() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>(() => [WELCOME]);
  const [pending, setPending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open || minimized) return;
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open, minimized, pending]);

  useEffect(() => {
    if (!open || minimized) return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 120);
    return () => window.clearTimeout(t);
  }, [open, minimized]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || pending) return;

    setInput("");
    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setPending(true);

    try {
      const payload = {
        pathname: pathname || "/",
        messages: nextMessages.map(({ role, content, localOnly }) => ({
          role,
          content,
          localOnly,
        })),
      };

      const res = await fetch("/api/site-guide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof data?.error === "string" ? data.error : `Request failed (${res.status})`
        );
      }

      const reply = typeof data?.reply === "string" ? data.reply : "";
      if (!reply) throw new Error("No reply from assistant.");

      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (e: unknown) {
      console.warn("[site-guide-assistant]", e);
      const fallback =
        "I couldn't reach the guide service. Confirm **GEMINI_API_KEY** is in `.env`, restart the dev server, and try again.";
      const msg =
        e instanceof Error && e.message.trim() ? e.message.trim() : fallback;
      setMessages((prev) => [...prev, { role: "assistant", content: msg }]);
    } finally {
      setPending(false);
    }
  }, [input, messages, pathname, pending]);

  return (
    <>
      {/* Launcher */}
      <div className="fixed bottom-5 right-5 z-[100] flex flex-col items-end gap-2 print:hidden">
        {open && !minimized ? (
          <section
            className="theme-panel flex max-h-[min(560px,70vh)] w-[min(100vw-2rem,380px)] flex-col overflow-hidden rounded-2xl shadow-2xl"
            aria-label="Site guide assistant"
          >
            <header className="flex shrink-0 items-center gap-2 border-b border-[var(--border-subtle)] bg-[var(--surface-muted)] px-3 py-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-muted)] text-[var(--accent)]">
                <IconSparkles size={18} stroke={1.75} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-[var(--foreground)]">
                  Site guide
                </p>
                <p className="truncate text-xs text-[var(--muted-text)]">
                  Ask how to use Meal-IT!!
                </p>
              </div>
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--muted-text)] hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
                aria-label="Minimize"
                onClick={() => setMinimized(true)}
              >
                <IconMinus size={18} />
              </button>
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--muted-text)] hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
                aria-label="Close"
                onClick={() => setOpen(false)}
              >
                <IconX size={18} />
              </button>
            </header>

            <div
              ref={scrollRef}
              className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-3 py-3"
            >
              {messages.map((m, i) => (
                <div
                  key={`${i}-${m.role}`}
                  className={[
                    "flex gap-2 text-sm leading-relaxed",
                    m.role === "user" ? "justify-end" : "justify-start",
                  ].join(" ")}
                >
                  {m.role === "assistant" ? (
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-muted)] text-[var(--accent)]">
                      <IconRobot size={18} stroke={1.5} />
                    </span>
                  ) : null}
                  <div
                    className={[
                      "max-w-[88%] rounded-2xl px-3 py-2 whitespace-pre-wrap",
                      m.role === "user"
                        ? "bg-[var(--user-bubble-bg)] text-[var(--user-bubble-fg)]"
                        : "border border-[var(--border-subtle)] bg-[var(--surface)] text-[var(--foreground)]",
                    ].join(" ")}
                  >
                    {formatAssistantMarkdownLite(m.content)}
                  </div>
                </div>
              ))}
              {pending ? (
                <p className="pl-10 text-xs text-[var(--muted-text)]">Thinking…</p>
              ) : null}
            </div>

            <footer className="shrink-0 border-t border-[var(--border-subtle)] bg-[var(--surface-muted)] p-2">
              <div className="flex items-end gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] p-1.5 focus-within:ring-2 focus-within:ring-[var(--ring-focus)]">
                <textarea
                  ref={inputRef}
                  rows={2}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void send();
                    }
                  }}
                  placeholder="e.g. I'm new — where do I start?"
                  className="max-h-28 min-h-11 flex-1 resize-none bg-transparent px-2 py-2 text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--muted-text)]"
                  disabled={pending}
                  aria-label="Message to site guide"
                />
                <button
                  type="button"
                  onClick={() => void send()}
                  disabled={pending || !input.trim()}
                  className="btn-solid mb-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--user-bubble-bg)] text-[var(--user-bubble-fg)] disabled:opacity-40"
                  aria-label="Send"
                >
                  <IconSend size={18} />
                </button>
              </div>
              <p className="mt-1.5 px-1 text-[10px] text-[var(--muted-text)]">
                Uses Google Gemini · Esc to close
              </p>
            </footer>
          </section>
        ) : null}

        {open && minimized ? (
          <button
            type="button"
            onClick={() => setMinimized(false)}
            className="glow-pill flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium shadow-lg"
            aria-label="Expand site guide"
          >
            <IconSparkles size={18} className="text-[var(--accent)]" />
            Guide
          </button>
        ) : null}

        {!open ? (
          <button
            type="button"
            onClick={() => {
              setOpen(true);
              setMinimized(false);
            }}
            className="btn-solid flex h-14 w-14 items-center justify-center rounded-full bg-[var(--user-bubble-bg)] text-[var(--user-bubble-fg)] shadow-xl ring-4 ring-[var(--background)] transition hover:scale-[1.03] active:scale-[0.98]"
            aria-label="Open site guide assistant"
          >
            <IconMessageCircle size={26} stroke={1.5} />
          </button>
        ) : null}
      </div>
    </>
  );
}

/** Very small formatter: **bold**, `code`, newlines — safe for inner HTML avoidance */
function formatAssistantMarkdownLite(text: string) {
  const lines = text.split("\n");
  return lines.map((line, li) => (
    <span key={li} className="block">
      {splitBoldAndCode(line)}
      {li < lines.length - 1 ? <br /> : null}
    </span>
  ));
}

function splitBoldAndCode(line: string) {
  const parts: ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < line.length) {
    const bold = line.indexOf("**", i);
    const tick = line.indexOf("`", i);

    let next = -1;
    let mode: "bold" | "code" | null = null;
    if (bold !== -1 && (tick === -1 || bold <= tick)) {
      next = bold;
      mode = "bold";
    } else if (tick !== -1) {
      next = tick;
      mode = "code";
    }

    if (next === -1) {
      parts.push(<span key={key++}>{line.slice(i)}</span>);
      break;
    }

    if (next > i) {
      parts.push(<span key={key++}>{line.slice(i, next)}</span>);
    }

    if (mode === "bold") {
      const end = line.indexOf("**", next + 2);
      if (end === -1) {
        parts.push(<span key={key++}>{line.slice(next)}</span>);
        break;
      }
      parts.push(
        <strong key={key++} className="font-semibold">
          {line.slice(next + 2, end)}
        </strong>
      );
      i = end + 2;
    } else {
      const end = line.indexOf("`", next + 1);
      if (end === -1) {
        parts.push(<span key={key++}>{line.slice(next)}</span>);
        break;
      }
      parts.push(
        <code
          key={key++}
          className="rounded bg-[var(--surface-muted)] px-1 py-0.5 font-mono text-[0.85em] text-[var(--accent)]"
        >
          {line.slice(next + 1, end)}
        </code>
      );
      i = end + 1;
    }
  }

  return parts;
}
