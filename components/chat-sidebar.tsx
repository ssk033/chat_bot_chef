"use client";

import {
  IconLayoutSidebarLeftCollapse,
  IconLayoutSidebarLeftExpand,
  IconMessageCircle,
  IconPlus,
  IconTrash,
  IconUser,
  IconX,
} from "@tabler/icons-react";
import { ChefAvatar } from "@/components/chef-avatar";
import { cn } from "@/lib/utils";

export type SessionRow = { id: number; title: string; updatedAt: string };

type ChatSidebarProps = {
  sessions: SessionRow[];
  activeSessionId: number | null;
  displayName: string;
  collapsed: boolean;
  mobileOpen: boolean;
  onToggleCollapsed: () => void;
  onMobileOpen: () => void;
  onMobileClose: () => void;
  onNewChat: () => void;
  onSelectSession: (id: number) => void;
  onDeleteSession: (id: number) => void;
  onRenameUser: () => void;
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function ChatSidebar({
  sessions,
  activeSessionId,
  displayName,
  collapsed,
  mobileOpen,
  onToggleCollapsed,
  onMobileOpen,
  onMobileClose,
  onNewChat,
  onSelectSession,
  onDeleteSession,
  onRenameUser,
}: ChatSidebarProps) {
  void onMobileOpen;
  const rail = collapsed;

  return (
    <>
      {mobileOpen ? (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-[color-mix(in_srgb,var(--foreground)_38%,transparent)] backdrop-blur-[2px] transition-opacity duration-200 md:hidden"
          onClick={onMobileClose}
        />
      ) : null}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex flex-col border-r border-[var(--border-subtle)] bg-[var(--surface-muted)] shadow-[4px_0_24px_-12px_color-mix(in_srgb,var(--foreground)_10%,transparent)] transition-[transform,width,background-color] duration-200 ease-out md:translate-x-0",
          rail ? "md:w-[72px]" : "w-[min(88vw,280px)] md:w-[260px]",
          mobileOpen ? "translate-x-0 shadow-xl" : "-translate-x-full md:translate-x-0"
        )}
      >
        <div className="flex h-14 shrink-0 items-center gap-2 border-b border-[var(--border-subtle)] px-3">
          <button
            type="button"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-[var(--foreground)] transition-all duration-200 hover:bg-[var(--surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-focus)] md:hidden"
            onClick={onMobileClose}
            aria-label="Close sidebar"
          >
            <IconX size={22} stroke={1.5} />
          </button>
          {!rail ? (
            <div className="flex min-w-0 flex-1 items-center gap-2 md:pr-0">
              <ChefAvatar size={38} interactive />
              <span className="truncate text-sm font-semibold tracking-tight text-[var(--foreground)]">Chef</span>
            </div>
          ) : (
            <span className="hidden shrink-0 md:flex">
              <ChefAvatar size={36} interactive />
            </span>
          )}
          <button
            type="button"
            onClick={onToggleCollapsed}
            className="ml-auto hidden h-10 w-10 shrink-0 items-center justify-center rounded-lg text-[var(--muted-text)] transition-all duration-200 hover:bg-[var(--surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-focus)] md:flex"
            title={rail ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={rail ? "Expand sidebar" : "Collapse sidebar"}
          >
            {rail ? (
              <IconLayoutSidebarLeftExpand size={20} stroke={1.5} />
            ) : (
              <IconLayoutSidebarLeftCollapse size={20} stroke={1.5} />
            )}
          </button>
        </div>

        <div className="shrink-0 border-b border-[var(--border-subtle)] p-2">
          <button
            type="button"
            onClick={() => {
              onNewChat();
              onMobileClose();
            }}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-[var(--foreground)] transition-all duration-200 hover:bg-[var(--surface)] hover:shadow-sm motion-safe:active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-muted)]"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--border-subtle)] bg-[var(--surface)] text-[var(--accent)] shadow-sm ring-1 ring-[var(--border-subtle)] transition-colors duration-200">
              <IconPlus size={20} stroke={1.75} aria-hidden />
            </span>
            {!rail ? <span>New chat</span> : null}
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-2 pt-1">
          {!rail ? (
            <>
              <div className="mx-2 mb-2 flex items-center gap-2 border-b border-[var(--border-subtle)] pb-2">
                <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--muted-text)]">Chats</p>
              </div>
              <ul className="space-y-1">
                {sessions.map((s) => (
                  <li key={s.id}>
                    <div className="group relative flex items-center gap-0.5 rounded-xl transition-colors duration-200 hover:bg-[color-mix(in_srgb,var(--surface)_85%,transparent)]">
                      <button
                        type="button"
                        onClick={() => {
                          onSelectSession(s.id);
                          onMobileClose();
                        }}
                        className={cn(
                          "min-w-0 flex-1 rounded-xl py-2.5 pr-2 text-left text-sm transition-all duration-200 motion-safe:active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-focus)]",
                          activeSessionId === s.id
                            ? "border-l-2 border-[var(--accent)] bg-[var(--surface)] pl-[10px] font-medium text-[var(--foreground)] shadow-sm ring-1 ring-[var(--border-subtle)]"
                            : "border-l-2 border-transparent pl-3 text-[var(--foreground)] hover:bg-[color-mix(in_srgb,var(--surface)_92%,transparent)]"
                        )}
                        title={s.title}
                      >
                        <span className="flex items-start gap-2.5">
                          <IconMessageCircle
                            size={18}
                            stroke={1.5}
                            className={cn(
                              "mt-0.5 shrink-0",
                              activeSessionId === s.id ? "text-[var(--accent)]" : "text-[var(--muted-text)]"
                            )}
                            aria-hidden
                          />
                          <span className="line-clamp-2 leading-snug">{s.title}</span>
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteSession(s.id);
                        }}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[var(--muted-text)] opacity-0 transition-all duration-200 hover:bg-[color-mix(in_srgb,var(--foreground)_08%,var(--surface))] hover:text-[var(--foreground)] group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-focus)]"
                        aria-label={`Delete ${s.title}`}
                      >
                        <IconTrash size={18} stroke={1.5} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <div className="hidden flex-col items-center gap-2 py-2 md:flex" aria-label="Recent chats">
              {sessions.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  title={s.title}
                  onClick={() => onSelectSession(s.id)}
                  className={cn(
                    "h-2.5 w-2.5 shrink-0 rounded-full transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-focus)]",
                    activeSessionId === s.id ? "bg-[var(--accent)]" : "bg-[var(--border)] hover:opacity-80"
                  )}
                />
              ))}
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-muted)_92%,var(--surface)_8%)] p-2 backdrop-blur-sm">
          <button
            type="button"
            onClick={onRenameUser}
            className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition-all duration-200 hover:bg-[var(--surface)] motion-safe:active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-focus)]"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--accent)_14%,var(--surface))] text-xs font-semibold text-[var(--accent)] ring-1 ring-[var(--border-subtle)]">
              {initials(displayName)}
            </span>
            {!rail ? (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-[var(--foreground)]">{displayName}</p>
                <p className="truncate text-xs text-[var(--muted-text)]">Tap to rename</p>
              </div>
            ) : (
              <IconUser size={18} className="text-[var(--muted-text)]" aria-hidden />
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
