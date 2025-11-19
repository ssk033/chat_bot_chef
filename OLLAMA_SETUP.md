# Ollama Setup Guide

This project now uses **Ollama** for local LLM inference instead of Google's Gemini API. This means all AI processing happens locally on your machine - no API calls, no costs, complete privacy!

## Installation

### 1. Install Ollama

Visit https://ollama.ai and download Ollama for your operating system:

- **Linux**: `curl -fsSL https://ollama.ai/install.sh | sh`
- **macOS**: Download from https://ollama.ai/download
- **Windows**: Download installer from https://ollama.ai/download

### 2. Start Ollama

Ollama runs as a local service. After installation, it should start automatically. If not:

```bash
ollama serve
```

### 3. Pull a Model

Download a model to use with the application. Recommended models:

**Lightweight (Fast, Lower Quality):**
```bash
ollama pull llama3.2:1b      # ~1.3GB - Very fast, good for testing
ollama pull phi3:mini       # ~2.3GB - Fast, decent quality
```

**Balanced (Recommended):**
```bash
ollama pull llama3.2:3b      # ~2.0GB - Good balance of speed and quality
ollama pull mistral:7b      # ~4.1GB - Better quality, slower
```

**High Quality (Slower):**
```bash
ollama pull llama3.1:8b     # ~4.7GB - High quality responses
ollama pull mistral:7b-instruct  # ~4.1GB - Instruction-tuned
```

### 4. Configure Model (Optional)

Set which model to use via environment variable:

```bash
# In your .env file
OLLAMA_MODEL=llama3.2:3b
OLLAMA_BASE_URL=http://localhost:11434  # Default, change if Ollama runs elsewhere
```

Or edit `lib/ollama-client.ts` to change the default model.

## Usage

Once Ollama is running and you've pulled a model:

1. **Start your Next.js app:**
   ```bash
   npm run dev
   ```

2. **The app will automatically use Ollama** for:
   - Generating chat responses
   - Answering recipe queries
   - All AI text generation

3. **TTS (Text-to-Speech)** uses your browser's built-in Web Speech API - no setup needed!

## Verification

Check if Ollama is running:

```bash
curl http://localhost:11434/api/tags
```

You should see a list of installed models.

## Troubleshooting

### "Ollama is not running" error

1. Check if Ollama is installed: `ollama --version`
2. Start Ollama: `ollama serve`
3. Verify it's running: `curl http://localhost:11434/api/tags`

### "Model not found" error

1. List installed models: `ollama list`
2. Pull the model: `ollama pull llama3.2:1b` (or your preferred model)
3. Update `OLLAMA_MODEL` in `.env` if using a different model

### Slow responses

- Use a smaller model (e.g., `llama3.2:1b` instead of `llama3.1:8b`)
- Ensure you have enough RAM (models need 2-8GB depending on size)
- Close other applications to free up resources

### Connection refused

- Make sure Ollama is running: `ollama serve`
- Check the port (default is 11434)
- If running Ollama on a different machine, update `OLLAMA_BASE_URL` in `.env`

## Model Recommendations

For this recipe chatbot:

- **Development/Testing**: `llama3.2:1b` - Fast, good enough for testing
- **Production (Good)**: `llama3.2:3b` - Balanced quality and speed
- **Production (Best)**: `mistral:7b` or `llama3.1:8b` - Higher quality responses

## Benefits of Local LLM

✅ **No API costs** - Everything runs locally  
✅ **Complete privacy** - Your data never leaves your machine  
✅ **No rate limits** - Use as much as you want  
✅ **Works offline** - No internet required after setup  
✅ **Customizable** - Use any model you want  

## Next Steps

1. Install Ollama
2. Pull a model: `ollama pull llama3.2:3b`
3. Start your app: `npm run dev`
4. Enjoy local AI! 🎉

