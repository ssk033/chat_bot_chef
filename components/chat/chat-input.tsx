"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  IconLoader2,
  IconMicrophone,
  IconPaperclip,
  IconPlayerPlay,
  IconPlayerStop,
  IconSend,
} from "@tabler/icons-react";

type ChatInputProps = {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  isLoading?: boolean;
  /** Speech-to-text listening */
  isListening?: boolean;
  onMicToggle?: () => void;
  /** TTS */
  hasBotReply?: boolean;
  isPlayingTTS?: boolean;
  onSpeak?: () => void;
  onStopSpeak?: () => void;
  helperText?: string;
};

export function ChatInput({
  value,
  onChange,
  onSend,
  isLoading,
  isListening,
  onMicToggle,
  hasBotReply,
  isPlayingTTS,
  onSpeak,
  onStopSpeak,
  helperText,
}: ChatInputProps) {
  const taRef = useRef<HTMLTextAreaElement>(null);

  const autosize = useCallback(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "0px";
    const next = Math.min(200, Math.max(48, el.scrollHeight));
    el.style.height = `${next}px`;
  }, []);

  useEffect(() => {
    autosize();
  }, [value, autosize]);

  return (
    <div className="border-t border-[var(--border)] bg-[var(--background)]/90 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-md supports-[backdrop-filter]:bg-[var(--background)]/75 sm:px-6 sm:pb-5 sm:pt-4">
      <div className="mx-auto max-w-[760px]">
        <div className="flex items-end gap-2 rounded-[999px] border border-[var(--border)] bg-[var(--surface)] px-2 py-2 shadow-sm transition-all duration-200 focus-within:border-[color-mix(in_srgb,var(--accent)_45%,var(--border))] focus-within:shadow-md focus-within:ring-2 focus-within:ring-[color-mix(in_srgb,var(--accent)_22%,transparent)] sm:gap-3 sm:px-3 sm:py-2.5">
          <button
            type="button"
            disabled
            className="mb-1.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--muted-text)] opacity-40 sm:mb-1.5 sm:h-10 sm:w-10"
            aria-label="Attachments (coming soon)"
            title="Coming soon"
          >
            <IconPaperclip size={20} stroke={1.5} aria-hidden />
          </button>

          <label htmlFor="chat-composer" className="sr-only">
            Message
          </label>
          <textarea
            ref={taRef}
            id="chat-composer"
            rows={1}
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
              autosize();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSend();
              }
            }}
            placeholder="Ask for recipes, ingredients, or meal ideas..."
            disabled={isLoading}
            autoComplete="off"
            enterKeyHint="send"
            className="mb-1 min-h-[48px] w-full min-w-0 flex-1 resize-none rounded-3xl border-0 bg-transparent px-3 py-3 text-base leading-relaxed text-[var(--foreground)] placeholder:text-[var(--muted-text)] outline-none disabled:opacity-50 sm:px-4 sm:text-sm sm:leading-relaxed"
          />

          <div className="mb-1 flex shrink-0 items-center gap-1 sm:gap-1.5">
            {isPlayingTTS ? (
              <button
                type="button"
                onClick={onStopSpeak}
                className="glow-pill flex h-10 w-10 items-center justify-center rounded-full text-[var(--accent)] transition-all duration-200 hover:brightness-105 motion-safe:active:scale-95"
                aria-label="Stop speaking"
              >
                <IconPlayerStop size={20} stroke={1.75} aria-hidden />
              </button>
            ) : (
              <button
                type="button"
                onClick={onSpeak}
                disabled={!hasBotReply}
                className="glow-pill flex h-10 w-10 items-center justify-center rounded-full text-[var(--accent)] transition-all duration-200 hover:brightness-105 motion-safe:active:scale-95 disabled:pointer-events-none disabled:opacity-35"
                aria-label="Speak last reply"
              >
                <IconPlayerPlay size={20} stroke={1.75} aria-hidden />
              </button>
            )}

            <button
              type="button"
              onClick={onMicToggle}
              className={`flex h-10 w-10 items-center justify-center rounded-full transition-all duration-200 motion-safe:active:scale-95 ${
                isListening
                  ? "bg-[color-mix(in_srgb,var(--accent)_20%,var(--surface))] text-[var(--accent)] ring-2 ring-[color-mix(in_srgb,var(--accent)_35%,transparent)]"
                  : "text-[var(--muted-text)] hover:bg-[color-mix(in_srgb,var(--surface)_85%,var(--background))] hover:text-[var(--foreground)]"
              }`}
              aria-label={isListening ? "Stop listening" : "Voice input"}
              aria-pressed={isListening}
            >
              <IconMicrophone size={20} stroke={1.75} className={isListening ? "animate-pulse" : ""} aria-hidden />
            </button>

            <button
              type="button"
              onClick={onSend}
              disabled={isLoading || !value.trim()}
              className="btn-solid flex h-11 w-11 items-center justify-center rounded-full bg-[var(--accent)] text-black shadow-sm transition-all duration-200 hover:shadow-md hover:brightness-110 motion-safe:active:scale-95 disabled:pointer-events-none disabled:opacity-40 disabled:shadow-none"
              aria-label="Send message"
            >
              {isLoading ? <IconLoader2 size={22} className="animate-spin" aria-hidden /> : <IconSend size={22} stroke={1.75} aria-hidden />}
            </button>
          </div>
        </div>

        {helperText ? (
          <p className="mt-3 text-center text-[11px] leading-relaxed text-[var(--muted-text)]">{helperText}</p>
        ) : null}
      </div>
    </div>
  );
}
