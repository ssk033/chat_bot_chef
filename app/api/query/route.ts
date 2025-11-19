import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { generateEmbedding } from "@/lib/embedding-model";
import { generateText, checkOllamaAvailable } from "@/lib/ollama-client";

const prisma = new PrismaClient();

/**
 * Generate intelligent fallback response when LLM is unavailable
 */
function generateIntelligentFallbackResponse(
  message: string,
  results: any[],
  requestedCount: number | null
): string {
  const limit = requestedCount && requestedCount > 0 ? requestedCount : Math.min(3, results.length);
  const finalResults = results.slice(0, limit);
  
  // Analyze query intent
  const lowerMessage = message.toLowerCase();
  const isAskingForIngredients = /ingredient|what.*in|what.*need|what.*use/i.test(lowerMessage);
  const isAskingForTime = /time|how long|duration|minutes|hours/i.test(lowerMessage);
  const isAskingForInstructions = /how.*make|how.*cook|how.*prepare|steps|instructions|recipe/i.test(lowerMessage);
  
  let reply = "";
  
  if (finalResults.length === 0) {
    return `I couldn't find any recipes matching "${message}". Try being more specific or using ingredient names.`;
  }
  
  // Build contextual response
  if (isAskingForIngredients && finalResults[0].ingredients) {
    reply = `Here are the ingredients for ${finalResults[0].title}:\n\n`;
    reply += `${finalResults[0].ingredients}\n\n`;
    if (finalResults.length > 1) {
      reply += `I also found ${finalResults.length - 1} other similar recipe${finalResults.length > 2 ? 's' : ''} you might like.\n`;
    }
  } else if (isAskingForTime && (finalResults[0].prepTime || finalResults[0].cookTime)) {
    const totalTime = (finalResults[0].prepTime || 0) + (finalResults[0].cookTime || 0);
    reply = `${finalResults[0].title} takes approximately ${totalTime} minutes`;
    if (finalResults[0].prepTime && finalResults[0].cookTime) {
      reply += ` (${finalResults[0].prepTime} minutes prep, ${finalResults[0].cookTime} minutes cooking)`;
    }
    reply += `.\n\n`;
  } else if (isAskingForInstructions && finalResults[0].instructions) {
    reply = `Here's how to make ${finalResults[0].title}:\n\n`;
    reply += `${finalResults[0].instructions.slice(0, 500)}${finalResults[0].instructions.length > 500 ? '...' : ''}\n\n`;
  } else {
    // General recipe recommendation
    reply = `I found ${finalResults.length} great recipe${finalResults.length > 1 ? 's' : ''} for you:\n\n`;
  }
  
  // Add recipe details
  finalResults.forEach((r: any, index: number) => {
    if (!isAskingForIngredients && !isAskingForInstructions) {
      reply += `${index + 1}. ${r.title}\n`;
      
      const totalTime = (r.prepTime || 0) + (r.cookTime || 0);
      if (totalTime > 0) {
        reply += `   Time: ${totalTime} minutes`;
        if (r.prepTime && r.cookTime) {
          reply += ` (${r.prepTime} min prep, ${r.cookTime} min cook)`;
        }
        reply += `\n`;
      }
      
      if (r.ingredients && !isAskingForIngredients) {
        const ingredients = r.ingredients.replace(/,/g, ', ').slice(0, 150);
        reply += `   Ingredients: ${ingredients}${r.ingredients.length > 150 ? '...' : ''}\n`;
      }
      
      if (r.cuisine) {
        reply += `   Cuisine: ${r.cuisine}\n`;
      }
      
      reply += `\n`;
    }
  });
  
  return reply.trim();
}

