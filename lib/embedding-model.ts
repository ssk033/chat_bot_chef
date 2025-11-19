/**
 * Custom embedding model for recipe similarity.
 * Uses a Python inference service to run the trained model.
 */

import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

const MODEL_DIR = path.join(process.cwd(), 'models', 'recipe-embedder');
const INFERENCE_SCRIPT = path.join(process.cwd(), 'scripts', 'inference.py');

/**
 * Check if the custom model is available.
 */
export function isModelAvailable(): boolean {
  return fs.existsSync(MODEL_DIR) && fs.existsSync(INFERENCE_SCRIPT);
}

/**
 * Generate embedding for a given text using the custom trained model.
 * @param text - The text to embed
 * @returns Embedding vector as an array of numbers
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  if (!isModelAvailable()) {
    throw new Error(
      `Google Colab trained model not found at ${MODEL_DIR}.\n` +
      `Please ensure the trained model is placed in models/recipe-embedder/`
    );
  }

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

