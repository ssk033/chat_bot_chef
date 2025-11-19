# Training Custom Embedding Model

This project uses a **custom-trained embedding model** instead of pre-trained Google API models. The model is trained specifically on your recipe data for better similarity search.

## Prerequisites

1. **Python 3.8+** installed
2. **Python dependencies** installed:
   ```bash
   pip install -r requirements.txt
   ```

## Training the Model

1. **Train the model** on your recipes:
   ```bash
   npm run train
   # or
   python3 scripts/train_model.py
   ```

2. This will:
   - Load recipes from `recipes.csv`
   - Create training pairs from similar recipes
   - Fine-tune a sentence transformer model
   - Save the model to `models/recipe-embedder/`

3. **Training time**: Depends on your dataset size, typically 5-30 minutes

## Loading Recipes with Custom Model

After training, load recipes into the database:

```bash
npm run load
# or
npx ts-node scripts/load.ts
```

This will:
- Load recipes from `recipes.csv`
- Generate embeddings using your **custom trained model**
- Store embeddings in the database

## How It Works

1. **Training** (`scripts/train_model.py`):
   - Uses `sentence-transformers` library
   - Fine-tunes `all-MiniLM-L6-v2` base model
   - Creates training pairs from recipes with similar cuisines/ingredients
   - Saves trained model to `models/recipe-embedder/`

2. **Inference** (`scripts/inference.py`):
   - Python script that loads the trained model
   - Called from Node.js via `lib/embedding-model.ts`
   - Generates embeddings for any text input

3. **Usage**:
   - `load.ts` uses custom model to generate embeddings for all recipes
   - `app/api/query/route.ts` uses custom model for query embeddings
   - Vector similarity search finds matching recipes

## Model Architecture

- **Base Model**: `all-MiniLM-L6-v2` (384-dimensional embeddings)
- **Fine-tuning**: Trained on recipe similarity pairs
- **Output**: 384-dimensional normalized vectors

## Troubleshooting

### Model not found error
```bash
# Make sure you've trained the model first
python3 scripts/train_model.py
```

### Python not found
```bash
# Check Python installation
python3 --version

# Or use python instead of python3
# Update scripts/inference.py if needed
```

### Training fails
- Check that `recipes.csv` exists
- Ensure you have enough disk space
- Check Python dependencies: `pip install -r requirements.txt`

## Retraining

To retrain with updated data:
```bash
# Delete old model (optional)
rm -rf models/recipe-embedder

# Retrain
npm run train

# Reload recipes
npm run load
```

