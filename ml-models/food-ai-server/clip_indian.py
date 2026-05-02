"""Zero-shot dish tagging with CLIP when only demo Keras weights exist (trained head not available)."""

from __future__ import annotations

import logging
import os
import re
import threading
from functools import lru_cache
from typing import Any

import numpy as np
from PIL import Image

from class_names import CLASS_NAMES
from nutrition_map import nutrition_for_dish

_LOG = logging.getLogger("food_ai")
_LOCK = threading.Lock()
_MODEL_ID = os.environ.get("FOOD_AI_CLIP_MODEL", "openai/clip-vit-base-patch32").strip()
_CLIP = None  # tuple (model, processor, device)

# auto | foodx251 | indian16 — auto uses FoodX CSV+class list when present, else 16 curated names.
_CLIP_SET = os.environ.get("FOOD_AI_CLIP_LABEL_SET", "auto").strip().lower()


def clip_deps_available() -> bool:
    try:
        import torch  # noqa: F401
        from transformers import CLIPModel, CLIPProcessor  # noqa: F401

        return True
    except ImportError:
        return False


def _camel_to_words(name: str) -> str:
    return re.sub(r"(?<!^)(?=[A-Z])", " ", name).strip().lower()


def _prompt_line(class_name: str) -> str:
    label = _camel_to_words(class_name)
    return f"a photo of Indian dish {label}, served on plate or platter, realistic food"


def _prompt_foodx_display(display_name: str) -> str:
    d = display_name.strip()
    return f"a photo of {d}, food dish on a plate or bowl, realistic"


@lru_cache(maxsize=1)
def _cached_foodx_table() -> tuple[tuple[str, ...], tuple[str, ...], tuple[int, ...]] | None:
    try:
        from foodx_data import load_foodx_table

        return load_foodx_table()
    except (FileNotFoundError, ValueError, OSError) as e:
        _LOG.info("FoodX label list for CLIP unavailable (%s); using 16-dish set if needed.", e)
        return None


def foodx_clip_labels_ready() -> bool:
    return _cached_foodx_table() is not None


def _active_label_mode() -> str:
    """Return 'foodx251' or 'indian16'."""
    if _CLIP_SET == "indian16":
        return "indian16"
    if _CLIP_SET == "foodx251":
        return "foodx251" if foodx_clip_labels_ready() else "indian16"
    # auto
    return "foodx251" if foodx_clip_labels_ready() else "indian16"


def clip_label_mode_public() -> str:
    """For /health: which label set CLIP will use."""
    return _active_label_mode()


def _load_clip() -> None:
    global _CLIP
    if _CLIP is not None:
        return
    import torch
    from transformers import CLIPModel, CLIPProcessor

    with _LOCK:
        if _CLIP is not None:
            return
        _LOG.info("Loading CLIP (%s) for demo zero-shot…", _MODEL_ID)
        model = CLIPModel.from_pretrained(_MODEL_ID)
        processor = CLIPProcessor.from_pretrained(_MODEL_ID)
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        model = model.to(device)
        model.eval()
        _CLIP = (model, processor, device)


def _run_clip_probs(pil: Image.Image, prompts: list[str]) -> tuple[np.ndarray, list[str]]:
    import torch

    _load_clip()
    assert _CLIP is not None
    model, processor, device = _CLIP

    rgb = pil.convert("RGB")
    inputs = processor(text=prompts, images=rgb, return_tensors="pt", padding=True, truncation=True)
    inputs = inputs.to(device) if hasattr(inputs, "to") else {k: v.to(device) for k, v in inputs.items()}

    with torch.no_grad():
        out = model(**inputs)
        probs = out.logits_per_image.softmax(dim=1)[0]

    probs_np = probs.cpu().numpy().astype(np.float64)
    return probs_np, prompts


def run_clip_indian16(pil: Image.Image) -> tuple[str, float, dict[str, float]]:
    """16 curated CamelCase dishes + nutrition_map serving estimates."""
    texts = [_prompt_line(c) for c in CLASS_NAMES]
    probs_np, _ = _run_clip_probs(pil, texts)
    idx = int(np.argmax(probs_np))
    dish = CLASS_NAMES[idx]
    confidence = float(probs_np[idx])
    prob_map = {CLASS_NAMES[i]: round(float(probs_np[i]), 4) for i in range(len(CLASS_NAMES))}
    return dish, confidence, prob_map


def run_clip_foodx251(pil: Image.Image) -> tuple[str, float, dict[str, float], tuple[int, ...]]:
    """251 FoodX display names + per‑100 g calories from project CSV."""
    from foodx_data import estimate_macros_from_calories

    tab = _cached_foodx_table()
    assert tab is not None
    _, display_names, kcals = tab
    prompts = [_prompt_foodx_display(display_names[i]) for i in range(len(display_names))]
    probs_np, _ = _run_clip_probs(pil, prompts)

    idx = int(np.argmax(probs_np))
    idx = max(0, min(idx, len(display_names) - 1))

    dish = display_names[idx]
    confidence = float(probs_np[idx])
    cal_100 = kcals[idx]
    p_g, c_g, f_g = estimate_macros_from_calories(cal_100)

    top_n = np.argsort(probs_np)[-15:][::-1]
    prob_map = {display_names[int(i)]: round(float(probs_np[int(i)]), 4) for i in top_n if int(i) < len(display_names)}

    extras = cal_100, p_g, c_g, f_g
    # Return macros via side channel to avoid breaking tuple unpacking at call sites
    return dish, confidence, prob_map, extras


