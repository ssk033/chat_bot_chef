import { NextResponse } from "next/server";
import { prisma, withPrismaReconnect } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const anonymousKey = typeof body?.anonymousKey === "string" ? body.anonymousKey.trim() : "";
    const displayNameIn =
      typeof body?.displayName === "string" && body.displayName.trim().length > 0
        ? body.displayName.trim().slice(0, 80)
        : undefined;

    if (!anonymousKey || anonymousKey.length < 8) {
      return NextResponse.json({ error: "anonymousKey required" }, { status: 400 });
    }

    const select = {
      id: true,
      anonymousKey: true,
      displayName: true,
    } as const;

    const user = await withPrismaReconnect(() =>
      prisma.user.upsert({
        where: { anonymousKey },
        update: displayNameIn !== undefined ? { displayName: displayNameIn } : {},
        create: {
          anonymousKey,
          displayName: displayNameIn ?? "Guest",
        },
        select,
      })
    );

    return NextResponse.json({ user });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Bootstrap failed";
    console.error("user/bootstrap", e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
