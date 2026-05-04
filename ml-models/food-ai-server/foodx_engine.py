"""ViT / Hugging Face FoodX-251 inference + backend selection."""

from __future__ import annotations

import logging
import os
import threading
from pathlib import Path
from typing import Any, Literal

import numpy as np
from PIL import Image

from foodx_data import estimate_macros_from_calories, load_foodx_table

_LOG = logging.getLogger("food_ai")

BackendName = Literal["keras", "foodx"]

_MODEL = None
_PROCESSOR = None
_DEVICE = None
_LOAD_LOCK = threading.Lock()


def default_foodx_model_dir() -> Path:
    override = os.environ.get("FOODX_MODEL_DIR", "").strip()
    if override:
        return Path(override)
    return (
        Path(__file__).resolve().parent.parent.parent
        / "Food-Recognition-and-Calorie-Estimation"
        / "models"
        / "vit-foodx251"
    )


def foodx_demo_marker_path() -> Path:
    return default_foodx_model_dir() / ".foodx_demo"


def is_foodx_demo_model() -> bool:
    return foodx_demo_marker_path().is_file()


def foodx_config_present() -> bool:
    if os.environ.get("FOODX_HF_MODEL_ID", "").strip():
        return True
    d = default_foodx_model_dir()
    return (d / "config.json").is_file()


def foodx_runtime_available() -> bool:
    try:
        import torch  # noqa: F401
        import transformers  # noqa: F401

        return True
    except ImportError:
        return False


def _foodx_suitable_for_auto() -> bool:
    """Prefer ViT/FoodX-251 only when not the local scaffold from init_demo_foodx (.foodx_demo)."""
    if os.environ.get("FOODX_HF_MODEL_ID", "").strip():
        return True
    if not foodx_config_present():
        return False
    return not is_foodx_demo_model()


def resolve_backend_intent() -> BackendName:
    mode = os.environ.get("FOOD_AI_BACKEND", "auto").strip().lower()
    if mode == "keras":
        return "keras"
    if mode == "foodx":
        return "foodx"
    # auto: ViT checkpoint from init_demo_foodx has a random classifier head → nonsense labels unless you trained it.
    return "foodx" if _foodx_suitable_for_auto() else "keras"


def effective_backend() -> BackendName:
    """Intent + env: explicit foodx errors if deps missing; auto falls back to Keras."""
    intent = resolve_backend_intent()
    if intent == "foodx":
        if not foodx_runtime_available():
            explicit = os.environ.get("FOOD_AI_BACKEND", "auto").strip().lower() == "foodx"
            if explicit:
                return "foodx"
            _LOG.warning(
                "FoodX model path or HF id is set but torch/transformers are not installed; "
                "falling back to Keras. pip install -r ml-models/food-ai-server/requirements.foodx.txt"
            )
            return "keras"
        return "foodx"
    return "keras"


def _model_source() -> str:
    mid = os.environ.get("FOODX_HF_MODEL_ID", "").strip()
    if mid:
        return mid
    return str(default_foodx_model_dir())


def _load_vit():
    global _MODEL, _PROCESSOR, _DEVICE
    import torch
    from transformers import AutoImageProcessor, AutoModelForImageClassification

    src = _model_source()
    _PROCESSOR = AutoImageProcessor.from_pretrained(src)
    _MODEL = AutoModelForImageClassification.from_pretrained(src)
    _DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    _MODEL.to(_DEVICE)
    _MODEL.eval()


def load_foodx_model():
    global _MODEL, _PROCESSOR
    if _MODEL is not None and _PROCESSOR is not None:
        return _MODEL, _PROCESSOR
    with _LOAD_LOCK:
        if _MODEL is not None and _PROCESSOR is not None:
            return _MODEL, _PROCESSOR
        _load_vit()
        return _MODEL, _PROCESSOR


def foodx_health() -> dict[str, Any]:
    n_classes = len(load_foodx_table()[0])
    return {
        "foodx_model_dir": str(default_foodx_model_dir()),
        "foodx_hf_model_id": os.environ.get("FOODX_HF_MODEL_ID") or None,
        "foodx_config_present": foodx_config_present(),
        "foodx_runtime_available": foodx_runtime_available(),
        "foodx_demo_mode": is_foodx_demo_model(),
        "foodx_num_classes": n_classes,
    }


def predict_foodx(pil: Image.Image) -> dict[str, Any]:
    import torch

    model, processor = load_foodx_model()
    _, display_names, kcals = load_foodx_table()
    n = len(display_names)

    rgb = pil.convert("RGB")
    inputs = processor(images=rgb, return_tensors="pt")
    inputs = {k: v.to(_DEVICE) for k, v in inputs.items()}

    with torch.no_grad():
        logits = model(**inputs).logits
        probs = torch.nn.functional.softmax(logits, dim=-1)[0]

    probs_np = probs.cpu().numpy()
    idx = int(np.argmax(probs_np))
    if idx < 0 or idx >= n:
        idx = int(np.clip(idx, 0, n - 1))

    confidence = float(probs_np[idx])
    dish = display_names[idx]
    cal = kcals[idx]
    p_g, c_g, f_g = estimate_macros_from_calories(cal)

    top_idx = np.argsort(probs_np)[-10:][::-1]
    top_probs = {display_names[i]: round(float(probs_np[i]), 4) for i in top_idx if i < n}

    demo_vit = is_foodx_demo_model()
    thr = float(os.environ.get("FOOD_AI_DEMO_CONFIDENCE_THRESHOLD", "0.45"))
    if demo_vit and confidence < thr:
        return {
            "dish": "Unrecognized (demo ViT head)",
            "confidence": round(confidence, 4),
            "calories": 0,
            "protein_g": 0,
            "carbs_g": 0,
            "fats_g": 0,
            "demoMode": True,
            "demoLowConfidence": True,
            "demoHint": (
                "init-demo-foodx only resized the classifier to 251 FoodX labels; the head is random until you "
                f"fine-tune. Confidence {confidence:.1%} is below demo threshold ({thr:.0%}). Train/export a "
                "real ViT checkpoint to Food‑Recognition‑and‑Calorie‑Estimation/models/vit-foodx251 "
                "(remove .foodx_demo), or train the Keras 16‑dish MobileNet weights."
            ),
            "suppressedGuess": dish,
            "backend": "foodx",
            "probabilities": top_probs,
        }

    return {
        "dish": dish,
        "confidence": round(confidence, 4),
        "calories": cal,
        "protein_g": p_g,
        "carbs_g": c_g,
        "fats_g": f_g,
        "demoMode": demo_vit,
        "backend": "foodx",
        "probabilities": top_probs,
    }
