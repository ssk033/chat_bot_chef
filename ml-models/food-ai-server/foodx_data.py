"""FoodX-251 labels and per-100g calories from Food-Recognition-and-Calorie-Estimation/src."""

from __future__ import annotations

import csv
import os
import re
from functools import lru_cache
from pathlib import Path


def chat_bot_root() -> Path:
    env = os.environ.get("CHAT_BOT_CHEF_ROOT", "").strip()
    if env:
        return Path(env)
    # ml-models/food-ai-server -> chat_bot_chef
    return Path(__file__).resolve().parent.parent.parent


def food_recognition_src_dir() -> Path:
    return chat_bot_root() / "Food-Recognition-and-Calorie-Estimation" / "src"


@lru_cache(maxsize=1)
def load_class_names() -> tuple[str, ...]:
    path = food_recognition_src_dir() / "classes_names.txt"
    if not path.is_file():
        raise FileNotFoundError(f"Missing FoodX class list: {path}")
    lines = [ln.strip() for ln in path.read_text(encoding="utf-8").splitlines() if ln.strip()]
    return tuple(lines)


_CAL_RE = re.compile(r"(\d+)\s*cal", re.I)


@lru_cache(maxsize=1)
def load_foodx_table() -> tuple[tuple[str, ...], tuple[str, ...], tuple[int, ...]]:
    """Return (snake id per row, display name from CSV, kcal per 100g) — row order matches train labels."""
    names = load_class_names()
    csv_path = food_recognition_src_dir() / "food_estimates_by_gc.csv"
    if not csv_path.is_file():
        raise FileNotFoundError(f"Missing calorie table: {csv_path}")

    display: list[str] = []
    kcals: list[int] = []
    with csv_path.open(newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            label = (row.get("Predicted Food Class") or "").strip()
            est = (row.get("Estimated Calories") or "").strip()
            m = _CAL_RE.search(est)
            if not label or not m:
                continue
            display.append(label)
            kcals.append(int(m.group(1)))

    if len(display) != len(names):
        raise ValueError(
            f"food_estimates_by_gc.csv has {len(display)} rows but classes_names.txt has {len(names)} — counts must match."
        )
    return tuple(names), tuple(display), tuple(kcals)


def estimate_macros_from_calories(calories: int, *, protein_ratio: float = 0.15) -> tuple[int, int, int]:
    """Rough P/C/F grams for 100g reference (CSV is per 100g); not from pixels."""
    c = max(calories, 1)
    p = max(1, round((c * protein_ratio) / 4))
    carb = max(1, round((c * 0.50) / 4))
    fat = max(1, round((c * (1.0 - protein_ratio - 0.50)) / 9))
    return p, carb, fat


def typical_serving_grams(display_name: str) -> int:
    """Scale FoodX per-100g calories to a plausible plate size."""
    low = display_name.lower()
    if "biryani" in low or "pulao" in low or "pilaf" in low:
        return 320
    if "curry" in low or "stew" in low:
        return 280
    if "soup" in low or "salad" in low:
        return 250
    return 200


def nutrition_for_foodx_label(display_name: str, cal_per_100g: int) -> tuple[int, int, int, int]:
    """Return calories + macros for a typical serving of a FoodX-labelled dish."""
    from nutrition_reference import reference_nutrition_for_label, reconcile_with_reference

    ref = reference_nutrition_for_label(display_name)
    if ref:
        return ref["calories"], ref["protein_g"], ref["carbs_g"], ref["fats_g"]

    grams = typical_serving_grams(display_name)
    factor = grams / 100.0
    cal = max(1, round(cal_per_100g * factor))
    protein_ratio = 0.22 if any(k in display_name.lower() for k in ("chicken", "mutton", "lamb", "beef", "meat", "fish")) else 0.15
    p, carb, fat = estimate_macros_from_calories(cal_per_100g, protein_ratio=protein_ratio)
    scaled = {
        "calories": cal,
        "protein_g": max(1, round(p * factor)),
        "carbs_g": max(1, round(carb * factor)),
        "fats_g": max(1, round(fat * factor)),
    }
    final, _ = reconcile_with_reference(display_name, scaled)
    return final["calories"], final["protein_g"], final["carbs_g"], final["fats_g"]
