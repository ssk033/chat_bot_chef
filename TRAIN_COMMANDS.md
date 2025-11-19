# 🚀 Training Commands - Quick Start

## Step-by-Step Training Guide

### 1. Install Python Dependencies

```bash
pip install -r requirements.txt
```

This installs:
- pandas, numpy
- sentence-transformers
- torch
- transformers
- datasets, accelerate
- kagglehub (optional, if using Kaggle)

### 2. Train the Model

**Option A: Using npm script (Recommended)**
```bash
npm run train
```

**Option B: Direct Python command**
```bash
python3 scripts/train_model.py
```

### 3. What Happens During Training

1. ✅ Loads `recipes_data.csv` (2.2GB, ~2.23M recipes)
2. ✅ Samples 500,000 recipes (configurable)
3. ✅ Creates training pairs from similar recipes
4. ✅ Trains for 3 epochs
5. ✅ Saves model to `models/recipe-embedder/`

### 4. Monitor Training Progress

You'll see output like:
```
📖 Loading recipes from recipes_data.csv...
   File size: 2200.00 MB
   Large file detected, reading in chunks...
✅ Loaded 2231150 recipes
📊 Sampling 500000 recipes from 2231150 total...
🔄 Preparing training data...
   Creating recipe text representations...
   Processed 10000/500000 recipes...
🚀 Starting training...
   Base model: all-MiniLM-L6-v2
   Epochs: 3
   Batch size: 32
```

### 5. After Training

Once training completes:
```bash
# Generate embeddings for your recipes
npm run load

# Start your app
npm run dev
```

## Training Time Estimates

- **500k recipes**: 
  - CPU: ~2-4 hours
  - GPU: ~30-60 minutes

- **1M recipes**:
  - CPU: ~4-8 hours
  - GPU: ~1-2 hours

## Customize Training

Edit `scripts/train_model.py`:

```python
# Use more recipes
MAX_RECIPES_FOR_TRAINING = 1000000  # 1M recipes

# Use fewer recipes (faster)
MAX_RECIPES_FOR_TRAINING = 100000  # 100k recipes

# Change batch size (if you have more RAM)
BATCH_SIZE = 64  # Default is 32

# More epochs (better quality, slower)
EPOCHS = 5  # Default is 3
```

## Troubleshooting

### "Module not found" error
```bash
pip install -r requirements.txt
```

### "Out of memory" error
Reduce `MAX_RECIPES_FOR_TRAINING` in `scripts/train_model.py`:
```python
MAX_RECIPES_FOR_TRAINING = 100000  # Use 100k instead
```

### "File not found" error
Make sure `recipes_data.csv` is in the project root:
```bash
ls -lh recipes_data.csv
```

## Quick Command Reference

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Train model
npm run train

# 3. (After training) Load recipes with embeddings
npm run load

# 4. Start app
npm run dev
```

That's it! 🎉