def run_clip_router(pil: Image.Image):
    """Dispatch by FOOD_AI_CLIP_LABEL_SET / data availability."""
    mode = _active_label_mode()
    if mode == "foodx251":
        dish, confidence, prob_map, extras = run_clip_foodx251(pil)
        cal_100, pg, cg, fg = extras
        return {
            "mode": "foodx251",
            "dish": dish,
            "confidence": confidence,
            "prob_map": prob_map,
            "calories": cal_100,
            "protein_g": pg,
            "carbs_g": cg,
            "fats_g": fg,
            "clip_label_count": len(_cached_foodx_table()[1]),
        }

    dish, confidence, prob_map = run_clip_indian16(pil)
    return {
        "mode": "indian16",
        "dish": dish,
        "confidence": confidence,
        "prob_map": prob_map,
        "calories": None,
        "protein_g": None,
        "carbs_g": None,
        "fats_g": None,
        "clip_label_count": len(CLASS_NAMES),
    }


def classify_when_demo_weights(pil: Image.Image) -> dict[str, Any] | None:
    """
    Try CLIP zero-shot classification for demo-weights setups.

    Returns a full /predict-shaped dict, or None to fall back to random Keras head + suppression logic.
    """
    if os.environ.get("FOOD_AI_DISABLE_CLIP_FALLBACK", "").strip() == "1":
        return None
    if not clip_deps_available():
        return None
    try:
        r = run_clip_router(pil)
        dish = r["dish"]
        confidence = float(r["confidence"])
        prob_map = r["prob_map"]
        mode = str(r["mode"])
        clip_n = int(r["clip_label_count"])
    except Exception as e:
        _LOG.warning("CLIP zero-shot failed; using Keras head: %s", e)
        return None

    min_conf = float(
        os.environ.get(
            "FOOD_AI_CLIP_MIN_CONFIDENCE_FOODX" if mode == "foodx251" else "FOOD_AI_CLIP_MIN_CONFIDENCE",
            "0.10" if mode == "foodx251" else "0.18",
        )
    )
    if confidence < min_conf:
        scope = f"{clip_n} FoodX labels" if mode == "foodx251" else "16 curated Indian dishes"
        return {
            "dish": "Unrecognized (CLIP uncertain)",
            "confidence": round(confidence, 4),
            "calories": 0,
            "protein_g": 0,
            "carbs_g": 0,
            "fats_g": 0,
            "demoMode": True,
            "demoLowConfidence": True,
            "demoHint": (
                f"No strong CLIP match among {scope} (best {confidence:.1%}, need ≥{min_conf:.0%}). "
                "Try clearer lighting / centred food, force ViT backend with trained weights "
                "(FOOD_AI_BACKEND=foodx), or lower FOOD_AI_CLIP_MIN_CONFIDENCE* env vars."
            ),
            "suppressedGuess": dish,
            "backend": "clip",
            "predictionSource": "clip_zero_shot_foodx251" if mode == "foodx251" else "clip_zero_shot",
            "clipLabelCount": clip_n,
            "probabilities": prob_map,
        }

    assert isinstance(prob_map, dict)

    if mode == "foodx251":
        return {
            "dish": dish,
            "confidence": round(confidence, 4),
            "calories": int(r["calories"]),
            "protein_g": int(r["protein_g"]),
            "carbs_g": int(r["carbs_g"]),
            "fats_g": int(r["fats_g"]),
            "demoMode": False,
            "demoLowConfidence": False,
            "backend": "clip",
            "predictionSource": "clip_zero_shot_foodx251",
            "clipLabelCount": clip_n,
            "predictionNote": (
                f"CLIP zero-shot over {clip_n} FoodX class names — not the same as a trained classifier. "
                "Calorie column follows food_estimates_by_gc.csv (reference per 100 g split into rough P/C/F), "
                "not weighed from pixels."
            ),
            "probabilities": prob_map,
        }

    n = nutrition_for_dish(dish)
    return {
        "dish": dish,
        "confidence": round(confidence, 4),
        "calories": n["calories"],
        "protein_g": n["protein_g"],
        "carbs_g": n["carbs_g"],
        "fats_g": n["fats_g"],
        "demoMode": False,
        "demoLowConfidence": False,
        "backend": "clip",
        "predictionSource": "clip_zero_shot",
        "clipLabelCount": clip_n,
        "predictionNote": (
            "CLIP zero-shot over 16 Indian dish tokens (nutrition_map servings). Expand FoodX CSV + "
            "classes_names.txt to enable ~251-way CLIP (default auto)."
        ),
        "probabilities": prob_map,
    }
