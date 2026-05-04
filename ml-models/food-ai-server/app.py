from __future__ import annotations

import io
import os

import numpy as np
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image

from class_names import CLASS_NAMES
from foodx_engine import (
    effective_backend,
    foodx_config_present,
    foodx_health,
    foodx_runtime_available,
    predict_foodx,
)
import clip_indian
from model_loader import default_weights_path, is_demo_model, load_model
from nutrition_map import nutrition_for_dish

app = FastAPI(title="Food classifier (Food Tracker)", version="1.1.0")

_origins = os.environ.get("FOOD_AI_CORS_ORIGINS", "http://127.0.0.1:3000,http://localhost:3000")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in _origins.split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _preprocess_image(pil: Image.Image) -> np.ndarray:
    import tensorflow as tf

    pil = pil.convert("RGB").resize((224, 224), Image.Resampling.BILINEAR)
    arr = np.asarray(pil, dtype=np.float32)
    batch = np.expand_dims(arr, axis=0)
    return tf.keras.applications.mobilenet_v2.preprocess_input(batch)


@app.get("/health")
def health():
    backend = effective_backend()
    out: dict = {"ok": True, "backend": backend}
    out.update(foodx_health())

    if backend == "keras":
        path = default_weights_path()
        model = load_model()
        out.update(
            {
                "weights_path": str(path),
                "weights_found": path.is_file(),
                "model_loaded": model is not None,
                "demo_mode": path.is_file() and is_demo_model(),
                "clip_zero_shot_available": clip_indian.clip_deps_available(),
                "clip_label_mode": clip_indian.clip_label_mode_public(),
                "clip_foodx_data_ready": clip_indian.foodx_clip_labels_ready(),
            }
        )
    else:
        out["keras_weights_path"] = str(default_weights_path())

    return out


@app.post("/predict")
async def predict(image: UploadFile = File(...)):
    if not image.content_type or not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Upload an image file.")

    raw = await image.read()
    try:
        pil = Image.open(io.BytesIO(raw))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid image: {e}") from e

    backend = effective_backend()

    if backend == "foodx":
        if not foodx_runtime_available():
            raise HTTPException(
                status_code=503,
                detail=(
                    "FoodX backend selected but PyTorch/transformers are not installed. "
                    "Run: pip install -r ml-models/food-ai-server/requirements.foodx.txt "
                    "(inside .venv-food-ai), then restart food-ai:dev."
                ),
            )
        if not foodx_config_present():
            raise HTTPException(
                status_code=503,
                detail=(
                    "FoodX backend selected but no model found. Export a ViT checkpoint to "
                    "Food-Recognition-and-Calorie-Estimation/models/vit-foodx251 (config.json + weights), "
                    "set FOODX_MODEL_DIR or FOODX_HF_MODEL_ID, or run: npm run food-ai:init-demo-foodx"
                ),
            )
        try:
            return predict_foodx(pil)
        except Exception as e:
            raise HTTPException(
                status_code=503,
                detail=f"FoodX inference failed: {e}. Check FOODX_MODEL_DIR / FOODX_HF_MODEL_ID and class count (251).",
            ) from e

    demo_marker = is_demo_model()
    weights_path = default_weights_path()

    # Demo `.keras` file is random head only — CLIP compares image↔labels without training (~600MB HF download once).
    if demo_marker:
        clip_out = clip_indian.classify_when_demo_weights(pil)
        if clip_out is not None:
            return clip_out

    model = load_model()
    if model is None:
        raise HTTPException(
            status_code=503,
            detail=(
                f"No model file at {weights_path}. "
                "Train indian-food-classifier/train_indian_food_mobilenet.ipynb and export food_classifier.keras, "
                "or generate a runnable placeholder: npm run food-ai:init-demo-model (restart food-ai:dev after). "
                "Or set FOOD_MODEL_PATH. For ViT/FoodX-251 instead, run npm run food-ai:init-demo-foodx "
                "(and pip install ml-models/food-ai-server/requirements.foodx.txt)."
            ),
        )

    batch = _preprocess_image(pil)
    probs = model.predict(batch, verbose=0)[0]
    idx = int(np.argmax(probs))
    dish = CLASS_NAMES[idx]
    confidence = float(probs[idx])
    n = nutrition_for_dish(dish)

    demo = is_demo_model()
    prob_map = {CLASS_NAMES[i]: round(float(probs[i]), 4) for i in range(len(CLASS_NAMES))}

    # Placeholder/demo Keras weights are not trained — argmax labels are often wrong (e.g. cupcake→Dhokla).
    thr = float(os.environ.get("FOOD_AI_DEMO_CONFIDENCE_THRESHOLD", "0.45"))
    if demo and confidence < thr:
        return {
            "dish": "Unrecognized (demo weights)",
            "confidence": round(confidence, 4),
            "calories": 0,
            "protein_g": 0,
            "carbs_g": 0,
            "fats_g": 0,
            "demoMode": True,
            "demoLowConfidence": True,
            "demoHint": (
                "Demo MobileNet classifier is random — it only maps to 16 Indian dish names "
                "and was not trained on your images. Highest softmax was "
                f"{confidence:.1%} (below demo threshold {thr:.0%}). With PyTorch+transformers installed "
                "(pip install -r ml-models/food-ai-server/requirements.foodx.txt — then restart "
                "food-ai:dev), the API uses CLIP zero-shot automatically for demo setups. Otherwise train "
                "via ml-models/indian-food-classifier/train_indian_food_mobilenet.ipynb, replace "
                "food_classifier.keras, or deploy a trained FoodX‑251 ViT."
            ),
            "suppressedGuess": dish,
            "backend": "keras",
            "probabilities": prob_map,
        }

    return {
        "dish": dish,
        "confidence": round(confidence, 4),
        "calories": n["calories"],
        "protein_g": n["protein_g"],
        "carbs_g": n["carbs_g"],
        "fats_g": n["fats_g"],
        "demoMode": demo,
        "backend": "keras",
        "probabilities": prob_map,
    }
