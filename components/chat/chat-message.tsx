"use client";

import { useMemo } from "react";
import { ChefAvatar, UserAvatar } from "@/components/chef-avatar";
import { tryParseRecipe } from "@/components/chat/parse-recipe";
import { RecipeCard } from "@/components/chat/recipe-card";
import { sanitizeAssistantDisplayText } from "@/lib/sanitize-chat-display";

export function ChefTypingIndicator({ assistantLabel = "Chef" }: { assistantLabel?: string }) {
  return (
    <div className="message-enter flex w-full gap-3 sm:gap-4">
      <ChefAvatar size={28} />
      <div className="flex min-w-0 flex-1 flex-col items-start">
        <span className="mb-1.5 px-0.5 text-[11px] font-medium uppercase tracking-wide text-[var(--muted-text)]">
          {assistantLabel}
        </span>
        <div className="rounded-2xl rounded-bl-md border border-[var(--border)] bg-[var(--surface)] px-4 py-3 shadow-sm sm:px-5 sm:py-4">
          <p className="text-sm leading-relaxed text-[var(--muted-text)]">{assistantLabel} is thinking...</p>
          <div className="mt-3 flex gap-1.5 pl-0.5" aria-hidden>
            <span className="typing-dot" />
            <span className="typing-dot [animation-delay:0.2s]" />
            <span className="typing-dot [animation-delay:0.4s]" />
          </div>
        </div>
      </div>
    </div>
  );
}

export type ChatMessageModel = { id: string; role: string; text: string };

type ChatMessageProps = {
  message: ChatMessageModel;
  userInitials: string;
  assistantLabel?: string;
};

export function ChatMessage({ message, userInitials, assistantLabel = "Chef" }: ChatMessageProps) {
  const isUser = message.role === "user";

  const parsed = useMemo(() => {
    if (isUser) return null;
    return tryParseRecipe(message.text);
  }, [isUser, message.text]);

  const displayPlainText = useMemo(
    () => (isUser ? message.text : sanitizeAssistantDisplayText(message.text)),
    [isUser, message.text]
  );

  return (
    <div
      className={`message-enter flex w-full gap-3 sm:gap-4 ${isUser ? "flex-row-reverse justify-start" : "flex-row justify-start"}`}
    >
      {isUser ? <UserAvatar initials={userInitials} /> : <ChefAvatar size={28} />}

      <div className={`flex min-w-0 max-w-[min(100%,42rem)] flex-1 flex-col ${isUser ? "items-end" : "items-start"}`}>
        <div className="mb-1.5 flex items-center gap-2 px-0.5">
          <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--muted-text)]">
            {isUser ? "You" : assistantLabel}
          </span>
        </div>

        <div
          className={`w-full rounded-2xl px-4 py-3 shadow-sm transition-all duration-200 sm:px-5 sm:py-4 ${
            isUser
              ? "rounded-br-md bg-[var(--accent)] text-black"
              : "rounded-bl-md border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]"
          }`}
        >
          {!isUser && parsed ? (
            <>
              {parsed.intro ? (
                <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-[var(--foreground)]">
                  {sanitizeAssistantDisplayText(parsed.intro)}
                </p>
              ) : null}
              <RecipeCard recipe={parsed} />
            </>
          ) : (
            <div className="whitespace-pre-wrap break-words text-sm leading-relaxed text-[var(--foreground)] sm:leading-relaxed">
              {displayPlainText}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
