import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: Request) {
  try {
    const { text } = await req.json();
    if (!text) return NextResponse.json({ error: "Text required" }, { status: 400 });

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-tts" });

    // Call the model. The exact SDK shape can vary by version — store result and inspect.
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text }] }],
    });

    // DEBUG: log the full result so you can inspect in server logs (remove in prod)
    try {
      console.log("TTS raw result:", JSON.stringify(result, null, 2));
    } catch (e) {
      console.log("TTS raw result (non-serializable):", result);
    }

    // Try multiple known locations for audio (safe fallbacks).
    // Use `as any` because SDK typings might not include these fields.
    const asAny = result as any;

    // Common possible locations (try them in order)
    const audioBase64Candidates = [
      // Old examples we've used:
      asAny?.response?.audio,
      // Sometimes output is in `response.output` or `output` array
      asAny?.output?.[0]?.content?.find?.((c: any) => c.type === "audio")?.data,
      asAny?.output?.[0]?.content?.find?.((c: any) => c.type === "audio")?.audio, // variant
      // Some SDKs include `output[0].mimeType` + `output[0].content[0].text` etc.
      asAny?.response?.output?.[0]?.content?.[0]?.audio,
      // Another pattern: `result.output[0].content[0].data` or `result.output_audio`
      asAny?.output_audio,
      asAny?.audio, // fallback
      // If the SDK returned base64 inside `response?.items` or similar:
      asAny?.response?.items?.find?.((i: any) => i.type === "audio")?.data,
    ];

    const audioBase64 = audioBase64Candidates.find(Boolean) as string | undefined;

    if (!audioBase64) {
      // If nothing found — return helpful error + the shape (first level) for debugging
      const preview = {
        topLevelKeys: Object.keys(asAny || {}),
        // include small snapshot if serializable
        sample: (() => {
          try {
            const clone = { ...(asAny || {}) };
            // remove heavy fields
            if (clone.response && clone.response.output) {
              clone.response.output = "[OUTPUT PRESENT]";
            }
            return clone;
          } catch {
            return "not-serializable";
          }
        })(),
      };
      console.error("TTS: audio not found. Shape preview:", preview);
      return NextResponse.json(
        { error: "TTS: audio not found in response", preview },
        { status: 500 }
      );
    }

    // Success: return base64 string
    return NextResponse.json({ audioBase64 });
  } catch (err: any) {
    console.error("TTS ERROR:", err);
    return NextResponse.json({ error: "TTS failed", details: String(err) }, { status: 500 });
  }
}
