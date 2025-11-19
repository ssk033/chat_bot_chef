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

# Get model directory
MODEL_DIR = Path(__file__).parent.parent / "models" / "recipe-embedder"

# Global model cache
_model = None

def load_model():
    """Load the model (cached for performance)."""
    global _model
    if _model is None:
        if not MODEL_DIR.exists():
            print(json.dumps({"error": f"Model not found at {MODEL_DIR}. Please train the model first."}))
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

