/**
 * Custom embedding model for recipe similarity.
 * Uses local Python inference for development, falls back to Hugging Face API for production (Vercel).
 */

import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

/** Prevent Turbopack from tracing the entire repo via open-ended `process.cwd()` joins (NFT warning). */
function rootJoin(...segments: string[]): string {
  return path.join(/* turbopackIgnore: true */ process.cwd(), ...segments);
}

const INFERENCE_SCRIPT = rootJoin('scripts', 'inference.py');

const MODEL_DIR_CANDIDATES = [
  rootJoin('models', 'recipe-embedder'),
  rootJoin('RecipeModel', 'models', 'recipe-embedder'),
];

function resolveModelDir(): string | null {
  for (const candidate of MODEL_DIR_CANDIDATES) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

// Hugging Face Inference API endpoints (free, no API key needed for public models)
// Using multiple models as fallback options
const HUGGINGFACE_MODELS = [
  'sentence-transformers/all-MiniLM-L6-v2', // 384 dims
  'sentence-transformers/paraphrase-MiniLM-L6-v2', // 384 dims
];

const EMBEDDING_CACHE_TTL_MS = 5 * 60 * 1000;
const EMBEDDING_CACHE_MAX_ITEMS = 300;
const HF_TIMEOUT_MS = 3500;
const PYTHON_TIMEOUT_MS = 8000;

const embeddingCache = new Map<string, { value: number[]; expiresAt: number }>();
const inFlightEmbeddings = new Map<string, Promise<number[]>>();

function getHuggingFaceUrl(model: string): string {
  return `https://api-inference.huggingface.co/pipeline/feature-extraction/${model}`;
}

/**
 * Check if the custom local model is available.
 */
export function isModelAvailable(): boolean {
  // On Vercel, always return false to use cloud API
  if (process.env.VERCEL === '1' || process.env.NEXT_PUBLIC_VERCEL === '1') {
    return false;
  }
  return resolveModelDir() !== null && fs.existsSync(INFERENCE_SCRIPT);
}

/**
 * Generate embedding using Hugging Face Inference API (works on Vercel)
 * Tries multiple models as fallback
 */
async function generateEmbeddingWithHuggingFace(text: string): Promise<number[]> {
  let lastError: Error | null = null;
  
  // Try each model in order
  for (const model of HUGGINGFACE_MODELS) {
    try {
      const apiUrl = getHuggingFaceUrl(model);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), HF_TIMEOUT_MS);
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ inputs: text }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        // If model is loading (503), wait and retry once
        if (response.status === 503) {
          await new Promise(resolve => setTimeout(resolve, 500));
          
          const retryController = new AbortController();
          const retryTimeoutId = setTimeout(() => retryController.abort(), HF_TIMEOUT_MS);
          const retryResponse = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ inputs: text }),
            signal: retryController.signal,
          });
          clearTimeout(retryTimeoutId);
          
          if (!retryResponse.ok) {
            // If still failing, try next model
            lastError = new Error(`Model ${model} error: ${retryResponse.statusText}`);
            continue;
          }
          
          const retryData = await retryResponse.json();
          const embedding = Array.isArray(retryData) ? retryData[0] : retryData;
          
          // Normalize to 384 dimensions if needed (for compatibility with database)
          if (Array.isArray(embedding) && embedding.length > 0) {
            // If embedding is 768 dims, we can truncate or use as-is
            // Database should handle different dimensions, but let's keep it flexible
            return embedding;
          }
          
          return embedding;
        }
        
        // For other errors (like 410 Gone), try next model
        if (response.status === 410 || response.status >= 500) {
          lastError = new Error(`Model ${model} unavailable: ${response.statusText}`);
          continue;
        }
        
        // For 4xx errors (except 410), throw immediately
        throw new Error(`Hugging Face API error: ${response.statusText}`);
      }

      const data = await response.json();
      if (data?.error) {
        throw new Error(`Hugging Face API error: ${String(data.error)}`);
      }
      
      // Handle different response formats
      let embedding: number[];
      if (Array.isArray(data)) {
        // If array of arrays, take first
        embedding = Array.isArray(data[0]) ? data[0] : data;
      } else if (data.embeddings) {
        embedding = Array.isArray(data.embeddings[0]) ? data.embeddings[0] : data.embeddings;
      } else {
        embedding = data;
      }
      
      if (!Array.isArray(embedding) || embedding.length === 0) {
        throw new Error('Invalid embedding format received');
      }
      
      if (process.env.NODE_ENV === "development") {
        console.log(`[embedding] OK ${model} (${embedding.length} dims)`);
      }
      return embedding;
      
    } catch (error: any) {
      lastError = error;
      if (process.env.NODE_ENV === "development") {
        console.warn(`[embedding] ${model} failed:`, error.message);
      }
      // Continue to next model
      continue;
    }
  }
  
  // All models failed
  throw new Error(
    `All Hugging Face models failed. Last error: ${lastError?.message || 'Unknown error'}. ` +
    `Please ensure you have internet connectivity and Hugging Face API is accessible.`
  );
}

