import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { GoogleGenerativeAI } from "@google/generative-ai";

const prisma = new PrismaClient();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// Embedding model
const embedModel = genAI.getGenerativeModel({
  model: "models/text-embedding-004",
});

// Chat model
const chatModel = genAI.getGenerativeModel({
  model: "gemini-2.0-flash",
});

// Helper function to retry with exponential backoff
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      // Check if it's a rate limit error (429)
      const isRateLimit = error.status === 429 || 
                         error.message?.includes("429") ||
                         error.message?.includes("rate limit") ||
                         error.message?.includes("Resource exhausted");
      
      if (isRateLimit && attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt);
        console.log(`⏳ Rate limited. Retrying in ${delay}ms... (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // If not rate limit or last attempt, throw
      throw error;
    }
  }
  
  throw lastError;
}

export async function POST(req: Request) {
  try {
    const { message } = await req.json();

    if (!message) {
      return NextResponse.json({ error: "Message required" }, { status: 400 });
    }

    console.log("📝 User query:", message);

    // Check if database has recipes
    const recipeCount = await prisma.recipe.count();
    const embeddingCount = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM "embeddings"`) as any[];
    const embeddingCountNum = embeddingCount[0]?.count || 0;
    
    console.log("📊 Total recipes in database:", recipeCount);
    console.log("📊 Total embeddings in database:", embeddingCountNum);

    if (recipeCount === 0) {
      return NextResponse.json({
        reply: "I don't have any recipes in my database yet. Please run the load script to import recipes first:\n\n```bash\nnpm run load\n```\n\nOr if you're using the TypeScript script:\n```bash\nnpx ts-node scripts/load.ts\n```"
      });
    }

    if (embeddingCountNum === 0) {
      return NextResponse.json({
        reply: "I have recipes in the database, but they don't have embeddings yet. This means the vector search won't work. Please run the load script again to generate embeddings:\n\n```bash\nnpm run load\n```"
      });
    }

    // 1️⃣ Create embedding for user query
    console.log("🔄 Generating embedding for query...");
    let qEmbedding: number[];
    let qLiteral: string;
    
    try {
      const embedRes = await retryWithBackoff(() => embedModel.embedContent(message));
      qEmbedding = embedRes.embedding.values;
      qLiteral = `[${qEmbedding.join(",")}]`;
    } catch (embedError: any) {
      console.error("❌ Embedding generation failed:", embedError);
      const isRateLimit = embedError.status === 429 || embedError.message?.includes("429");
      
      if (isRateLimit) {
        return NextResponse.json({
          reply: "⚠️ Rate limit reached for the embedding service. Please wait a few moments and try again. The API has temporary usage limits to ensure fair access for all users."
        }, { status: 429 });
      }
      
      return NextResponse.json({
        reply: "I couldn't process your query. There might be an issue with the embedding service. Please try again or check your API key configuration."
      }, { status: 500 });
    }

    // 2️⃣ Vector similarity search
    console.log("🔍 Searching for similar recipes...");
    let results: any[] = [];
    
    try {
      // Escape the literal to prevent SQL injection (though it's already a number array)
      const sanitizedLiteral = qLiteral.replace(/'/g, "''");
      results = await prisma.$queryRawUnsafe(`
        SELECT r.*, e.vector <-> '${sanitizedLiteral}'::vector AS distance
        FROM "embeddings" e
        JOIN "Recipe" r ON e."recipeId" = r.id
        ORDER BY e.vector <-> '${sanitizedLiteral}'::vector
        LIMIT 5;
      `) as any[];
    } catch (searchError: any) {
      console.error("❌ Vector search failed:", searchError);
      
      // If vector search fails, try a simple text search as fallback
      console.log("🔄 Falling back to text search...");
      try {
        const searchTerms = message.toLowerCase().split(/\s+/).filter(term => term.length > 2);
        
        if (searchTerms.length > 0) {
          // Use Prisma's OR query for text search
          const searchConditions = searchTerms.map(term => ({
            OR: [
              { title: { contains: term, mode: 'insensitive' as const } },
              { ingredients: { contains: term, mode: 'insensitive' as const } }
            ]
          }));
          
          const textResults = await prisma.recipe.findMany({
            where: {
              OR: searchConditions.flatMap(c => c.OR)
            },
            take: 5
          });
          
          // Convert to same format as vector search results
          results = textResults.map(r => ({ ...r, distance: 0.5 }));
        }
        
        console.log("✅ Found", results.length, "recipes using text search");
      } catch (fallbackError: any) {
        console.error("❌ Fallback search also failed:", fallbackError);
        return NextResponse.json({
          reply: "I encountered an error searching for recipes. The database might not be properly configured. Please check:\n1. Database connection is working\n2. Recipes are loaded\n3. Vector extension (pgvector) is enabled"
        }, { status: 500 });
      }
    }

    console.log("✅ Found", results.length, "matching recipes");

    if (results.length === 0) {
      return NextResponse.json({
        reply: `I couldn't find any recipes matching "${message}". Try:\n- Being more specific (e.g., "chicken pasta" instead of "food")\n- Using ingredient names (e.g., "tomatoes", "pasta", "chicken")\n- Asking for recipe types (e.g., "dessert", "breakfast", "italian")`
      });
    }

    // Extract number from query for AI prompt
    const numberMatch = message.match(/\b(\d+)\s*(?:recipe|recipes|dish|dishes)?\b/i);
    const requestedCount = numberMatch ? parseInt(numberMatch[1], 10) : null;
    
    // Deduplicate results before sending to AI
    const seenTitles = new Set<string>();
    const uniqueResults = results.filter((r: any) => {
      const titleLower = r.title?.toLowerCase().trim();
      if (!titleLower || seenTitles.has(titleLower)) {
        return false;
      }
      seenTitles.add(titleLower);
      return true;
    });
    
    // Limit results for AI context
    const limitForAI = requestedCount && requestedCount > 0 ? Math.min(requestedCount, uniqueResults.length) : Math.min(3, uniqueResults.length);
    const aiResults = uniqueResults.slice(0, limitForAI);
    
    // Build context from unique, limited results
    let context = "";
    for (const r of aiResults) {
      context += `
Recipe: ${r.title}
Ingredients: ${r.ingredients || "Not specified"}
Instructions: ${r.instructions?.slice(0, 400) || "Not specified"}
Prep Time: ${r.prepTime || "Not specified"} minutes
Cook Time: ${r.cookTime || "Not specified"} minutes
Total Time: ${r.totalTime || "Not specified"} minutes
Cuisine: ${r.cuisine || "Not specified"}
---
`;
    }

    // 3️⃣ Ask Gemini to answer based on DB context
    const countInstruction = requestedCount ? ` The user specifically requested ${requestedCount} recipe${requestedCount > 1 ? 's' : ''}, so focus on providing exactly that many.` : '';
    
    const prompt = `
You are a professional chef AI assistant.

User query: "${message}"
${countInstruction}

Here are the most relevant recipes from the database:
${context}

Based on these recipes, provide a helpful response that:
- Answers the user's query directly
- ${requestedCount ? `Provides exactly ${requestedCount} recipe${requestedCount > 1 ? 's' : ''} as requested` : 'Recommends the best matching recipe(s)'}
- Explains why they fit the user's needs
- Provides clear step-by-step instructions
- Suggests alternatives if relevant

IMPORTANT: Do NOT use markdown formatting like asterisks (**), bold, or special characters that would be read aloud by text-to-speech. Use plain text only. Format your response naturally for both reading and listening.
`;

    console.log("🤖 Asking Gemini for response...");
    let reply: string;
    
    try {
      const completion = await retryWithBackoff(() => chatModel.generateContent(prompt));
      reply = completion.response.text();
      console.log("✅ Response generated successfully");
    } catch (geminiError: any) {
      console.error("❌ Gemini API error:", geminiError);
      
      const isRateLimit = geminiError.status === 429 || 
                         geminiError.message?.includes("429") ||
                         geminiError.message?.includes("Resource exhausted");
      
      if (isRateLimit) {
        // Fallback: Return recipes directly without AI enhancement
        console.log("⚠️ Rate limited. Returning recipes directly without AI enhancement...");
        
        // Extract number from query (e.g., "3 recipes" -> 3)
        const numberMatch = message.match(/\b(\d+)\s*(?:recipe|recipes|dish|dishes)?\b/i);
        const requestedCount = numberMatch ? parseInt(numberMatch[1], 10) : null;
        
        // Deduplicate results by title (case-insensitive)
        const seenTitles = new Set<string>();
        const uniqueResults = results.filter((r: any) => {
          const titleLower = r.title?.toLowerCase().trim();
          if (!titleLower || seenTitles.has(titleLower)) {
            return false;
          }
          seenTitles.add(titleLower);
          return true;
        });
        
        // Limit to requested number or default to 3
        const limit = requestedCount && requestedCount > 0 ? requestedCount : 3;
        const finalResults = uniqueResults.slice(0, limit);
        
        // Format response without markdown (TTS-friendly)
        reply = `I found ${finalResults.length} recipe${finalResults.length > 1 ? 's' : ''} matching your query:\n\n`;
        
        finalResults.forEach((r: any, index: number) => {
          reply += `Recipe ${index + 1}: ${r.title}\n`;
          
          const totalTime = (r.prepTime || 0) + (r.cookTime || 0);
          if (totalTime > 0) {
            reply += `Total time: ${totalTime} minutes`;
            if (r.prepTime && r.cookTime) {
              reply += ` (${r.prepTime} minutes prep, ${r.cookTime} minutes cook)`;
            }
            reply += `\n`;
          }
          
          if (r.ingredients) {
            const ingredients = r.ingredients.replace(/,/g, ', ').slice(0, 200);
            reply += `Ingredients: ${ingredients}${r.ingredients.length > 200 ? '...' : ''}\n`;
          }
          
          if (r.instructions) {
            const instructions = r.instructions.slice(0, 250).replace(/\n/g, ' ');
            reply += `Instructions: ${instructions}${r.instructions.length > 250 ? '...' : ''}\n`;
          }
          
          reply += `\n`;
        });
        
        reply += `\nNote: The AI response service is currently rate-limited. These are the raw recipe results. Please try again in a moment for an enhanced AI-powered response.`;
        
        return NextResponse.json({
          reply,
          sources: finalResults.map((r: any) => ({
            title: r.title,
            prepTime: r.prepTime,
            cookTime: r.cookTime,
            distance: r.distance
          })),
          rateLimited: true
        });
      }
      
      // For other errors, throw to be caught by outer catch
      throw geminiError;
    }

    return NextResponse.json({
      reply,
      sources: results.map((r: any) => ({
        title: r.title,
        prepTime: r.prepTime,
        cookTime: r.cookTime,
        distance: r.distance
      })),
    });
  } catch (error: any) {
    console.error("❌ QUERY ERROR:", error);
    console.error("Error details:", error.message);
    console.error("Stack:", error.stack);
    
    // Provide more helpful error messages
    const isRateLimit = error.status === 429 || 
                       error.message?.includes("429") ||
                       error.message?.includes("rate limit") ||
                       error.message?.includes("Resource exhausted");
    
    if (isRateLimit) {
      return NextResponse.json({
        reply: "⚠️ Rate limit reached. The API has temporary usage limits. Please wait 30-60 seconds and try again. You can also check your API quota at https://aistudio.google.com/app/apikey"
      }, { status: 429 });
    }
    
    let errorMessage = "Query failed. ";
    
    if (error.message?.includes("relation") || error.message?.includes("does not exist")) {
      errorMessage += "Database tables not found. Run migrations with: npx prisma migrate dev";
    } else if (error.message?.includes("vector")) {
      errorMessage += "Vector extension not enabled. Make sure pgvector is installed in your database.";
    } else if (error.message?.includes("quota")) {
      errorMessage += "API quota exceeded. Please check your API usage limits.";
    } else {
      errorMessage += error.message || "Unknown error occurred";
    }

    return NextResponse.json(
      { 
        error: errorMessage,
        reply: "Sorry, I encountered an error processing your request. Please try again in a moment."
      },
      { status: 500 }
    );
  }
}