#!/usr/bin/env python3
"""
Train a custom embedding model for recipe similarity search.
This script trains a sentence transformer model on Kaggle recipe dataset (2M+ recipes).
"""

import pandas as pd
import numpy as np
from sentence_transformers import SentenceTransformer, InputExample, losses
from sentence_transformers.evaluation import EmbeddingSimilarityEvaluator
from torch.utils.data import DataLoader
import os
import json
from pathlib import Path
import ast  # For parsing JSON strings in CSV
import torch
import time

# Optional import for Kaggle (only needed if USE_KAGGLE_DATASET = True)
try:
    import kagglehub
    KAGGLE_AVAILABLE = True
except ImportError:
    KAGGLE_AVAILABLE = False

# Configuration
MODEL_NAME = "all-MiniLM-L6-v2"  # Base model to fine-tune
OUTPUT_DIR = Path(__file__).parent.parent / "models" / "recipe-embedder"

# Auto-detect device and optimize settings
USE_GPU = torch.cuda.is_available()
if USE_GPU:
    print("✅ GPU detected - using GPU for training")
    BATCH_SIZE = 128  # Larger batch size for GPU
    DEVICE = "cuda"
else:
    print("⚠️  No GPU detected - training on CPU (will be slower)")
    BATCH_SIZE = 32  # Smaller batch size for CPU (better performance)
    DEVICE = "cpu"

EPOCHS = 2  # Reduced from 3 to 2 (faster, still effective)
TRAIN_SPLIT = 0.8

# Dataset configuration
KAGGLE_DATASET = "wilmerarltstrmberg/recipe-dataset-over-2m"
USE_KAGGLE_DATASET = False  # Set to True to download from Kaggle
LOCAL_CSV_FILE = "recipes_data.csv"  # Local CSV file name
MAX_RECIPES_FOR_TRAINING = 50000  # Optimized for CPU: 50k recipes (was 100k)
SAMPLE_RECIPES = True  # If True, randomly sample MAX_RECIPES_FOR_TRAINING recipes

def download_kaggle_dataset():
    """Download the Kaggle recipe dataset."""
    if not KAGGLE_AVAILABLE:
        raise ImportError(
            "kagglehub is not installed. Install it with: pip install kagglehub\n"
            "Or set USE_KAGGLE_DATASET = False to use local CSV file."
        )
    
    print(f"📥 Downloading Kaggle dataset: {KAGGLE_DATASET}...")
    try:
        path = kagglehub.dataset_download(KAGGLE_DATASET)
        print(f"✅ Dataset downloaded to: {path}")
        return path
    except Exception as e:
        print(f"❌ Error downloading dataset: {e}")
        print("💡 Make sure you have Kaggle credentials set up:")
        print("   1. Go to https://www.kaggle.com/settings")
        print("   2. Create API token")
        print("   3. Place kaggle.json in ~/.kaggle/")
        raise

def find_csv_file(dataset_path: Path) -> Path:
    """Find the main CSV file in the downloaded dataset."""
    csv_files = list(dataset_path.glob("*.csv"))
    if not csv_files:
        raise FileNotFoundError(f"No CSV files found in {dataset_path}")
    
    # Prefer files with 'recipe' in the name, or largest file
    recipe_files = [f for f in csv_files if 'recipe' in f.name.lower()]
    if recipe_files:
        return max(recipe_files, key=lambda f: f.stat().st_size)
    
    # Otherwise return largest CSV
    return max(csv_files, key=lambda f: f.stat().st_size)