/**
 * Generate embedding using local Python model (for development)
 */
async function generateEmbeddingLocal(text: string): Promise<number[]> {
  return new Promise((resolve, reject) => {
    const pythonCommand = process.platform === 'win32' ? 'python' : 'python3';
    const python = spawn(pythonCommand, [INFERENCE_SCRIPT, text], {
      env: {
        ...process.env,
        RECIPE_MODEL_DIR: resolveModelDir() ?? "",
      },
    });

    let stdout = '';
    let stderr = '';
    const timeoutId = setTimeout(() => {
      python.kill();
      reject(new Error("Python inference timed out"));
    }, PYTHON_TIMEOUT_MS);

    python.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    python.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    python.on('close', (code) => {
      clearTimeout(timeoutId);
      if (code !== 0) {
        reject(new Error(`Python inference failed: ${stderr || 'Unknown error'}`));
        return;
      }

      try {
        const result = JSON.parse(stdout.trim());
        if (result.error) {
          reject(new Error(result.error));
          return;
        }
        resolve(result.embedding);
      } catch (error: any) {
        reject(new Error(`Failed to parse embedding result: ${error.message}`));
      }
    });

    python.on('error', (error) => {
      clearTimeout(timeoutId);
      reject(new Error(`Failed to start Python process: ${error.message}`));
    });
  });
}

function normalizeEmbeddingText(text: string): string {
  return text.toLowerCase().trim().replace(/\s+/g, " ").slice(0, 800);
}

function getCachedEmbedding(cacheKey: string): number[] | null {
  const entry = embeddingCache.get(cacheKey);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    embeddingCache.delete(cacheKey);
    return null;
  }
  return entry.value;
}

function setCachedEmbedding(cacheKey: string, value: number[]) {
  embeddingCache.set(cacheKey, { value, expiresAt: Date.now() + EMBEDDING_CACHE_TTL_MS });
  if (embeddingCache.size <= EMBEDDING_CACHE_MAX_ITEMS) return;
  const firstKey = embeddingCache.keys().next().value as string | undefined;
  if (firstKey) embeddingCache.delete(firstKey);
}

/**
 * Generate embedding for a given text.
 * Tries local model first, falls back to Hugging Face API (for Vercel).
 * @param text - The text to embed
 * @returns Embedding vector as an array of numbers
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const cacheKey = normalizeEmbeddingText(text);
  const cached = getCachedEmbedding(cacheKey);
  if (cached) {
    return cached;
  }

  const inFlight = inFlightEmbeddings.get(cacheKey);
  if (inFlight) {
    return inFlight;
  }

  const run = (async () => {
  // Try local model first (for development)
    if (isModelAvailable()) {
      try {
        const embedding = await generateEmbeddingLocal(text);
        setCachedEmbedding(cacheKey, embedding);
        return embedding;
      } catch (error: any) {
        if (process.env.NODE_ENV === "development") {
          console.warn("[embedding] Local model failed, using HF API:", error.message);
        }
      }
    }

    const embedding = await generateEmbeddingWithHuggingFace(text);
    setCachedEmbedding(cacheKey, embedding);
    return embedding;
  })();

  inFlightEmbeddings.set(cacheKey, run);
  try {
    return await run;
  } finally {
    inFlightEmbeddings.delete(cacheKey);
  }
}

/**
 * Generate embeddings for multiple texts (batch processing).
 * @param texts - Array of texts to embed
 * @returns Array of embedding vectors
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const embeddings = await Promise.all(
    texts.map(text => generateEmbedding(text))
  );
  return embeddings;
}

/**
 * Get model information.
 */
export function getModelInfo(): { path: string; available: boolean } {
  const resolvedModel = resolveModelDir();
  return {
    path: resolvedModel ?? MODEL_DIR_CANDIDATES[0],
    available: resolvedModel !== null && isModelAvailable(),
  };
}

