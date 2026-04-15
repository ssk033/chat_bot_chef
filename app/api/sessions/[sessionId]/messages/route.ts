import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAnonymousKeyFromRequest } from "@/lib/chef-auth";

function titleFromFirstUserMessage(text: string): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (!t) return "New chat";
  return t.length > 56 ? `${t.slice(0, 53)}…` : t;
}

type Entry = { role?: string; content?: string };

export async function POST(
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

    const user = await prisma.user.findUnique({ where: { anonymousKey } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const session = await prisma.chatSession.findFirst({
      where: { id: sessionId, userId: user.id },
    });
    if (!session) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await req.json();
    const entries: Entry[] = Array.isArray(body?.entries) ? body.entries : [];
    if (entries.length === 0) {
      return NextResponse.json({ error: "entries required" }, { status: 400 });
    }

    const normalized: { role: string; content: string }[] = [];
    for (const e of entries) {
      const role = typeof e?.role === "string" ? e.role.trim() : "";
      const content = typeof e?.content === "string" ? e.content : "";
      if (!role || !content) continue;
      if (role !== "user" && role !== "bot") {
        return NextResponse.json({ error: "Invalid role" }, { status: 400 });
      }
      normalized.push({ role, content });
    }

    if (normalized.length === 0) {
      return NextResponse.json({ error: "No valid entries" }, { status: 400 });
    }

    let newTitle: string | undefined;
    const firstUser = normalized.find((e) => e.role === "user");
    if (firstUser && (session.title === "New chat" || !session.title)) {
      newTitle = titleFromFirstUserMessage(firstUser.content);
    }

    await prisma.$transaction(async (tx) => {
      await tx.chatMessage.createMany({
        data: normalized.map((m) => ({
          sessionId,
          role: m.role,
          content: m.content,
        })),
      });
      await tx.chatSession.update({
        where: { id: sessionId },
        data: newTitle ? { title: newTitle } : { title: session.title },
      });
    });

    return NextResponse.json({ ok: true, title: newTitle ?? session.title });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Append failed";
    console.error("POST /api/sessions/[id]/messages", e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
