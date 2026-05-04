/**
 * One-off: verify GEMINI_API_KEY and model availability.
 * Usage: node scripts/check-gemini.mjs
 */
import "dotenv/config";
import { GoogleGenerativeAI } from "@google/generative-ai";

function stripKey(raw) {
  if (!raw) return "";
  const t = String(raw).trim();
  return t.replace(/^["']|["']$/g, "");
}

const apiKey = stripKey(process.env.GEMINI_API_KEY);
const candidates = [
  process.env.GEMINI_MODEL?.trim(),
  "gemini-2.5-flash",
  "gemini-flash-latest",
  "gemini-2.0-flash-lite",
  "gemini-2.0-flash-lite-001",
  "gemini-2.0-flash",
  "gemini-2.0-flash-001",
].filter(Boolean);

async function main() {
  if (!apiKey) {
    console.error("FAIL: GEMINI_API_KEY is missing or empty after trim.");
    process.exit(1);
  }
  console.log("Key length:", apiKey.length, "(expect ~39)");
  console.log("Key prefix:", apiKey.slice(0, 8) + "…");

  const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`;
  try {
    const lr = await fetch(listUrl);
    const lj = await lr.json();
    const names = (lj.models ?? [])
      .filter((m) => m.supportedGenerationMethods?.includes("generateContent"))
      .map((m) => m.name.replace(/^models\//, ""));
    console.log("Models with generateContent (first 30):", names.slice(0, 30).join(", ") || "(none)");
  } catch {
    console.log("(Could not list models.)");
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  for (const modelName of candidates) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const r = await model.generateContent("Reply with exactly: OK");
      const text = r.response.text();
      console.log(`OK model="${modelName}" response="${text.trim().slice(0, 80)}"`);
      process.exit(0);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`FAIL model="${modelName}":`, msg.split("\n")[0]);
    }
  }
  console.error("No working model found in candidate list.");
  process.exit(2);
}

main();
