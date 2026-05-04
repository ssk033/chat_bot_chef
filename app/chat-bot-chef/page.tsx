"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { IconLayoutDashboard, IconLoader2, IconMenu2 } from "@tabler/icons-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { ChatSidebar, type SessionRow } from "@/components/chat-sidebar";
import { CHEF_ANONYMOUS_KEY_HEADER } from "@/lib/chef-auth";
import { getStoredUser } from "@/lib/client-auth";
import { ChatInput } from "@/components/chat/chat-input";
import {
  ChatMessage as ChatBubbleRow,
  ChefTypingIndicator,
  type ChatMessageModel,
} from "@/components/chat/chat-message";
import { ChefAvatar } from "@/components/chef-avatar";

const LS_DISPLAY_NAME = "chef_display_name";
const LS_SIDEBAR_COLLAPSED = "chef_sidebar_collapsed";

function createMessage(role: string, text: string): ChatMessageModel {
  return { id: crypto.randomUUID(), role, text };
}

function initialsFromDisplayName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "YO";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function ChatBotChefPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessageModel[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isListening, setIsListening] = useState(false);
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
  const recognitionRef = useRef<{ stop: () => void } | null>(null);
  const lastRequestTime = useRef<number>(0);
  const minRequestInterval = 2000;
  const scrollAnchorRef = useRef<HTMLDivElement | null>(null);

  const userInitials = initialsFromDisplayName(displayName);

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
        (data.messages ?? []).map((m: { id?: number; role: string; text: string }) => ({
          id: m.id ? String(m.id) : crypto.randomUUID(),
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

  const stopListening = useCallback(() => {
    try {
      recognitionRef.current?.stop();
    } catch {
      /* noop */
    }
    recognitionRef.current = null;
    setIsListening(false);
  }, []);

  const toggleMic = useCallback(() => {
    if (typeof window === "undefined") return;
    const w = window as unknown as {
      SpeechRecognition?: new () => {
        continuous: boolean;
        interimResults: boolean;
        lang: string;
        start(): void;
        stop(): void;
        onresult: ((ev: { results: Array<Array<{ transcript: string }>> }) => void) | null;
        onerror: (() => void) | null;
        onend: (() => void) | null;
      };
      webkitSpeechRecognition?: new () => {
        continuous: boolean;
        interimResults: boolean;
        lang: string;
        start(): void;
        stop(): void;
        onresult: ((ev: { results: Array<Array<{ transcript: string }>> }) => void) | null;
        onerror: (() => void) | null;
        onend: (() => void) | null;
      };
    };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) {
      alert("Voice input is not supported in this browser. Try Chrome or Edge.");
      return;
    }
    if (isListening) {
      stopListening();
      return;
    }
    const rec = new Ctor();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = "en-US";
    rec.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript;
      if (transcript) setInput((prev) => `${prev ? `${prev} ` : ""}${transcript.trim()}`);
      stopListening();
    };
    rec.onerror = () => stopListening();
    rec.onend = () => setIsListening(false);
    recognitionRef.current = rec;
    try {
      rec.start();
      setIsListening(true);
    } catch {
      stopListening();
    }
  }, [isListening, stopListening]);

  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.stop();
      } catch {
        /* noop */
      }
    };
  }, []);

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
    setModelStatus({ available: true, loading: false });

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
            setChatStorageError(
              "Could not create a chat session. Check DATABASE_URL and run: npx prisma migrate deploy"
            );
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
  }, [messages.length, isLoading]);

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
        createMessage(
          "bot",
          `Please wait ${waitTime} second${waitTime > 1 ? "s" : ""} before sending another message.`
        ),
      ]);
      return;
    }

    const userMsg = createMessage("user", input);
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
        setMessages((prev) => [...prev, createMessage("bot", botReply)]);
      } else if (data.error && !data.reply) {
        setMessages((prev) => [...prev, createMessage("bot", `Error: ${data.error}`)]);
      } else {
        botReply = data.reply || "Sorry, I couldn't generate a response.";
        setMessages((prev) => [...prev, createMessage("bot", botReply)]);
      }

      if (botReply !== null) {
        void persistExchange(userInput, botReply);
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [
        ...prev,
        createMessage("bot", "Error: Could not get response. Please check your connection and try again."),
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
      voices.find((v) => v.lang.startsWith("en") && (v.name.includes("Google") || v.name.includes("Natural"))) ||
      voices.find((v) => v.lang.startsWith("en"));

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
    <div className="flex h-[100dvh] overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
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

      <div
        className={`flex min-h-0 min-w-0 flex-1 flex-col transition-[margin] duration-200 ease-out ${
          sidebarCollapsed ? "md:ml-[72px]" : "md:ml-[260px]"
        }`}
      >
        <header
          className={`fixed top-0 right-0 z-30 shrink-0 border-b border-[var(--border-subtle)] bg-[var(--surface)]/92 backdrop-blur-md supports-[backdrop-filter]:bg-[var(--surface)]/78 ${
            sidebarCollapsed ? "md:left-[72px]" : "md:left-[260px]"
          } left-0 shadow-[0_1px_0_color-mix(in_srgb,var(--border-subtle)_65%,transparent)]`}
        >
          <div className="flex w-full flex-wrap items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
            <button
              type="button"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[var(--foreground)] transition-all duration-200 hover:bg-[var(--surface-muted)] motion-safe:active:scale-95 md:hidden"
              onClick={() => setMobileSidebarOpen(true)}
              aria-label="Open sidebar"
            >
              <IconMenu2 size={22} stroke={1.5} />
            </button>
            <Link
              href="/"
              className="group flex min-w-0 flex-1 items-center gap-3 rounded-xl transition-all duration-200 hover:bg-[var(--surface-muted)]/80 hover:opacity-95 motion-safe:hover:scale-[1.01] sm:flex-initial sm:gap-3.5"
              aria-label="Go to homepage"
            >
              <ChefAvatar size={36} sizeSm={40} className="shrink-0" />
              <div className="min-w-0 md:block">
                <p className="truncate text-base font-semibold tracking-tight text-[var(--foreground)] sm:text-lg">
                  Chef
                </p>
                <p className="hidden truncate text-xs text-[var(--muted-text)] sm:block sm:text-[13px]">
                  Recipe assistant
                </p>
              </div>
            </Link>
            <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
              <Link
                href="/dashboard"
                className="glow-pill inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-[var(--foreground)] transition-all duration-200 hover:opacity-95 motion-safe:active:scale-[0.98]"
              >
                <IconLayoutDashboard size={18} stroke={1.75} aria-hidden />
                Dashboard
              </Link>
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
            className="shrink-0 border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-center text-sm leading-relaxed text-amber-950 dark:text-amber-100 sm:px-6"
            role="status"
          >
            {chatStorageError}
          </div>
        ) : null}

        <div className="flex min-h-0 flex-1 flex-col pt-[calc(3.5rem+1px)]">
          <div className="relative flex min-h-0 flex-1 flex-col bg-[var(--background)]">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,color-mix(in_srgb,var(--accent-muted)_100%,transparent),transparent)] opacity-90 dark:opacity-70" />

            <div className="chat-scroll-area relative min-h-0 flex-1 overflow-y-auto overscroll-y-contain touch-pan-y">
              <div className="mx-auto max-w-[760px] space-y-6 px-5 py-8 sm:space-y-8 sm:px-6 sm:py-10">
                {messages.length === 0 ? (
                  <div className="flex min-h-[min(52dvh,22rem)] flex-col items-center justify-center px-2 text-center sm:min-h-[300px]">
                    <ChefAvatar size={52} sizeSm={56} className="mb-6 shrink-0 !rounded-2xl shadow-md" />
                    <h2 className="max-w-md text-lg font-semibold tracking-tight text-[var(--foreground)] sm:text-xl">
                      What would you like to cook today?
                    </h2>
                    <p className="mt-3 max-w-md text-sm leading-relaxed text-[var(--muted-text)] sm:text-[15px] sm:leading-7">
                      Ask for recipes, swaps, or meal ideas. Try: &ldquo;What can I make with chicken and rice?&rdquo;
                    </p>
                  </div>
                ) : (
                  <>
                    {messages.map((m) => (
                      <ChatBubbleRow key={m.id} message={m} userInitials={userInitials} />
                    ))}
                    {isLoading ? <ChefTypingIndicator /> : null}
                  </>
                )}
                <div ref={scrollAnchorRef} aria-hidden className="h-px w-full shrink-0" />
              </div>
            </div>

            <ChatInput
              value={input}
              onChange={setInput}
              onSend={() => void send()}
              isLoading={isLoading}
              isListening={isListening}
              onMicToggle={toggleMic}
              hasBotReply={hasBotReply}
              isPlayingTTS={isPlaying}
              onSpeak={playLatestWithBrowserTTS}
              onStopSpeak={stopAudio}
              helperText={`Browser text-to-speech · Voice input where supported · Enter to send · ${minRequestInterval / 1000}s between messages`}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
