"use client";

import {
  IconChefHat,
  IconLayoutSidebarLeftCollapse,
  IconLayoutSidebarLeftExpand,
  IconPlus,
  IconTrash,
  IconUser,
  IconX,
} from "@tabler/icons-react";

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
  const rail = collapsed;

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen ? (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px] md:hidden"
          onClick={onMobileClose}
        />
      ) : null}

      <aside
        className={[
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-[var(--border-subtle)] bg-[var(--surface-muted)] transition-transform duration-200 md:static md:z-auto md:translate-x-0",
          rail ? "md:w-[72px]" : "w-[min(88vw,280px)] md:w-[260px]",
          mobileOpen ? "translate-x-0 shadow-xl" : "-translate-x-full md:translate-x-0",
        ].join(" ")}
      >
        <div className="flex h-14 shrink-0 items-center gap-2 border-b border-[var(--border-subtle)] px-3">
          <button
            type="button"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-[var(--foreground)] transition hover:bg-[var(--surface)] md:hidden"
            onClick={onMobileClose}
            aria-label="Close sidebar"
          >
            <IconX size={22} stroke={1.5} />
          </button>
          {!rail ? (
            <div className="flex min-w-0 flex-1 items-center gap-2 md:pr-0">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-muted)] text-[var(--accent)]">
                <IconChefHat size={20} stroke={1.75} aria-hidden />
              </span>
              <span className="truncate text-sm font-semibold tracking-tight">Chef</span>
            </div>
          ) : (
            <span className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-muted)] text-[var(--accent)] md:flex">
              <IconChefHat size={20} stroke={1.75} aria-hidden />
            </span>
          )}
          <button
            type="button"
            onClick={onToggleCollapsed}
            className="ml-auto hidden h-10 w-10 shrink-0 items-center justify-center rounded-lg text-[var(--muted-text)] transition hover:bg-[var(--surface)] md:flex"
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

        <div className="shrink-0 p-2">
          <button
            type="button"
            onClick={() => {
              onNewChat();
              onMobileClose();
            }}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--surface)]"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--border-subtle)] bg-[var(--surface)]">
              <IconPlus size={20} stroke={1.75} />
            </span>
            {!rail ? <span>New chat</span> : null}
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-2">
          {!rail ? (
            <>
              <p className="px-3 pb-2 text-[11px] font-medium uppercase tracking-wide text-[var(--muted-text)]">
                Recents
              </p>
              <ul className="space-y-0.5">
                {sessions.map((s) => (
                  <li key={s.id}>
                    <div className="group flex items-center gap-1 rounded-lg hover:bg-[var(--surface)]">
                      <button
                        type="button"
                        onClick={() => {
                          onSelectSession(s.id);
                          onMobileClose();
                        }}
                        className={`min-w-0 flex-1 truncate rounded-lg px-3 py-2.5 text-left text-sm transition ${
                          activeSessionId === s.id
                            ? "bg-[var(--surface)] font-medium ring-1 ring-[var(--border-subtle)]"
                            : "text-[var(--foreground)]"
                        }`}
                        title={s.title}
                      >
                        {s.title}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteSession(s.id);
                        }}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[var(--muted-text)] opacity-0 transition hover:bg-red-500/10 hover:text-red-600 group-hover:opacity-100 dark:hover:text-red-400"
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
                  className={`h-2.5 w-2.5 shrink-0 rounded-full transition ${
                    activeSessionId === s.id ? "bg-[var(--accent)]" : "bg-[var(--border-subtle)] hover:opacity-80"
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-[var(--border-subtle)] p-2">
          <button
            type="button"
            onClick={onRenameUser}
            className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition hover:bg-[var(--surface)]"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--accent-muted)] text-xs font-semibold text-[var(--accent)]">
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
