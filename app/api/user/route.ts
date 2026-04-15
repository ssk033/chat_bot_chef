import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAnonymousKeyFromRequest } from "@/lib/chef-auth";

export async function PATCH(req: Request) {
  try {
    const anonymousKey = getAnonymousKeyFromRequest(req);
    if (!anonymousKey) {
      return NextResponse.json({ error: "Missing anonymous key header" }, { status: 401 });
    }

    const body = await req.json();
    const displayName =
      typeof body?.displayName === "string" ? body.displayName.trim().slice(0, 80) : "";

    if (!displayName) {
      return NextResponse.json({ error: "displayName required" }, { status: 400 });
    }

    const user = await prisma.user.update({
      where: { anonymousKey },
      data: { displayName },
      select: { id: true, displayName: true, anonymousKey: true },
    });

    return NextResponse.json({ user });
  } catch (e: unknown) {
    if (e && typeof e === "object" && "code" in e && (e as { code: string }).code === "P2025") {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    const msg = e instanceof Error ? e.message : "Update failed";
    console.error("PATCH /api/user", e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
