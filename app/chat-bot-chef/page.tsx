"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  IconChefHat,
  IconSend,
  IconPlayerPlay,
  IconPlayerStop,
  IconLoader2,
  IconMenu2,
} from "@tabler/icons-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { ChatSidebar, type SessionRow } from "@/components/chat-sidebar";
import { CHEF_ANONYMOUS_KEY_HEADER } from "@/lib/chef-auth";
import { getStoredUser } from "@/lib/client-auth";

const LS_DISPLAY_NAME = "chef_display_name";
const LS_SIDEBAR_COLLAPSED = "chef_sidebar_collapsed";

export default function ChatBotChefPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<{ role: string; text: string }[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [modelStatus, setModelStatus] = useState<{ available: boolean; loading: boolean }>({
    available: false,
    loading: true,
  });
  const [ready, setReady] = useState(false);
  const [anonymousKey, setAnonymousKey] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("Guest");
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [chatStorageError, setChatStorageError] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const lastRequestTime = useRef<number>(0);
  const minRequestInterval = 2000;
  const scrollAnchorRef = useRef<HTMLDivElement | null>(null);

  const refreshSessions = useCallback(async (key: string) => {
    try {
      const res = await fetch("/api/sessions", {
        headers: { [CHEF_ANONYMOUS_KEY_HEADER]: key },
      });
      if (!res.ok) return;
      const data = await res.json();
      const list: SessionRow[] = (data.sessions ?? []).map(
        (s: { id: number; title: string; updatedAt: string }) => ({
          id: s.id,
          title: s.title,
          updatedAt: s.updatedAt,
        })
      );
      setSessions(list);
    } catch {
      /* ignore */
    }
  }, []);

  const loadMessagesForSession = useCallback(async (sessionId: number, key: string) => {
    try {
      const res = await fetch(`/api/sessions/${sessionId}`, {
        headers: { [CHEF_ANONYMOUS_KEY_HEADER]: key },
      });
      if (!res.ok) return;
      const data = await res.json();
      setMessages(
        (data.messages ?? []).map((m: { role: string; text: string }) => ({
          role: m.role,
          text: m.text,
        }))
      );
    } catch {
      /* ignore */
    }
  }, []);

  function stopAudio() {
    window.speechSynthesis.cancel();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
    utteranceRef.current = null;
  }

  useEffect(() => {
    const user = getStoredUser();
    if (!user) {
      router.replace("/auth/login?next=/chat-bot-chef");
      return;
    }
    setAuthChecked(true);
  }, [router]);

  useEffect(() => {
    try {
      setSidebarCollapsed(localStorage.getItem(LS_SIDEBAR_COLLAPSED) === "1");
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const loadVoices = () => setVoices(window.speechSynthesis.getVoices());
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    fetch("/api/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "__check_model__" }),
    })
      .then((res) => res.json())
      .then((data) => {
        setModelStatus({ available: !data.error || Boolean(data.reply), loading: false });
      })
      .catch(() => setModelStatus({ available: false, loading: false }));

    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  useEffect(() => {
    if (!authChecked) return;
    let cancelled = false;
    (async () => {
      try {
        const user = getStoredUser();
        if (!user?.email) {
          router.replace("/auth/login?next=/chat-bot-chef");
          return;
        }

        const key = `account:${user.email.toLowerCase()}`;

        const savedName = localStorage.getItem(LS_DISPLAY_NAME);
        const boot = await fetch("/api/user/bootstrap", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            anonymousKey: key,
            displayName: savedName && savedName.trim() ? savedName.trim() : undefined,
          }),
        });

        if (!boot.ok) {
          const err = await boot.json().catch(() => ({}));
          setChatStorageError(
            typeof err?.error === "string" ? err.error : "Could not connect to chat storage (database)."
          );
          setAnonymousKey(key);
          setReady(true);
          return;
        }

        const { user: bootUser } = await boot.json();
        if (cancelled) return;

        setAnonymousKey(key);
        setDisplayName(bootUser.displayName ?? "Guest");
        localStorage.setItem(LS_DISPLAY_NAME, bootUser.displayName ?? "Guest");

        const sessionsRes = await fetch("/api/sessions", {
          headers: { [CHEF_ANONYMOUS_KEY_HEADER]: key },
        });

        if (!sessionsRes.ok) {
          setChatStorageError("Chat history unavailable. Run database migrations if you just updated the app.");
          setReady(true);
          return;
        }

        const { sessions: list } = await sessionsRes.json();
        const rows: SessionRow[] = (list ?? []).map(
          (s: { id: number; title: string; updatedAt: string }) => ({
            id: s.id,
            title: s.title,
            updatedAt: s.updatedAt,
          })
        );
        setSessions(rows);

        if (rows.length === 0) {
          const cr = await fetch("/api/sessions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              [CHEF_ANONYMOUS_KEY_HEADER]: key,
            },
            body: JSON.stringify({}),
          });
          if (!cr.ok) {
            setChatStorageError("Could not create a chat session. Check DATABASE_URL and run: npx prisma migrate deploy");
            setReady(true);
            return;
          }
          const { session } = await cr.json();
          setSessions([session]);
          setActiveSessionId(session.id);
          setMessages([]);
        } else {
          setActiveSessionId(rows[0].id);
          await loadMessagesForSession(rows[0].id, key);
        }
      } catch (e) {
        console.error(e);
        setChatStorageError("Failed to initialize chat.");
      } finally {
        if (!cancelled) setReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authChecked, loadMessagesForSession, router]);

  useEffect(() => {
    scrollAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isLoading]);

  const toggleSidebarCollapsed = useCallback(() => {
    setSidebarCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem(LS_SIDEBAR_COLLAPSED, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const handleNewChat = useCallback(async () => {
    const key = anonymousKey;
    if (!key) return;
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          [CHEF_ANONYMOUS_KEY_HEADER]: key,
        },
        body: JSON.stringify({}),
      });
      if (!res.ok) return;
      const { session } = await res.json();
      setSessions((prev) => [{ ...session, updatedAt: session.updatedAt ?? new Date().toISOString() }, ...prev]);
      setActiveSessionId(session.id);
      setMessages([]);
      void refreshSessions(key);
    } catch {
      /* ignore */
    }
  }, [anonymousKey, refreshSessions]);

  const handleSelectSession = useCallback(
    async (id: number) => {
      const key = anonymousKey;
      if (!key) return;
      setActiveSessionId(id);
      await loadMessagesForSession(id, key);
    },
    [anonymousKey, loadMessagesForSession]
  );

  const handleDeleteSession = useCallback(
    async (id: number) => {
      const key = anonymousKey;
      if (!key) return;
      try {
        const res = await fetch(`/api/sessions/${id}`, {
          method: "DELETE",
          headers: { [CHEF_ANONYMOUS_KEY_HEADER]: key },
        });
        if (!res.ok) return;
        const remaining = sessions.filter((s) => s.id !== id);
        setSessions(remaining);
        if (activeSessionId === id) {
          if (remaining.length > 0) {
            setActiveSessionId(remaining[0].id);
            await loadMessagesForSession(remaining[0].id, key);
          } else {
            const cr = await fetch("/api/sessions", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                [CHEF_ANONYMOUS_KEY_HEADER]: key,
              },
              body: JSON.stringify({}),
            });
            if (cr.ok) {
              const { session } = await cr.json();
              setSessions([session]);
              setActiveSessionId(session.id);
              setMessages([]);
            } else {
              setActiveSessionId(null);
              setMessages([]);
            }
          }
        }
        void refreshSessions(key);
      } catch {
        /* ignore */
      }
    },
    [anonymousKey, sessions, activeSessionId, loadMessagesForSession, refreshSessions]
  );

  const handleRenameUser = useCallback(async () => {
    const key = anonymousKey;
    if (!key) return;
    const next = window.prompt("Display name", displayName);
    if (next === null) return;
    const trimmed = next.trim().slice(0, 80);
    if (!trimmed) return;
    try {
      const res = await fetch("/api/user", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          [CHEF_ANONYMOUS_KEY_HEADER]: key,
        },
        body: JSON.stringify({ displayName: trimmed }),
      });
      if (!res.ok) return;
      const { user } = await res.json();
      setDisplayName(user.displayName);
      localStorage.setItem(LS_DISPLAY_NAME, user.displayName);
    } catch {
      /* ignore */
    }
  }, [anonymousKey, displayName]);

  async function persistExchange(userText: string, botText: string) {
    const key = anonymousKey;
    const sid = activeSessionId;
    if (!key || !sid) return;
    try {
      await fetch(`/api/sessions/${sid}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          [CHEF_ANONYMOUS_KEY_HEADER]: key,
        },
        body: JSON.stringify({
          entries: [
            { role: "user", content: userText },
            { role: "bot", content: botText },
          ],
        }),
      });
      void refreshSessions(key);
    } catch {
      /* ignore */
    }
  }

  async function send() {
    if (!input.trim() || isLoading) return;

    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime.current;
    if (timeSinceLastRequest < minRequestInterval) {
      const waitTime = Math.ceil((minRequestInterval - timeSinceLastRequest) / 1000);
      setMessages((prev) => [
        ...prev,
        {
          role: "bot",
          text: `Please wait ${waitTime} second${waitTime > 1 ? "s" : ""} before sending another message.`,
        },
      ]);
      return;
    }

    const userMsg = { role: "user", text: input };
    setMessages((prev) => [...prev, userMsg]);
    const userInput = input;
    setInput("");
    setIsLoading(true);
    lastRequestTime.current = now;

    try {
      const res = await fetch("/api/query", {
        method: "POST",
        body: JSON.stringify({ message: userInput }),
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();

      if (data.reply && !data.error) {
        setModelStatus({ available: true, loading: false });
      }

      let botReply: string | null = null;

      if (res.status === 429) {
        botReply = data.reply || "Rate limit reached. Please wait a moment and try again.";
        setMessages((prev) => [...prev, { role: "bot", text: botReply }]);
      } else if (data.error && !data.reply) {
        setMessages((prev) => [...prev, { role: "bot", text: `Error: ${data.error}` }]);
      } else {
        botReply = data.reply || "Sorry, I couldn't generate a response.";
        setMessages((prev) => [...prev, { role: "bot", text: botReply }]);
      }

      if (botReply !== null) {
        void persistExchange(userInput, botReply);
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "bot",
          text: "Error: Could not get response. Please check your connection and try again.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  function playLatestWithBrowserTTS() {
    const lastBot = [...messages].reverse().find((m) => m.role === "bot");
    if (!lastBot) return alert("No assistant message to speak.");

    stopAudio();

    const utterance = new SpeechSynthesisUtterance(lastBot.text);
    utteranceRef.current = utterance;

    const englishVoice =
      voices.find(
        (v) => v.lang.startsWith("en") && (v.name.includes("Google") || v.name.includes("Natural"))
      ) || voices.find((v) => v.lang.startsWith("en"));

    if (englishVoice) {
      utterance.voice = englishVoice;
    }

    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    utterance.onstart = () => setIsPlaying(true);
    utterance.onend = () => {
      setIsPlaying(false);
      utteranceRef.current = null;
    };
    utterance.onerror = () => {
      setIsPlaying(false);
      utteranceRef.current = null;
      alert("Error playing audio");
    };

    window.speechSynthesis.speak(utterance);
  }

  const hasBotReply = messages.filter((m) => m.role === "bot").length > 0;

  if (!authChecked || !ready) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[var(--background)] text-[var(--muted-text)]">
        <IconLoader2 size={28} className="animate-spin" aria-hidden />
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <ChatSidebar
        sessions={sessions}
        activeSessionId={activeSessionId}
        displayName={displayName}
        collapsed={sidebarCollapsed}
        mobileOpen={mobileSidebarOpen}
        onToggleCollapsed={toggleSidebarCollapsed}
        onMobileOpen={() => setMobileSidebarOpen(true)}
        onMobileClose={() => setMobileSidebarOpen(false)}
        onNewChat={handleNewChat}
        onSelectSession={handleSelectSession}
        onDeleteSession={handleDeleteSession}
        onRenameUser={handleRenameUser}
      />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="shrink-0 border-b border-[var(--border-subtle)] bg-[var(--surface)]/90 backdrop-blur-md supports-[backdrop-filter]:bg-[var(--surface)]/75">
          <div className="flex w-full flex-wrap items-center gap-3 px-3 py-3 sm:px-5 lg:px-6 xl:px-8">
            <button
              type="button"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-[var(--foreground)] transition hover:bg-[var(--surface-muted)] md:hidden"
              onClick={() => setMobileSidebarOpen(true)}
              aria-label="Open sidebar"
            >
              <IconMenu2 size={22} stroke={1.5} />
            </button>
            <div className="flex min-w-0 flex-1 items-center gap-3 sm:flex-initial sm:gap-3.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-muted)] text-[var(--accent)] sm:h-10 sm:w-10">
                <IconChefHat size={22} stroke={1.75} aria-hidden className="green-shine-icon" />
              </span>
              <div className="min-w-0 md:block">
                <p className="truncate text-sm font-semibold tracking-tight sm:text-base">Chef</p>
                <p className="hidden truncate text-xs text-[var(--muted-text)] sm:block sm:text-[13px]">
                  Recipe search & cooking Q&A
                </p>
              </div>
            </div>
            <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
              <ThemeToggle />
              {modelStatus.loading ? (
                <span className="inline-flex items-center gap-1.5 text-xs text-[var(--muted-text)]">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--muted-text)]" />
                  Checking...
                </span>
              ) : modelStatus.available ? (
                <span className="inline-flex max-w-[10rem] items-center gap-1.5 text-xs text-[var(--foreground)] sm:max-w-none">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
                  <span className="truncate sm:whitespace-normal">Ready</span>
                </span>
              ) : (
                <span className="inline-flex max-w-[10rem] items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 sm:max-w-none">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                  <span className="truncate sm:whitespace-normal">Limited</span>
                </span>
              )}
            </div>
          </div>
        </header>

        {chatStorageError ? (
          <div
            className="shrink-0 border-b border-amber-500/30 bg-amber-500/10 px-3 py-2 text-center text-xs text-amber-800 dark:text-amber-200 sm:text-sm"
            role="status"
          >
            {chatStorageError}
          </div>
        ) : null}

        <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-3 py-4 sm:px-5 sm:py-5 lg:px-6 xl:max-w-4xl xl:px-8 min-h-0 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <section
            className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] shadow-sm"
            aria-label="Conversation"
          >
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-3 py-4 touch-pan-y sm:px-5 sm:py-5">
                {messages.length === 0 ? (
                  <div className="flex min-h-[min(50dvh,20rem)] flex-col items-center justify-center px-2 text-center sm:min-h-[280px]">
                    <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--surface-muted)] text-[var(--muted-text)] ring-1 ring-[var(--border-subtle)] sm:h-16 sm:w-16">
                      <IconChefHat size={30} stroke={1.5} aria-hidden className="green-shine-icon" />
                    </div>
                    <h2 className="max-w-md text-base font-medium tracking-tight text-[var(--foreground)] sm:text-lg">
                      Ask anything about recipes or ingredients
                    </h2>
                    <p className="mt-2 max-w-md text-sm leading-relaxed text-[var(--muted-text)]">
                      Example: &ldquo;What can I make with chicken and rice?&rdquo;
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4 sm:space-y-5">
                    {messages.map((m, i) => (
                      <div
                        key={i}
                        className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[min(100%,36rem)] rounded-2xl px-3.5 py-3 text-sm leading-relaxed sm:px-4 sm:text-[15px] sm:leading-relaxed ${
                            m.role === "user"
                              ? "bg-[var(--user-bubble-bg)] text-[var(--user-bubble-fg)]"
                              : "bg-[var(--surface-muted)] text-[var(--foreground)] ring-1 ring-[var(--border-subtle)]"
                          }`}
                        >
                          <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-[var(--muted-text)]">
                            {m.role === "user" ? "You" : "Chef"}
                          </div>
                          <div className="whitespace-pre-wrap break-words">{m.text}</div>
                        </div>
                      </div>
                    ))}
                    {isLoading && (
                      <div className="flex justify-start">
                        <div className="flex items-center gap-2 rounded-2xl bg-[var(--surface-muted)] px-3.5 py-3 text-sm text-[var(--muted-text)] ring-1 ring-[var(--border-subtle)] sm:px-4">
                          <IconLoader2 size={18} className="shrink-0 animate-spin" aria-hidden />
                          <span>Thinking...</span>
                        </div>
                      </div>
                    )}
                    <div ref={scrollAnchorRef} aria-hidden className="h-px w-full shrink-0" />
                  </div>
                )}
              </div>
            </div>
          </section>

          <section
            className="shrink-0 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-3 shadow-sm sm:p-4"
            aria-label="Message composer"
          >
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:gap-3">
              <label className="sr-only" htmlFor="chat-input">
                Message
              </label>
              <input
                id="chat-input"
                className="min-h-[48px] w-full min-w-0 flex-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-3.5 py-3 text-base text-[var(--foreground)] placeholder:text-[var(--muted-text)] outline-none transition-shadow focus:border-[var(--input-border-focus)] focus:ring-2 focus:ring-[var(--ring-focus)] disabled:opacity-60 sm:px-4 sm:text-sm"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void send();
                  }
                }}
                placeholder="Describe ingredients or ask for a recipe..."
                disabled={isLoading}
                autoComplete="off"
                enterKeyHint="send"
              />
              <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row sm:items-stretch sm:gap-2 lg:shrink-0">
                <button
                  type="button"
                  onClick={() => void send()}
                  disabled={isLoading || !input.trim()}
                  className="inline-flex h-12 min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-[var(--user-bubble-bg)] px-4 text-sm font-medium text-[var(--user-bubble-fg)] transition hover:opacity-90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-45 sm:w-auto sm:min-w-[7.75rem]"
                >
                  {isLoading ? (
                    <IconLoader2 size={20} className="animate-spin" aria-hidden />
                  ) : (
                    <IconSend size={20} stroke={1.75} aria-hidden />
                  )}
                  Send
                </button>
                {isPlaying ? (
                  <button
                    type="button"
                    onClick={stopAudio}
                    className="inline-flex h-12 min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-4 text-sm font-medium transition hover:opacity-90 sm:w-auto sm:min-w-[6.75rem]"
                  >
                    <IconPlayerStop size={20} stroke={1.75} aria-hidden />
                    Stop
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={playLatestWithBrowserTTS}
                    disabled={!hasBotReply}
                    className="inline-flex h-12 min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-4 text-sm font-medium transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45 sm:w-auto sm:min-w-[6.75rem]"
                  >
                    <IconPlayerPlay size={20} stroke={1.75} aria-hidden />
                    Speak
                  </button>
                )}
              </div>
            </div>
            <p className="mt-3 text-center text-[11px] leading-snug text-[var(--muted-text)]">
              Browser text-to-speech · Enter to send · {minRequestInterval / 1000}s between messages
            </p>
          </section>
        </main>
      </div>
    </div>
  );
}
