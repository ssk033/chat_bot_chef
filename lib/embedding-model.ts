/**
 * Custom embedding model for recipe similarity.
 * Uses local Python inference for development, falls back to Hugging Face API for production (Vercel).
 */

import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

const MODEL_DIR = path.join(process.cwd(), 'models', 'recipe-embedder');
const INFERENCE_SCRIPT = path.join(process.cwd(), 'scripts', 'inference.py');

// Hugging Face Inference API endpoint (free, no API key needed for public models)
// Using sentence-transformers/all-MiniLM-L6-v2 (384 dimensions, similar to recipe model)
const HUGGINGFACE_API_URL = 'https://api-inference.huggingface.co/models/sentence-transformers/all-MiniLM-L6-v2';

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
 */
async function generateEmbeddingWithHuggingFace(text: string): Promise<number[]> {
  try {
    const response = await fetch(HUGGINGFACE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ inputs: text }),
    });

    if (!response.ok) {
      // If model is loading, wait and retry once
      if (response.status === 503) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        const retryResponse = await fetch(HUGGINGFACE_API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ inputs: text }),
        });
        
        if (!retryResponse.ok) {
          throw new Error(`Hugging Face API error: ${retryResponse.statusText}`);
        }
        
        const retryData = await retryResponse.json();
        return Array.isArray(retryData) ? retryData : retryData[0];
      }
      
      throw new Error(`Hugging Face API error: ${response.statusText}`);
    }

    const data = await response.json();
    // Hugging Face returns array of embeddings, we need the first one
    return Array.isArray(data) ? data[0] : data;
  } catch (error: any) {
    throw new Error(`Hugging Face embedding failed: ${error.message}`);
  }
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

