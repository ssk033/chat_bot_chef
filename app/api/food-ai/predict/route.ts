import { NextResponse } from "next/server";

// Must match `FOOD_AI_PORT` in scripts/food-ai-dev.mjs (default 8788).
const UPSTREAM = process.env.FOOD_AI_SERVICE_URL ?? "http://127.0.0.1:8788";

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("image");
  if (!(file instanceof Blob) || file.size === 0) {
    return NextResponse.json({ error: "Missing image field (multipart form)." }, { status: 400 });
  }

  const upstream = new FormData();
  upstream.append("image", file, "upload.jpg");

  try {
    const res = await fetch(`${UPSTREAM}/predict`, {
      method: "POST",
      body: upstream,
    });
    const text = await res.text();
    return new NextResponse(text, {
      status: res.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return NextResponse.json(
      {
        error: `Cannot reach Food AI service at ${UPSTREAM}. Run: npm run food-ai:dev and install ml-models/food-ai-server/requirements.txt`,
      },
      { status: 503 }
    );
  }
}
