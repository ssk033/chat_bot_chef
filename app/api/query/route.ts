import { NextResponse } from "next/server";
import { formatRecipesJsonReply } from "@/lib/format-recipe-response";
import { generateEmbedding } from "@/lib/embedding-model";
import { prisma, withPrismaReconnect } from "@/lib/prisma";
import {
  filterRecipesByConstraints,
  getFilterRejectReason,
  getSearchTermsForRanking,
  logRecipeSearchDebug,
  parseQueryConstraints,
  rankRecipesWithConstraints,
  resolveIngredientToken,
  validateRecipeConstraints,
  type QueryConstraints,
} from "@/lib/query-constraints";
import { RECIPE_CHEF_JSON_INSTRUCTION } from "@/lib/recipe-chef-prompt";

export const runtime = "nodejs";

const isQueryDebug =
  process.env.NODE_ENV === "development" || process.env.RECIPE_SEARCH_DEBUG === "1";

function queryLog(...args: unknown[]) {
  if (isQueryDebug) console.log(...args);
}

/**
 * Format instructions - handle JSON arrays or plain text
 */
function formatInstructions(instructions: string | null | undefined): string {
  if (!instructions) return "Not specified";
  
  try {
    // Try to parse as JSON array
    const parsed = JSON.parse(instructions);
    if (Array.isArray(parsed)) {
      return parsed.map((step: string, index: number) => `${index + 1}. ${step}`).join('\n');
    }
  } catch {
    // Not JSON, treat as plain text
  }
  
  // If it's plain text, return as is (but clean up if needed)
  return instructions;
}

const CASUAL_CHAT_REGEX =
  /^(hi|hello|hey|yo|sup|how are you|what's up|good morning|good afternoon|good evening|thanks|thank you|bye|goodbye|who are you|what are you|help|help me)$/i;

function isCasualConversation(message: string): boolean {
  return CASUAL_CHAT_REGEX.test(message.trim());
}

function formatNoMatchReply(constraints: QueryConstraints): string {
  if (constraints.requiredIngredients.length === 1) {
    return formatRecipesJsonReply(
      `No recipes found containing ${constraints.requiredIngredients[0]}.`,
      []
    );
  }
  if (constraints.requiredIngredients.length > 1) {
    return formatRecipesJsonReply(
      `No recipes found containing all of: ${constraints.requiredIngredients.join(", ")}.`,
      []
    );
  }
  return formatRecipesJsonReply("No recipes matched your requirements.", []);
}

function mergeMealPlanConstraints(
  constraints: QueryConstraints,
  mealPlanIngredients: string[]
): QueryConstraints {
  if (mealPlanIngredients.length === 0) return constraints;
  return {
    ...constraints,
    requiredIngredients: [
      ...new Set([...constraints.requiredIngredients, ...mealPlanIngredients]),
    ],
  };
}

function applyConstraintPipeline(
  message: string,
  constraints: QueryConstraints,
  candidates: any[]
): any[] {
  const rejected = candidates
    .map((r) => ({
      title: String(r.title ?? "Untitled"),
      reason: getFilterRejectReason(r, constraints),
    }))
    .filter((x): x is { title: string; reason: string } => x.reason != null);

  const filtered = filterRecipesByConstraints(candidates, constraints);
  const searchTerms = getSearchTermsForRanking(constraints, message);
  const ranked = rankRecipesWithConstraints(filtered, constraints, searchTerms);
  const validated = ranked.filter((r) => validateRecipeConstraints(r, constraints));

  logRecipeSearchDebug({
    query: message,
    constraints,
    vectorResults: candidates.map((r) => ({
      title: String(r.title ?? "Untitled"),
      distance: r.distance ?? null,
    })),
    filteredResults: filtered.map((r) => ({ title: String(r.title ?? "Untitled") })),
    rejected,
    coverageScores: ranked.map((r) => ({
      title: String(r.title ?? "Untitled"),
      coverage: r.coverageScore,
      finalScore: r.finalScore,
    })),
    finalResults: validated.map((r) => ({ title: String(r.title ?? "Untitled") })),
  });

  return validated.slice(0, 5);
}

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
  
  if (finalResults.length === 0) {
    return `I couldn't find any recipes matching "${message}". Try being more specific or using ingredient names.`;
  }

  if (isAskingForIngredients && finalResults[0]?.ingredients) {
    let intro = `Here are the ingredients for ${finalResults[0].title}:`;
    if (finalResults.length > 1) {
      intro += ` I also found ${finalResults.length - 1} other similar recipe${finalResults.length > 2 ? "s" : ""} you might like.`;
    }
    return formatRecipesJsonReply(intro, [finalResults[0]]);
  }

  if (isAskingForTime && (finalResults[0].prepTime || finalResults[0].cookTime)) {
    const totalTime = (finalResults[0].prepTime || 0) + (finalResults[0].cookTime || 0);
    const intro = `${finalResults[0].title} takes approximately ${totalTime} minutes${
      finalResults[0].prepTime && finalResults[0].cookTime
        ? ` (${finalResults[0].prepTime} minutes prep, ${finalResults[0].cookTime} minutes cooking)`
        : ""
    }.`;
    return formatRecipesJsonReply(intro, [finalResults[0]]);
  }

  if (isAskingForInstructions && finalResults[0]?.instructions) {
    const intro = `Here's how to make ${finalResults[0].title}:`;
    return formatRecipesJsonReply(intro, [finalResults[0]]);
  }

  const intro = `I found ${finalResults.length} great recipe${finalResults.length > 1 ? "s" : ""} for you:`;
  return formatRecipesJsonReply(intro, finalResults);
}

