# 🐌 Why Training is Slow - Performance Analysis

## Main Bottlenecks

### 1. **CPU-Only Training (PRIMARY BOTTLENECK)**
- **Current Status**: Your system is training on CPU only (no GPU detected)
- **Impact**: Training on CPU is **10-50x slower** than GPU
- **Evidence**: 
  - `torch.cuda.is_available()` returns `False`
  - The script uses `use_amp=True` but this only helps if GPU is available
- **Expected Time**: 
  - CPU: 2-4 hours for 100k recipes
  - GPU: 15-30 minutes for 100k recipes

### 2. **Large Dataset Processing**
- **Current Config**: `MAX_RECIPES_FOR_TRAINING = 100000` (100k recipes)
- **Impact**: Processing 100k recipes takes significant time
- **Bottlenecks**:
  - CSV loading and parsing
  - Creating text representations for all recipes
  - Memory allocation and garbage collection

### 3. **Inefficient Training Pair Creation**
- **Problem**: The ingredient similarity matching (lines 266-309) uses nested loops
- **Complexity**: O(n²) for similarity comparisons
- **Current**: Compares up to 3000 sampled recipes with each other
- **Impact**: Can take 10-30 minutes just to create training pairs

### 4. **No Multiprocessing**
- **Problem**: Data preparation is single-threaded
- **Impact**: CPU cores are underutilized
- **Solution**: Use multiprocessing for parallel data processing

### 5. **Batch Size on CPU**
- **Current**: `BATCH_SIZE = 128`
- **Problem**: Large batch sizes on CPU can be slower due to memory overhead
- **Optimal**: 16-32 for CPU, 64-128 for GPU

## Performance Breakdown

For **100k recipes** on CPU:
1. **Data Loading**: ~5-10 minutes
2. **Pair Creation**: ~15-30 minutes
3. **Model Training**: ~1.5-3 hours (2 epochs)
4. **Total**: ~2-4 hours

## Solutions & Optimizations

### Quick Fixes (Immediate Impact)

#### 1. **Reduce Dataset Size** (Fastest)
```python
# In scripts/train_model.py
MAX_RECIPES_FOR_TRAINING = 50000  # Reduce to 50k (2x faster)
# or even
MAX_RECIPES_FOR_TRAINING = 25000  # Reduce to 25k (4x faster)
```

#### 2. **Reduce Epochs** (Already done - 2 epochs)
```python
EPOCHS = 1  # Try 1 epoch for faster training (may reduce quality slightly)
```

#### 3. **Optimize Batch Size for CPU**
```python
BATCH_SIZE = 32  # Better for CPU (was 128)
```

#### 4. **Reduce Training Pairs**
```python
# In prepare_training_data function
target_examples = min(5000, len(recipe_texts) // 200)  # Reduce from 10k to 5k
sample_size = min(2000, len(recipe_texts) // 50)  # Reduce from 3k to 2k
```

### Medium-Term Optimizations

#### 1. **Use GPU (Best Solution)**
- **Option A**: Use Google Colab (free GPU)
- **Option B**: Use Kaggle Notebooks (free GPU)
- **Option C**: Use cloud GPU (AWS, GCP, Azure)
- **Option D**: Get a local GPU

#### 2. **Optimize Pair Creation Algorithm**
- Use vectorized operations instead of nested loops
- Use approximate nearest neighbors (ANN) for similarity search
- Pre-compute ingredient embeddings for faster comparison

#### 3. **Add Multiprocessing**
- Parallelize recipe text processing
- Use multiprocessing for pair creation

### Long-Term Solutions

#### 1. **Use Pre-trained Models**
- Consider using pre-trained recipe embeddings
- Fine-tune only if necessary

#### 2. **Incremental Training**
- Train on smaller batches incrementally
- Save checkpoints and resume training

#### 3. **Use Distributed Training**
- If you have multiple machines/GPUs

## Recommended Configuration for CPU Training

```python
# Fast training on CPU (good quality, ~30-60 min)
MAX_RECIPES_FOR_TRAINING = 50000
BATCH_SIZE = 32
EPOCHS = 2
target_examples = 5000  # In prepare_training_data
sample_size = 2000  # In prepare_training_data

# Very fast training on CPU (acceptable quality, ~15-30 min)
MAX_RECIPES_FOR_TRAINING = 25000
BATCH_SIZE = 32
EPOCHS = 1
target_examples = 3000
sample_size = 1500
```

## GPU Setup (If Available)

If you have a GPU or want to use one:

1. **Check GPU availability**:
   ```bash
   python3 -c "import torch; print(torch.cuda.is_available())"
   ```

2. **Install CUDA-enabled PyTorch** (if needed):
   ```bash
   pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
   ```

3. **The script will automatically use GPU** if available (sentence-transformers detects it)

## Monitoring Training Progress

The script shows progress, but you can add more detailed timing:

```python
import time
start_time = time.time()
# ... training code ...
elapsed = time.time() - start_time
print(f"Training took {elapsed/60:.1f} minutes")
```

## Summary

**Main Issue**: Training on CPU is inherently slow (10-50x slower than GPU)

**Quick Solutions**:
1. Reduce `MAX_RECIPES_FOR_TRAINING` to 25k-50k
2. Reduce `BATCH_SIZE` to 32
3. Reduce training pairs (target_examples to 3k-5k)

**Best Solution**: Use GPU (Colab, Kaggle, or cloud GPU)

**Expected Times**:
- **Current (100k, CPU)**: 2-4 hours
- **Optimized (25k, CPU)**: 15-30 minutes
- **With GPU (100k)**: 15-30 minutes

