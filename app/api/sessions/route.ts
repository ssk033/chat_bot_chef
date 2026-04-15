import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAnonymousKeyFromRequest } from "@/lib/chef-auth";

export async function GET(req: Request) {
  try {
    const anonymousKey = getAnonymousKeyFromRequest(req);
    if (!anonymousKey) {
      return NextResponse.json({ error: "Missing anonymous key header" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { anonymousKey } });
    if (!user) {
      return NextResponse.json({ sessions: [] });
    }

    const sessions = await prisma.chatSession.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      select: { id: true, title: true, updatedAt: true, createdAt: true },
      take: 80,
    });

    return NextResponse.json({ sessions });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "List failed";
    console.error("GET /api/sessions", e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const anonymousKey = getAnonymousKeyFromRequest(req);
    if (!anonymousKey) {
      return NextResponse.json({ error: "Missing anonymous key header" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { anonymousKey } });
    if (!user) {
      return NextResponse.json({ error: "User not found; call bootstrap first" }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const title =
      typeof body?.title === "string" && body.title.trim().length > 0
        ? body.title.trim().slice(0, 120)
        : "New chat";

    const session = await prisma.chatSession.create({
      data: { userId: user.id, title },
      select: { id: true, title: true, updatedAt: true },
    });

    return NextResponse.json({ session });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Create failed";
    console.error("POST /api/sessions", e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
