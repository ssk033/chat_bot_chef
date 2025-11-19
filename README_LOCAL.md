# 🎉 Fully Local AI Recipe Chatbot

This project now runs **100% locally** - no external APIs, no costs, complete privacy!

## What Changed

✅ **Embeddings**: Custom trained model (no Google API)  
✅ **Chat/LLM**: Ollama local LLM (no Gemini API)  
✅ **TTS**: Browser Web Speech API (no external services)  

## Quick Start

### 1. Install Ollama

```bash
# Linux/macOS
curl -fsSL https://ollama.ai/install.sh | sh

# Or download from https://ollama.ai
```

### 2. Pull a Model

```bash
# Lightweight (recommended for testing)
ollama pull llama3.2:1b

# Or better quality
ollama pull llama3.2:3b
```

### 3. Start Ollama

```bash
ollama serve
```

### 4. Train Your Embedding Model (One-time)

```bash
# Install Python dependencies
pip install -r requirements.txt

# Train the model
npm run train
```

### 5. Load Recipes

```bash
npm run load
```

### 6. Start the App

```bash
npm run dev
```

## Configuration

Optional: Set model in `.env`:

```env
OLLAMA_MODEL=llama3.2:3b
OLLAMA_BASE_URL=http://localhost:11434
```

## Features

- 🔒 **100% Private** - All data stays on your machine
- 💰 **Free** - No API costs
- ⚡ **Fast** - Local processing
- 🎯 **Custom** - Trained on your recipe data
- 🔊 **TTS** - Browser-based text-to-speech

## Troubleshooting

See `OLLAMA_SETUP.md` for detailed troubleshooting.

## Architecture

```
User Query
    ↓
Custom Embedding Model (Python) → Vector Search → Find Recipes
    ↓
Ollama LLM (Local) → Generate Response
    ↓
Browser TTS → Speak Response
```

All processing happens locally! 🚀