export async function POST(req: Request) {
  try {
    const { message, history = [] } = await req.json();

    if (!message) {
      return NextResponse.json({ error: "Message required" }, { status: 400 });
    }

    // Handle model status check
    if (message === '__check_model__') {
      const { isModelAvailable } = await import('@/lib/embedding-model');
      return NextResponse.json({ 
        modelAvailable: isModelAvailable(),
        reply: isModelAvailable() ? "Model ready" : "Model not found"
      });
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

    // 1️⃣ Create embedding for user query using CUSTOM trained model
    console.log("🔄 Generating embedding for query using custom model...");
    let qEmbedding: number[];
    let qLiteral: string;
    
    try {
      // Use custom trained embedding model instead of Google API
      qEmbedding = await generateEmbedding(message);
      qLiteral = `[${qEmbedding.join(",")}]`;
      console.log("✅ Embedding generated successfully (dimension:", qEmbedding.length, ")");
    } catch (embedError: any) {
      console.error("❌ Embedding generation failed:", embedError);
      
      // Check if it's a model not found error
      if (embedError.message?.includes("Model not found") || embedError.message?.includes("trained model not found")) {
        return NextResponse.json({
          reply: "⚠️ Google Colab trained model not found. Please ensure the model is placed in `models/recipe-embedder/` directory.\n\nThen reload the recipes:\n```bash\nnpm run load\n```"
        }, { status: 500 });
      }
      
      return NextResponse.json({
        reply: "I couldn't process your query. There might be an issue with the embedding model. Please check that the model is trained and Python is available."
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
        const searchTerms = message.toLowerCase().split(/\s+/).filter((term: string) => term.length > 2);
        
        if (searchTerms.length > 0) {
          // Use Prisma's OR query for text search
          const textResults = await prisma.recipe.findMany({
            where: {
              OR: searchTerms.flatMap((term: string) => [
                { title: { contains: term, mode: 'insensitive' as const } },
                { ingredients: { contains: term, mode: 'insensitive' as const } }
              ])
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

    // Check if this is a general question (not recipe-related)
    const isGeneralQuestion = /^(hi|hello|hey|how are you|what's up|how do you do|good morning|good afternoon|good evening|thanks|thank you|bye|goodbye|who are you|what are you|help|help me)/i.test(message.trim()) ||
                               message.trim().length < 10 ||
                               (!message.toLowerCase().match(/\b(recipe|ingredient|food|dish|cook|bake|make|prepare|cuisine|meal|breakfast|lunch|dinner|snack|dessert|appetizer|chicken|beef|pork|fish|vegetable|pasta|rice|bread|soup|salad|pizza|burger|sandwich|cake|cookie|pie|sauce|spice|herb|flavor|taste|kitchen|cooking|baking|grill|fry|boil|steam|roast)\b/i) && results.length === 0);

    // If it's a general question, skip recipe search and go directly to LLM
    if (isGeneralQuestion && results.length === 0) {
      console.log("💬 Detected general question, skipping recipe search");
      
      // Build conversation history for context
      let conversationContext = "";
      if (history.length > 0) {
        conversationContext = "\n\nPrevious conversation:\n";
        history.slice(-5).forEach((msg: any) => {
          conversationContext += `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}\n`;
        });
      }
      
      const generalPrompt = `You are a friendly and helpful AI chef assistant. You can help with cooking questions, recipe suggestions, and general conversation.

User: ${message}${conversationContext}

Provide a friendly, helpful response. If the user is greeting you, greet them back warmly. If they're asking for help, offer assistance. Keep responses concise and natural. Use plain text only (no markdown formatting).`;

      try {
        const ollamaAvailable = await checkOllamaAvailable();
        if (!ollamaAvailable) {
          return NextResponse.json({
            reply: "Hello! I'm your AI chef assistant. I can help you find recipes and answer cooking questions. However, I need Ollama to be running for full functionality. Please install Ollama from https://ollama.ai"
          });
        }

        const reply = await generateText(generalPrompt);
        return NextResponse.json({ reply });
      } catch (error: any) {
        // Fallback response for general questions
        const greetings = ["Hello!", "Hi there!", "Hey!", "Greetings!"];
        const responses: { [key: string]: string } = {
          "hi": "Hello! I'm your AI chef assistant. How can I help you with recipes today?",
          "hello": "Hi! I'm here to help you find recipes and answer cooking questions. What would you like to know?",
          "how are you": "I'm doing great, thank you for asking! I'm ready to help you with recipes and cooking tips. What can I help you with?",
          "thanks": "You're welcome! Feel free to ask if you need any more recipe suggestions.",
          "thank you": "You're very welcome! Happy cooking!",
          "bye": "Goodbye! Happy cooking!",
          "goodbye": "See you later! Enjoy your cooking!",
          "help": "I'm your AI chef assistant! I can help you:\n- Find recipes by ingredients\n- Suggest dishes based on what you have\n- Answer cooking questions\n\nJust ask me anything about recipes or cooking!"
        };
        
        const lowerMessage = message.toLowerCase().trim();
        const reply = responses[lowerMessage] || greetings[Math.floor(Math.random() * greetings.length)] + " I'm your AI chef assistant. How can I help you with recipes?";
        
        return NextResponse.json({ reply });
      }
    }

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

    // 3️⃣ Ask local LLM (Ollama) to answer based on DB context
    const countInstruction = requestedCount ? ` The user specifically requested ${requestedCount} recipe${requestedCount > 1 ? 's' : ''}, so focus on providing exactly that many.` : '';
    
    // Build conversation history for context
    let conversationContext = "";
    if (history.length > 0) {
      conversationContext = "\n\nPrevious conversation context:\n";
      history.slice(-5).forEach((msg: any) => {
        conversationContext += `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}\n`;
      });
      conversationContext += "\nUse the conversation history to understand context and provide relevant responses.\n";
    }
    
    const prompt = `
You are a professional chef AI assistant.

Current user query: "${message}"
${countInstruction}
${conversationContext}

Here are the most relevant recipes from the database:
${context}

Based on these recipes and the conversation history, provide a helpful response that:
- Answers the user's query directly, considering any previous context
- ${requestedCount ? `Provides exactly ${requestedCount} recipe${requestedCount > 1 ? 's' : ''} as requested` : 'Recommends the best matching recipe(s)'}
- Explains why they fit the user's needs
- Provides clear step-by-step instructions
- Suggests alternatives if relevant
- References previous conversation if relevant (e.g., "as you mentioned earlier", "like we discussed")

IMPORTANT: Do NOT use markdown formatting like asterisks (**), bold, or special characters that would be read aloud by text-to-speech. Use plain text only. Format your response naturally for both reading and listening.
`;

    console.log("🤖 Asking local LLM (Ollama) for response...");
    let reply: string;
    
    try {
      // Check if Ollama is available
      const ollamaAvailable = await checkOllamaAvailable();
      if (!ollamaAvailable) {
        throw new Error(
          "Ollama is not running. Please install and start Ollama:\n" +
          "1. Install from https://ollama.ai\n" +
          "2. Run: ollama serve\n" +
          "3. Pull a model: ollama pull llama3.2:1b"
        );
      }

      reply = await generateText(prompt);
      console.log("✅ Response generated successfully using local LLM");
    } catch (llmError: any) {
      console.error("❌ Local LLM error:", llmError);
      console.log("⚠️ LLM unavailable. Using intelligent fallback response...");
      
      // Intelligent fallback: Generate a helpful response from recipes
      try {
        reply = generateIntelligentFallbackResponse(message, uniqueResults, requestedCount);
        console.log("✅ Generated intelligent fallback response");
      } catch (fallbackError) {
        // Final fallback: Return recipes directly without AI enhancement
        console.log("⚠️ Using basic recipe listing fallback...");
        
        // Check if it's a general question for fallback
      const isGeneralQuestionFallback = /^(hi|hello|hey|how are you|what's up|how do you do|good morning|good afternoon|good evening|thanks|thank you|bye|goodbye|who are you|what are you|help|help me)/i.test(message.trim());
      
      if (isGeneralQuestionFallback) {
        const responses: { [key: string]: string } = {
          "hi": "Hello! I'm your AI chef assistant. How can I help you with recipes today?",
          "hello": "Hi! I'm here to help you find recipes and answer cooking questions. What would you like to know?",
          "how are you": "I'm doing great, thank you for asking! I'm ready to help you with recipes and cooking tips. What can I help you with?",
          "thanks": "You're welcome! Feel free to ask if you need any more recipe suggestions.",
          "thank you": "You're very welcome! Happy cooking!",
          "bye": "Goodbye! Happy cooking!",
          "goodbye": "See you later! Enjoy your cooking!",
          "help": "I'm your AI chef assistant! I can help you:\n- Find recipes by ingredients\n- Suggest dishes based on what you have\n- Answer cooking questions\n\nJust ask me anything about recipes or cooking!"
        };
        
        const lowerMessage = message.toLowerCase().trim();
        const reply = responses[lowerMessage] || "Hello! I'm your AI chef assistant. How can I help you with recipes?";
        
        return NextResponse.json({ reply, llmUnavailable: true });
      }
      
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
      
      reply += `\nNote: Enhanced AI responses are currently unavailable, but I've found these great recipes for you!`;
      
      return NextResponse.json({
        reply,
        sources: finalResults.map((r: any) => ({
          title: r.title,
          prepTime: r.prepTime,
          cookTime: r.cookTime,
          distance: r.distance
        })),
        llmUnavailable: true
      });
      }
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
        reply: "Sorry, I encountered an error processing your request. Please try again with a different query."
      },
      { status: 500 }
    );
  }
}