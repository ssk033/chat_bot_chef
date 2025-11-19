/**
 * Ollama client for local LLM inference.
 * Requires Ollama to be installed and running locally.
 */

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const DEFAULT_MODEL = process.env.OLLAMA_MODEL || 'llama3.2:1b'; // Lightweight model by default

/**
 * Check if Ollama is available and running.
 */
export async function checkOllamaAvailable(): Promise<boolean> {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
      method: 'GET',
      signal: AbortSignal.timeout(3000), // 3 second timeout
    });
    return response.ok;
  } catch (error) {
    return false;
  }
}

/**
 * Generate text using Ollama local LLM.
 * @param prompt - The prompt to send to the model
 * @param model - Optional model name (defaults to DEFAULT_MODEL)
 * @returns Generated text response
 */
export async function generateText(
  prompt: string,
  model: string = DEFAULT_MODEL
): Promise<string> {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
        options: {
          temperature: 0.7,
          top_p: 0.9,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ollama API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.response || '';
  } catch (error: any) {
    if (error.name === 'AbortError' || error.message?.includes('fetch')) {
      throw new Error(
        `Cannot connect to Ollama at ${OLLAMA_BASE_URL}. ` +
        `Make sure Ollama is installed and running. ` +
        `Install from: https://ollama.ai`
      );
    }
    throw error;
  }
}

/**
 * Generate text with streaming support (for future use).
 */
export async function* generateTextStream(
  prompt: string,
  model: string = DEFAULT_MODEL
): AsyncGenerator<string, void, unknown> {
  const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      prompt,
      stream: true,
      options: {
        temperature: 0.7,
        top_p: 0.9,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama API error: ${response.status}`);
  }

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();

  if (!reader) {
    throw new Error('Failed to get response reader');
  }

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(line => line.trim());

      for (const line of lines) {
        try {
          const data = JSON.parse(line);
          if (data.response) {
            yield data.response;
          }
        } catch {
          // Skip invalid JSON lines
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * List available models in Ollama.
 */
export async function listModels(): Promise<string[]> {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`);
    if (!response.ok) {
      throw new Error(`Failed to list models: ${response.status}`);
    }
    const data = await response.json();
    return data.models?.map((m: any) => m.name) || [];
  } catch (error) {
    console.error('Error listing Ollama models:', error);
    return [];
  }
}

