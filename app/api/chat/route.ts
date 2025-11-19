import { NextResponse } from "next/server";
import { generateText, checkOllamaAvailable } from "@/lib/ollama-client";

export async function POST(req: Request) {
  try {
    const { message } = await req.json();

    if (!message) {
      return NextResponse.json({ error: "Message required" }, { status: 400 });
    }

    // Check if Ollama is available
    const ollamaAvailable = await checkOllamaAvailable();
    if (!ollamaAvailable) {
      return NextResponse.json({
        error: "Ollama is not running. Please install and start Ollama:\n" +
               "1. Install from https://ollama.ai\n" +
               "2. Run: ollama serve\n" +
               "3. Pull a model: ollama pull llama3.2:1b"
      }, { status: 503 });
    }

    // Generate response using local LLM
    const reply = await generateText(message);

    return NextResponse.json({ reply });
  } catch (err: any) {
    console.error("SERVER ERROR:", err);
    return NextResponse.json({
      error: err.message || "Server error",
      hint: "Make sure Ollama is installed and running. Visit https://ollama.ai for installation instructions."
    }, { status: 500 });
  }
}
