import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: Request) {
  try {
    const { text } = await req.json();
    if (!text) return NextResponse.json({ error: "Text required" }, { status: 400 });

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    
    // Try gemini-2.0-flash-exp with TTS capabilities
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash-exp"
    });

    // Generate audio content - the model should auto-detect TTS intent
    const result = await model.generateContent(text);

    // Log the structure for debugging
    console.log("TTS Result structure:", JSON.stringify(result, null, 2));

    // Try to extract audio from various possible locations
    const response = result.response;
    const candidate = response.candidates?.[0];
    
    if (!candidate) {
      console.error("No candidate in response");
      return NextResponse.json({ error: "No audio generated" }, { status: 500 });
    }

    // Check multiple possible locations for audio data
    let audioBase64: string | null = null;
    let mimeType = "audio/wav";

    // Location 1: inlineData in parts
    const audioPart = candidate.content?.parts?.find((part: any) => part.inlineData);
    if (audioPart?.inlineData?.data) {
      audioBase64 = audioPart.inlineData.data;
      mimeType = audioPart.inlineData.mimeType || "audio/wav";
    }

    // Location 2: Direct audio field
    if (!audioBase64 && (candidate as any).audio) {
      audioBase64 = (candidate as any).audio;
    }

    // Location 3: In response object
    if (!audioBase64 && (response as any).audio) {
      audioBase64 = (response as any).audio;
    }

    // Location 4: modelData or other fields
    if (!audioBase64 && (result as any).modelData?.audio) {
      audioBase64 = (result as any).modelData.audio;
    }

    if (!audioBase64) {
      // If no audio found, log the full structure
      console.error("No audio data found. Full result:", {
        hasResponse: !!result.response,
        hasCandidates: !!result.response.candidates,
        candidateKeys: candidate ? Object.keys(candidate) : [],
        contentKeys: candidate?.content ? Object.keys(candidate.content) : [],
        partsCount: candidate?.content?.parts?.length || 0,
        firstPartKeys: candidate?.content?.parts?.[0] ? Object.keys(candidate.content.parts[0]) : []
      });
      
      return NextResponse.json({ 
        error: "No audio data in response",
        debug: {
          hasResponse: !!result.response,
          hasCandidates: !!result.response.candidates,
        }
      }, { status: 500 });
    }

    // Return the base64 audio data
    return NextResponse.json({ 
      audioBase64,
      mimeType
    });

  } catch (err: any) {
    console.error("TTS ERROR:", err);
    console.error("Error details:", err.message, err.stack);
    return NextResponse.json({ 
      error: "TTS failed", 
      details: err.message || String(err) 
    }, { status: 500 });
  }
}