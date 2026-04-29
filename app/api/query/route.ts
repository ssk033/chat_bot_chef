import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateEmbedding } from "@/lib/embedding-model";

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

/**
 * Format ingredients from JSON arrays or plain text.
 */
function formatIngredients(ingredients: string | null | undefined): string {
  if (!ingredients) return "Not specified";

  try {
    const parsed = JSON.parse(ingredients);
    if (Array.isArray(parsed)) {
      return parsed
        .map((item) => String(item).trim())
        .filter(Boolean)
        .join(", ");
    }
  } catch {
    // fall back to plain text
  }

  return ingredients
    .replace(/^\[|\]$/g, "")
    .replace(/","/g, ", ")
    .replace(/"/g, "")
    .trim();
}

function sanitizePlainTextReply(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, "")
    .replace(/\*\*/g, "")
    .replace(/\[(.*?)\]/g, "$1")
    .replace(/"\s*,\s*"/g, ", ")
    .trim();
}

function extractSearchTerms(message: string): string[] {
  return message
    .toLowerCase()
    .split(/\s+/)
    .map((term) => term.trim())
    .filter(
      (term) =>
        term.length > 2 &&
        ![
          "the",
          "and",
          "for",
          "with",
          "from",
          "that",
          "this",
          "give",
          "me",
          "recipes",
          "recipe",
          "make",
          "cook",
          "please",
        ].includes(term)
    );
}

function lexicalRelevanceScore(recipe: any, searchTerms: string[]): number {
  if (searchTerms.length === 0) return 0;
  const title = String(recipe.title ?? "").toLowerCase();
  const ingredients = String(recipe.ingredients ?? "").toLowerCase();
  const instructions = String(recipe.instructions ?? "").toLowerCase();

  let score = 0;
  for (const term of searchTerms) {
    if (title.includes(term)) score += 8;
    if (ingredients.includes(term)) score += 12;
    if (instructions.includes(term)) score += 2;
  }
  return score;
}

const CASUAL_CHAT_REGEX =
  /^(hi|hello|hey|yo|sup|how are you|what's up|good morning|good afternoon|good evening|thanks|thank you|bye|goodbye|who are you|what are you|help|help me)$/i;

function isCasualConversation(message: string): boolean {
  return CASUAL_CHAT_REGEX.test(message.trim());
}

function normalizeSearchToken(token: string): string {
  const t = token.trim().toLowerCase();
  if (t === "biriyani") return "biryani";
  if (t === "mutton") return "lamb";
  return t;
}

const COMMON_INGREDIENT_HINTS = [
  "chicken", "egg", "eggs", "rice", "tomato", "onion", "potato", "garlic", "ginger",
  "paneer", "milk", "cheese", "butter", "yogurt", "curd", "spinach", "broccoli",
  "carrot", "beans", "peas", "corn", "mushroom", "capsicum", "bell pepper", "lettuce",
  "cucumber", "chili", "chilli", "coriander", "cilantro", "mint", "lemon", "lime",
  "beef", "mutton", "pork", "fish", "shrimp", "prawn", "tuna", "salmon", "oats",
  "flour", "pasta", "noodles", "bread", "lentils", "dal", "chickpea", "rajma"
];

function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i += 1) dp[i][0] = i;
  for (let j = 0; j <= n; j += 1) dp[0][j] = j;

  for (let i = 1; i <= m; i += 1) {
    for (let j = 1; j <= n; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }

  return dp[m][n];
}

