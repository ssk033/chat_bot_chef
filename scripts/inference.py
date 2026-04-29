#!/usr/bin/env python3
"""
Inference script for the custom embedding model.
Called from Node.js to generate embeddings.
"""

import sys
import json
import os
from pathlib import Path
from sentence_transformers import SentenceTransformer

def resolve_model_dir() -> Path:
    """
    Resolve model path from env override first, then known locations.
    """
    env_path = os.getenv("RECIPE_MODEL_DIR")
    if env_path:
        p = Path(env_path)
        if p.exists():
            return p

    candidates = [
        Path(__file__).parent.parent / "models" / "recipe-embedder",
        Path(__file__).parent.parent / "RecipeModel" / "models" / "recipe-embedder",
    ]
    for candidate in candidates:
        if candidate.exists():
            return candidate
    return candidates[0]

# Get model directory
MODEL_DIR = resolve_model_dir()

# Global model cache
_model = None

def load_model():
    """Load the model (cached for performance)."""
    global _model
    if _model is None:
        if not MODEL_DIR.exists():
            print(json.dumps({"error": f"Google Colab trained model not found at {MODEL_DIR}. Please ensure the model is placed in models/recipe-embedder/ or RecipeModel/models/recipe-embedder/"}))
            sys.exit(1)
        
        try:
            _model = SentenceTransformer(str(MODEL_DIR))
        except Exception as e:
            print(json.dumps({"error": f"Failed to load model: {str(e)}"}))
            sys.exit(1)
    
    return _model

def generate_embedding(text: str):
    """Generate embedding for a single text."""
    model = load_model()
    embedding = model.encode(text, normalize_embeddings=True)
    return embedding.tolist()

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No text provided"}))
        sys.exit(1)
    
    text = sys.argv[1]
    
    try:
        embedding = generate_embedding(text)
        result = {
            "embedding": embedding,
            "dimension": len(embedding)
        }
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main()

