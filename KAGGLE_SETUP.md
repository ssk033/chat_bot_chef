# Kaggle Dataset Training Setup

Your model will now train on the **Kaggle recipe dataset with 2M+ recipes**!

## Setup Kaggle API

### 1. Get Kaggle API Credentials

1. Go to https://www.kaggle.com/settings
2. Scroll to "API" section
3. Click "Create New Token"
4. This downloads `kaggle.json`

### 2. Install Kaggle Credentials

**Linux/macOS:**
```bash
mkdir -p ~/.kaggle
mv ~/Downloads/kaggle.json ~/.kaggle/
chmod 600 ~/.kaggle/kaggle.json
```

**Windows:**
```bash
# Create folder: C:\Users\<YourUsername>\.kaggle
# Move kaggle.json there
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

This installs `kagglehub` which will download the dataset automatically.

## Training Configuration

The training script is configured in `scripts/train_model.py`:

```python
# Dataset configuration
KAGGLE_DATASET = "wilmerarltstrmberg/recipe-dataset-over-2m"
USE_KAGGLE_DATASET = True  # Set to False to use local recipes.csv
MAX_RECIPES_FOR_TRAINING = 500000  # Limit recipes (2M is too much)
SAMPLE_RECIPES = True  # Randomly sample recipes
```

### Customize Training

**Use more recipes:**
```python
MAX_RECIPES_FOR_TRAINING = 1000000  # Use 1M recipes
```

**Use all recipes (not recommended - very slow):**
```python
MAX_RECIPES_FOR_TRAINING = 2000000
SAMPLE_RECIPES = False
```

**Use local file instead:**
```python
USE_KAGGLE_DATASET = False  # Uses recipes.csv in project root
```

## Training

### Start Training

```bash
npm run train
# or
python3 scripts/train_model.py
```

### What Happens

1. **Downloads dataset** from Kaggle (first time only, ~GB)
2. **Loads recipes** (samples 500k by default)
3. **Creates training pairs** from similar recipes
4. **Trains model** for 3 epochs
5. **Saves model** to `models/recipe-embedder/`

### Training Time Estimates

- **500k recipes**: ~2-4 hours (CPU), ~30-60 min (GPU)
- **1M recipes**: ~4-8 hours (CPU), ~1-2 hours (GPU)
- **2M recipes**: ~8-16 hours (CPU), ~2-4 hours (GPU)

### Memory Requirements

- **500k recipes**: ~8-16GB RAM
- **1M recipes**: ~16-32GB RAM
- **2M recipes**: ~32-64GB RAM

## Dataset Info

- **Source**: Kaggle - Recipe Dataset Over 2M
- **Dataset ID**: `wilmerarltstrmberg/recipe-dataset-over-2m`
- **Size**: ~2+ million recipes
- **Format**: CSV files

## Troubleshooting

### "Kaggle API credentials not found"

Make sure `kaggle.json` is in `~/.kaggle/` with correct permissions:
```bash
chmod 600 ~/.kaggle/kaggle.json
```

### "Out of memory"

Reduce `MAX_RECIPES_FOR_TRAINING`:
```python
MAX_RECIPES_FOR_TRAINING = 100000  # Use 100k instead
```

### "Download too slow"

The dataset is large. First download may take 30-60 minutes depending on internet speed. It's cached after first download.

### "Column not found"

The script handles multiple column name variations. If you see errors, check the CSV structure and update column names in `prepare_training_data()` function.

## Next Steps

After training:
1. Model saved to `models/recipe-embedder/`
2. Run `npm run load` to generate embeddings
3. Start app: `npm run dev`

Enjoy your model trained on 2M+ recipes! 🎉