def load_recipes(csv_path: str = None) -> pd.DataFrame:
    """Load recipes from CSV file or Kaggle dataset."""
    project_root = Path(__file__).parent.parent
    
    if USE_KAGGLE_DATASET:
        # Download from Kaggle
        dataset_path = Path(download_kaggle_dataset())
        csv_path = find_csv_file(dataset_path)
        print(f"📖 Using Kaggle dataset CSV: {csv_path.name}")
    else:
        # Try local CSV files in priority order
        local_files = [
            project_root / LOCAL_CSV_FILE,  # recipes_data.csv (user's file)
            project_root / "recipes_data.csv",  # Alternative name
            project_root / "recipes.csv",  # Fallback
        ]
        
        csv_path = None
        for file_path in local_files:
            if file_path.exists():
                csv_path = file_path
                print(f"📖 Using local CSV file: {csv_path.name}")
                break
        
        if not csv_path:
            raise FileNotFoundError(
                f"Recipe CSV not found! Tried:\n" +
                "\n".join([f"  - {f}" for f in local_files]) +
                f"\n\nPlease ensure {LOCAL_CSV_FILE} exists in the project root."
            )
    
    print(f"📖 Loading recipes from {csv_path}...")
    
    # For large files, use chunking
    file_size = Path(csv_path).stat().st_size / (1024 * 1024)  # MB
    print(f"   File size: {file_size:.2f} MB")
    
    # Always use chunking for large files to save memory
    if file_size > 100:  # If larger than 100MB, use chunking (lowered threshold)
        print("   Large file detected, reading in chunks and sampling...")
        chunks = []
        chunk_size = 20000  # Read 20k rows at a time (reduced from 50k)
        total_read = 0
        
        for chunk in pd.read_csv(csv_path, chunksize=chunk_size, low_memory=False):
            # Sample from each chunk to avoid loading everything
            if SAMPLE_RECIPES:
                # Sample proportionally from each chunk
                sample_ratio = min(1.0, MAX_RECIPES_FOR_TRAINING / (file_size * 1000))  # Rough estimate
                if sample_ratio < 1.0:
                    chunk = chunk.sample(frac=sample_ratio, random_state=42)
            
            chunks.append(chunk)
            total_read += len(chunk)
            
            # Stop early if we have enough
            if SAMPLE_RECIPES and total_read >= MAX_RECIPES_FOR_TRAINING * 1.2:  # Get 20% extra for sampling
                break
        
        df = pd.concat(chunks, ignore_index=True)
        
        # Final sampling if we loaded too much
        if SAMPLE_RECIPES and len(df) > MAX_RECIPES_FOR_TRAINING:
            print(f"📊 Final sampling: {MAX_RECIPES_FOR_TRAINING} from {len(df)} loaded...")
            df = df.sample(n=MAX_RECIPES_FOR_TRAINING, random_state=42).reset_index(drop=True)
    else:
        df = pd.read_csv(csv_path, low_memory=False)
        # Sample if needed
        if SAMPLE_RECIPES and len(df) > MAX_RECIPES_FOR_TRAINING:
            print(f"📊 Sampling {MAX_RECIPES_FOR_TRAINING} recipes from {len(df)} total...")
            df = df.sample(n=MAX_RECIPES_FOR_TRAINING, random_state=42).reset_index(drop=True)
    
    print(f"✅ Loaded {len(df)} recipes for training")
    
    return df

