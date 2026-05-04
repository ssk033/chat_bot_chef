import { NextResponse } from "next/server";
import type { Content } from "@google/generative-ai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { mergeAdjacentSameRole, responseTextSafe } from "@/lib/site-guide-gemini";
import { SITE_GUIDE_SYSTEM } from "@/lib/site-guide-prompt";

export const runtime = "nodejs";

type ClientMsg = { role?: string; content?: string; localOnly?: boolean };

const MAX_MESSAGES = 24;
const MAX_CONTENT_LEN = 6000;
const DEFAULT_MODEL = "gemini-2.5-flash";

function sanitizeMessages(raw: unknown): { role: "user" | "assistant"; content: string }[] {
  if (!Array.isArray(raw)) return [];
  const out: { role: "user" | "assistant"; content: string }[] = [];
  for (const m of raw) {
    const row = m as ClientMsg;
    if (row?.localOnly) continue;
    const role = row?.role;
    const content = typeof row?.content === "string" ? row.content.trim() : "";
    if (!content || content.length > MAX_CONTENT_LEN) continue;
    if (role !== "user" && role !== "assistant") continue;
    out.push({ role, content });
    if (out.length >= MAX_MESSAGES) break;
  }
  return out;
}

function toGeminiHistory(messages: { role: "user" | "assistant"; content: string }[]): Content[] {
  return messages.map((m) => ({
    role: m.role === "user" ? ("user" as const) : ("model" as const),
    parts: [{ text: m.content }],
  }));
}

function modelCandidates(): string[] {
  const env = process.env.GEMINI_MODEL?.trim();
  const list = [
    env,
    DEFAULT_MODEL,
    "gemini-flash-latest",
    "gemini-2.0-flash-lite",
    "gemini-2.0-flash",
  ].filter((m): m is string => Boolean(m));
  return [...new Set(list)];
}

function shouldTryNextModel(errMsg: string): boolean {
  return (
    /\b429\b/i.test(errMsg) ||
    /quota|rate limit|resource exhausted/i.test(errMsg) ||
    /\b404\b/i.test(errMsg) ||
    /not found/i.test(errMsg) ||
    /is not supported for generateContent/i.test(errMsg)
  );
}

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY?.trim().replace(/^["']|["']$/g, "");
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured." },
        { status: 503 }
      );
    }

    const body = await req.json().catch(() => null);
    const pathname =
      typeof body?.pathname === "string" ? body.pathname.slice(0, 512) : "";
    const sanitized = sanitizeMessages(body?.messages);

    if (sanitized.length === 0 || sanitized[sanitized.length - 1]?.role !== "user") {
      return NextResponse.json(
        { error: "Last message must be from the user." },
        { status: 400 }
      );
    }

    const lastUser = sanitized[sanitized.length - 1]!.content;
    let prior = sanitized.slice(0, -1);
    while (prior.length > 0 && prior[0]!.role === "assistant") {
      prior = prior.slice(1);
    }

    let history = mergeAdjacentSameRole(toGeminiHistory(prior));
    if (history.length > 0 && history[0]!.role !== "user") {
      history = [];
    }

    const contextualSystem =
      pathname && pathname !== "/"
        ? `${SITE_GUIDE_SYSTEM}\n\n---\n**User's current path:** \`${pathname}\`\nPrefer tips relevant to this page when appropriate.`
        : SITE_GUIDE_SYSTEM;

    const genAI = new GoogleGenerativeAI(apiKey);
    const candidates = modelCandidates();

    let lastErr = "";
    for (let attempt = 0; attempt < candidates.length; attempt++) {
      const modelName = candidates[attempt]!;
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          systemInstruction: contextualSystem,
        });

        const chat = model.startChat({ history });
        const result = await chat.sendMessage(lastUser);
        const text = responseTextSafe(result.response);

        if (!text) {
          lastErr = "Empty or blocked model response.";
          continue;
        }

        return NextResponse.json({ reply: text });
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        lastErr = message;
        if (attempt < candidates.length - 1 && shouldTryNextModel(message)) {
          console.warn("[site-guide] model retry:", modelName, message.slice(0, 120));
          continue;
        }
        throw e;
      }
    }

    return NextResponse.json(
      {
        error: "Guide assistant failed. Try again in a moment.",
        detail: lastErr || "No model returned text.",
      },
      { status: 502 }
    );
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[site-guide]", message);

    const quota =
      /\b429\b/i.test(message) ||
      /quota|rate limit|resource exhausted/i.test(message);
    if (quota) {
      return NextResponse.json(
        {
          error:
            "Gemini rate limit or quota reached. Wait a few minutes or try again. See https://ai.google.dev/gemini-api/docs/rate-limits",
          detail: message,
        },
        { status: 429 }
      );
    }

    const authFail = /\b403\b|\b401\b|API key not valid|permission denied/i.test(
      message
    );
    if (authFail) {
      return NextResponse.json(
        {
          error:
            "Gemini rejected the API key. Create a new key in Google AI Studio and update GEMINI_API_KEY.",
          detail: message,
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        error: "Guide assistant failed. Try again in a moment.",
        detail: message,
      },
      { status: 500 }
    );
  }
}
