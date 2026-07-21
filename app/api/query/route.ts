import { NextResponse } from "next/server";
import { invokeChefCursorFallback } from "@/lib/chef-fallback";
import { assessRetrievalConfidence, isGeneralCookingKnowledgeQuestion } from "@/lib/chef-retrieval-confidence";
import { loadChefSessionContext, normalizeClientHistory } from "@/lib/chef-session-context";
import { getAnonymousKeyFromRequest } from "@/lib/chef-auth";
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
  type RankedRecipe,
} from "@/lib/query-constraints";
import {
  httpRequestCounter,
  requestDuration,
} from "@/lib/prometheus";

export const runtime = "nodejs";

const isQueryDebug =
  process.env.NODE_ENV === "development" || process.env.RECIPE_SEARCH_DEBUG === "1";

function queryLog(...args: unknown[]) {
  if (isQueryDebug) console.log(...args);
}

const CASUAL_CHAT_REGEX =
  /^(hi|hello|hey|yo|sup|how are you|what's up|good morning|good afternoon|good evening|thanks|thank you|bye|goodbye|who are you|what are you|help|help me)$/i;

function isCasualConversation(message: string): boolean {
  return CASUAL_CHAT_REGEX.test(message.trim());
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
): { results: any[]; ranked: RankedRecipe[] } {
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

  return { results: validated.slice(0, 5), ranked };
}

type QueryRequestBody = {
  message?: string;
  sessionId?: number;
  chatHistory?: { role: string; content: string }[];
  dietaryPreferences?: string;
  mealPlanContext?: Record<string, string>;
};

async function resolveChefReplyWithFallback(args: {
  message: string;
  constraints: QueryConstraints;
  uniqueResults: any[];
  rankedResults: RankedRecipe[];
  recipeCount: number;
  sessionContext: Awaited<ReturnType<typeof loadChefSessionContext>>;
  mealPlanContext?: Record<string, string>;
  requestedCount: number | null;
  assessmentReasons: string[];
  forceCursor?: boolean;
}): Promise<{ reply: string; source: "database" | "cursor" | "static" }> {
  const assessment = assessRetrievalConfidence({
    message: args.message,
    constraints: args.constraints,
    rankedResults: args.rankedResults,
    uniqueCount: args.uniqueResults.length,
  });

  const reasons = [...new Set([...args.assessmentReasons, ...assessment.reasons])];
  const useCursor = args.forceCursor || assessment.useCursorFallback;

  if (!useCursor && args.uniqueResults.length > 0) {
    const reply = generateIntelligentFallbackResponse(
      args.message,
      args.uniqueResults,
      args.requestedCount
    );
    return { reply, source: "database" };
  }

  queryLog("🧠 Cursor Chef fallback", reasons.join(", ") || "triggered");

  const cursorOutcome = await invokeChefCursorFallback({
    userQuery: args.message,
    chatHistory: args.sessionContext.history,
    dietaryPreferences: args.sessionContext.dietaryPreferences,
    sessionTitle: args.sessionContext.sessionTitle,
    mealPlanContext: args.mealPlanContext,
    constraints: args.constraints,
    retrievedRecipes: args.uniqueResults.map((r) => ({
      title: String(r.title ?? "Untitled"),
      ingredients: r.ingredients,
      instructions: r.instructions,
      prepTime: r.prepTime,
      cookTime: r.cookTime,
      cuisine: r.cuisine,
      yield: r.yield,
      distance: r.distance,
      finalScore: r.finalScore,
    })),
    fallbackReasons: reasons,
    databaseRecipeCount: args.recipeCount,
  });

  return {
    reply: cursorOutcome.reply,
    source: cursorOutcome.cursorUsed ? "cursor" : "static",
  };
}

function dedupeRecipesById(recipes: any[]): any[] {
  const seen = new Set<string | number>();
  return recipes.filter((r) => {
    const id = r.id;
    if (id == null) return true;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function shouldPreferTextSearch(message: string, constraints: QueryConstraints): boolean {
  if (constraints.requiredIngredients.length > 0) return true;
  if (/ingredients\s*\/?\s*pantry\s*on\s*hand\s*:/i.test(message)) return true;
  const terms = getSearchTermsForRanking(constraints, message);
  if (terms.length === 0) return false;
  return !message.includes("\n") && message.trim().length <= 220;
}

async function searchRecipesByText(message: string, constraints: QueryConstraints): Promise<any[]> {
  const searchTerms =
    constraints.requiredIngredients.length > 0
      ? constraints.requiredIngredients
      : getSearchTermsForRanking(constraints, message);

  const prepTimeMatch = message.match(/(\d+)\s*(?:min|minute|mins)\s*(?:prep|preparation)/i);
  const maxPrepTime = prepTimeMatch ? parseInt(prepTimeMatch[1], 10) : null;

  if (searchTerms.length === 0) {
    const sample = await withPrismaReconnect(() =>
      prisma.recipe.findMany({ take: 5, orderBy: { id: "asc" } })
    );
    return sample.map((r) => ({ ...r, distance: 0.5 }));
  }

  const whereClause: any = {
    OR: [
      ...searchTerms.map((term: string) => ({
        ingredients: { contains: term, mode: "insensitive" as const },
      })),
      ...searchTerms.map((term: string) => ({
        title: { contains: term, mode: "insensitive" as const },
      })),
      ...searchTerms.map((term: string) => ({
        instructions: { contains: term, mode: "insensitive" as const },
      })),
    ],
  };

  if (maxPrepTime !== null) {
    whereClause.prepTime = { lte: maxPrepTime };
  }

  const textResults = await withPrismaReconnect(() =>
    prisma.recipe.findMany({
      where: whereClause,
      take: 25,
    })
  );

  return textResults.map((r) => ({ ...r, distance: 0.35 }));
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
  const end = requestDuration.startTimer({
    method: "POST",
    route: "/api/query",
  });
  try {
    const body = (await req.json()) as QueryRequestBody;
    const message = body.message?.trim();

    if (!message) {
      return NextResponse.json({ error: "Message required" }, { status: 400 });
    }

    const anonymousKey = getAnonymousKeyFromRequest(req);
    const sessionId =
      typeof body.sessionId === "number" && Number.isFinite(body.sessionId)
        ? body.sessionId
        : undefined;
    const clientHistory = normalizeClientHistory(body.chatHistory);
    const sessionContext = await loadChefSessionContext({
      sessionId,
      anonymousKey,
      clientHistory,
      dietaryPreferences: body.dietaryPreferences,
    });
    const mealPlanContext = body.mealPlanContext;

    // Handle model status check
    if (message === '__check_model__') {
      const { isModelAvailable } = await import('@/lib/embedding-model');
      httpRequestCounter.inc({
        method: "POST",
        route: "/api/query",
        status: "200",
      });
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
      httpRequestCounter.inc({
        method: "POST",
        route: "/api/query",
        status: "200",
      });
      return NextResponse.json({ reply: responses[key] ?? "Hey! Tell me what dish you want and I will find recipes for it." });
    }

    queryLog("📝 User query:", message);

    const recipeCount = await withPrismaReconnect(() => prisma.recipe.count());
    if (recipeCount === 0) {
      queryLog("📭 Empty recipe database — using Cursor Chef");
      const { reply, source } = await resolveChefReplyWithFallback({
        message,
        constraints: parseQueryConstraints(message),
        uniqueResults: [],
        rankedResults: [],
        recipeCount: 0,
        sessionContext,
        mealPlanContext,
        requestedCount: null,
        assessmentReasons: ["empty_database"],
        forceCursor: true,
      });
      httpRequestCounter.inc({
        method: "POST",
        route: "/api/query",
        status: "200",
      });
      return NextResponse.json({ reply, source });
    }

    const mealPlanMatch = message.match(/generate a meal plan with ingredients:\s*([^\.]+)/i);
    const mealPlanIngredients = mealPlanMatch
      ? mealPlanMatch[1]
          .split(/[,/&]|\band\b/i)
          .map((s) => resolveIngredientToken(s))
          .filter(Boolean)
      : [];

    const constraints = mergeMealPlanConstraints(parseQueryConstraints(message), mealPlanIngredients);
    const preferTextSearch =
      mealPlanIngredients.length > 0 || shouldPreferTextSearch(message, constraints);

    queryLog("🔍 Searching for recipes...", preferTextSearch ? "(text-first)" : "(vector)");
    let results: any[] = [];

    try {
      if (preferTextSearch) {
        results = await searchRecipesByText(message, constraints);
        queryLog("✅ Found", results.length, "recipes using text search");
      } else {
        let qLiteral: string | null = null;
        try {
          const qEmbedding = await generateEmbedding(message);
          qLiteral = `[${qEmbedding.join(",")}]`;
          queryLog("✅ Embedding generated (dimension:", qEmbedding.length, ")");
        } catch (embedError: any) {
          console.warn("⚠️ Embedding failed, using text search:", embedError.message);
        }

        if (qLiteral) {
          try {
            const sanitizedLiteral = qLiteral.replace(/'/g, "''");
            results = (await withPrismaReconnect(() =>
              prisma.$queryRawUnsafe(`
          SELECT r.*, e.vector <-> '${sanitizedLiteral}'::vector AS distance
          FROM "embeddings" e
          JOIN "Recipe" r ON e."recipeId" = r.id
          ORDER BY e.vector <-> '${sanitizedLiteral}'::vector
          LIMIT 25;
        `)
            )) as any[];
            queryLog("✅ Found", results.length, "recipes using vector search");
          } catch (searchError: any) {
            console.warn("⚠️ Vector search failed, falling back to text search:", searchError.message);
          }
        }

        if (results.length === 0) {
          results = await searchRecipesByText(message, constraints);
          queryLog("✅ Found", results.length, "recipes using text search fallback");
        }
      }
    } catch (searchError: any) {
      console.error("❌ Recipe search failed:", searchError);
      return NextResponse.json(
        {
          reply:
            "I encountered an error searching for recipes. The database might not be properly configured. Please check:\n1. Database connection is working\n2. Recipes are loaded",
        },
        { status: 500 }
      );
    }

    results = dedupeRecipesById(results);

    const hasActiveConstraints =
      constraints.dietary.length > 0 ||
      constraints.requiredIngredients.length > 0 ||
      constraints.excludedIngredients.length > 0;

    let rankedResults: RankedRecipe[] = [];
    if (results.length > 0) {
      const piped = applyConstraintPipeline(message, constraints, results);
      results = piped.results;
      rankedResults = piped.ranked;
    }

    queryLog("✅ Found", results.length, "matching recipes after constraints");

    // Check if this is a general question (not recipe-related)
    // Only treat as general if it's clearly a greeting/small talk AND no recipes found
    const isGeneralQuestion = results.length === 0 && (
      /^(hi|hello|hey|how are you|what's up|how do you do|good morning|good afternoon|good evening|thanks|thank you|bye|goodbye|who are you|what are you|help|help me)$/i.test(message.trim()) ||
      (message.trim().length < 10 && !message.toLowerCase().match(/\b(recipe|ingredient|food|dish|cook|bake|make|prepare|cuisine|meal|breakfast|lunch|dinner|snack|dessert|appetizer|chicken|beef|pork|fish|vegetable|pasta|rice|bread|soup|salad|pizza|burger|sandwich|cake|cookie|pie|sauce|spice|herb|flavor|taste|kitchen|cooking|baking|grill|fry|boil|steam|roast)\b/i))
    );

    if (isGeneralQuestion && results.length === 0 && !isGeneralCookingKnowledgeQuestion(message)) {
      queryLog("💬 Casual greeting");
      const greetings = ["Hello!", "Hi there!", "Hey!", "Greetings!"];
      const responses: { [key: string]: string } = {
        hi: "Hello! I'm Chef — ask for a dish, ingredients you have, or nutrition tips.",
        hello: "Hi! Tell me what you'd like to cook or what's in your pantry.",
        "how are you": "Doing great and ready to cook with you. What should we make?",
        thanks: "Anytime! Want another recipe or meal idea?",
        "thank you": "You're welcome. Happy cooking!",
        bye: "Bye! Come back when you're hungry.",
        goodbye: "See you soon!",
        help: "I can find recipes, plan meals, estimate nutrition, and suggest dishes from your ingredients.",
      };
      const lowerMessage = message.toLowerCase().trim();
      const reply =
        responses[lowerMessage] ||
        `${greetings[Math.floor(Math.random() * greetings.length)]} I'm Chef — what would you like to make?`;
      httpRequestCounter.inc({
        method: "POST",
        route: "/api/query",
        status: "200",
      });
      return NextResponse.json({ reply, source: "static" });
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
    
    const extraReasons: string[] = [];
    if (uniqueResults.length === 0 && hasActiveConstraints) {
      extraReasons.push("constraint_no_match");
    }

    queryLog("🤖 Resolving Chef response (database → confidence → Cursor)...");
    const { reply, source } = await resolveChefReplyWithFallback({
      message,
      constraints,
      uniqueResults,
      rankedResults,
      recipeCount,
      sessionContext,
      mealPlanContext,
      requestedCount,
      assessmentReasons: extraReasons,
      forceCursor: uniqueResults.length === 0,
    });

    queryLog("✅ Chef response via", source);

    httpRequestCounter.inc({
      method: "POST",
      route: "/api/query",
      status: "200",
    });
    return NextResponse.json({
      reply,
      source,
      sources: uniqueResults.map((r: any) => ({
        title: r.title,
        prepTime: r.prepTime,
        cookTime: r.cookTime,
        distance: r.distance,
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
      httpRequestCounter.inc({
        method: "POST",
        route: "/api/query",
        status: "500",
      });
      return NextResponse.json({
        reply: "⚠️ Database connection error. Please check your DATABASE_URL environment variable and ensure your database is accessible."
      }, { status: 500 });
    }
    
    // Database table/relation errors
    if (errorMessage.includes("relation") || 
        errorMessage.includes("does not exist") ||
        errorMessage.includes("P2021") ||
        errorMessage.includes("P2001")) {
      httpRequestCounter.inc({
        method: "POST",
        route: "/api/query",
        status: "500",
      });
      return NextResponse.json({
        reply: "⚠️ Database tables not found. Please run database migrations:\n\n```bash\nnpx prisma migrate deploy\n```\n\nOr if developing locally:\n```bash\nnpx prisma migrate dev\n```"
      }, { status: 500 });
    }
    
    // Vector/pgvector errors
    if (errorMessage.includes("vector") || 
        errorMessage.includes("pgvector") ||
        errorMessage.includes("operator does not exist")) {
      httpRequestCounter.inc({
        method: "POST",
        route: "/api/query",
        status: "500",
      });
      return NextResponse.json({
        reply: "⚠️ Vector extension error. Please ensure pgvector extension is enabled in your PostgreSQL database:\n\n```sql\nCREATE EXTENSION IF NOT EXISTS vector;\n```"
      }, { status: 500 });
    }
    
    // Embedding model errors
    if (errorMessage.includes("Model not found") || 
        errorMessage.includes("trained model not found") ||
        errorMessage.includes("inference.py") ||
        errorMessage.includes("Python")) {
      httpRequestCounter.inc({
        method: "POST",
        route: "/api/query",
        status: "500",
      });
      return NextResponse.json({
        reply: "⚠️ Embedding model not available. The trained model files are required for generating embeddings. Please ensure the model is properly set up."
      }, { status: 500 });
    }
    
    // Rate limit errors
    if (error.status === 429 || 
        errorMessage.includes("429") ||
        errorMessage.includes("rate limit") ||
        errorMessage.includes("Resource exhausted")) {
      httpRequestCounter.inc({
        method: "POST",
        route: "/api/query",
        status: "500",
      });
      return NextResponse.json({
        reply: "⚠️ Rate limit reached. Please wait a moment and try again."
      }, { status: 429 });
    }
    
    // Prisma errors
    if (errorName.includes("Prisma") || errorMessage.includes("P")) {
      httpRequestCounter.inc({
        method: "POST",
        route: "/api/query",
        status: "500",
      });
      return NextResponse.json({
        reply: `⚠️ Database error: ${errorMessage}. Please check your database connection and schema.`
      }, { status: 500 });
    }
    
    // Generic error with more context
    httpRequestCounter.inc({
      method: "POST",
      route: "/api/query",
      status: "500",
    });
    return NextResponse.json(
      { 
        error: errorMessage,
        reply: `Sorry, I encountered an error: ${errorMessage}. Please try again or contact support if the issue persists.`
      },
      { status: 500 }
    );
  } finally {
    end();
  }
}