/**
 * Custom embedding model for recipe similarity.
 * Uses local Python inference for development, falls back to Hugging Face API for production (Vercel).
 */

import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

const MODEL_DIR = path.join(process.cwd(), 'models', 'recipe-embedder');
const INFERENCE_SCRIPT = path.join(process.cwd(), 'scripts', 'inference.py');

// Hugging Face Inference API endpoints (free, no API key needed for public models)
// Using multiple models as fallback options
const HUGGINGFACE_MODELS = [
  'sentence-transformers/all-MiniLM-L6-v2', // 384 dims
  'sentence-transformers/all-mpnet-base-v2', // 768 dims (more accurate)
  'sentence-transformers/paraphrase-MiniLM-L6-v2', // 384 dims
];

function getHuggingFaceUrl(model: string): string {
  return `https://api-inference.huggingface.co/models/${model}`;
}

/**
 * Check if the custom local model is available.
 */
export function isModelAvailable(): boolean {
  // On Vercel, always return false to use cloud API
  if (process.env.VERCEL === '1' || process.env.NEXT_PUBLIC_VERCEL === '1') {
    return false;
  }
  return fs.existsSync(MODEL_DIR) && fs.existsSync(INFERENCE_SCRIPT);
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
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ inputs: text }),
      });

      if (!response.ok) {
        // If model is loading (503), wait and retry once
        if (response.status === 503) {
          console.log(`Model ${model} is loading, waiting 5 seconds...`);
          await new Promise(resolve => setTimeout(resolve, 5000));
          
          const retryResponse = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ inputs: text }),
          });
          
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
      
      console.log(`✅ Successfully used model: ${model} (${embedding.length} dimensions)`);
      return embedding;
      
    } catch (error: any) {
      lastError = error;
      console.warn(`Model ${model} failed:`, error.message);
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
    const python = spawn('python3', [INFERENCE_SCRIPT, text]);

    let stdout = '';
    let stderr = '';

    python.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    python.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    python.on('close', (code) => {
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
      reject(new Error(`Failed to start Python process: ${error.message}`));
    });
  });
}

/**
 * Generate embedding for a given text.
 * Tries local model first, falls back to Hugging Face API (for Vercel).
 * @param text - The text to embed
 * @returns Embedding vector as an array of numbers
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  // Try local model first (for development)
  if (isModelAvailable()) {
    try {
      return await generateEmbeddingLocal(text);
    } catch (error: any) {
      console.warn('Local model failed, falling back to Hugging Face API:', error.message);
      // Fall through to use Hugging Face API
    }
  }

  // Use Hugging Face API (works on Vercel and as fallback)
  return await generateEmbeddingWithHuggingFace(text);
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
  return {
    path: MODEL_DIR,
    available: isModelAvailable(),
  };
}

