import { prisma, withPrismaReconnect } from "@/lib/prisma";
import type { ChefChatTurn } from "@/lib/chef-fallback";

export type ChefSessionContext = {
  history: ChefChatTurn[];
  sessionTitle?: string;
  dietaryPreferences?: string;
};

function mapRole(role: string): "user" | "assistant" | null {
  const r = role.trim().toLowerCase();
  if (r === "user") return "user";
  if (r === "bot" || r === "assistant") return "assistant";
  return null;
}

export function normalizeClientHistory(
  entries: unknown,
  maxTurns = 10
): ChefChatTurn[] {
  if (!Array.isArray(entries)) return [];
  const out: ChefChatTurn[] = [];
  for (const entry of entries) {
    if (!entry || typeof entry !== "object") continue;
    const role = mapRole(String((entry as { role?: string }).role ?? ""));
    const content = String((entry as { content?: string }).content ?? "").trim();
    if (!role || !content) continue;
    out.push({ role, content: content.slice(0, 2000) });
  }
  return out.slice(-maxTurns);
}

export async function loadChefSessionContext(args: {
  sessionId?: number;
  anonymousKey?: string | null;
  clientHistory?: ChefChatTurn[];
  dietaryPreferences?: string;
}): Promise<ChefSessionContext> {
  if (args.clientHistory && args.clientHistory.length > 0) {
    return {
      history: args.clientHistory,
      dietaryPreferences: args.dietaryPreferences,
    };
  }

  if (!args.sessionId || !args.anonymousKey) {
    return { history: [], dietaryPreferences: args.dietaryPreferences };
  }

  const session = await withPrismaReconnect(() =>
    prisma.chatSession.findFirst({
      where: { id: args.sessionId, user: { anonymousKey: args.anonymousKey } },
      select: {
        title: true,
        messages: {
          orderBy: { id: "desc" },
          take: 12,
          select: { role: true, content: true },
        },
      },
    })
  );

  if (!session) {
    return { history: [], dietaryPreferences: args.dietaryPreferences };
  }

  const history: ChefChatTurn[] = [];
  for (const m of session.messages.slice().reverse()) {
    const role = mapRole(m.role);
    if (!role) continue;
    history.push({ role, content: m.content.slice(0, 2000) });
  }

  return {
    history,
    sessionTitle: session.title,
    dietaryPreferences: args.dietaryPreferences,
  };
}
