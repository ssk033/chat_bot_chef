import { NextResponse } from "next/server";

/**
 * TTS route - now uses browser's built-in Web Speech API.
 * This endpoint just confirms TTS is available client-side.
 * The actual TTS is handled in the browser using speechSynthesis API.
 */
export async function POST(req: Request) {
  try {
    const { text } = await req.json();
    if (!text) return NextResponse.json({ error: "Text required" }, { status: 400 });

    // TTS is now handled client-side using browser's Web Speech API
    // This endpoint just returns a success message
    // The frontend will use window.speechSynthesis for text-to-speech
    
    return NextResponse.json({ 
      success: true,
      message: "TTS is handled client-side using browser's Web Speech API",
      note: "The frontend uses window.speechSynthesis.speak() for text-to-speech"
    });

  } catch (err: any) {
    console.error("TTS ERROR:", err);
    return NextResponse.json({ 
      error: "TTS endpoint error", 
      details: err.message || String(err) 
    }, { status: 500 });
  }
}