# ViT checkpoints (FoodX-251)

Place a Hugging Face–style ViT export here:

- **Default path:** `vit-foodx251/` (contains `config.json`, weights such as `model.safetensors` or `pytorch_model.bin`, and preprocessor files from `ViTImageProcessor.save_pretrained`).
- Override directory with **`FOODX_MODEL_DIR`**, or set **`FOODX_HF_MODEL_ID`** (e.g. `org/model`) to load from the Hub instead.

Quick **untrained** 251-class checkpoint for wiring tests (downloads base ViT weights from Hugging Face):

```bash
# From chat_bot_chef, with .venv-food-ai activated and requirements.foodx.txt installed:
npm run food-ai:init-demo-foodx
```

Calories shown in the Food Tracker come from **`../src/food_estimates_by_gc.csv`** per class index—replace the demo weights with your fine-tuned FoodX ViT for real recognition.