export async function POST(req: Request) {
  try {
    const { message } = await req.json();

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

    // Handle casual small-talk up front, so greetings feel chat-like.
    if (isCasualConversation(message)) {
      const responses: { [key: string]: string } = {
        "hi": "Hey! I am your chef buddy. Tell me ingredients or dish name, and I will suggest the best recipes.",
        "hello": "Hello! Ready to cook? Ask me any dish, cuisine, or ingredients you have.",
        "hey": "Hey! What are you craving today?",
        "yo": "Yo! Chef mode on. Tell me what you want to cook.",
        "how are you": "Doing great and ready to cook with you. What should we make?",
        "thanks": "Anytime! Want another recipe suggestion?",
        "thank you": "You are welcome. Let's cook something awesome.",
        "bye": "Bye! Happy cooking.",
        "goodbye": "Goodbye! Come back for more recipes.",
        "help": "I can help with:\n- dish-based recipes (e.g. mutton biryani)\n- ingredient-based recipes (e.g. rice onion tomato)\n- quick meal ideas by prep time",
      };
      const key = message.toLowerCase().trim();
      return NextResponse.json({ reply: responses[key] ?? "Hey! Tell me what dish you want and I will find recipes for it." });
    }

    queryLog("📝 User query:", message);

    // Check if database has recipes (single lightweight query on hot path)
    const recipeCount = await withPrismaReconnect(() => prisma.recipe.count());
    if (recipeCount === 0) {
      return NextResponse.json({
        reply: "I don't have any recipes in my database yet. Please run the load script to import recipes first:\n\n```bash\nnpm run load\n```\n\nOr if you're using the TypeScript script:\n```bash\nnpx ts-node scripts/load.ts\n```"
      });
    }

    const mealPlanMatch = message.match(/generate a meal plan with ingredients:\s*([^\.]+)/i);
    const mealPlanIngredients = mealPlanMatch
      ? mealPlanMatch[1]
          .split(/[,/&]|\band\b/i)
          .map((s) => resolveIngredientToken(s))
          .filter(Boolean)
      : [];

    const constraints = mergeMealPlanConstraints(parseQueryConstraints(message), mealPlanIngredients);

    // 1️⃣ Try to create embedding for user query (optional - will use text search if fails)
    queryLog("🔄 Attempting to generate embedding for query...");
    let qEmbedding: number[] | null = null;
    let qLiteral: string | null = null;
    let useVectorSearch = false;
    
    if (mealPlanIngredients.length === 0) {
      try {
        qEmbedding = await generateEmbedding(message);
        qLiteral = `[${qEmbedding.join(",")}]`;
        useVectorSearch = true;
        queryLog("✅ Embedding generated successfully (dimension:", qEmbedding.length, ")");
      } catch (embedError: any) {
        console.warn("⚠️ Embedding generation failed, will use text search instead:", embedError.message);
        // Don't return error - continue with text search fallback
        useVectorSearch = false;
      }
    } else {
      queryLog("🍽️ Meal-plan request detected, using ingredient-priority search");
      useVectorSearch = false;
    }

    // 2️⃣ Search for recipes - try vector search first, fallback to text search
    queryLog("🔍 Searching for similar recipes...");
    let results: any[] = [];
    
    if (useVectorSearch && qLiteral) {
      try {
        // Escape the literal to prevent SQL injection (though it's already a number array)
        const sanitizedLiteral = qLiteral.replace(/'/g, "''");
        results = await withPrismaReconnect(() => prisma.$queryRawUnsafe(`
          SELECT r.*, e.vector <-> '${sanitizedLiteral}'::vector AS distance
          FROM "embeddings" e
          JOIN "Recipe" r ON e."recipeId" = r.id
          ORDER BY e.vector <-> '${sanitizedLiteral}'::vector
          LIMIT 25;
        `)) as any[];
        queryLog("✅ Found", results.length, "recipes using vector search");
      } catch (searchError: any) {
        console.warn("⚠️ Vector search failed, falling back to text search:", searchError.message);
        useVectorSearch = false; // Fall through to text search
      }
    }
    
    // If vector search didn't work or wasn't attempted, use text search
    if (!useVectorSearch || results.length === 0) {
      queryLog("🔄 Using text-based search...");
      try {
        // Extract meaningful search terms from query
        const searchTerms =
          constraints.requiredIngredients.length > 0
            ? constraints.requiredIngredients
            : getSearchTermsForRanking(constraints, message);
        
        // Extract prep time filter if mentioned
        const prepTimeMatch = message.match(/(\d+)\s*(?:min|minute|mins)\s*(?:prep|preparation)/i);
        const maxPrepTime = prepTimeMatch ? parseInt(prepTimeMatch[1], 10) : null;
        
        if (searchTerms.length > 0) {
          // Build search query - prioritize ingredients, then title
          const whereClause: any = {
            OR: [
              // First priority: ingredients (most important for ingredient-based queries)
              ...searchTerms.map((term: string) => ({
                ingredients: { contains: term, mode: 'insensitive' as const }
              })),
              // Second priority: title
              ...searchTerms.map((term: string) => ({
                title: { contains: term, mode: 'insensitive' as const }
              })),
              // Third priority: instructions
              ...searchTerms.map((term: string) => ({
                instructions: { contains: term, mode: 'insensitive' as const }
              }))
            ]
          };
          
          // Add prep time filter if specified
          if (maxPrepTime !== null) {
            whereClause.prepTime = { lte: maxPrepTime };
          }
          
          const textResults = await withPrismaReconnect(() => prisma.recipe.findMany({
            where: whereClause,
            take: 10, // Get more results to filter better
          }));
          
          // Filter and sort results by relevance
          results = textResults.map((r: any) => ({
            ...r,
            distance: 0.5,
          }));
          
          queryLog("✅ Found", results.length, "recipes using text search");
        } else {
          // If no search terms, get random recipes
          results = await withPrismaReconnect(() => prisma.recipe.findMany({
            take: 5,
            orderBy: { id: 'asc' }
          }));
          results = results.map((r: any) => ({ ...r, distance: 0.5 }));
          queryLog("✅ No specific search terms, returning sample recipes");
        }
      } catch (fallbackError: any) {
        console.error("❌ Text search also failed:", fallbackError);
        return NextResponse.json({
          reply: "I encountered an error searching for recipes. The database might not be properly configured. Please check:\n1. Database connection is working\n2. Recipes are loaded"
        }, { status: 500 });
      }
    }

    const hasActiveConstraints =
      constraints.dietary.length > 0 ||
      constraints.requiredIngredients.length > 0 ||
      constraints.excludedIngredients.length > 0;

    if (results.length > 0) {
      results = applyConstraintPipeline(message, constraints, results);
    }

    queryLog("✅ Found", results.length, "matching recipes after constraints");

    // Check if this is a general question (not recipe-related)
    // Only treat as general if it's clearly a greeting/small talk AND no recipes found
    const isGeneralQuestion = results.length === 0 && (
      /^(hi|hello|hey|how are you|what's up|how do you do|good morning|good afternoon|good evening|thanks|thank you|bye|goodbye|who are you|what are you|help|help me)$/i.test(message.trim()) ||
      (message.trim().length < 10 && !message.toLowerCase().match(/\b(recipe|ingredient|food|dish|cook|bake|make|prepare|cuisine|meal|breakfast|lunch|dinner|snack|dessert|appetizer|chicken|beef|pork|fish|vegetable|pasta|rice|bread|soup|salad|pizza|burger|sandwich|cake|cookie|pie|sauce|spice|herb|flavor|taste|kitchen|cooking|baking|grill|fry|boil|steam|roast)\b/i))
    );

    // If it's a general question, skip recipe search and go directly to LLM
    if (isGeneralQuestion && results.length === 0) {
      queryLog("💬 Detected general question, skipping recipe search");
      
      // Fallback response for general questions (works without Ollama)
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

    if (results.length === 0) {
      if (hasActiveConstraints) {
        return NextResponse.json({
          reply: formatNoMatchReply(constraints),
        });
      }
      return NextResponse.json({
        reply: `I couldn't find any recipes matching "${message}". Try:\n- Being more specific (e.g., "chicken pasta" instead of "food")\n- Using ingredient names (e.g., "tomatoes", "pasta", "chicken")\n- Asking for recipe types (e.g., "dessert", "breakfast", "italian")`
      });
    }

    // Extract number from query for AI prompt
    const numberMatch = message.match(/\b(\d+)\s*(?:recipe|recipes|dish|dishes)?\b/i);
    const requestedCount = numberMatch ? parseInt(numberMatch[1], 10) : null;
    
    // Deduplicate results before sending to AI
    const seenTitles = new Set<string>();
    const uniqueResults = results
      .filter((r: any) => validateRecipeConstraints(r, constraints))
      .filter((r: any) => {
      const titleLower = r.title?.toLowerCase().trim();
      if (!titleLower || seenTitles.has(titleLower)) {
        return false;
      }
      seenTitles.add(titleLower);
      return true;
    });
    
    // Limit results for AI context
    const limitForAI = requestedCount && requestedCount > 0 ? Math.min(requestedCount, uniqueResults.length) : Math.min(3, uniqueResults.length);
    if (uniqueResults.length === 0 && hasActiveConstraints) {
      return NextResponse.json({
        reply: formatNoMatchReply(constraints),
      });
    }

    const aiResults = uniqueResults.slice(0, limitForAI);
    
    // Build context for LLM enhancement (each recipe stays separate in source data)
    let context = `${RECIPE_CHEF_JSON_INSTRUCTION}\n\nRetrieved recipes (use one JSON object per recipe in your output):\n`;
    for (const r of aiResults) {
      const formattedInstructions = formatInstructions(r.instructions);
      context += `
Recipe: ${r.title}
Ingredients: ${r.ingredients || "Not specified"}
Instructions: ${formattedInstructions.slice(0, 400)}${formattedInstructions.length > 400 ? "..." : ""}
Prep Time: ${r.prepTime || "Not specified"} minutes
Cook Time: ${r.cookTime || "Not specified"} minutes
Total Time: ${r.totalTime || "Not specified"} minutes
Cuisine: ${r.cuisine || "Not specified"}
Servings: ${r.yield || "Not specified"}
---
`;
    }

    // 3️⃣ Generate response from retrieved recipes
    void context;
    queryLog("🤖 Generating recipe response...");
    let reply: string;
    
    try {
      reply = generateIntelligentFallbackResponse(message, uniqueResults, requestedCount);
      queryLog("✅ Generated intelligent recipe response");
    } catch {
      queryLog("⚠️ Primary recipe response failed, using basic listing fallback...");
      // Final fallback: Return recipes directly without AI enhancement
      queryLog("⚠️ Using basic recipe listing fallback...");
      
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
        reply = responses[lowerMessage] || "Hello! I'm your AI chef assistant. How can I help you with recipes?";
        
        return NextResponse.json({ reply });
      }
    
      // Use the already-declared requestedCount and uniqueResults from outer scope
      // No need to redeclare them
    
      // Limit to requested number or default to 3
      const limit = requestedCount && requestedCount > 0 ? requestedCount : 3;
      const finalResults = uniqueResults.slice(0, limit);
      
      const intro = `I found ${finalResults.length} recipe${finalResults.length > 1 ? "s" : ""} matching your query:`;
      reply = formatRecipesJsonReply(intro, finalResults);
      
      return NextResponse.json({
        reply,
        sources: finalResults.map((r: any) => ({
          title: r.title,
          prepTime: r.prepTime,
          cookTime: r.cookTime,
          distance: r.distance
        })),
      });
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
    console.error("Error name:", error.name);
    console.error("Stack:", error.stack);
    
    // Provide more helpful error messages based on error type
    const errorMessage = error.message || String(error) || "Unknown error";
    const errorName = error.name || "";
    
    // Database connection errors
    if (errorMessage.includes("Can't reach database server") || 
        errorMessage.includes("Connection") ||
        errorMessage.includes("ECONNREFUSED") ||
        errorMessage.includes("P1001")) {
      return NextResponse.json({
        reply: "⚠️ Database connection error. Please check your DATABASE_URL environment variable and ensure your database is accessible."
      }, { status: 500 });
    }
    
    // Database table/relation errors
    if (errorMessage.includes("relation") || 
        errorMessage.includes("does not exist") ||
        errorMessage.includes("P2021") ||
        errorMessage.includes("P2001")) {
      return NextResponse.json({
        reply: "⚠️ Database tables not found. Please run database migrations:\n\n```bash\nnpx prisma migrate deploy\n```\n\nOr if developing locally:\n```bash\nnpx prisma migrate dev\n```"
      }, { status: 500 });
    }
    
    // Vector/pgvector errors
    if (errorMessage.includes("vector") || 
        errorMessage.includes("pgvector") ||
        errorMessage.includes("operator does not exist")) {
      return NextResponse.json({
        reply: "⚠️ Vector extension error. Please ensure pgvector extension is enabled in your PostgreSQL database:\n\n```sql\nCREATE EXTENSION IF NOT EXISTS vector;\n```"
      }, { status: 500 });
    }
    
    // Embedding model errors
    if (errorMessage.includes("Model not found") || 
        errorMessage.includes("trained model not found") ||
        errorMessage.includes("inference.py") ||
        errorMessage.includes("Python")) {
      return NextResponse.json({
        reply: "⚠️ Embedding model not available. The trained model files are required for generating embeddings. Please ensure the model is properly set up."
      }, { status: 500 });
    }
    
    // Rate limit errors
    if (error.status === 429 || 
        errorMessage.includes("429") ||
        errorMessage.includes("rate limit") ||
        errorMessage.includes("Resource exhausted")) {
      return NextResponse.json({
        reply: "⚠️ Rate limit reached. Please wait a moment and try again."
      }, { status: 429 });
    }
    
    // Prisma errors
    if (errorName.includes("Prisma") || errorMessage.includes("P")) {
      return NextResponse.json({
        reply: `⚠️ Database error: ${errorMessage}. Please check your database connection and schema.`
      }, { status: 500 });
    }
    
    // Generic error with more context
    return NextResponse.json(
      { 
        error: errorMessage,
        reply: `Sorry, I encountered an error: ${errorMessage}. Please try again or contact support if the issue persists.`
      },
      { status: 500 }
    );
  }
}