def prepare_training_data(df: pd.DataFrame):
    """
    Prepare training data for the model.
    Creates positive pairs from similar recipes (same cuisine, similar ingredients).
    Optimized for large datasets.
    """
    print("🔄 Preparing training data...")
    prep_start_time = time.time()
    
    training_examples = []
    
    # Store recipe count before processing
    num_recipes = len(df)
    
    # Create text representations for each recipe (process in batches to save memory)
    print("   Creating recipe text representations...")
    recipe_texts = []
    recipe_metadata = []  # Store metadata for pairing
    
    # Process in batches to avoid memory issues
    batch_size = 10000
    total_rows = len(df)
    
    for batch_start in range(0, total_rows, batch_size):
        batch_end = min(batch_start + batch_size, total_rows)
        batch_df = df.iloc[batch_start:batch_end]
        
        for idx, row in batch_df.iterrows():
            # Try different column name variations
            title = str(row.get('recipe_name', row.get('Name', row.get('title', row.get('Title', '')))) or '')
            
            # Handle ingredients - could be JSON array or string
            ingredients_raw = row.get('ingredients', row.get('Ingredients', row.get('ingredient', '')))
            if isinstance(ingredients_raw, str):
                # Try to parse as JSON array
                try:
                    ingredients_list = ast.literal_eval(ingredients_raw)
                    if isinstance(ingredients_list, list):
                        ingredients = ', '.join(str(x) for x in ingredients_list)
                    else:
                        ingredients = str(ingredients_raw)
                except:
                    ingredients = str(ingredients_raw)
            else:
                ingredients = str(ingredients_raw) if ingredients_raw else ''
            
            # Handle directions/instructions - could be JSON array or string
            instructions_raw = row.get('directions', row.get('Directions', row.get('instructions', row.get('Instructions', ''))))
            if isinstance(instructions_raw, str):
                # Try to parse as JSON array
                try:
                    instructions_list = ast.literal_eval(instructions_raw)
                    if isinstance(instructions_list, list):
                        instructions = ' '.join(str(x) for x in instructions_list)
                    else:
                        instructions = str(instructions_raw)
                except:
                    instructions = str(instructions_raw)
            else:
                instructions = str(instructions_raw) if instructions_raw else ''
            
            cuisine = str(row.get('cuisine_path', row.get('cuisine', row.get('Cuisine', row.get('source', '')))) or '')
            
            # Combine into a single text representation
            text = f"{title}\nIngredients: {ingredients}\nInstructions: {instructions[:500]}"
            recipe_texts.append(text.strip())
            recipe_metadata.append({
                'cuisine': cuisine,
                'ingredients_lower': ingredients.lower(),
                'title_lower': title.lower()
            })
        
        if batch_end % 10000 == 0 or batch_end == total_rows:
            print(f"   Processed {batch_end}/{total_rows} recipes...")
        
        # Clear batch from memory
        del batch_df
    
    print(f"✅ Created {len(recipe_texts)} recipe representations")
    
    # Clear original dataframe to save memory
    del df
    
    # Create training pairs - optimized for large datasets
    print("   Creating training pairs...")
    
    # Strategy 1: Group by cuisine (most efficient)
    print("   Grouping by cuisine...")
    cuisine_groups = {}
    for idx, meta in enumerate(recipe_metadata):
        cuisine = meta['cuisine']
        if cuisine and cuisine.strip():
            if cuisine not in cuisine_groups:
                cuisine_groups[cuisine] = []
            cuisine_groups[cuisine].append(idx)
    
    print(f"   Found {len(cuisine_groups)} cuisine groups")
    
    # Create positive pairs from same cuisine (limit pairs per cuisine to avoid explosion)
    pairs_per_cuisine = 20  # Limit pairs per cuisine
    for cuisine, indices in cuisine_groups.items():
        if len(indices) >= 2:
            # Sample pairs from this cuisine
            np.random.seed(42)
            sampled_indices = np.random.choice(indices, size=min(len(indices), pairs_per_cuisine * 2), replace=False)
            
            # Create pairs
            for i in range(len(sampled_indices) - 1):
                for j in range(i + 1, min(i + 3, len(sampled_indices))):  # Create 2-3 pairs per recipe
                    training_examples.append(
                        InputExample(
                            texts=[recipe_texts[sampled_indices[i]], recipe_texts[sampled_indices[j]]],
                            label=1.0  # High similarity
                        )
                    )
    
    print(f"   Created {len(training_examples)} cuisine-based pairs")
    
    # Strategy 2: Create pairs from similar recipes (ingredient overlap)
    # Optimized for CPU: reduced target examples for faster training
    target_examples = min(5000, len(recipe_texts) // 100)  # Target 5k examples (reduced from 10k)
    if len(training_examples) < target_examples:
        print("   Creating additional pairs from ingredient similarity...")
        additional_needed = target_examples - len(training_examples)
        
        # Sample recipes for similarity matching (optimized for speed and memory)
        sample_size = min(2000, len(recipe_texts) // 50)  # Sample 2% of recipes, max 2k (reduced for CPU)
        print(f"   Sampling {sample_size} recipes for similarity matching...")
        sampled_indices = np.random.choice(len(recipe_texts), size=sample_size, replace=False)
        
        pairs_created = 0
        for i, idx_i in enumerate(sampled_indices):
            if len(training_examples) >= target_examples:
                break
            
            # Compare with fewer recipes (optimized for speed)
            for j in range(i + 1, min(i + 5, len(sampled_indices))):  # Compare with up to 5 next recipes (was 10)
                if len(training_examples) >= target_examples:
                    break
                    
                idx_j = sampled_indices[j]
                # Simple similarity: check if they share common words
                words_i = set(recipe_metadata[idx_i]['ingredients_lower'].split())
                words_j = set(recipe_metadata[idx_j]['ingredients_lower'].split())
                
                if len(words_i) > 0 and len(words_j) > 0:
                    overlap = len(words_i & words_j) / max(len(words_i | words_j), 1)
                    
                    if overlap > 0.15:  # Increased threshold to 15% (was 10%) - fewer but better pairs
                        training_examples.append(
                            InputExample(
                                texts=[recipe_texts[idx_i], recipe_texts[idx_j]],
                                label=min(overlap * 1.5, 1.0)  # Scale overlap to 0-1
                            )
                        )
                        pairs_created += 1
            
            if (i + 1) % 500 == 0:
                print(f"   Created {len(training_examples)} pairs so far...")
        
        print(f"   Created {pairs_created} additional pairs from ingredient similarity")
    
    prep_elapsed = time.time() - prep_start_time
    print(f"✅ Created {len(training_examples)} total training examples")
    print(f"⏱️  Data preparation took {prep_elapsed/60:.1f} minutes")
    return training_examples, num_recipes

def train_model(training_examples, output_dir: Path):
    """Train the sentence transformer model."""
    print(f"🚀 Starting training...")
    print(f"   Base model: {MODEL_NAME}")
    print(f"   Output directory: {output_dir}")
    print(f"   Device: {DEVICE}")
    print(f"   Epochs: {EPOCHS}")
    print(f"   Batch size: {BATCH_SIZE}")
    print(f"   Training examples: {len(training_examples):,}")
    
    start_time = time.time()
    
    # Load base model
    model = SentenceTransformer(MODEL_NAME, device=DEVICE)
    
    # Create data loader
    train_dataloader = DataLoader(training_examples, shuffle=True, batch_size=BATCH_SIZE)
    
    # Define loss function (CosineSimilarityLoss for similarity learning)
    train_loss = losses.CosineSimilarityLoss(model)
    
    # Train the model (optimized settings)
    # Only use AMP (mixed precision) if GPU is available
    model.fit(
        train_objectives=[(train_dataloader, train_loss)],
        epochs=EPOCHS,
        output_path=str(output_dir),
        show_progress_bar=True,
        warmup_steps=min(100, len(training_examples) // 10),  # Adaptive warmup steps
        optimizer_params={'lr': 2e-5},  # Learning rate
        use_amp=USE_GPU  # Only use mixed precision if GPU available
    )
    
    elapsed_time = time.time() - start_time
    print(f"✅ Training complete! Model saved to {output_dir}")
    print(f"⏱️  Training took {elapsed_time/60:.1f} minutes ({elapsed_time/3600:.2f} hours)")
    return model

def save_model_info(output_dir: Path, num_recipes: int, num_examples: int):
    """Save metadata about the trained model."""
    info = {
        "base_model": MODEL_NAME,
        "training_recipes": num_recipes,
        "training_examples": num_examples,
        "epochs": EPOCHS,
        "batch_size": BATCH_SIZE,
        "embedding_dimension": 384  # all-MiniLM-L6-v2 dimension
    }
    
    info_path = output_dir / "model_info.json"
    with open(info_path, 'w') as f:
        json.dump(info, f, indent=2)
    print(f"📝 Model info saved to {info_path}")

def main():
    total_start_time = time.time()
    
    # Create output directory
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    
    print("=" * 60)
    print("🚀 Recipe Embedding Model Training")
    print("=" * 60)
    print(f"Device: {DEVICE}")
    print(f"Max recipes: {MAX_RECIPES_FOR_TRAINING:,}")
    print(f"Batch size: {BATCH_SIZE}")
    print(f"Epochs: {EPOCHS}")
    print("=" * 60)
    print()
    
    # Load recipes (from Kaggle or local file)
    load_start = time.time()
    try:
        df = load_recipes()
    except Exception as e:
        print(f"❌ Error loading recipes: {e}")
        return
    
    load_elapsed = time.time() - load_start
    print(f"⏱️  Data loading took {load_elapsed/60:.1f} minutes")
    print()
    
    # Prepare training data (returns examples and recipe count)
    training_examples, num_recipes = prepare_training_data(df)
    
    # Clear df from memory (already processed)
    del df
    
    if len(training_examples) < 10:
        print("❌ Error: Not enough training examples. Need at least 10.")
        return
    
    # Split into train/validation
    split_idx = int(len(training_examples) * TRAIN_SPLIT)
    train_examples = training_examples[:split_idx]
    val_examples = training_examples[split_idx:]
    
    print(f"📊 Train examples: {len(train_examples):,}, Validation examples: {len(val_examples):,}")
    print()
    
    # Train model
    print(f"🚀 Starting training on {len(train_examples):,} examples...")
    model = train_model(train_examples, OUTPUT_DIR)
    
    # Save model info
    save_model_info(OUTPUT_DIR, num_recipes, len(training_examples))
    
    # Test the model
    print("\n🧪 Testing model...")
    test_text = "chicken pasta with tomatoes"
    embedding = model.encode(test_text)
    print(f"   Test embedding shape: {embedding.shape}")
    print(f"   Test embedding sample: {embedding[:5]}")
    
    total_elapsed = time.time() - total_start_time
    print("\n" + "=" * 60)
    print("🎉 Model training complete!")
    print("=" * 60)
    print(f"📦 Model saved to: {OUTPUT_DIR}")
    print(f"⏱️  Total time: {total_elapsed/60:.1f} minutes ({total_elapsed/3600:.2f} hours)")
    print(f"📊 Training stats:")
    print(f"   - Recipes used: {num_recipes:,}")
    print(f"   - Training examples: {len(training_examples):,}")
    print(f"   - Base model: {MODEL_NAME}")
    print(f"   - Device: {DEVICE}")
    print(f"\n💡 Next steps:")
    print(f"   1. The model is ready to use!")
    print(f"   2. Run 'npm run load' to generate embeddings for your recipes")
    print(f"   3. Start your app: 'npm run dev'")
    print("=" * 60)

if __name__ == "__main__":
    main()

