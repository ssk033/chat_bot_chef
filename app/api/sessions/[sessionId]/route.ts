import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAnonymousKeyFromRequest } from "@/lib/chef-auth";

async function loadSessionForUser(sessionId: number, anonymousKey: string) {
  const user = await prisma.user.findUnique({ where: { anonymousKey } });
  if (!user) return null;
  const session = await prisma.chatSession.findFirst({
    where: { id: sessionId, userId: user.id },
  });
  if (!session) return null;
  return { user, session };
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

    const messages = await prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: "asc" },
      select: { role: true, content: true, id: true },
    });

    return NextResponse.json({
      session: { id: ctx.session.id, title: ctx.session.title },
      messages: messages.map((m) => ({ role: m.role, text: m.content })),
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

    await prisma.chatSession.delete({ where: { id: sessionId } });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Delete failed";
    console.error("DELETE /api/sessions/[id]", e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
