import { NextResponse } from "next/server";
import { prisma, withPrismaReconnect } from "@/lib/prisma";
import { getAnonymousKeyFromRequest } from "@/lib/chef-auth";

async function loadSessionForUser(sessionId: number, anonymousKey: string) {
  const session = await withPrismaReconnect(() => prisma.chatSession.findFirst({
    where: { id: sessionId, user: { anonymousKey } },
    select: { id: true, title: true },
  }));
  if (!session) return null;
  return { session };
}

function getCursorParams(url: string): { take: number; cursorId?: number } {
  const parsed = new URL(url);
  const takeRaw = Number(parsed.searchParams.get("take") ?? "50");
  const take = Number.isFinite(takeRaw) ? Math.min(Math.max(Math.floor(takeRaw), 1), 100) : 50;
  const cursorRaw = parsed.searchParams.get("cursor");
  const cursorId = cursorRaw ? Number(cursorRaw) : undefined;
  return {
    take,
    cursorId: cursorId && Number.isFinite(cursorId) ? cursorId : undefined,
  };
}

async function loadSessionMessages(sessionId: number, reqUrl: string) {
  const { take, cursorId } = getCursorParams(reqUrl);
  const baseArgs = {
    where: { sessionId },
    orderBy: { id: "desc" as const },
    select: { role: true, content: true, id: true },
    take,
  };

  const rows = cursorId
    ? await withPrismaReconnect(() =>
        prisma.chatMessage.findMany({
          ...baseArgs,
          skip: 1,
          cursor: { id: cursorId },
        })
      )
    : await withPrismaReconnect(() => prisma.chatMessage.findMany(baseArgs));

  const ordered = rows.slice().reverse();
  return {
    messages: ordered.map((m) => ({ role: m.role, text: m.content, id: m.id })),
    nextCursor: rows.length === take ? rows[rows.length - 1]?.id ?? null : null,
  };
}

export async function GET(
  req: Request,
  context: { params: Promise<{ sessionId: string }> }
) {
  try {
    const anonymousKey = getAnonymousKeyFromRequest(req);
    if (!anonymousKey) {
      return NextResponse.json({ error: "Missing anonymous key header" }, { status: 401 });
    }

    const { sessionId: raw } = await context.params;
    const sessionId = parseInt(raw, 10);
    if (Number.isNaN(sessionId)) {
      return NextResponse.json({ error: "Invalid session" }, { status: 400 });
    }

    const ctx = await loadSessionForUser(sessionId, anonymousKey);
    if (!ctx) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { messages, nextCursor } = await loadSessionMessages(sessionId, req.url);
    return NextResponse.json({
      session: { id: ctx.session.id, title: ctx.session.title },
      messages,
      nextCursor,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Load failed";
    console.error("GET /api/sessions/[id]", e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ sessionId: string }> }
) {
  try {
    const anonymousKey = getAnonymousKeyFromRequest(req);
    if (!anonymousKey) {
      return NextResponse.json({ error: "Missing anonymous key header" }, { status: 401 });
    }

    const { sessionId: raw } = await context.params;
    const sessionId = parseInt(raw, 10);
    if (Number.isNaN(sessionId)) {
      return NextResponse.json({ error: "Invalid session" }, { status: 400 });
    }

    const ctx = await loadSessionForUser(sessionId, anonymousKey);
    if (!ctx) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await withPrismaReconnect(() => prisma.chatSession.delete({ where: { id: sessionId } }));
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Delete failed";
    console.error("DELETE /api/sessions/[id]", e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
