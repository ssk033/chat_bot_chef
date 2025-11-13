import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { GoogleGenerativeAI } from "@google/generative-ai";

const prisma = new PrismaClient();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// NEW embedding model
const embedModel = genAI.getGenerativeModel({
  model: "models/text-embedding-004",
});

// NEW chat model
const chatModel = genAI.getGenerativeModel({
  model: "gemini-2.0-flash",
});

export async function POST(req: Request) {
  try {
    const { message } = await req.json();

    if (!message) {
      return NextResponse.json({ error: "Message required" }, { status: 400 });
    }

    // 1️⃣ Create embedding for user query
    const embedRes = await embedModel.embedContent(message);

    const qEmbedding = embedRes.embedding.values;
    const qLiteral = `[${qEmbedding.join(",")}]`;

    // 2️⃣ Vector similarity search
    const results: any =
      await prisma.$queryRawUnsafe(`
        SELECT r.*, e.vector <-> '${qLiteral}'::vector AS distance
        FROM "embeddings" e
        JOIN "Recipe" r ON e."recipeId" = r.id
        ORDER BY e.vector <-> '${qLiteral}'::vector
        LIMIT 5;
      `);

    // Build context from DB rows
    let context = "";
    for (const r of results) {
      context += `
Recipe: ${r.title}
Ingredients: ${r.ingredients}
Instructions: ${r.instructions?.slice(0, 400)}
---
`;
    }

    // 3️⃣ Ask Gemini to answer based on DB context
    const prompt = `
You are a professional chef AI.

User query:
"${message}"

Relevant recipes from database:
${context}

Provide:
- Best matching recipe
- Why it fits
- Step-by-step instructions
- Alternatives if needed
`;

    const completion = await chatModel.generateContent(prompt);
    const reply = completion.response.text();

    return NextResponse.json({
      reply,
      sources: results,
    });
  } catch (error) {
    console.error("QUERY ERROR:", error);
    return NextResponse.json(
      { error: "Query failed", details: String(error) },
      { status: 500 }
    );
  }
}
