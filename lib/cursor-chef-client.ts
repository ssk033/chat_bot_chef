/**
 * Cursor Cloud Agents API client for Chef fallback (no-repo agents).
 * Docs: https://cursor.com/docs/cloud-agent/api/endpoints
 */

const CURSOR_API_BASE = "https://api.cursor.com/v1";

const DEFAULT_MODEL = process.env.CURSOR_CHEF_MODEL?.trim() || "composer-2.5";
const REQUEST_TIMEOUT_MS = Number(process.env.CURSOR_CHEF_TIMEOUT_MS) || 55_000;
const POLL_INTERVAL_MS = Number(process.env.CURSOR_CHEF_POLL_MS) || 1_500;
const MAX_POLL_ATTEMPTS = Number(process.env.CURSOR_CHEF_MAX_POLLS) || 45;
const MAX_RETRIES = Number(process.env.CURSOR_CHEF_RETRIES) || 2;

export type CursorChefResult =
  | { ok: true; text: string; runId: string; agentId: string }
  | { ok: false; error: string; retryable: boolean };

type RunStatus = "CREATING" | "RUNNING" | "FINISHED" | "ERROR" | "CANCELLED" | "EXPIRED";

function stripApiKey(raw: string | undefined): string {
  if (!raw) return "";
  return raw.trim().replace(/^["']|["']$/g, "");
}

export function isCursorChefConfigured(): boolean {
  if (process.env.CHEF_CURSOR_FALLBACK === "false") return false;
  return Boolean(stripApiKey(process.env.CURSOR_API_KEY));
}

function authHeaders(apiKey: string): HeadersInit {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || status === 502 || status === 503 || status === 504;
}

async function cursorFetch(
  path: string,
  apiKey: string,
  init: RequestInit,
  signal?: AbortSignal
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  const onAbort = () => controller.abort();
  signal?.addEventListener("abort", onAbort);

  try {
    return await fetch(`${CURSOR_API_BASE}${path}`, {
      ...init,
      signal: controller.signal,
      headers: { ...authHeaders(apiKey), ...(init.headers ?? {}) },
    });
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
  }
}

async function createNoRepoAgent(
  promptText: string,
  apiKey: string,
  signal?: AbortSignal
): Promise<{ agentId: string; runId: string }> {
  const res = await cursorFetch(
    "/agents",
    apiKey,
    {
      method: "POST",
      body: JSON.stringify({
        name: "Meal-IT Chef",
        prompt: { text: promptText },
        model: { id: DEFAULT_MODEL },
      }),
    },
    signal
  );

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw Object.assign(new Error(`Cursor create agent failed (${res.status}): ${body.slice(0, 300)}`), {
      retryable: isRetryableStatus(res.status),
      status: res.status,
    });
  }

  const data = (await res.json()) as {
    agent?: { id?: string; latestRunId?: string };
    run?: { id?: string };
  };

  const agentId = data.agent?.id ?? "";
  const runId = data.run?.id ?? data.agent?.latestRunId ?? "";
  if (!agentId || !runId) {
    throw Object.assign(new Error("Cursor create agent returned incomplete ids"), { retryable: false });
  }

  return { agentId, runId };
}

async function getRun(
  agentId: string,
  runId: string,
  apiKey: string,
  signal?: AbortSignal
): Promise<{ status: RunStatus; result?: string }> {
  const res = await cursorFetch(
    `/agents/${encodeURIComponent(agentId)}/runs/${encodeURIComponent(runId)}`,
    apiKey,
    { method: "GET" },
    signal
  );

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw Object.assign(new Error(`Cursor get run failed (${res.status}): ${body.slice(0, 200)}`), {
      retryable: isRetryableStatus(res.status),
      status: res.status,
    });
  }

  const data = (await res.json()) as { status?: RunStatus; result?: string };
  return { status: data.status ?? "ERROR", result: data.result };
}

async function pollRunResult(
  agentId: string,
  runId: string,
  apiKey: string,
  signal?: AbortSignal
): Promise<string> {
  for (let i = 0; i < MAX_POLL_ATTEMPTS; i += 1) {
    if (signal?.aborted) throw new Error("Cursor chef request aborted");

    const run = await getRun(agentId, runId, apiKey, signal);
    if (run.status === "FINISHED") {
      const text = (run.result ?? "").trim();
      if (!text) throw new Error("Cursor run finished with empty result");
      return text;
    }
    if (run.status === "ERROR" || run.status === "CANCELLED" || run.status === "EXPIRED") {
      throw new Error(`Cursor run ended with status ${run.status}`);
    }
    await sleep(POLL_INTERVAL_MS);
  }
  throw Object.assign(new Error("Cursor chef polling timed out"), { retryable: true });
}

/**
 * One-shot Chef answer via Cursor Cloud Agent (no repository attached).
 */
export async function completeChefWithCursor(
  promptText: string,
  options: { signal?: AbortSignal } = {}
): Promise<CursorChefResult> {
  const apiKey = stripApiKey(process.env.CURSOR_API_KEY);
  if (!apiKey) {
    return { ok: false, error: "CURSOR_API_KEY not configured", retryable: false };
  }

  let lastError = "Unknown error";
  let retryable = false;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      if (attempt > 0) {
        const backoff = Math.min(4000, 800 * 2 ** (attempt - 1));
        await sleep(backoff);
      }

      const { agentId, runId } = await createNoRepoAgent(promptText, apiKey, options.signal);
      const text = await pollRunResult(agentId, runId, apiKey, options.signal);
      return { ok: true, text, runId, agentId };
    } catch (err: unknown) {
      const e = err as Error & { retryable?: boolean; status?: number };
      lastError = e.message || String(err);
      retryable = Boolean(e.retryable) || e.message.includes("timed out");
      if (process.env.NODE_ENV === "development") {
        console.warn(`[cursor-chef] attempt ${attempt + 1} failed:`, lastError);
      }
      if (!retryable || attempt >= MAX_RETRIES) break;
    }
  }

  return { ok: false, error: lastError, retryable };
}