function resolveIngredientToken(token: string): string {
  const normalized = token.trim().toLowerCase();
  if (!normalized) return normalized;
  if (COMMON_INGREDIENT_HINTS.includes(normalized)) return normalized;

  let bestMatch = normalized;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const candidate of COMMON_INGREDIENT_HINTS) {
    const dist = levenshteinDistance(normalized, candidate);
    if (dist < bestDistance) {
      bestDistance = dist;
      bestMatch = candidate;
    }
  }

  // Keep original token if not close enough to avoid bad corrections.
  return bestDistance <= 2 ? bestMatch : normalized;
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
  
  let reply = "";
  
  if (finalResults.length === 0) {
    return `I couldn't find any recipes matching "${message}". Try being more specific or using ingredient names.`;
  }
  
  // Build contextual response
  if (isAskingForIngredients && finalResults[0].ingredients) {
    reply = `Here are the ingredients for ${finalResults[0].title}:\n\n`;
    reply += `${formatIngredients(finalResults[0].ingredients)}\n\n`;
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
    const formattedInstructions = formatInstructions(finalResults[0].instructions);
    reply += `${formattedInstructions.slice(0, 500)}${formattedInstructions.length > 500 ? '...' : ''}\n\n`;
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
        const ingredients = formatIngredients(r.ingredients).slice(0, 150);
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

    console.log("📝 User query:", message);

    // Check if database has recipes
    const recipeCount = await prisma.recipe.count();
    const embeddingCount = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM "embeddings"`) as any[];
    const embeddingCountNum = Number(embeddingCount[0]?.count ?? 0);
    
    console.log("📊 Total recipes in database:", recipeCount);
    console.log("📊 Total embeddings in database:", embeddingCountNum);

    if (recipeCount === 0) {
      return NextResponse.json({
        reply: "I don't have any recipes in my database yet. Please run the load script to import recipes first:\n\n```bash\nnpm run load\n```\n\nOr if you're using the TypeScript script:\n```bash\nnpx ts-node scripts/load.ts\n```"
      });
    }

    // Note: We'll use text search if embeddings are not available
    if (embeddingCountNum === 0) {
      console.log("⚠️ No embeddings found, will use text-based search");
    }

    const mealPlanMatch = message.match(/generate a meal plan with ingredients:\s*([^\.]+)/i);
    const mealPlanIngredients = mealPlanMatch
      ? mealPlanMatch[1]
          .split(",")
          .map((s) => resolveIngredientToken(s))
          .filter(Boolean)
      : [];

    // 1️⃣ Try to create embedding for user query (optional - will use text search if fails)
    console.log("🔄 Attempting to generate embedding for query...");
    let qEmbedding: number[] | null = null;
    let qLiteral: string | null = null;
    let useVectorSearch = false;
    
    if (mealPlanIngredients.length === 0) {
      try {
        qEmbedding = await generateEmbedding(message);
        qLiteral = `[${qEmbedding.join(",")}]`;
        useVectorSearch = true;
        console.log("✅ Embedding generated successfully (dimension:", qEmbedding.length, ")");
      } catch (embedError: any) {
        console.warn("⚠️ Embedding generation failed, will use text search instead:", embedError.message);
        // Don't return error - continue with text search fallback
        useVectorSearch = false;
      }
    } else {
      console.log("🍽️ Meal-plan request detected, using ingredient-priority search");
      useVectorSearch = false;
    }

    // 2️⃣ Search for recipes - try vector search first, fallback to text search
    console.log("🔍 Searching for similar recipes...");
    let results: any[] = [];
    
    if (useVectorSearch && qLiteral) {
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
        console.log("✅ Found", results.length, "recipes using vector search");
      } catch (searchError: any) {
        console.warn("⚠️ Vector search failed, falling back to text search:", searchError.message);
        useVectorSearch = false; // Fall through to text search
      }
    }
    
    // If vector search didn't work or wasn't attempted, use text search
    if (!useVectorSearch || results.length === 0) {
      console.log("🔄 Using text-based search...");
      try {
        // Extract meaningful search terms from query
        const searchTerms = mealPlanIngredients.length > 0 ? mealPlanIngredients : extractSearchTerms(message);
        
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
          
          const textResults = await prisma.recipe.findMany({
            where: whereClause,
            take: 10, // Get more results to filter better
            orderBy: [
              // Prioritize recipes with matching ingredients
              { ingredients: 'asc' }
            ]
          });
          
          // Filter and sort results by relevance
          const scoredResults = textResults.map((r: any) => {
            const score = lexicalRelevanceScore(r, searchTerms);
            return { ...r, distance: 1 - (score / 100), relevanceScore: score };
          });
          
          // Sort by relevance and take top 5
          results = scoredResults
            .sort((a: any, b: any) => (b.relevanceScore || 0) - (a.relevanceScore || 0))
            .slice(0, 5)
            .map((item: { relevanceScore: number; [key: string]: unknown }) => {
              const { relevanceScore, ...rest } = item;
              void relevanceScore;
              return { ...rest, distance: rest.distance as number };
            });
          
          console.log("✅ Found", results.length, "recipes using text search");
        } else {
          // If no search terms, get random recipes
          results = await prisma.recipe.findMany({
            take: 5,
            orderBy: { id: 'asc' }
          });
          results = results.map((r: any) => ({ ...r, distance: 0.5 }));
          console.log("✅ No specific search terms, returning sample recipes");
        }
      } catch (fallbackError: any) {
        console.error("❌ Text search also failed:", fallbackError);
        return NextResponse.json({
          reply: "I encountered an error searching for recipes. The database might not be properly configured. Please check:\n1. Database connection is working\n2. Recipes are loaded"
        }, { status: 500 });
      }
    }

    // Re-rank vector hits with lexical relevance and reject noisy matches.
    const searchTerms: string[] = (
      mealPlanIngredients.length > 0 ? mealPlanIngredients : extractSearchTerms(message)
    ).map(normalizeSearchToken);
    if (results.length > 0 && searchTerms.length > 0) {
      const rescored = results
        .map((r: any) => ({
          ...r,
          relevanceScore: lexicalRelevanceScore(r, searchTerms),
        }))
        .sort((a: any, b: any) => {
          if ((b.relevanceScore ?? 0) !== (a.relevanceScore ?? 0)) {
            return (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0);
          }
          return (a.distance ?? 1) - (b.distance ?? 1);
        });

      const bestScore = rescored[0]?.relevanceScore ?? 0;
      if (bestScore > 0) {
        results = rescored.slice(0, 5);
      } else {
        // No lexical signal at all: avoid showing random vector neighbors.
        results = [];
      }
    }

    // Recovery query: broad lexical lookup when vector + strict rerank returns nothing.
    if (results.length === 0 && searchTerms.length > 0) {
      const broadTerms: string[] = Array.from(
        new Set(
          searchTerms.flatMap((term: string) =>
            term === "lamb"
              ? ["lamb", "mutton", "goat"]
              : term === "biryani"
                ? ["biryani", "biriyani"]
                : [term]
          )
        )
      );

      const broadMatches = await prisma.recipe.findMany({
        where: {
          OR: broadTerms.flatMap((term) => [
            { title: { contains: term, mode: "insensitive" as const } },
            { ingredients: { contains: term, mode: "insensitive" as const } },
          ]),
        },
        take: 30,
      });

      results = broadMatches
        .map((r: any) => ({ ...r, relevanceScore: lexicalRelevanceScore(r, broadTerms), distance: 0.8 }))
        .filter((r: any) => (r.relevanceScore ?? 0) > 0)
        .sort((a: any, b: any) => (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0))
        .slice(0, 5);
    }

    console.log("✅ Found", results.length, "matching recipes");

    // Check if this is a general question (not recipe-related)
    // Only treat as general if it's clearly a greeting/small talk AND no recipes found
    const isGeneralQuestion = results.length === 0 && (
      /^(hi|hello|hey|how are you|what's up|how do you do|good morning|good afternoon|good evening|thanks|thank you|bye|goodbye|who are you|what are you|help|help me)$/i.test(message.trim()) ||
      (message.trim().length < 10 && !message.toLowerCase().match(/\b(recipe|ingredient|food|dish|cook|bake|make|prepare|cuisine|meal|breakfast|lunch|dinner|snack|dessert|appetizer|chicken|beef|pork|fish|vegetable|pasta|rice|bread|soup|salad|pizza|burger|sandwich|cake|cookie|pie|sauce|spice|herb|flavor|taste|kitchen|cooking|baking|grill|fry|boil|steam|roast)\b/i))
    );

    // If it's a general question, skip recipe search and go directly to LLM
    if (isGeneralQuestion && results.length === 0) {
      console.log("💬 Detected general question, skipping recipe search");
      
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
      const formattedInstructions = formatInstructions(r.instructions);
      context += `
Recipe: ${r.title}
Ingredients: ${r.ingredients || "Not specified"}
Instructions: ${formattedInstructions.slice(0, 400)}${formattedInstructions.length > 400 ? '...' : ''}
Prep Time: ${r.prepTime || "Not specified"} minutes
Cook Time: ${r.cookTime || "Not specified"} minutes
Total Time: ${r.totalTime || "Not specified"} minutes
Cuisine: ${r.cuisine || "Not specified"}
---
`;
    }

    // 3️⃣ Generate response from retrieved recipes
    void context;
    console.log("🤖 Generating recipe response...");
    let reply: string;
    
    try {
      reply = generateIntelligentFallbackResponse(message, uniqueResults, requestedCount);
      reply = sanitizePlainTextReply(reply);
      console.log("✅ Generated intelligent recipe response");
    } catch {
      console.log("⚠️ Primary recipe response failed, using basic listing fallback...");
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
        reply = responses[lowerMessage] || "Hello! I'm your AI chef assistant. How can I help you with recipes?";
        
        return NextResponse.json({ reply });
      }
    
      // Use the already-declared requestedCount and uniqueResults from outer scope
      // No need to redeclare them
    
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
          const ingredients = formatIngredients(r.ingredients).slice(0, 200);
          reply += `Ingredients: ${ingredients}${r.ingredients.length > 200 ? '...' : ''}\n`;
        }
        
        if (r.instructions) {
          const formattedInstructions = formatInstructions(r.instructions);
          const instructions = formattedInstructions.slice(0, 250).replace(/\n/g, ' ');
          reply += `Instructions: ${instructions}${formattedInstructions.length > 250 ? '...' : ''}\n`;
        }
        
        reply += `\n`;
      });
      
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